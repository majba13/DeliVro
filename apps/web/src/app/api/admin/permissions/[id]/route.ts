import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * PATCH /api/admin/permissions/[id]
 * Update permission flags
 * Body: { canRead?, canWrite?, canDelete? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only SuperAdmin can update permissions" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { canRead, canWrite, canDelete } = body;

    const updateData: any = {};
    if (canRead !== undefined) updateData.canRead = canRead;
    if (canWrite !== undefined) updateData.canWrite = canWrite;
    if (canDelete !== undefined) updateData.canDelete = canDelete;

    const permission = await prisma.adminPermission.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ permission });
  } catch (error: any) {
    console.error("Update permission error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update permission" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/permissions/[id]
 * Delete a permission
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only SuperAdmin can delete permissions" }, { status: 403 });
  }

  try {
    await prisma.adminPermission.delete({ where: { id } });
    return NextResponse.json({ message: "Permission deleted successfully" });
  } catch (error: any) {
    console.error("Delete permission error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete permission" }, { status: 500 });
  }
}
