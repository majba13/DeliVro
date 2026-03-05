/**
 * POST /api/delivery/[orderId]/ping
 * Delivery man sends GPS location update.
 * Body: { lat, lng, speed?, heading?, accuracy? }
 */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

const prisma = new PrismaClient();

const pingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(359).optional(),
  accuracy: z.number().min(0).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAuth(req);
  const { orderId } = await params;
  if (isAuthError(auth)) return auth;

  // Only delivery men (and admins) can ping GPS
  const allowedRoles = ["DELIVERY_MAN", "SUPER_ADMIN", "ADMIN"];
  if (!allowedRoles.includes(auth.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = pingSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ message: body.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { lat, lng, speed, heading, accuracy } = body.data;

  // Verify this delivery is assigned to this user
  const delivery = await prisma.delivery.findUnique({ where: { orderId } });
  if (!delivery) return NextResponse.json({ message: "Delivery not found" }, { status: 404 });

  const adminRoles = ["SUPER_ADMIN", "ADMIN"];
  if (!adminRoles.includes(auth.role) && delivery.deliveryManId !== auth.sub) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Record GPS breadcrumb
  const ping = await prisma.deliveryLocation.create({
    data: {
      deliveryManId: auth.sub,
      orderId,
      latitude: lat,
      longitude: lng,
      speed: speed ?? null,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
    },
  });

  // Update current position on Delivery record
  await prisma.delivery.update({
    where: { orderId },
    data: { currentLat: lat, currentLng: lng, lastTrackedAt: new Date(), updatedAt: new Date() },
  });

  return NextResponse.json({ ping }, { status: 201 });
}
