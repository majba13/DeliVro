import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method");
    const isMatched = searchParams.get("isMatched");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};
    
    if (method) {
      where.method = method;
    }
    
    if (isMatched !== null && isMatched !== undefined) {
      where.isMatched = isMatched === "true";
    }

    const [transactions, total] = await Promise.all([
      prisma.adminTransaction.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          matchedPayment: {
            include: {
              order: {
                include: {
                  customer: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          receivedAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.adminTransaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    });

  } catch (error) {
    console.error("Error fetching admin transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin transactions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const {
      method,
      transactionId,
      amount,
      senderNumber,
      receivedAt,
      rawMessage,
    } = await req.json();

    // Validate required fields
    if (!method || !transactionId || !amount) {
      return NextResponse.json(
        { error: "Method, transaction ID, and amount are required" },
        { status: 400 }
      );
    }

    if (!["bKash", "Nagad", "Rocket"].includes(method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Check if transaction already exists
    const existingTxn = await prisma.adminTransaction.findUnique({
      where: {
        method_transactionId: {
          method,
          transactionId: transactionId.trim(),
        },
      },
    });

    if (existingTxn) {
      return NextResponse.json(
        { error: "This transaction ID has already been recorded" },
        { status: 409 }
      );
    }

    // Create admin transaction
    const adminTransaction = await prisma.adminTransaction.create({
      data: {
        adminId: user.userId,
        method,
        transactionId: transactionId.trim(),
        amount,
        senderNumber: senderNumber?.trim() || null,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
        rawMessage: rawMessage?.trim() || null,
      },
    });

    // Auto-matching logic: Search for matching customer payment
    const matchingPayment = await prisma.payment.findFirst({
      where: {
        method,
        transactionId: transactionId.trim(),
        status: "PENDING_VERIFICATION",
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    let matched = false;
    let autoVerified = false;
    let matchedPayment = null;

    if (matchingPayment) {
      // Check if amounts match (allow small tolerance for rounding)
      const amountDifference = Math.abs(amount - matchingPayment.amount);
      
      if (amountDifference < 1) { // Less than 1 Taka difference
        // Auto-verify the payment
        await prisma.$transaction([
          // Update payment status to VERIFIED
          prisma.payment.update({
            where: { id: matchingPayment.id },
            data: {
              status: "VERIFIED",
              verificationLog: {
                push: {
                  timestamp: new Date().toISOString(),
                  action: "AUTO_VERIFIED_BY_ADMIN",
                  matchedTransactionId: adminTransaction.id,
                  note: "Automatically verified by admin transaction input",
                },
              },
            },
          }),
          // Update order status to CONFIRMED
          prisma.order.update({
            where: { id: matchingPayment.orderId },
            data: {
              status: "CONFIRMED",
            },
          }),
          // Mark admin transaction as matched
          prisma.adminTransaction.update({
            where: { id: adminTransaction.id },
            data: {
              isMatched: true,
              matchedPaymentId: matchingPayment.id,
            },
          }),
          // Create notification for customer
          prisma.notification.create({
            data: {
              userId: matchingPayment.order.customerId,
              title: "Payment Verified! 🎉",
              message: `Your payment of ৳${matchingPayment.amount} has been verified. Your order is now confirmed!`,
              channel: "in_app",
              payload: {
                type: "PAYMENT",
                orderId: matchingPayment.orderId,
                paymentId: matchingPayment.id,
              },
            },
          }),
          // Create notification for admin
          prisma.notification.create({
            data: {
              userId: user.userId,
              title: "Payment Auto-Matched",
              message: `Transaction ${transactionId} automatically matched with order payment.`,
              channel: "in_app",
              payload: {
                type: "PAYMENT",
                orderId: matchingPayment.orderId,
                transactionId: adminTransaction.id,
              },
            },
          }),
          // Create audit log
          prisma.auditLog.create({
            data: {
              userId: user.userId,
              action: "PAYMENT_AUTO_VERIFIED_BY_ADMIN",
              resource: "Payment",
              resourceId: matchingPayment.id,
              metadata: {
                orderId: matchingPayment.orderId,
                amount: matchingPayment.amount,
                method,
                transactionId: transactionId.trim(),
                adminTxnId: adminTransaction.id,
                customerId: matchingPayment.order.customerId,
              },
            },
          }),
        ]);

        matched = true;
        autoVerified = true;
        matchedPayment = matchingPayment;
      } else {
        // Amount mismatch - log but don't auto-verify
        await prisma.adminTransaction.update({
          where: { id: adminTransaction.id },
          data: {
            notes: `Transaction ID matched with payment ${matchingPayment.id} but amounts differ. Customer submitted: ৳${matchingPayment.amount}, Admin received: ৳${amount}. Manual verification required.`,
          },
        });
        matched = true; // Transaction ID matched, but needs manual review
      }
    }

    // Fetch the updated transaction with relations
    const updatedTransaction = await prisma.adminTransaction.findUnique({
      where: { id: adminTransaction.id },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        matchedPayment: matchedPayment ? {
          include: {
            order: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        } : undefined,
      },
    });

    return NextResponse.json({
      transaction: updatedTransaction,
      matched,
      autoVerified,
      matchedPayment: matchedPayment || null,
      message: autoVerified
        ? "Transaction recorded and payment auto-verified!"
        : matched
        ? "Transaction recorded but amounts differ. Manual verification needed."
        : "Transaction recorded. No matching pending payment found.",
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating admin transaction:", error);
    
    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "This transaction ID has already been recorded" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create admin transaction" },
      { status: 500 }
    );
  }
}
