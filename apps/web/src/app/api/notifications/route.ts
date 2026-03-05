/**
 * GET    /api/notifications        — list the authenticated user's notifications
 *   Query: ?unreadOnly=true&page=1&limit=20
 * DELETE /api/notifications        — delete all READ notifications for this user
 * PATCH  /api/notifications/read-all — mark all as read
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = { userId: auth.sub, ...(unreadOnly ? { isRead: false } : {}) };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: auth.sub, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, total, unreadCount, page, limit });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { count } = await prisma.notification.deleteMany({
    where: { userId: auth.sub, isRead: true },
  });

  return NextResponse.json({ deleted: count });
}
