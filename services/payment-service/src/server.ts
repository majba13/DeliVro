import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rawBodyPlugin from "fastify-raw-body";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const PaymentMethod = {
  STRIPE: "STRIPE",
  BKASH: "BKASH",
  NAGAD: "NAGAD",
  ROCKET: "ROCKET",
  BANK: "BANK",
  COD: "COD"
} as const;
type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

const PaymentStatus = {
  INITIATED: "INITIATED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  VERIFIED: "VERIFIED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED"
} as const;
type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

const RoleType = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SHOP_OWNER: "SHOP_OWNER",
  DELIVERY_MAN: "DELIVERY_MAN",
  CUSTOMER: "CUSTOMER"
} as const;
type RoleType = (typeof RoleType)[keyof typeof RoleType];

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const prisma = new PrismaClient();
const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? "dev-secret" });
await app.register(rawBodyPlugin, {
  field: "rawBody",
  global: false,
  encoding: "utf8",
  runFirst: true
});

app.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: "Unauthorized" });
  }
});

app.post("/stripe/intent", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { sub: string };
  const body = z.object({ orderId: z.string() }).parse(request.body);
  const order = await prisma.order.findUnique({ where: { id: body.orderId } });
  if (!order) return reply.status(404).send({ message: "Order not found" });

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(Number(order.total) * 100),
    currency: "usd",
    metadata: { orderId: order.id, userId: user.sub }
  });

  await prisma.payment.upsert({
    where: { orderId: order.id },
    update: { method: PaymentMethod.STRIPE, stripePaymentId: intent.id, status: PaymentStatus.INITIATED, amount: order.total, userId: user.sub },
    create: { orderId: order.id, userId: user.sub, method: PaymentMethod.STRIPE, stripePaymentId: intent.id, amount: order.total }
  });

  return reply.send({ clientSecret: intent.client_secret });
});

app.post("/stripe/webhook", { config: { rawBody: true } }, async (request: any, reply) => {
  const signature = request.headers["stripe-signature"] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return reply.status(400).send({ message: "Missing Stripe signature or webhook secret" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(request.rawBody, signature, webhookSecret);
  } catch (error) {
    return reply.status(400).send({ message: "Invalid Stripe webhook signature", error: (error as Error).message });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;
    if (orderId) {
      await prisma.payment.updateMany({
        where: { orderId, stripePaymentId: intent.id },
        data: {
          status: PaymentStatus.VERIFIED,
          verificationLog: {
            provider: "STRIPE",
            eventType: event.type,
            paymentIntentId: intent.id,
            receivedAt: new Date().toISOString()
          }
        }
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;
    if (orderId) {
      await prisma.payment.updateMany({
        where: { orderId, stripePaymentId: intent.id },
        data: {
          status: PaymentStatus.FAILED,
          verificationLog: {
            provider: "STRIPE",
            eventType: event.type,
            paymentIntentId: intent.id,
            receivedAt: new Date().toISOString()
          }
        }
      });
    }
  }

  return reply.send({ received: true });
});

app.post("/manual/submit", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { sub: string };
  const body = z.object({
    orderId: z.string(),
    method: z.enum(["BKASH", "NAGAD", "ROCKET", "BANK"]),
    transactionId: z.string().min(6),
    mobileReference: z.string().optional()
  }).parse(request.body);

  const order = await prisma.order.findUnique({ where: { id: body.orderId } });
  if (!order) return reply.status(404).send({ message: "Order not found" });

  const payment = await prisma.payment.upsert({
    where: { orderId: body.orderId },
    update: {
      method: body.method as PaymentMethod,
      transactionId: body.transactionId,
      mobileReference: body.mobileReference,
      status: PaymentStatus.PENDING_VERIFICATION,
      amount: order.total,
      userId: user.sub
    },
    create: {
      orderId: body.orderId,
      userId: user.sub,
      method: body.method as PaymentMethod,
      transactionId: body.transactionId,
      mobileReference: body.mobileReference,
      status: PaymentStatus.PENDING_VERIFICATION,
      amount: order.total
    }
  });

  return reply.status(202).send({ message: "Submitted for auto verification", paymentId: payment.id });
});

app.post("/manual/mobile-notification", async (request, reply) => {
  const body = z.object({
    provider: z.enum(["BKASH", "NAGAD", "ROCKET", "BANK"]),
    transactionId: z.string(),
    amount: z.number().positive(),
    receivedAt: z.string().optional()
  }).parse(request.body);

  const payment = await prisma.payment.findFirst({
    where: {
      method: body.provider as PaymentMethod,
      transactionId: body.transactionId,
      status: PaymentStatus.PENDING_VERIFICATION
    }
  });

  if (!payment) return reply.status(404).send({ matched: false });

  const isAmountMatched = Number(payment.amount) === Number(body.amount);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: isAmountMatched ? PaymentStatus.VERIFIED : PaymentStatus.FAILED,
      verificationLog: body
    }
  });

  return reply.send({ matched: true, verified: isAmountMatched });
});

app.post("/cod", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { sub: string };
  const body = z.object({ orderId: z.string() }).parse(request.body);
  const order = await prisma.order.findUnique({ where: { id: body.orderId } });
  if (!order) return reply.status(404).send({ message: "Order not found" });

  const payment = await prisma.payment.upsert({
    where: { orderId: body.orderId },
    update: { method: PaymentMethod.COD, status: PaymentStatus.INITIATED, amount: order.total, userId: user.sub },
    create: { orderId: body.orderId, userId: user.sub, method: PaymentMethod.COD, status: PaymentStatus.INITIATED, amount: order.total }
  });

  return reply.send(payment);
});

app.post("/manual/verify/:paymentId", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { role: RoleType; sub: string };
  if (!([RoleType.ADMIN, RoleType.SUPER_ADMIN] as string[]).includes(user.role)) {
    return reply.status(403).send({ message: "Only admins can verify" });
  }

  const { paymentId } = request.params as { paymentId: string };
  const { status } = z.object({ status: z.enum(["VERIFIED", "FAILED"]) }).parse(request.body);

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: status === "VERIFIED" ? PaymentStatus.VERIFIED : PaymentStatus.FAILED }
  });

  await prisma.auditLog.create({ data: { userId: user.sub, action: "PAYMENT_REVIEW", resource: "Payment", resourceId: paymentId, metadata: { status } } });
  return reply.send(updated);
});

app.get("/fraud-score/:orderId", { preHandler: (app as any).authenticate }, async (request, reply) => {
  const { orderId } = request.params as { orderId: string };
  const payment = await prisma.payment.findUnique({ where: { orderId }, include: { order: true } });
  if (!payment) return reply.status(404).send({ message: "Payment not found" });

  let score = 0;
  if (([PaymentMethod.BKASH, PaymentMethod.NAGAD, PaymentMethod.ROCKET] as string[]).includes(payment.method)) score += 25;
  if (Number(payment.amount) > 500) score += 30;
  if (payment.status === PaymentStatus.PENDING_VERIFICATION) score += 20;
  if (!payment.transactionId && payment.method !== PaymentMethod.COD && payment.method !== PaymentMethod.STRIPE) score += 35;

  return reply.send({
    orderId,
    paymentId: payment.id,
    score,
    riskLevel: score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW"
  });
});

app.get("/health", async () => ({ status: "ok", service: "payment-service" }));

const port = Number(process.env.PAYMENT_PORT ?? 4004);
await app.listen({ port, host: "0.0.0.0" });

