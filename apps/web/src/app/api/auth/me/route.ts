/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-in-production"
);

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  SHOP_OWNER: "ShopOwner",
  DELIVERY_MAN: "DeliveryMan",
  CUSTOMER: "Customer",
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer "))
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    const userId = payload.sub as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { adminPermissions: true },
    });

    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      name: (user as any).name ?? user.email?.split("@")[0] ?? "User",
      email: user.email,
      phone: user.phone,
      role: ROLE_DISPLAY[user.role] ?? user.role,
      isVerified: user.isVerified,
      permissions: user.adminPermissions,
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
