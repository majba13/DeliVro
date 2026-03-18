/**
 * GET  /api/reviews  — list reviews for a product or shop
 *   ?productId=xxx  or  ?shopId=xxx  (one required)
 *   ?page=1&limit=20
 *
 * POST /api/reviews  — create a review (auth required, must have a delivered order)
 *   Body: { productId?, shopId?, rating, comment?, images? }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  productId: z.string().optional(),
  shopId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
}).refine((d) => d.productId ?? d.shopId, {
  message: "productId or shopId is required",
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId") ?? undefined;
  const shopId = searchParams.get("shopId") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  if (!productId && !shopId) {
    return NextResponse.json({ message: "productId or shopId is required" }, { status: 400 });
  }

  const where = {
    isVisible: true,
    ...(productId ? { productId } : {}),
    ...(shopId ? { shopId } : {}),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({ reviews, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { productId, shopId, rating, comment, images } = body.data;

  // Verify user has a delivered order involving this product (anti-spam guard)
  if (productId) {
    const orderWithProduct = await prisma.order.findFirst({
      where: {
        customerId: auth.sub,
        status: "DELIVERED",
        items: { some: { productId } },
      },
    });
    if (!orderWithProduct) {
      return NextResponse.json(
        { message: "You can only review products from delivered orders" },
        { status: 403 }
      );
    }
  }

  // Prevent duplicate review for same product/shop by same user
  const existing = await prisma.review.findFirst({
    where: {
      userId: auth.sub,
      ...(productId ? { productId } : {}),
      ...(shopId ? { shopId } : {}),
    },
  });
  if (existing) {
    return NextResponse.json({ message: "You have already reviewed this item" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      userId: auth.sub,
      productId: productId ?? null,
      shopId: shopId ?? null,
      rating,
      comment: comment ?? null,
      images: images ?? [],
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Update aggregate stats in background (non-blocking)
  if (productId) {
    prisma.review
      .aggregate({ where: { productId, isVisible: true }, _avg: { rating: true }, _count: true })
      .then(({ _avg, _count }) =>
        prisma.product.update({
          where: { id: productId },
          data: { avgRating: _avg.rating ?? 0, totalReviews: _count },
        })
      )
      .catch(() => {});
  }
  if (shopId) {
    prisma.review
      .aggregate({ where: { shopId, isVisible: true }, _avg: { rating: true }, _count: true })
      .then(({ _avg, _count }) =>
        prisma.shop.update({
          where: { id: shopId },
          data: { avgRating: _avg.rating ?? 0, totalReviews: _count },
        })
      )
      .catch(() => {});
  }

  return NextResponse.json({ review }, { status: 201 });
}
