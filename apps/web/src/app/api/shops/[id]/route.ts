/**
 * GET    /api/shops/[id]   — get shop detail + products
 * PATCH  /api/shops/[id]   — owner updates shop info, admin approves/rejects
 * DELETE /api/shops/[id]   — owner/admin deactivates shop
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      products: {
        where: { isActive: true },
        include: { inventory: { select: { stock: true } } },
        take: 50,
        orderBy: { createdAt: "desc" },
      },
      reviews: {
        where: { isVisible: true },
        include: { user: { select: { id: true, name: true } } },
        take: 20,
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { products: true, reviews: true } },
    },
  });

  if (!shop) return NextResponse.json({ message: "Shop not found" }, { status: 404 });

  return NextResponse.json({ shop });
}

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  logo: z.string().url().optional().nullable(),
  banner: z.string().url().optional().nullable(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  deliveryFee: z.number().min(0).optional(),
  minOrderAmt: z.number().min(0).optional(),
  address: z.object({ line1: z.string(), city: z.string(), zip: z.string().optional() }).optional(),
  // Admin-only
  isApproved: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const shop = await prisma.shop.findUnique({ where: { id } });
  if (!shop) return NextResponse.json({ message: "Shop not found" }, { status: 404 });

  const isAdmin = auth.role === "SUPER_ADMIN" || auth.role === "ADMIN";
  const isOwner = shop.ownerId === auth.sub;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message }, { status: 400 });
  }

  // Only admins can change approval/active status
  const data: Record<string, unknown> = { ...body.data };
  if (!isAdmin) {
    delete data.isApproved;
    delete data.isActive;
  }

  const updated = await prisma.shop.update({ where: { id }, data });
  return NextResponse.json({ shop: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const shop = await prisma.shop.findUnique({ where: { id } });
  if (!shop) return NextResponse.json({ message: "Shop not found" }, { status: 404 });

  const isAdmin = auth.role === "SUPER_ADMIN" || auth.role === "ADMIN";
  const isOwner = shop.ownerId === auth.sub;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Soft-delete: deactivate rather than destroy
  await prisma.shop.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ message: "Shop deactivated" });
}
