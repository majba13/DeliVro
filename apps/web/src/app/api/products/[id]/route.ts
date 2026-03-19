/**
 * GET    /api/products/[id]  — get a single product with full details
 * PATCH  /api/products/[id]  — update (owner / admin)
 * DELETE /api/products/[id]  — soft-delete (owner / admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { validateRealisticProduct } from "@/lib/realDataValidation";

const VALID_CATEGORIES = [
  "FOOD", "GROCERIES", "MEDICINE", "EMERGENCY",
  "STATIONARY", "WEAR", "ELECTRONICS",
] as const;

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(5).max(2000).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  price: z.number().positive().optional(),
  discount: z.number().min(0).max(100).nullable().optional(),
  unit: z.string().max(30).nullable().optional(),
  stock: z.number().int().nonnegative().optional(),
  images: z.array(z.string().url()).max(8).optional(),
  tags: z.array(z.string()).max(10).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      inventory: true,
      shop: { select: { id: true, name: true, logo: true, category: true } },
      reviews: {
        where: { isVisible: true },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      owner: { select: { id: true, name: true } },
    },
  });

  if (!product || !product.isActive) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const canManage =
    ["SUPER_ADMIN", "ADMIN"].includes(auth.role) || product.ownerId === auth.sub;
  if (!canManage) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (body.data.name || body.data.description || body.data.tags) {
    const productInputIssue = validateRealisticProduct({
      name: body.data.name ?? product.name,
      description: body.data.description ?? product.description,
      tags: body.data.tags ?? product.tags,
    });
    if (productInputIssue) {
      return NextResponse.json({ message: productInputIssue }, { status: 422 });
    }
  }

  const { stock, ...rest } = body.data;

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...rest,
      ...(rest.category ? { category: rest.category as any } : {}),
      ...(stock !== undefined
        ? { inventory: { upsert: { create: { stock }, update: { stock } } } }
        : {}),
    },
    include: { inventory: true },
  });

  return NextResponse.json({ product: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const canManage =
    ["SUPER_ADMIN", "ADMIN"].includes(auth.role) || product.ownerId === auth.sub;
  if (!canManage) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Soft delete
  await prisma.product.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ message: "Product deactivated" });
}
