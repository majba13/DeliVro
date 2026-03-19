/**
 * GET  /api/products — list products with filters
 *   ?category=  ?q=  ?shopId=  ?page=  ?limit=  ?sort=price_asc|price_desc|rating|newest
 *
 * POST /api/products — create a product (SHOP_OWNER, ADMIN, SUPER_ADMIN)
 *   Body: { name, description, category, price, discount?, unit?, stock, shopId?, images?, tags? }
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

/** Map UI display category → Prisma enum value */
const CATEGORY_RAW: Record<string, string> = {
  Food: "FOOD",
  Groceries: "GROCERIES",
  Stationary: "STATIONARY",
  Medicine: "MEDICINE",
  Wear: "WEAR",
  Electronics: "ELECTRONICS",
  Emergency: "EMERGENCY",
};

/** Map Prisma enum value → UI display category */
const CATEGORY_DISPLAY: Record<string, string> = {
  FOOD: "Food",
  GROCERIES: "Groceries",
  STATIONARY: "Stationary",
  MEDICINE: "Medicine",
  WEAR: "Wear",
  ELECTRONICS: "Electronics",
  EMERGENCY: "Emergency",
};

const SORT_MAP: Record<string, object> = {
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  rating: { avgRating: "desc" },
  newest: { createdAt: "desc" },
};

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(5).max(2000),
  category: z.enum(VALID_CATEGORIES),
  price: z.number().positive(),
  discount: z.number().min(0).max(100).optional(),
  unit: z.string().max(30).optional(),
  stock: z.number().int().nonnegative().default(0),
  shopId: z.string().optional(),
  images: z.array(z.string().url()).max(8).default([]),
  tags: z.array(z.string()).max(10).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const q = searchParams.get("q");
    const shopId = searchParams.get("shopId") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const sort = searchParams.get("sort") ?? "newest";

    const rawCategory =
      category && category !== "All"
        ? (CATEGORY_RAW[category] ?? category)
        : undefined;

    const orderBy = (SORT_MAP[sort] ?? SORT_MAP.newest) as any;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(rawCategory ? { category: rawCategory as any } : {}),
        ...(shopId ? { shopId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { tags: { has: q } },
              ],
            }
          : {}),
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
        tags: true,
        isActive: true,
        avgRating: true,
        totalReviews: true,
        shopId: true,
        shop: { select: { id: true, name: true } },
        inventory: { select: { stock: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    const result = products.map((p) => ({
      ...p,
      price: Number(p.price),
      category: CATEGORY_DISPLAY[p.category] ?? p.category,
      imageUrl: p.images?.[0] ?? null,
      inStock: (p.inventory?.stock ?? 0) > 0,
      stock: p.inventory?.stock ?? 0,
    }));

    const total = await prisma.product.count({
      where: {
        isActive: true,
        ...(rawCategory ? { category: rawCategory as any } : {}),
        ...(shopId ? { shopId } : {}),
      },
    });

    return NextResponse.json({ products: result, total, page, limit });
  } catch {
    return NextResponse.json({ products: [], total: 0 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const allowedRoles = ["SHOP_OWNER", "ADMIN", "SUPER_ADMIN"];
  if (!allowedRoles.includes(auth.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, description, category, price, discount, unit, stock, shopId, images, tags } = body.data;

  const productInputIssue = validateRealisticProduct({ name, description, tags });
  if (productInputIssue) {
    return NextResponse.json({ message: productInputIssue }, { status: 422 });
  }

  // Shop owners can only add products to their own shop
  if (auth.role === "SHOP_OWNER" && shopId) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.ownerId !== auth.sub) {
      return NextResponse.json({ message: "You do not own this shop" }, { status: 403 });
    }
  }

  const product = await prisma.product.create({
    data: {
      ownerId: auth.sub,
      shopId: shopId ?? null,
      name,
      description,
      category: category as any,
      price,
      discount: discount ?? null,
      unit: unit ?? null,
      images,
      tags,
      inventory: { create: { stock } },
    },
    include: { inventory: true },
  });

  return NextResponse.json({ product }, { status: 201 });
}
