/**
 * POST /api/auth/register
 * Creates a new user account and returns JWTs immediately.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-in-production"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-in-production"
);

const ROLE_FROM_CLIENT: Record<string, string> = {
  SuperAdmin: "SUPER_ADMIN",
  Admin: "ADMIN",
  ShopOwner: "SHOP_OWNER",
  DeliveryMan: "DELIVERY_MAN",
  Customer: "CUSTOMER",
};

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  SHOP_OWNER: "ShopOwner",
  DELIVERY_MAN: "DeliveryMan",
  CUSTOMER: "Customer",
};

const SUPER_ADMIN_EMAIL = "majbauddin.study@gmail.com";

const schema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(8).optional(),
    password: z.string().min(8),
    role: z.string().optional(),
  })
  .refine((v) => v.email || v.phone, { message: "Email or phone required" });

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    // Resolve role
    let dbRole =
      (body.role ? ROLE_FROM_CLIENT[body.role] ?? null : null) ?? "CUSTOMER";

    // Designated SuperAdmin email
    if (body.email === SUPER_ADMIN_EMAIL) {
      dbRole = "SUPER_ADMIN";
    } else if (dbRole === "SUPER_ADMIN" || dbRole === "ADMIN") {
      return NextResponse.json(
        { message: "Cannot self-register as Admin or SuperAdmin" },
        { status: 403 }
      );
    }

    // Duplicate check
    if (body.email) {
      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existing)
        return NextResponse.json(
          { message: "Email already registered" },
          { status: 409 }
        );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        name: body.name ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        passwordHash,
        role: dbRole as any,
        isVerified: true,
      },
    });

    const accessToken = await new SignJWT({ sub: user.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .sign(ACCESS_SECRET);

    const refreshToken = await new SignJWT({
      sub: user.id,
      role: user.role,
      t: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(REFRESH_SECRET);

    return NextResponse.json(
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name ?? user.email?.split("@")[0] ?? "User",
          email: user.email,
          phone: user.phone,
          role: ROLE_DISPLAY[user.role] ?? user.role,
          isVerified: user.isVerified,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { message: err.errors[0]?.message ?? "Validation error" },
        { status: 422 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json(
      { message: err?.message ?? "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
