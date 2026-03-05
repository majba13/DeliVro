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

/* ------------------------------------------------------------------ */
/* AI Chat / Customer Assistant                                         */
/* ------------------------------------------------------------------ */
const CHAT_FALLBACKS = [
  "I'm here to help! You can ask me about products, your orders, delivery status, or payment methods.",
  "Great question! For more specific help please visit our support section or browse our product catalog.",
  "I can help you find products, check order status, or answer questions about delivery and payment."
];

app.post("/chat", async (request) => {
  const { message, userId } = z.object({
    message: z.string().min(1).max(500),
    userId: z.string().optional()
  }).parse(request.body);

  const msg = message.toLowerCase().trim();

  /* Order / delivery tracking */
  if (/\b(track|delivery|deliver|order status|where.*order|order.*where)\b/.test(msg)) {
    return {
      reply: "You can track any order in real-time at /tracking?orderId=YOUR_ORDER_ID. The page shows a live timeline and GPS updates.",
      intent: "tracking"
    };
  }

  /* Payment / mobile banking */
  if (/\b(pay|payment|bkash|nagad|rocket|stripe|cash on delivery|cod)\b/.test(msg)) {
    return {
      reply: "DeliVro accepts: Stripe (card), bKash, Nagad, Rocket, and Cash on Delivery. Choose your preferred method at checkout.",
      intent: "payment"
    };
  }

  /* Return / refund */
  if (/\b(return|refund|cancel|exchange)\b/.test(msg)) {
    return {
      reply: "Returns are accepted within 7 days of delivery for unopened items. Go to your Orders page → select order → Request Return.",
      intent: "return"
    };
  }

  /* Shipping / timing */
  if (/\b(ship|shipping|how long|when.*arrive|arrival|eta|estimate)\b/.test(msg)) {
    return {
      reply: "Standard delivery is 1-3 business days. Express same-day delivery is available in select areas. You'll see the estimate at checkout.",
      intent: "shipping"
    };
  }

  /* Product search */
  const keywords = msg.replace(/[^a-z0-9 ]/g, "").split(" ").filter((w) => w.length > 3);
  if (keywords.length && /\b(product|find|search|show|looking for|have|sell|buy|price)\b/.test(msg)) {
    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: keywords.slice(0, 3).map((kw) => ({ name: { contains: kw, mode: "insensitive" as const } }))
        },
        select: { name: true, price: true, category: true },
        take: 4
      });
      if (products.length) {
        const list = products.map((p) => `• ${p.name} — $${Number(p.price).toFixed(2)} (${p.category})`).join("\n");
        return { reply: `Here's what I found:\n${list}\n\nVisit /products to see the full catalog.`, intent: "search" };
      }
    } catch {
      /* fall through to generic reply */
    }
  }

  /* Recommendations for logged-in user */
  if (userId && /\b(recommend|suggest|what.*buy|popular|trending|best)\b/.test(msg)) {
    try {
      const top = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: { name: true, price: true, category: true },
        take: 3
      });
      if (top.length) {
        const list = top.map((p) => `• ${p.name} — $${Number(p.price).toFixed(2)}`).join("\n");
        return { reply: `Here are some popular picks for you:\n${list}`, intent: "recommendations" };
      }
    } catch {
      /* fall through */
    }
  }

  /* Account / login */
  if (/\b(account|login|register|sign up|sign in|password|email)\b/.test(msg)) {
    return {
      reply: "You can create an account or log in at /login. Customer, Shop Owner, and Delivery staff all have dedicated portals.",
      intent: "account"
    };
  }

  /* Greeting */
  if (/^(hi|hello|hey|howdy|good morning|good afternoon|good evening|greetings)/.test(msg)) {
    return {
      reply: "Hello! 👋 I'm DeliVro's AI assistant. I can help with products, orders, tracking, and payments. What can I do for you?",
      intent: "greeting"
    };
  }

  return {
    reply: CHAT_FALLBACKS[Math.floor(Math.random() * CHAT_FALLBACKS.length)],
    intent: "general"
  };
});

const port = Number(process.env.AI_PORT ?? 4006);
await app.listen({ port, host: "0.0.0.0" });

