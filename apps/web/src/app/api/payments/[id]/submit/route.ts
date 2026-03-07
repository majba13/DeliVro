import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const { transactionId, screenshotUrl } = await req.json();

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Fetch payment with order details
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify the user owns this order
    if (payment.order.customerId !== user.userId) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this payment" },
        { status: 403 }
      );
    }

    // Check if payment is in a state that can accept transaction submission
    if (!["PENDING_VERIFICATION", "FAILED"].includes(payment.status)) {
      return NextResponse.json(
        { error: "Payment cannot be updated in its current state" },
        { status: 400 }
      );
    }

    // Update payment with transaction details
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        transactionId: transactionId.trim(),
        mobileReference: screenshotUrl || undefined,
        status: "PENDING_VERIFICATION",
        verificationLog: {
          push: {
            timestamp: new Date().toISOString(),
            action: "CUSTOMER_SUBMITTED_TXN",
            transactionId: transactionId.trim(),
            screenshotUrl: screenshotUrl || null,
          },
        },
      },
    });

    // Auto-matching logic: Search for matching AdminTransaction
    const matchingAdminTxn = await prisma.adminTransaction.findFirst({
      where: {
        method: payment.method,
        transactionId: transactionId.trim(),
        isMatched: false,
      },
    });

    let matched = false;
    let autoVerified = false;

    if (matchingAdminTxn) {
      // Check if amounts match (allow small tolerance for rounding)
      const amountDifference = Math.abs(matchingAdminTxn.amount - payment.amount);
      
      if (amountDifference < 1) { // Less than 1 Taka difference
        // Auto-verify the payment
        await prisma.$transaction([
          // Update payment status to VERIFIED
          prisma.payment.update({
            where: { id },
            data: {
              status: "VERIFIED",
              verificationLog: {
                push: {
                  timestamp: new Date().toISOString(),
                  action: "AUTO_VERIFIED",
                  matchedTransactionId: matchingAdminTxn.id,
                  note: "Automatically verified by matching with admin transaction",
                },
              },
            },
          }),
          // Update order status to CONFIRMED
          prisma.order.update({
            where: { id: payment.orderId },
            data: {
              status: "CONFIRMED",
            },
          }),
          // Mark admin transaction as matched
          prisma.adminTransaction.update({
            where: { id: matchingAdminTxn.id },
            data: {
              isMatched: true,
              matchedPaymentId: id,
            },
          }),
          // Create notification for customer
          prisma.notification.create({
            data: {
              userId: user.userId,
              title: "Payment Verified! 🎉",
              message: `Your payment of ৳${payment.amount} has been verified. Your order is now confirmed!`,
              channel: "in_app",
              payload: {
                type: "PAYMENT",
                orderId: payment.orderId,
                paymentId: id,
              },
            },
          }),
          // Create audit log
          prisma.auditLog.create({
            data: {
              userId: user.userId,
              action: "PAYMENT_AUTO_VERIFIED",
              resource: "Payment",
              resourceId: id,
              metadata: {
                orderId: payment.orderId,
                amount: payment.amount,
                method: payment.method,
                transactionId: transactionId.trim(),
                matchedAdminTxnId: matchingAdminTxn.id,
              },
            },
          }),
        ]);

        matched = true;
        autoVerified = true;
      } else {
        // Amount mismatch - log but don't auto-verify
        await prisma.payment.update({
          where: { id },
          data: {
            verificationLog: {
              push: {
                timestamp: new Date().toISOString(),
                action: "MATCH_FOUND_AMOUNT_MISMATCH",
                matchedTransactionId: matchingAdminTxn.id,
                expectedAmount: payment.amount,
                receivedAmount: matchingAdminTxn.amount,
                note: "Transaction ID matched but amounts don't match. Manual verification required.",
              },
            },
          },
        });
        matched = true; // Transaction ID matched, but needs manual review
      }
    }

    return NextResponse.json({
      payment: updatedPayment,
      matched,
      autoVerified,
      message: autoVerified
        ? "Payment verified automatically! Your order is confirmed."
        : matched
        ? "Transaction ID matched but amounts differ. Our team will verify shortly."
        : "Payment confirmation submitted. Our team will verify shortly.",
    });

  } catch (error) {
    console.error("Error submitting payment:", error);
    return NextResponse.json(
      { error: "Failed to submit payment confirmation" },
      { status: 500 }
    );
  }
}
