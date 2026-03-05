/**
 * POST /api/payments — initiate a payment for an order
 *   Body: { orderId, method: "STRIPE" | "BKASH" | "NAGAD" | "ROCKET" | "COD" | ... }
 *   - COD: immediately marks payment as VERIFIED and returns success
 *   - STRIPE: creates a Stripe PaymentIntent and returns clientSecret
 *   - Mobile (bKash/Nagad/Rocket): returns a pending record for manual verification
 */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

const prisma = new PrismaClient();

const VALID_METHODS = ["STRIPE", "BKASH", "NAGAD", "ROCKET", "BANK", "COD"] as const;

const schema = z.object({
  orderId: z.string().min(1),
  method: z.enum(VALID_METHODS),
  // For mobile payments: the payer's mobile number / transaction reference
  mobileReference: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { orderId, method, mobileReference } = body.data;

  // Verify order belongs to this user
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.customerId !== auth.sub) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Prevent double-payment
  const existing = await prisma.payment.findUnique({ where: { orderId } });
  if (existing && existing.status !== "FAILED") {
    return NextResponse.json(
      { message: "Payment already exists", payment: existing },
      { status: 409 }
    );
  }

  // ── COD — instant verification ────────────────────────────────────
  if (method === "COD") {
    const payment = await prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        userId: auth.sub,
        method: "COD",
        status: "VERIFIED",
        amount: order.total,
      },
      update: { status: "VERIFIED", method: "COD", updatedAt: new Date() },
    });

    await prisma.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });

    return NextResponse.json({ payment, message: "Cash on delivery confirmed" }, { status: 201 });
  }

  // ── STRIPE ────────────────────────────────────────────────────────
  if (method === "STRIPE") {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ message: "Stripe is not configured" }, { status: 503 });
    }

    // Dynamic import — avoids bundling Stripe in non-payment routes
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // paisa
      currency: "bdt",
      metadata: { orderId, userId: auth.sub },
    });

    const payment = await prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        userId: auth.sub,
        method: "STRIPE",
        status: "INITIATED",
        amount: order.total,
        stripePaymentId: intent.id,
      },
      update: {
        method: "STRIPE",
        status: "INITIATED",
        stripePaymentId: intent.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { payment, clientSecret: intent.client_secret },
      { status: 201 }
    );
  }

  // ── Mobile payment (bKash / Nagad / Rocket) ───────────────────────
  const payment = await prisma.payment.upsert({
    where: { orderId },
    create: {
      orderId,
      userId: auth.sub,
      method,
      status: "PENDING_VERIFICATION",
      amount: order.total,
      mobileReference: mobileReference ?? null,
    },
    update: {
      method,
      status: "PENDING_VERIFICATION",
      mobileReference: mobileReference ?? null,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(
    {
      payment,
      message: "Payment submitted for verification. You will be notified once confirmed.",
    },
    { status: 201 }
  );
}
