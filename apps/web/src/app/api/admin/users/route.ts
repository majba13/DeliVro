import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * GET /api/admin/users
 * List all users (SuperAdmin/Admin only)
 * Query params: ?role=ADMIN&search=john&isActive=true
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  // Only SuperAdmin and Admin can access
  if (authResult.role !== "SUPER_ADMIN" && authResult.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");

    const where: any = {};
    
    if (role) where.role = role;
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        adminPermissions: {
          select: {
            id: true,
            key: true,
            canRead: true,
            canWrite: true,
            canDelete: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
