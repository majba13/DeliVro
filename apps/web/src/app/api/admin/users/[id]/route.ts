import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * GET /api/admin/users/[id]
 * Get user details with permissions
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.role !== "SUPER_ADMIN" && authResult.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        adminPermissions: {
          select: {
            id: true,
            key: true,
            canRead: true,
            canWrite: true,
            canDelete: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user role, isActive status, or basic info
 * Body: { role?, isActive?, name? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  // Only SuperAdmin can change roles
  if (authResult.role !== "SUPER_ADMIN" && authResult.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { role, isActive, name } = body;

    // Additional check: only SUPER_ADMIN can assign SUPER_ADMIN or ADMIN roles
    if (role && (role === "SUPER_ADMIN" || role === "ADMIN")) {
      if (authResult.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Only SuperAdmin can assign Admin or SuperAdmin roles" },
          { status: 403 }
        );
      }
    }

    // Prevent user from deactivating themselves
    if (id === authResult.userId && isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Prevent user from changing their own role
    if (id === authResult.userId && role) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name !== undefined) updateData.name = name;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        adminPermissions: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Update user error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete user (SuperAdmin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only SuperAdmin can delete users" }, { status: 403 });
  }

  // Prevent user from deleting themselves
  if (id === authResult.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
