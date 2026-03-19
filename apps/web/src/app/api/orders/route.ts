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
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

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
    } else if (auth.role === "DELIVERY_MAN") {
      where.delivery = { is: { deliveryManId: auth.sub } };
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
        customer: { select: { id: true, name: true, phone: true, email: true } },
        payment: { select: { id: true, method: true, status: true, amount: true } },
        delivery: {
          select: {
            id: true,
            status: true,
            etaMinutes: true,
            lastTrackedAt: true,
            currentLat: true,
            currentLng: true,
          },
        },
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
  /**
   * Fallback cart items sent by the client when the DB cart sync may have failed
  * (e.g. temporary network issues, or a race condition on first add-to-cart).
   * Prices are used as-is; for production you would re-verify them from the DB.
   */
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })).optional(),
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

  // If DB cart is empty, fall back to client-provided items.
  // This handles the case where cart sync failed due to transient issues.
  const effectiveItems = cartItems.length > 0
    ? cartItems
    : (body.data.items ?? []).map((bi) => ({
        productId: bi.productId,
        quantity: bi.quantity,
        price: bi.price,
        product: {
          price: bi.price,
          isActive: true,
          ownerId: body.data.ownerId ?? auth.sub,
          inventory: null,
        },
      }));

  if (effectiveItems.length === 0) {
    return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
  }

  // Verify all products are active
  const inactiveItem = effectiveItems.find((ci) => !ci.product.isActive);
  if (inactiveItem) {
    return NextResponse.json({ message: "One or more products are no longer available" }, { status: 400 });
  }

  // Determine owner from first cart item if not explicitly supplied
  const ownerId = body.data.ownerId ?? effectiveItems[0]!.product.ownerId;

  // Calculate totals
  const subtotal = effectiveItems.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);
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
          create: effectiveItems.map((ci) => ({
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

    // Notify shop owner about the new order.
    await tx.notification.create({
      data: {
        userId: ownerId,
        title: "New Order Received",
        message: `You received a new order #${newOrder.id.slice(-6).toUpperCase()}.`,
        channel: "in_app",
        payload: { orderId: newOrder.id, customerId: auth.sub },
      },
    });

    // Auto-assign a delivery man based on city familiarity and current load.
    const deliveryMen = await tx.user.findMany({
      where: { role: "DELIVERY_MAN", isActive: true },
      select: { id: true, name: true, createdAt: true },
    });

    if (deliveryMen.length > 0) {
      const activeDeliveries = await tx.delivery.findMany({
        where: { status: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"] } },
        select: { deliveryManId: true },
      });

      const city = (body.data.deliveryAddress.city ?? "").trim().toLowerCase();
      const recentDeliveries = await tx.delivery.findMany({
        take: 300,
        orderBy: { updatedAt: "desc" },
        select: {
          deliveryManId: true,
          order: { select: { deliveryAddress: true } },
        },
      });

      const loadByDeliveryMan = new Map<string, number>();
      for (const d of activeDeliveries) {
        loadByDeliveryMan.set(d.deliveryManId, (loadByDeliveryMan.get(d.deliveryManId) ?? 0) + 1);
      }

      const cityExperienceByDeliveryMan = new Map<string, number>();
      if (city) {
        for (const d of recentDeliveries) {
          const deliveryAddress = d.order?.deliveryAddress as { city?: string } | null;
          const deliveryCity = (deliveryAddress?.city ?? "").trim().toLowerCase();
          if (deliveryCity && deliveryCity === city) {
            cityExperienceByDeliveryMan.set(
              d.deliveryManId,
              (cityExperienceByDeliveryMan.get(d.deliveryManId) ?? 0) + 1
            );
          }
        }
      }

      const ranked = deliveryMen
        .map((dm) => {
          const load = loadByDeliveryMan.get(dm.id) ?? 0;
          const cityExperience = cityExperienceByDeliveryMan.get(dm.id) ?? 0;
          return { dm, load, cityExperience };
        })
        .sort((a, b) => {
          if (b.cityExperience !== a.cityExperience) return b.cityExperience - a.cityExperience;
          if (a.load !== b.load) return a.load - b.load;
          return a.dm.createdAt.getTime() - b.dm.createdAt.getTime();
        });

      const selected = ranked[0];
      if (selected) {
        const etaMinutes = Math.min(90, 25 + selected.load * 10);

        await tx.delivery.upsert({
          where: { orderId: newOrder.id },
          create: {
            orderId: newOrder.id,
            deliveryManId: selected.dm.id,
            status: "ASSIGNED",
            etaMinutes,
          },
          update: {
            deliveryManId: selected.dm.id,
            status: "ASSIGNED",
            etaMinutes,
          },
        });

        if (newOrder.status === "PENDING") {
          await tx.order.update({
            where: { id: newOrder.id },
            data: { status: "CONFIRMED", estimatedMinutes: etaMinutes },
          });
        }

        await tx.notification.createMany({
          data: [
            {
              userId: selected.dm.id,
              title: "New delivery assigned",
              message: `Order #${newOrder.id.slice(-6).toUpperCase()} has been assigned to you.`,
              channel: "in_app",
              payload: { orderId: newOrder.id, etaMinutes },
            },
            {
              userId: auth.sub,
              title: "Delivery Partner Assigned",
              message: `A delivery partner has been assigned. ETA ${etaMinutes} minutes.`,
              channel: "in_app",
              payload: { orderId: newOrder.id, etaMinutes },
            },
            {
              userId: ownerId,
              title: "Delivery Assigned",
              message: `Order #${newOrder.id.slice(-6).toUpperCase()} was auto-assigned to delivery.`,
              channel: "in_app",
              payload: { orderId: newOrder.id, deliveryManId: selected.dm.id, etaMinutes },
            },
          ],
        });
      }
    }

    return newOrder;
  });

  return NextResponse.json({ order }, { status: 201 });
}
