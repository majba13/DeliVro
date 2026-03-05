/**
 * GET  /api/orders — list orders
 *   Customer: own orders only
 *   ShopOwner: orders for their products
 *   Admin/SuperAdmin: all orders
 *   Query: ?status=PENDING&page=1&limit=20
 *
 * POST /api/orders — place a new order from the user's cart
 *   Body: { deliveryAddress: { street, city, zip, country } }
 */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const adminRoles = ["SUPER_ADMIN", "ADMIN"];
  const isAdmin = adminRoles.includes(auth.role);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (!isAdmin) {
    if (auth.role === "SHOP_OWNER") {
      where.ownerId = auth.sub;
    } else {
      where.customerId = auth.sub;
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
          },
        },
        payment: { select: { id: true, method: true, status: true, amount: true } },
        delivery: { select: { id: true, status: true, etaMinutes: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().optional(),
  country: z.string().default("Bangladesh"),
});

const placeOrderSchema = z.object({
  deliveryAddress: addressSchema,
  ownerId: z.string().optional(), // If omitted, derived from first cart item's product owner
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const body = placeOrderSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Load cart
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: auth.sub },
    include: {
      product: { select: { id: true, price: true, isActive: true, ownerId: true, inventory: true } },
    },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
  }

  // Verify all products are active
  const inactiveItem = cartItems.find((ci) => !ci.product.isActive);
  if (inactiveItem) {
    return NextResponse.json({ message: "One or more products are no longer available" }, { status: 400 });
  }

  // Determine owner from first cart item if not explicitly supplied
  const ownerId = body.data.ownerId ?? cartItems[0]!.product.ownerId;

  // Calculate totals
  const subtotal = cartItems.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);
  const deliveryFee = 50; // Fixed BDT 50 — can be dynamic later
  const total = subtotal + deliveryFee;

  // Create order with items, then clear cart — in a transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        customerId: auth.sub,
        ownerId,
        subtotal,
        deliveryFee,
        total,
        deliveryAddress: body.data.deliveryAddress,
        items: {
          create: cartItems.map((ci) => ({
            productId: ci.productId,
            quantity: ci.quantity,
            unitPrice: ci.price,
          })),
        },
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, images: true } } },
        },
      },
    });

    // Clear cart after order placed
    await tx.cartItem.deleteMany({ where: { userId: auth.sub } });

    // Create an in-app notification for the customer
    await tx.notification.create({
      data: {
        userId: auth.sub,
        title: "Order Placed!",
        message: `Your order #${newOrder.id.slice(-6).toUpperCase()} has been placed successfully.`,
        channel: "in_app",
        payload: { orderId: newOrder.id },
      },
    });

    return newOrder;
  });

  return NextResponse.json({ order }, { status: 201 });
}
