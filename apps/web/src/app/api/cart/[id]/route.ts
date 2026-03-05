/**
 * PATCH  /api/cart/[id] — update quantity  { quantity: number }
 * DELETE /api/cart/[id] — remove one cart item
 */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

const prisma = new PrismaClient();

const patchSchema = z.object({ quantity: z.number().int().min(1) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const item = await prisma.cartItem.findUnique({ where: { id } });
  if (!item || item.userId !== auth.sub) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.cartItem.update({
    where: { id },
    data: { quantity: body.data.quantity, updatedAt: new Date() },
    include: { product: { select: { id: true, name: true, price: true, images: true } } },
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const item = await prisma.cartItem.findUnique({ where: { id } });
  if (!item || item.userId !== auth.sub) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await prisma.cartItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
