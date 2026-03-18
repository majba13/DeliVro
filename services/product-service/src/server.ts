import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const ProductCategory = {
  FOOD: "FOOD",
  GROCERIES: "GROCERIES",
  STATIONARY: "STATIONARY",
  MEDICINE: "MEDICINE",
  WEAR: "WEAR",
  ELECTRONICS: "ELECTRONICS",
  EMERGENCY: "EMERGENCY"
} as const;
type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory];

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

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  category: z.nativeEnum(ProductCategory),
  price: z.number().positive(),
  discount: z.number().min(0).max(100).optional(),
  unit: z.string().max(30).optional(),
  stock: z.number().int().nonnegative(),
  shopId: z.string().optional(),
  images: z.array(z.string().url()).default([]),
  tags: z.array(z.string()).default([])
});

app.get("/", async (request) => {
  const { q, category } = request.query as { q?: string; category?: ProductCategory };
  return prisma.product.findMany({
    where: {
      isActive: true,
      category,
      OR: q
        ? [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }]
        : undefined
    },
    include: { inventory: true },
    orderBy: { createdAt: "desc" }
  });
});

app.post("/", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { sub: string; role: RoleType };
  if (!([RoleType.SHOP_OWNER, RoleType.ADMIN, RoleType.SUPER_ADMIN] as string[]).includes(user.role)) {
    return reply.status(403).send({ message: "Not allowed" });
  }

  const body = productSchema.parse(request.body);
  const product = await prisma.product.create({
    data: {
      ownerId: user.sub,
      shopId: body.shopId ?? null,
      name: body.name,
      description: body.description,
      category: body.category,
      price: body.price,
      discount: body.discount ?? null,
      unit: body.unit ?? null,
      images: body.images,
      tags: body.tags,
      inventory: { create: { stock: body.stock } }
    },
    include: { inventory: true }
  });
  return reply.status(201).send(product);
});

app.patch("/:id", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { sub: string; role: RoleType };
  const { id } = request.params as { id: string };
  const body = productSchema.partial().parse(request.body);

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return reply.status(404).send({ message: "Product not found" });

  const canManage = ([RoleType.SUPER_ADMIN, RoleType.ADMIN] as string[]).includes(user.role) || existing.ownerId === user.sub;
  if (!canManage) return reply.status(403).send({ message: "Not allowed" });

  const { stock, ...rest } = body;
  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...rest,
      inventory: stock !== undefined ? { update: { stock } } : undefined
    },
    include: { inventory: true }
  });

  return reply.send(updated);
});

app.get("/health", async () => ({ status: "ok", service: "product-service" }));

const port = Number(process.env.PRODUCT_PORT ?? 4002);
await app.listen({ port, host: "0.0.0.0" });

