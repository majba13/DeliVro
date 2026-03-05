/**
 * PATCH /api/notifications/read-all — mark ALL notifications as read for the current user
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { count } = await prisma.notification.updateMany({
    where: { userId: auth.sub, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ updated: count });
}
