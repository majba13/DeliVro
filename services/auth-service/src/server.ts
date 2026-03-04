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

const prisma = new PrismaClient();
const app = Fastify({ logger: true });
const otpStore = new Map<string, string>();

await app.register(cors, { origin: true, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, { max: 80, timeWindow: "1 minute" });
await app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? "dev-secret" });

app.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: "Unauthorized" });
  }
});

const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  password: z.string().min(8),
  role: z.nativeEnum(RoleType).optional()
}).refine((value) => value.email || value.phone, "Email or phone required");

app.post("/register", async (request, reply) => {
  const body = registerSchema.parse(request.body);
  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      phone: body.phone,
      passwordHash,
      role: body.role ?? RoleType.CUSTOMER
    }
  });

  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  otpStore.set(user.id, otp);
  return reply.status(201).send({ userId: user.id, verificationOtp: otp });
});

app.post("/verify", async (request, reply) => {
  const { userId, otp } = z.object({ userId: z.string(), otp: z.string().length(6) }).parse(request.body);
  if (otpStore.get(userId) !== otp) {
    return reply.status(400).send({ message: "Invalid OTP" });
  }

  await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  otpStore.delete(userId);
  return reply.send({ verified: true });
});

app.post("/oauth/google", async (request, reply) => {
  const { googleId, email } = z.object({ googleId: z.string().min(4), email: z.string().email() }).parse(request.body);
  const user = await prisma.user.upsert({
    where: { email },
    update: { googleId, isVerified: true },
    create: { email, googleId, isVerified: true, role: RoleType.CUSTOMER }
  });

  const accessToken = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "15m" });
  const refreshToken = app.jwt.sign({ sub: user.id, role: user.role, t: "refresh" }, { expiresIn: "7d" });
  return reply.send({ accessToken, refreshToken, user });
});

app.post("/login", async (request, reply) => {
  const body = z.object({ identity: z.string(), password: z.string().min(8) }).parse(request.body);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: body.identity }, { phone: body.identity }],
      isActive: true
    }
  });

  if (!user || !user.passwordHash) {
    return reply.status(401).send({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(body.password, user.passwordHash);
  if (!isValid) {
    return reply.status(401).send({ message: "Invalid credentials" });
  }

  const accessToken = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "15m" });
  const refreshToken = app.jwt.sign({ sub: user.id, role: user.role, t: "refresh" }, { expiresIn: "7d" });
  return reply.send({ accessToken, refreshToken, user });
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

app.get("/me", { preHandler: (app as any).authenticate }, async (request: any) => {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    include: { adminPermissions: true }
  });
  return { user };
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
