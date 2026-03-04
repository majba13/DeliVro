import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { z } from "zod";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

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

app.post("/send", { preHandler: (app as any).authenticate }, async (request, reply) => {
  const body = z.object({
    userId: z.string(),
    title: z.string(),
    message: z.string(),
    channel: z.enum(["EMAIL", "SMS", "PUSH", "IN_APP"]),
    email: z.string().email().optional()
  }).parse(request.body);

  const record = await prisma.notification.create({
    data: {
      userId: body.userId,
      title: body.title,
      message: body.message,
      channel: body.channel
    }
  });

  if (body.channel === "EMAIL" && body.email) {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: body.email,
      subject: body.title,
      text: body.message
    });
  }

  return reply.status(201).send(record);
});

app.get("/my", { preHandler: (app as any).authenticate }, async (request: any) => {
  const userId = request.user.sub as string;
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
});

app.get("/health", async () => ({ status: "ok", service: "notification-service" }));

const port = Number(process.env.NOTIFICATION_PORT ?? 4007);
await app.listen({ port, host: "0.0.0.0" });

