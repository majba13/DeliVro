import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const OrderStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PREPARING: "PREPARING",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED"
} as const;
type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

const RoleType = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SHOP_OWNER: "SHOP_OWNER",
  DELIVERY_MAN: "DELIVERY_MAN",
  CUSTOMER: "CUSTOMER"
} as const;
type RoleType = (typeof RoleType)[keyof typeof RoleType];

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? "dev-secret" });

app.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: "Unauthorized" });
  }
});

app.post("/", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { sub: string; role: RoleType };
  if (user.role !== RoleType.CUSTOMER) return reply.status(403).send({ message: "Only customers can order" });

  const body = z.object({
    ownerId: z.string(),
    items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1)
  }).parse(request.body);

  const products = await prisma.product.findMany({ where: { id: { in: body.items.map((i) => i.productId) } }, include: { inventory: true } });

  let subtotal = 0;
  for (const item of body.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || !product.inventory || product.inventory.stock < item.quantity) {
      return reply.status(400).send({ message: `Insufficient stock for product ${item.productId}` });
    }
    subtotal += Number(product.price) * item.quantity;
  }

  const deliveryFee = 40;
  const total = subtotal + deliveryFee;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerId: user.sub,
        ownerId: body.ownerId,
        subtotal,
        deliveryFee,
        total,
        estimatedMinutes: 45,
        items: {
          create: body.items.map((i) => {
            const product = products.find((p) => p.id === i.productId)!;
            return { productId: i.productId, quantity: i.quantity, unitPrice: product.price };
          })
        }
      },
      include: { items: true }
    });

    for (const item of body.items) {
      await tx.inventory.update({ where: { productId: item.productId }, data: { stock: { decrement: item.quantity }, reserved: { increment: item.quantity } } });
    }

    return created;
  });

  return reply.status(201).send(order);
});

app.patch("/:id/status", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { sub: string; role: RoleType };
  if (!([RoleType.SHOP_OWNER, RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.DELIVERY_MAN] as string[]).includes(user.role)) {
    return reply.status(403).send({ message: "Not allowed" });
  }

  const { id } = request.params as { id: string };
  const { status, estimatedMinutes } = z.object({
    status: z.nativeEnum(OrderStatus),
    estimatedMinutes: z.number().int().positive().optional()
  }).parse(request.body);

  const updated = await prisma.order.update({ where: { id }, data: { status, estimatedMinutes } });
  await prisma.auditLog.create({
    data: {
      userId: user.sub,
      action: "ORDER_STATUS_CHANGED",
      resource: "Order",
      resourceId: id,
      metadata: { status, estimatedMinutes }
    }
  });

  return reply.send(updated);
});

app.get("/my", { preHandler: (app as any).authenticate }, async (request: any) => {
  const user = request.user as { sub: string; role: RoleType };

  if (user.role === RoleType.CUSTOMER) {
    return prisma.order.findMany({ where: { customerId: user.sub }, include: { items: true, payment: true, delivery: true } });
  }

  if (user.role === RoleType.SHOP_OWNER) {
    return prisma.order.findMany({ where: { ownerId: user.sub }, include: { items: true, payment: true, delivery: true } });
  }

  return prisma.order.findMany({ include: { items: true, payment: true, delivery: true } });
});

app.get("/health", async () => ({ status: "ok", service: "order-service" }));

const port = Number(process.env.ORDER_PORT ?? 4003);
await app.listen({ port, host: "0.0.0.0" });

