/**
 * DELETE /api/reviews/[id]
 * Owner can delete their own review; Admin/SuperAdmin can delete any.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ message: "Review not found" }, { status: 404 });
  }

  const adminRoles = ["SUPER_ADMIN", "ADMIN"];
  if (review.userId !== auth.sub && !adminRoles.includes(auth.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await prisma.review.delete({ where: { id } });

  // Recalculate aggregates
  if (review.productId) {
    prisma.review
      .aggregate({
        where: { productId: review.productId, isVisible: true },
        _avg: { rating: true },
        _count: true,
      })
      .then(({ _avg, _count }) =>
        prisma.product.update({
          where: { id: review.productId! },
          data: { avgRating: _avg.rating ?? 0, totalReviews: _count },
        })
      )
      .catch(() => {});
  }
  if (review.shopId) {
    prisma.review
      .aggregate({
        where: { shopId: review.shopId, isVisible: true },
        _avg: { rating: true },
        _count: true,
      })
      .then(({ _avg, _count }) =>
        prisma.shop.update({
          where: { id: review.shopId! },
          data: { avgRating: _avg.rating ?? 0, totalReviews: _count },
        })
      )
      .catch(() => {});
  }

  return NextResponse.json({ message: "Review deleted" });
}

/**
 * PATCH /api/reviews/[id]  — admin hide/show (isVisible toggle)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  if (!["SUPER_ADMIN", "ADMIN"].includes(auth.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const isVisible = typeof body.isVisible === "boolean" ? body.isVisible : true;

  const review = await prisma.review.update({
    where: { id },
    data: { isVisible },
  });

  return NextResponse.json({ review });
}
