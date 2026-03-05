/**
 * POST /api/ai/chat
 * Proxies to the AI service if available, otherwise handles locally.
 */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const FALLBACKS = [
  "I'm here to help! You can ask me about products, your orders, delivery status, or payment methods.",
  "Great question! For more specific help please visit our support section or browse our product catalog.",
  "I can help you find products, check order status, or answer questions about delivery and payment.",
];

const schema = z.object({
  message: z.string().min(1).max(500),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = schema.parse(await req.json());
    const msg = message.toLowerCase().trim();

    if (/\b(track|delivery|deliver|order status|where.*order)\b/.test(msg)) {
      return NextResponse.json({
        reply: "You can track any order in real-time at /tracking?orderId=YOUR_ORDER_ID. The page shows a live timeline and GPS updates.",
        intent: "tracking",
      });
    }

    if (/\b(pay|payment|bkash|nagad|rocket|stripe|cash on delivery|cod)\b/.test(msg)) {
      return NextResponse.json({
        reply: "DeliVro accepts: Stripe (card), bKash, Nagad, Rocket, and Cash on Delivery. Choose your preferred method at checkout.",
        intent: "payment",
      });
    }

    if (/\b(return|refund|cancel|exchange)\b/.test(msg)) {
      return NextResponse.json({
        reply: "Returns are accepted within 7 days of delivery for unopened items. Go to Orders → select order → Request Return.",
        intent: "return",
      });
    }

    if (/\b(ship|shipping|how long|when.*arrive|eta|estimate)\b/.test(msg)) {
      return NextResponse.json({
        reply: "Standard delivery is 1-3 business days. Express same-day delivery is available in select areas.",
        intent: "shipping",
      });
    }

    if (/\b(product|find|search|show|looking for|buy|price)\b/.test(msg)) {
      const keywords = msg.replace(/[^a-z0-9 ]/g, "").split(" ").filter((w) => w.length > 3);
      if (keywords.length) {
        try {
          const products = await prisma.product.findMany({
            where: {
              isActive: true,
              OR: keywords.slice(0, 3).map((kw) => ({ name: { contains: kw, mode: "insensitive" as const } })),
            },
            select: { name: true, price: true, category: true },
            take: 4,
          });
          if (products.length) {
            const list = products.map((p) => `• ${p.name} — $${Number(p.price).toFixed(2)} (${p.category})`).join("\n");
            return NextResponse.json({ reply: `Here's what I found:\n${list}\n\nVisit /products to browse more.`, intent: "search" });
          }
        } catch { /* fall through */ }
      }
    }

    if (/^(hi|hello|hey|howdy|good (morning|afternoon|evening))/.test(msg)) {
      return NextResponse.json({
        reply: "Hello! 👋 I'm DeliVro's AI assistant. I can help with products, orders, tracking, and payments. What can I do for you?",
        intent: "greeting",
      });
    }

    if (/\b(account|login|register|sign up|password)\b/.test(msg)) {
      return NextResponse.json({
        reply: "You can create an account or log in at /login. We support Customer, Shop Owner, and Delivery staff roles.",
        intent: "account",
      });
    }

    return NextResponse.json({
      reply: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)],
      intent: "general",
    });
  } catch {
    return NextResponse.json(
      { reply: "I'm having trouble right now. Please try again shortly.", intent: "error" },
      { status: 200 }
    );
  }
}
