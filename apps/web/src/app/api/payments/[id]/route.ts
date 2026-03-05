/**
 * GET   /api/payments/[id] — get payment details (customer, admin, or shop owner)
 * PATCH /api/payments/[id] — admin/owner verifies a mobile payment
 *   Body: { status: "VERIFIED" | "FAILED", note?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { order: { select: { id: true, customerId: true, ownerId: true, status: true, total: true } } },
  });

  if (!payment) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const adminRoles = ["SUPER_ADMIN", "ADMIN"];
  const isAdmin = adminRoles.includes(auth.role);
  const isCustomer = payment.userId === auth.sub;
  const isOwner = payment.order.ownerId === auth.sub;

  if (!isAdmin && !isCustomer && !isOwner) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ payment });
}

const patchSchema = z.object({
  status: z.enum(["VERIFIED", "FAILED"]),
  note: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const adminRoles = ["SUPER_ADMIN", "ADMIN", "SHOP_OWNER"];
  if (!adminRoles.includes(auth.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: body.data.status,
      verificationLog: body.data.note ? { note: body.data.note, by: auth.sub, at: new Date().toISOString() } : undefined,
      updatedAt: new Date(),
    },
  });

  // If verified, confirm the order
  if (body.data.status === "VERIFIED") {
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } });

    // Notify customer
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: "Payment Verified",
        message: `Your ${payment.method} payment for order #${payment.orderId.slice(-6).toUpperCase()} has been verified.`,
        channel: "in_app",
        payload: { orderId: payment.orderId, paymentId: payment.id },
      },
    });
  }

  return NextResponse.json({ payment: updated });
}
