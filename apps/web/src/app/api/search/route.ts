/**
 * GET /api/search
 * Full-text search across products and shops.
 *
 * Query params:
 *   q         — search string (required, min 1 char)
 *   type      — "products" | "shops" | "all"  (default "all")
 *   category  — filter by category (optional)
 *   limit     — max results per type, default 10
 *
 * Returns: { products: [...], shops: [...], total: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type") ?? "all";
  const category = searchParams.get("category") ?? undefined;
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "10")));

  if (!q) {
    return NextResponse.json({ products: [], shops: [], total: 0 });
  }

  const queryFilter = {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ],
  };

  const categoryFilter = category ? { category: category as any } : {};

  const [products, shops] = await Promise.all([
    type === "shops"
      ? Promise.resolve([])
      : prisma.product.findMany({
          where: {
            isActive: true,
            ...queryFilter,
            ...categoryFilter,
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discount: true,
            unit: true,
            category: true,
            images: true,
            avgRating: true,
            totalReviews: true,
            shop: { select: { id: true, name: true } },
          },
          orderBy: [{ avgRating: "desc" }, { createdAt: "desc" }],
          take: limit,
        }),
    type === "products"
      ? Promise.resolve([])
      : prisma.shop.findMany({
          where: {
            isApproved: true,
            isActive: true,
            ...categoryFilter,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            logo: true,
            avgRating: true,
            totalReviews: true,
            deliveryFee: true,
            _count: { select: { products: true } },
          },
          orderBy: [{ avgRating: "desc" }, { createdAt: "desc" }],
          take: limit,
        }),
  ]);

  return NextResponse.json({
    products,
    shops,
    total: products.length + shops.length,
    query: q,
  });
}
