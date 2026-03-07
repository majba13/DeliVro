/**
 * GET  /api/cart   — get the authenticated user's cart with product details
 * POST /api/cart   — add or increment an item  { productId, quantity? }
 * DELETE /api/cart — clear the entire cart
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const items = await prisma.cartItem.findMany({
    where: { userId: auth.sub },
    include: {
      product: { select: { id: true, name: true, price: true, images: true, category: true, isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return NextResponse.json({ items, totalPrice });
}

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const body = addSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { productId, quantity } = body.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  // Upsert: if already in cart, increment quantity
  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: auth.sub, productId } },
  });

  let item;
  if (existing) {
    item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity, price: product.price, updatedAt: new Date() },
      include: { product: { select: { id: true, name: true, price: true, images: true } } },
    });
  } else {
    item = await prisma.cartItem.create({
      data: { userId: auth.sub, productId, quantity, price: product.price },
      include: { product: { select: { id: true, name: true, price: true, images: true } } },
    });
  }

  return NextResponse.json({ item }, { status: existing ? 200 : 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  await prisma.cartItem.deleteMany({ where: { userId: auth.sub } });
  return new NextResponse(null, { status: 204 });
}
