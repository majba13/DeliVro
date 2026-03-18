/**
 * POST /api/delivery/assign
 * Admin assigns a delivery man to an order.
 * Body: { orderId, deliveryManId, etaMinutes? }
 *
 * Creates or updates the Delivery record and starts the order moving to CONFIRMED.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const assignSchema = z.object({
  orderId: z.string().min(1),
  deliveryManId: z.string().min(1),
  etaMinutes: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, "SUPER_ADMIN", "ADMIN");
  if (isAuthError(auth)) return auth;

  const body = assignSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { orderId, deliveryManId, etaMinutes } = body.data;

  // Verify the order exists
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  // Verify the delivery man is a real user with the right role
  const deliveryMan = await prisma.user.findUnique({
    where: { id: deliveryManId },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!deliveryMan || deliveryMan.role !== "DELIVERY_MAN" || !deliveryMan.isActive) {
    return NextResponse.json({ message: "Invalid delivery man" }, { status: 400 });
  }

  // Upsert delivery record
  const delivery = await prisma.delivery.upsert({
    where: { orderId },
    update: {
      deliveryManId,
      etaMinutes: etaMinutes ?? null,
      status: "ASSIGNED",
    },
    create: {
      orderId,
      deliveryManId,
      etaMinutes: etaMinutes ?? null,
      status: "ASSIGNED",
    },
  });

  // Advance order status to CONFIRMED if still PENDING
  if (order.status === "PENDING") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
  }

  await prisma.auditLog.create({
    data: {
      userId: auth.sub,
      action: "DELIVERY_ASSIGNED",
      resource: "Delivery",
      resourceId: delivery.id,
      metadata: { orderId, deliveryManId, etaMinutes },
    },
  });

  // Optionally create a notification for the delivery man
  prisma.notification
    .create({
      data: {
        userId: deliveryManId,
        title: "New delivery assigned",
        message: `You have been assigned to order #${orderId.slice(-6).toUpperCase()}`,
        channel: "in_app",
        payload: { orderId },
      },
    })
    .catch(() => {});

  // Notify customer and shop owner for real-time operational visibility.
  prisma.notification
    .createMany({
      data: [
        {
          userId: order.customerId,
          title: "Delivery Assigned",
          message: `A delivery partner has been assigned to order #${orderId.slice(-6).toUpperCase()}.`,
          channel: "in_app",
          payload: { orderId, deliveryManId },
        },
        {
          userId: order.ownerId,
          title: "Delivery Partner Assigned",
          message: `Order #${orderId.slice(-6).toUpperCase()} has been assigned to a delivery partner.`,
          channel: "in_app",
          payload: { orderId, deliveryManId },
        },
      ],
    })
    .catch(() => {});

  return NextResponse.json({ delivery }, { status: 201 });
}
