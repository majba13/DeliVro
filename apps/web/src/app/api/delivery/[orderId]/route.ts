/**
 * GET   /api/delivery/[orderId] — get delivery record + latest GPS pings
 * PATCH /api/delivery/[orderId] — delivery man updates status
 *   Body: { status: DeliveryStatus, etaMinutes?: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const DELIVERY_STATUSES = ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { orderId } = await params;

  const delivery = await prisma.delivery.findUnique({
    where: { orderId },
    include: {
      deliveryMan: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, customerId: true, ownerId: true, status: true, deliveryAddress: true } },
    },
  });

  if (!delivery) return NextResponse.json({ message: "Delivery not found" }, { status: 404 });

  const adminRoles = ["SUPER_ADMIN", "ADMIN"];
  const isAdmin = adminRoles.includes(auth.role);
  const isCustomer = delivery.order.customerId === auth.sub;
  const isDeliveryMan = delivery.deliveryManId === auth.sub;
  const isOwner = delivery.order.ownerId === auth.sub;

  if (!isAdmin && !isCustomer && !isDeliveryMan && !isOwner) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Last 50 GPS pings for live map
  const pings = await prisma.deliveryLocation.findMany({
    where: { orderId },
    orderBy: { recordedAt: "desc" },
    take: 50,
    select: { latitude: true, longitude: true, speed: true, heading: true, recordedAt: true },
  });

  return NextResponse.json({ delivery, pings: pings.reverse() });
}

const patchSchema = z.object({
  status: z.enum(DELIVERY_STATUSES),
  etaMinutes: z.number().int().min(1).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { orderId } = await params;

  const delivery = await prisma.delivery.findUnique({
    where: { orderId },
    include: { order: { select: { customerId: true } } },
  });
  if (!delivery) return NextResponse.json({ message: "Delivery not found" }, { status: 404 });

  // Only the assigned delivery man or admin can update
  const adminRoles = ["SUPER_ADMIN", "ADMIN"];
  if (!adminRoles.includes(auth.role) && delivery.deliveryManId !== auth.sub) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const now = new Date();
  const updated = await prisma.delivery.update({
    where: { orderId },
    data: {
      status: body.data.status,
      ...(body.data.etaMinutes ? { etaMinutes: body.data.etaMinutes } : {}),
      ...(body.data.lat != null ? { currentLat: body.data.lat } : {}),
      ...(body.data.lng != null ? { currentLng: body.data.lng } : {}),
      lastTrackedAt: now,
      ...(body.data.status === "DELIVERED" ? { deliveredAt: now } : {}),
      updatedAt: now,
    },
  });

  // Sync order status when delivered
  if (body.data.status === "DELIVERED") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });
  } else if (body.data.status === "ON_THE_WAY" || body.data.status === "PICKED_UP") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "OUT_FOR_DELIVERY" } });
  }

  // Notify customer
  await prisma.notification.create({
    data: {
      userId: delivery.order.customerId,
      title: "Delivery Update",
      message: `Your order is now: ${body.data.status.replace(/_/g, " ")}${
        body.data.etaMinutes ? `. ETA: ${body.data.etaMinutes} mins` : ""
      }`,
      channel: "in_app",
      payload: { orderId, status: body.data.status },
    },
  });

  return NextResponse.json({ delivery: updated });
}
