/**
 * POST /api/delivery/auto-assign
 * Admin or system auto-assigns closest delivery man to an order based on location
 * Body: { orderId, deliveryLat, deliveryLng, radiusKm? }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { calculateDistance, calculateETA } from "@/lib/distance-eta";

const autoAssignSchema = z.object({
  orderId: z.string().min(1),
  deliveryLat: z.number().min(-90).max(90),
  deliveryLng: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.5).max(50).default(5),
});

export async function POST(req: NextRequest) {
  // Allow both ADMIN and external cron/automation systems
  const auth = await requireRole(req, "SUPER_ADMIN", "ADMIN");
  if (isAuthError(auth)) return auth;

  const body = autoAssignSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { message: body.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { orderId, deliveryLat, deliveryLng, radiusKm } = body.data;

  // Verify order exists and isn't already assigned
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { delivery: true },
  });

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  if (order.delivery && order.delivery.status !== "ASSIGNED") {
    return NextResponse.json(
      { message: "Order already has an active delivery assignment" },
      { status: 409 }
    );
  }

  // Get all available delivery men with recent locations
  const availableDeliveryMen = await prisma.user.findMany({
    where: {
      role: "DELIVERY_MAN",
      isActive: true,
    },
    include: {
      locationPings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });

  // Calculate distances and sort by proximity
  const candidates = availableDeliveryMen
    .map((dm) => {
      const lastLocation = dm.locationPings[0];
      if (!lastLocation) return null;

      const distance = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        deliveryLat,
        deliveryLng
      );

      if (distance > radiusKm) return null;

      return {
        id: dm.id,
        name: dm.name,
        distance,
        etaMinutes: calculateETA(distance),
        lastLocationTime: lastLocation.recordedAt,
      };
    })
    .filter((c) => c !== null)
    .sort((a, b) => a!.distance - b!.distance);

  if (candidates.length === 0) {
    return NextResponse.json(
      {
        message: `No available delivery men within ${radiusKm}km of pickup location`,
        candidates: [],
      },
      { status: 404 }
    );
  }

  // Auto-assign to the closest one
  const selected = candidates[0]!;

  // Create or update delivery record
  const delivery = await prisma.delivery.upsert({
    where: { orderId },
    update: {
      deliveryManId: selected.id,
      status: "ASSIGNED",
      etaMinutes: selected.etaMinutes,
    },
    create: {
      orderId,
      deliveryManId: selected.id,
      etaMinutes: selected.etaMinutes,
      status: "ASSIGNED",
    },
  });

  // Advance order to CONFIRMED if PENDING
  if (order.status === "PENDING") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" },
    });
  }

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: auth.sub,
      action: "DELIVERY_AUTO_ASSIGNED",
      resource: "Delivery",
      resourceId: delivery.id,
      metadata: {
        orderId,
        deliveryManId: selected.id,
        distance: selected.distance,
        etaMinutes: selected.etaMinutes,
        radiusKm,
        candidatesCount: candidates.length,
      },
    },
  });

  // Notify delivery man
  await prisma.notification.create({
    data: {
      userId: selected.id,
      title: "📍 New delivery assigned (auto-matched)",
      message: `Order #${orderId.slice(-6).toUpperCase()} - ${selected.etaMinutes}min away. Accept to start.`,
      channel: "in_app",
      payload: { orderId, autoAssigned: true },
    },
  });

  // Notify customer
  await prisma.notification.create({
    data: {
      userId: order.customerId,
      title: "✅ Delivery partner found!",
      message: `${selected.name} is ${Math.round(selected.distance * 10) / 10}km away. ETA: ${selected.etaMinutes}min`,
      channel: "in_app",
      payload: { orderId, deliveryManName: selected.name },
    },
  });

  // Notify shop owner
  await prisma.notification.create({
    data: {
      userId: order.ownerId,
      title: "🚚 Delivery assigned",
      message: `${selected.name} assigned to order #${orderId.slice(-6).toUpperCase()}`,
      channel: "in_app",
      payload: { orderId, deliveryManName: selected.name },
    },
  });

  return NextResponse.json(
    {
      delivery,
      metadata: {
        selectedDeliveryMan: selected,
        totalCandidates: candidates.length,
        allCandidates: candidates,
      },
    },
    { status: 201 }
  );
}
