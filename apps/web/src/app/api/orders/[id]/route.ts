/**
 * GET    /api/orders/[id] — get a single order with full details
 * PATCH  /api/orders/[id] — update order status { status: OrderStatus }
 *   Allowed: ShopOwner (own orders), Admin/SuperAdmin (any), Customer (CANCEL only)
 * DELETE /api/orders/[id] — cancel an order (customer, PENDING only)
 */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

const prisma = new PrismaClient();

const VALID_STATUSES = [
  "PENDING", "CONFIRMED", "PREPARING",
  "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED",
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, description: true, images: true, category: true } },
        },
      },
      payment: true,
      delivery: {
        include: {
          deliveryMan: { select: { id: true, name: true, phone: true } },
        },
      },
      customer: { select: { id: true, name: true, email: true, phone: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const adminRoles = ["SUPER_ADMIN", "ADMIN"];
  const isAdmin = adminRoles.includes(auth.role);
  const isCustomer = order.customerId === auth.sub;
  const isOwner = order.ownerId === auth.sub;

  if (!isAdmin && !isCustomer && !isOwner) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ order });
}

const patchSchema = z.object({
  status: z.enum(VALID_STATUSES),
  estimatedMinutes: z.number().int().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const adminRoles = ["SUPER_ADMIN", "ADMIN"];
  const isAdmin = adminRoles.includes(auth.role);
  const isOwner = order.ownerId === auth.sub && auth.role === "SHOP_OWNER";

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message ?? "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      status: body.data.status,
      ...(body.data.estimatedMinutes ? { estimatedMinutes: body.data.estimatedMinutes } : {}),
    },
  });

  // Notify the customer about the status change
  await prisma.notification.create({
    data: {
      userId: order.customerId,
      title: "Order Update",
      message: `Your order #${order.id.slice(-6).toUpperCase()} is now ${body.data.status.replace(/_/g, " ")}.`,
      channel: "in_app",
      payload: { orderId: order.id, status: body.data.status },
    },
  });

  return NextResponse.json({ order: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  // Only customer who placed it can cancel, and only while PENDING
  if (order.customerId !== auth.sub) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json({ message: "Only PENDING orders can be cancelled" }, { status: 400 });
  }

  await prisma.order.update({ where: { id: params.id }, data: { status: "CANCELLED" } });
  return new NextResponse(null, { status: 204 });
}
