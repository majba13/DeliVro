import "dotenv/config";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import csrfProtection from "@fastify/csrf-protection";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import proxy from "@fastify/http-proxy";

const app = Fastify({ logger: true });

await app.register(cookie);
await app.register(cors, { origin: true, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
await app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? "dev-secret" });
await app.register(csrfProtection, { cookieOpts: { signed: false, sameSite: "lax", httpOnly: true, secure: false } });

app.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: "Unauthorized" });
  }
});

app.get("/health", async () => ({ status: "ok", service: "api-gateway" }));
app.get("/csrf-token", async (request, reply) => reply.send({ csrfToken: reply.generateCsrf() }));

const serviceMap = {
  auth: process.env.AUTH_SERVICE_URL ?? "http://localhost:4001",
  products: process.env.PRODUCT_SERVICE_URL ?? "http://localhost:4002",
  orders: process.env.ORDER_SERVICE_URL ?? "http://localhost:4003",
  payments: process.env.PAYMENT_SERVICE_URL ?? "http://localhost:4004",
  delivery: process.env.DELIVERY_SERVICE_URL ?? "http://localhost:4005",
  ai: process.env.AI_SERVICE_URL ?? "http://localhost:4006",
  notifications: process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:4007"
};

await app.register(proxy, {
  upstream: serviceMap.auth,
  prefix: "/api/auth"
});

for (const [prefix, upstream] of Object.entries(serviceMap)) {
  if (prefix === "auth") continue;
  await app.register(proxy, {
    upstream,
    prefix: `/api/${prefix}`
  });
}

const port = Number(process.env.GATEWAY_PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });

