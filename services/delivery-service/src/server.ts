import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import { PrismaClient } from "@prisma/client";
import admin from "firebase-admin";
import { z } from "zod";

const DeliveryStatus = {
  ASSIGNED: "ASSIGNED",
  PICKED_UP: "PICKED_UP",
  ON_THE_WAY: "ON_THE_WAY",
  DELIVERED: "DELIVERED"
} as const;
type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

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
const sockets = new Map<string, Set<any>>();
const sseClients = new Map<string, Set<any>>();

let firebaseEnabled = false;
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_DATABASE_URL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    firebaseEnabled = true;
  }
} catch {
  firebaseEnabled = false;
}

const broadcastTracking = async (orderId: string, type: "status" | "location", payload: unknown) => {
  const room = sockets.get(orderId);
  room?.forEach((ws) => ws.send(JSON.stringify({ type, payload })));

  const sseRoom = sseClients.get(orderId);
  sseRoom?.forEach((reply) => reply.raw.write(`data: ${JSON.stringify({ type, payload })}\n\n`));

  if (firebaseEnabled) {
    await admin.database().ref(`tracking/${orderId}`).set({ type, payload, updatedAt: new Date().toISOString() });
  }
};

await app.register(cors, { origin: true, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? "dev-secret" });
await app.register(websocket);

app.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: "Unauthorized" });
  }
});

app.post("/assign", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const actor = request.user as { role: RoleType };
  if (!([RoleType.ADMIN, RoleType.SUPER_ADMIN] as string[]).includes(actor.role)) {
    return reply.status(403).send({ message: "Only admins can assign delivery" });
  }

  const body = z.object({ orderId: z.string(), deliveryManId: z.string(), etaMinutes: z.number().int().positive().optional() }).parse(request.body);
  const created = await prisma.delivery.upsert({
    where: { orderId: body.orderId },
    update: { deliveryManId: body.deliveryManId, etaMinutes: body.etaMinutes, status: DeliveryStatus.ASSIGNED },
    create: { orderId: body.orderId, deliveryManId: body.deliveryManId, etaMinutes: body.etaMinutes }
  });

  return reply.send(created);
});

app.patch("/:orderId/status", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { sub: string; role: RoleType };
  const { orderId } = request.params as { orderId: string };
  const body = z.object({ status: z.nativeEnum(DeliveryStatus), etaMinutes: z.number().int().positive().optional() }).parse(request.body);

  const delivery = await prisma.delivery.findUnique({ where: { orderId } });
  if (!delivery) return reply.status(404).send({ message: "Delivery not found" });

  const canUpdate = user.role === RoleType.SUPER_ADMIN || user.role === RoleType.ADMIN || delivery.deliveryManId === user.sub;
  if (!canUpdate) return reply.status(403).send({ message: "Not allowed" });

  const updated = await prisma.delivery.update({
    where: { orderId },
    data: {
      status: body.status,
      etaMinutes: body.etaMinutes,
      deliveredAt: body.status === DeliveryStatus.DELIVERED ? new Date() : undefined
    }
  });

  await broadcastTracking(orderId, "status", updated);
  return reply.send(updated);
});

app.post("/:orderId/location", { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const user = request.user as { sub: string; role: RoleType };
  const { orderId } = request.params as { orderId: string };
  const body = z.object({ lat: z.number(), lng: z.number(), etaMinutes: z.number().int().positive().optional() }).parse(request.body);

  const delivery = await prisma.delivery.findUnique({ where: { orderId } });
  if (!delivery) return reply.status(404).send({ message: "Delivery not found" });
  if (delivery.deliveryManId !== user.sub && !([RoleType.ADMIN, RoleType.SUPER_ADMIN] as string[]).includes(user.role)) {
    return reply.status(403).send({ message: "Not allowed" });
  }

  const updated = await prisma.delivery.update({
    where: { orderId },
    data: {
      currentLat: body.lat,
      currentLng: body.lng,
      etaMinutes: body.etaMinutes,
      lastTrackedAt: new Date(),
      status: DeliveryStatus.ON_THE_WAY
    }
  });

  await broadcastTracking(orderId, "location", updated);
  return reply.send(updated);
});

app.get("/track/:orderId", { websocket: true }, (socket, request) => {
  const { orderId } = request.params as { orderId: string };
  if (!sockets.has(orderId)) sockets.set(orderId, new Set());
  sockets.get(orderId)!.add(socket);

  socket.on("close", () => {
    sockets.get(orderId)?.delete(socket);
    if (sockets.get(orderId)?.size === 0) sockets.delete(orderId);
  });
});

app.get("/track-sse/:orderId", async (request, reply) => {
  const { orderId } = request.params as { orderId: string };
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  if (!sseClients.has(orderId)) sseClients.set(orderId, new Set());
  sseClients.get(orderId)?.add(reply);
  reply.raw.write(`data: ${JSON.stringify({ type: "connected", orderId })}\n\n`);

  request.raw.on("close", () => {
    sseClients.get(orderId)?.delete(reply);
    if (sseClients.get(orderId)?.size === 0) sseClients.delete(orderId);
  });
});

app.get("/health", async () => ({ status: "ok", service: "delivery-service" }));

const port = Number(process.env.DELIVERY_PORT ?? 4005);
await app.listen({ port, host: "0.0.0.0" });

