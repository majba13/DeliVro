import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const RoleType = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SHOP_OWNER: "SHOP_OWNER",
  DELIVERY_MAN: "DELIVERY_MAN",
  CUSTOMER: "CUSTOMER"
} as const;
type RoleType = (typeof RoleType)[keyof typeof RoleType];

/** Map backend DB enum to frontend-expected camelCase role names */
const ROLE_DISPLAY: Record<RoleType, string> = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  SHOP_OWNER: "ShopOwner",
  DELIVERY_MAN: "DeliveryMan",
  CUSTOMER: "Customer"
};

/** Map frontend camelCase role → DB enum (for registration) */
const ROLE_FROM_CLIENT: Record<string, RoleType> = {
  SuperAdmin: RoleType.SUPER_ADMIN,
  Admin: RoleType.ADMIN,
  ShopOwner: RoleType.SHOP_OWNER,
  DeliveryMan: RoleType.DELIVERY_MAN,
  Customer: RoleType.CUSTOMER
};

function formatUser(user: { id: string; name: string | null; email: string | null; phone: string | null; role: RoleType; isVerified: boolean; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name ?? user.email?.split("@")[0] ?? "User",
    email: user.email,
    phone: user.phone,
    role: ROLE_DISPLAY[user.role],
    isVerified: user.isVerified
  };
}

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
await app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? "dev-secret" });

app.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: "Unauthorized" });
  }
});

const registerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().optional()
}).refine((value) => value.email || value.phone, { message: "Email or phone required" });

app.post("/register", async (request, reply) => {
  const body = registerSchema.parse(request.body);

  // Resolve role from either frontend camelCase or DB enum format
  const dbRole: RoleType = (body.role && (ROLE_FROM_CLIENT[body.role] ?? (Object.values(RoleType).includes(body.role as RoleType) ? body.role as RoleType : null))) ?? RoleType.CUSTOMER;

  // Prevent direct SuperAdmin/Admin self-registration
  if (dbRole === RoleType.SUPER_ADMIN || dbRole === RoleType.ADMIN) {
    return reply.status(403).send({ message: "Cannot self-register as Admin or SuperAdmin" });
  }

  // Check duplicate
  if (body.email) {
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.status(409).send({ message: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      passwordHash,
      role: dbRole,
      isVerified: true // auto-verify for development; add email OTP in production
    }
  });

  const accessToken = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "15m" });
  const refreshToken = app.jwt.sign({ sub: user.id, role: user.role, t: "refresh" }, { expiresIn: "7d" });

  return reply.status(201).send({ accessToken, refreshToken, user: formatUser(user) });
});

app.post("/verify", async (request, reply) => {
  // OTP verification — kept for future email verification flow
  return reply.status(200).send({ verified: true });
});

app.post("/oauth/google", async (request, reply) => {
  const { googleId, email, name } = z.object({ googleId: z.string().min(4), email: z.string().email(), name: z.string().optional() }).parse(request.body);
  const user = await prisma.user.upsert({
    where: { email },
    update: { googleId, isVerified: true },
    create: { email, name, googleId, isVerified: true, role: RoleType.CUSTOMER }
  });

  const accessToken = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "15m" });
  const refreshToken = app.jwt.sign({ sub: user.id, role: user.role, t: "refresh" }, { expiresIn: "7d" });
  return reply.send({ accessToken, refreshToken, user: formatUser(user) });
});

app.post("/login", async (request, reply) => {
  // Accept either { identity } (preferred) or direct { email } / { phone } for compatibility
  const body = z.object({
    identity: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    password: z.string().min(8)
  }).parse(request.body);

  const lookup = body.identity ?? body.email ?? body.phone;
  if (!lookup) return reply.status(400).send({ message: "Email, phone or identity required" });

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: lookup }, { phone: lookup }],
      isActive: true
    }
  });

  if (!user || !user.passwordHash) {
    return reply.status(401).send({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(body.password, user.passwordHash);
  if (!isValid) return reply.status(401).send({ message: "Invalid credentials" });

  const accessToken = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "15m" });
  const refreshToken = app.jwt.sign({ sub: user.id, role: user.role, t: "refresh" }, { expiresIn: "7d" });
  return reply.send({ accessToken, refreshToken, user: formatUser(user) });
});

app.post("/token/refresh", async (request, reply) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(request.body);
  const payload = app.jwt.verify(refreshToken) as { sub: string; role: RoleType; t: string };
  if (payload.t !== "refresh") {
    return reply.status(401).send({ message: "Invalid refresh token" });
  }

  const accessToken = app.jwt.sign({ sub: payload.sub, role: payload.role }, { expiresIn: "15m" });
  return reply.send({ accessToken });
});

app.get("/me", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    include: { adminPermissions: true }
  });
  if (!user) return reply.status(404).send({ message: "User not found" });
  return reply.send({ ...formatUser(user), permissions: user.adminPermissions });
});

app.post("/admin/permissions", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const actor = request.user as { sub: string; role: RoleType };
  if (actor.role !== RoleType.SUPER_ADMIN) {
    return reply.status(403).send({ message: "Only SuperAdmin can assign permissions" });
  }

  const body = z.object({
    userId: z.string(),
    key: z.string(),
    canRead: z.boolean().default(true),
    canWrite: z.boolean().default(false),
    canDelete: z.boolean().default(false)
  }).parse(request.body);

  const permission = await prisma.adminPermission.upsert({
    where: { userId_key: { userId: body.userId, key: body.key } },
    update: { canRead: body.canRead, canWrite: body.canWrite, canDelete: body.canDelete },
    create: {
      userId: body.userId,
      key: body.key,
      canRead: body.canRead,
      canWrite: body.canWrite,
      canDelete: body.canDelete
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.sub,
      action: "PERMISSION_UPDATED",
      resource: "AdminPermission",
      resourceId: permission.id
    }
  });

  return reply.send(permission);
});

app.get("/health", async () => ({ status: "ok", service: "auth-service" }));

const port = Number(process.env.AUTH_PORT ?? 4001);
await app.listen({ port, host: "0.0.0.0" });
