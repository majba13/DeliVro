/**
 * POST /api/payments/stripe/webhook
 * Receives Stripe webhook events to update payment/order status automatically.
 * Must be configured in Stripe Dashboard → Webhooks → your Vercel URL.
 * Set STRIPE_WEBHOOK_SECRET in Vercel environment variables.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ message: "Stripe not configured" }, { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as { id: string; metadata: { orderId?: string; userId?: string } };
    const { orderId, userId } = intent.metadata;

    if (orderId) {
      await prisma.payment.updateMany({
        where: { stripePaymentId: intent.id },
        data: { status: "VERIFIED", transactionId: intent.id, updatedAt: new Date() },
      });

      await prisma.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });

      if (userId) {
        await prisma.notification.create({
          data: {
            userId,
            title: "Payment Successful",
            message: `Your Stripe payment for order #${orderId.slice(-6).toUpperCase()} was successful!`,
            channel: "in_app",
            payload: { orderId, stripePaymentId: intent.id },
          },
        });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as { id: string };
    await prisma.payment.updateMany({
      where: { stripePaymentId: intent.id },
      data: { status: "FAILED", updatedAt: new Date() },
    });
  }

  return NextResponse.json({ received: true });
}
