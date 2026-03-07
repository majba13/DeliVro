/**
 * PUT /api/admin/update-role
 *
 * Update any user's role.  Only SUPER_ADMIN may call this.
 *
 * Body:
 *   userId — string (required)
 *   role   — RoleType enum value (required)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SHOP_OWNER",
  "DELIVERY_MAN",
  "CUSTOMER",
] as const;

const schema = z.object({
  userId: z.string().min(1, "userId is required"),
  role: z.enum(VALID_ROLES, { errorMap: () => ({ message: "Invalid role" }) }),
});

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  SHOP_OWNER: "ShopOwner",
  DELIVERY_MAN: "DeliveryMan",
  CUSTOMER: "Customer",
};

export async function PUT(req: NextRequest) {
  // Only SUPER_ADMIN can reassign roles
  const auth = await requireRole(req, "SUPER_ADMIN");
  if (isAuthError(auth)) return auth;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { message: body.error.errors[0]?.message ?? "Validation error" },
      { status: 422 }
    );
  }

  const { userId, role } = body.data;

  // Prevent the SuperAdmin from changing their own role
  if (userId === auth.sub) {
    return NextResponse.json(
      { message: "You cannot change your own role" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: `Role updated to ${ROLE_DISPLAY[user.role] ?? user.role}`,
      user: { ...user, role: ROLE_DISPLAY[user.role] ?? user.role },
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    console.error("[update-role]", err);
    return NextResponse.json({ message: "Failed to update role" }, { status: 500 });
  }
}
