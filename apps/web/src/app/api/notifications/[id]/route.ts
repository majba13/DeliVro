/**
 * PATCH /api/notifications/[id] — mark a single notification as read
 * DELETE /api/notifications/[id] — delete a single notification
 */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

const prisma = new PrismaClient();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const notification = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notification || notification.userId !== auth.sub) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const updated = await prisma.notification.update({
    where: { id: params.id },
    data: { isRead: true },
  });

  return NextResponse.json({ notification: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const notification = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notification || notification.userId !== auth.sub) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await prisma.notification.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
