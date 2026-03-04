import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

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

app.get("/recommendations", { preHandler: (app as any).authenticate }, async (request: any) => {
  const userId = request.user.sub as string;

  const recentOrders = await prisma.order.findMany({
    where: { customerId: userId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const categoryScores = new Map<string, number>();
  recentOrders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.product.category;
      categoryScores.set(key, (categoryScores.get(key) ?? 0) + item.quantity);
    });
  });

  const topCategories = [...categoryScores.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 3);

  return prisma.product.findMany({
    where: { category: { in: topCategories as any[] }, isActive: true },
    include: { inventory: true },
    take: 20,
    orderBy: { createdAt: "desc" }
  });
});

app.get("/predictive-search", { preHandler: (app as any).authenticate }, async (request) => {
  const { q } = z.object({ q: z.string().min(1) }).parse(request.query);
  return prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } }
      ]
    },
    select: { id: true, name: true, category: true, price: true },
    take: 10
  });
});

app.get("/customer-analytics", { preHandler: (app as any).authenticate }, async (request: any) => {
  const userId = request.user.sub as string;
  const orders = await prisma.order.findMany({ where: { customerId: userId }, include: { items: true } });

  const totalSpent = orders.reduce((acc, o) => acc + Number(o.total), 0);
  const avgBasketSize = orders.length ? orders.reduce((a, o) => a + o.items.length, 0) / orders.length : 0;

  return {
    totalOrders: orders.length,
    totalSpent,
    avgBasketSize,
    frequentOrderHour: new Date().getHours()
  };
});

app.get("/smart-categories", { preHandler: (app as any).authenticate }, async (request) => {
  const { q } = z.object({ q: z.string().min(1) }).parse(request.query);
  const products = await prisma.product.findMany({
    where: {
      OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }]
    },
    select: { category: true },
    take: 50
  });

  const counts = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([category, score]) => ({ category, score }));
});

app.get("/health", async () => ({ status: "ok", service: "ai-service" }));

const port = Number(process.env.AI_PORT ?? 4006);
await app.listen({ port, host: "0.0.0.0" });

