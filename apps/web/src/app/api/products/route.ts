/**
 * GET /api/products
 * Returns products with optional ?category= and ?q= filtering.
 * Falls back to an empty list — frontend uses its own demo data anyway.
 */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const q = searchParams.get("q");

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(category && category !== "All" ? { category: category as any } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        images: true,
        isActive: true,
        inventory: { select: { stock: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const result = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      category: p.category,
      imageUrl: p.images?.[0] ?? null,
      stock: p.inventory?.stock ?? 0,
    }));

    return NextResponse.json({ products: result });
  } catch {
    // If DB not available, return empty list — frontend uses demo data
    return NextResponse.json({ products: [] });
  }
}
