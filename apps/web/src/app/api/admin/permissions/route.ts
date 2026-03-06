import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * GET /api/admin/permissions
 * List permissions for a user
 * Query: ?userId=xxx
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.role !== "SUPER_ADMIN" && authResult.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId query param required" }, { status: 400 });
    }

    const permissions = await prisma.adminPermission.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("List permissions error:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

/**
 * POST /api/admin/permissions
 * Create a new permission for a user
 * Body: { userId, key, canRead?, canWrite?, canDelete? }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only SuperAdmin can create permissions" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, key, canRead, canWrite, canDelete } = body;

    if (!userId || !key) {
      return NextResponse.json(
        { error: "userId and key are required" },
        { status: 400 }
      );
    }

    // Check if user exists and is Admin or ShopOwner
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "SuperAdmin does not need explicit permissions" },
        { status: 400 }
      );
    }

    const permission = await prisma.adminPermission.create({
      data: {
        userId,
        key,
        canRead: canRead ?? false,
        canWrite: canWrite ?? false,
        canDelete: canDelete ?? false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ permission }, { status: 201 });
  } catch (error: any) {
    console.error("Create permission error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Permission already exists for this user and key" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create permission" }, { status: 500 });
  }
}
