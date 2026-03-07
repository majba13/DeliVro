/**
 * POST /api/admin/create-admin
 *
 * Create a new staff/admin account.  Only SUPER_ADMIN may call this.
 *
 * Body:
 *   name     — string (required)
 *   email    — string (required, unique)
 *   password — string (min 8 chars)
 *   role     — "ADMIN" | "SHOP_OWNER" | "DELIVERY_MAN" (default "ADMIN")
 *
 * Returns the created user (no password hash) with a fresh token pair.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { z } from "zod";
import { requireRole, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-in-production"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-in-production"
);

/** Roles that a SuperAdmin is allowed to create via this endpoint */
const CREATABLE_ROLES = ["ADMIN", "SHOP_OWNER", "DELIVERY_MAN", "CUSTOMER"] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(CREATABLE_ROLES).default("ADMIN"),
  phone: z.string().optional(),
});

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  SHOP_OWNER: "ShopOwner",
  DELIVERY_MAN: "DeliveryMan",
  CUSTOMER: "Customer",
};

export async function POST(req: NextRequest) {
  // Only SUPER_ADMIN may create admin accounts
  const auth = await requireRole(req, "SUPER_ADMIN");
  if (isAuthError(auth)) return auth;

  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { message: body.error.errors[0]?.message ?? "Validation error" },
        { status: 422 }
      );
    }

    const { name, email, password, role, phone } = body.data;

    // Reject duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Reject duplicate phone if provided
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return NextResponse.json(
          { message: "A user with this phone number already exists" },
          { status: 409 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        passwordHash,
        role: role as any,
        isVerified: true, // Admin-created accounts are pre-verified
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Issue tokens so the new admin can be logged in immediately if needed
    const accessToken = await new SignJWT({ sub: user.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(ACCESS_SECRET);

    const refreshToken = await new SignJWT({ sub: user.id, role: user.role, t: "refresh" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(REFRESH_SECRET);

    return NextResponse.json(
      {
        message: `${ROLE_DISPLAY[user.role] ?? user.role} account created successfully`,
        user: {
          ...user,
          role: ROLE_DISPLAY[user.role] ?? user.role,
        },
        accessToken,
        refreshToken,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[create-admin]", err);
    return NextResponse.json(
      { message: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/create-admin
 * List all admin/staff accounts (SUPER_ADMIN only).
 * Alias for GET /api/admin/users?role=ADMIN for convenience.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "SUPER_ADMIN");
  if (isAuthError(auth)) return auth;

  const adminRoles = ["SUPER_ADMIN", "ADMIN", "SHOP_OWNER", "DELIVERY_MAN"];

  const admins = await prisma.user.findMany({
    where: { role: { in: adminRoles as any[] } },
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
        select: { id: true, key: true, canRead: true, canWrite: true, canDelete: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ admins });
}
