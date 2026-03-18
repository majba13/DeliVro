/**
 * GET  /api/shops          — list approved shops (public) or all (admin)
 * POST /api/shops          — shop owner creates a shop
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = [
  "FOOD", "GROCERIES", "MEDICINE", "EMERGENCY",
  "STATIONARY", "WEAR", "ELECTRONICS",
] as const;

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  category: z.enum(VALID_CATEGORIES),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  deliveryFee: z.number().min(0).default(0),
  minOrderAmt: z.number().min(0).default(0),
  address: z
    .object({
      line1: z.string().min(1),
      city: z.string().min(1),
      zip: z.string().optional(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const mine = searchParams.get("mine") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  // Decode token when available (admin listing + mine listing).
  const authHeader = req.headers.get("authorization");
  let authSub: string | null = null;
  let authRole: string | null = null;
  let isAdmin = false;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { jwtVerify } = await import("jose");
      const secret = new TextEncoder().encode(
        process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-in-production"
      );
      const { payload } = await jwtVerify(authHeader.slice(7), secret);
      authSub = payload.sub as string;
      authRole = payload["role"] as string;
      isAdmin = authRole === "SUPER_ADMIN" || authRole === "ADMIN";
    } catch {
      // ignore — treat as unauthenticated
    }
  }

  if (mine && !authSub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const showAll = isAdmin && searchParams.get("all") === "true";

  const where: Record<string, unknown> = {
    ...(mine
      ? { ownerId: authSub }
      : {
          isActive: true,
          ...(showAll ? {} : { isApproved: true }),
        }),
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [shops, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.shop.count({ where }),
  ]);

  return NextResponse.json({ shops, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const allowedRoles = ["SHOP_OWNER", "ADMIN", "SUPER_ADMIN"];
  if (!allowedRoles.includes(auth.role)) {
    return NextResponse.json(
      { message: "Only shop owners can create shops" },
      { status: 403 }
    );
  }

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { message: body.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Prevent duplicate shop names per owner
  const existing = await prisma.shop.findFirst({
    where: { ownerId: auth.sub, name: body.data.name },
  });
  if (existing) {
    return NextResponse.json(
      { message: "You already have a shop with that name" },
      { status: 409 }
    );
  }

  // Auto-approve for admins/super-admins
  const isAdmin = auth.role === "ADMIN" || auth.role === "SUPER_ADMIN";

  const slug = body.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const shop = await prisma.shop.create({
    data: {
      ownerId: auth.sub,
      name: body.data.name,
      slug,
      description: body.data.description ?? null,
      logo: body.data.logo ?? null,
      banner: body.data.banner ?? null,
      category: body.data.category as any,
      phone: body.data.phone ?? null,
      email: body.data.email ?? null,
      deliveryFee: body.data.deliveryFee,
      minOrderAmt: body.data.minOrderAmt,
      address: body.data.address ?? null,
      isApproved: isAdmin,
      isActive: true,
    },
  });

  return NextResponse.json({ shop }, { status: 201 });
}
