/**
 * POST /api/auth/login
 * Authenticates a user and returns JWTs.
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

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  SHOP_OWNER: "ShopOwner",
  DELIVERY_MAN: "DeliveryMan",
  CUSTOMER: "Customer",
};

const SUPER_ADMIN_EMAIL = "majbauddin.study@gmail.com";

const schema = z.object({
  identity: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const lookup = body.identity ?? body.email ?? body.phone;

    if (!lookup)
      return NextResponse.json(
        { message: "Email, phone or identity required" },
        { status: 400 }
      );

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: lookup }, { phone: lookup }],
        isActive: true,
      },
    });

    if (!user || !user.passwordHash)
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid)
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );

    // Auto-promote the designated SuperAdmin email if their role was set incorrectly
    if (user.email === SUPER_ADMIN_EMAIL && user.role !== "SUPER_ADMIN") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "SUPER_ADMIN" },
      });
      (user as any).role = "SUPER_ADMIN";
    }

    const accessToken = await new SignJWT({ sub: user.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(ACCESS_SECRET);

    const refreshToken = await new SignJWT({
      sub: user.id,
      role: user.role,
      t: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(REFRESH_SECRET);

    return NextResponse.json({
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
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { message: err.errors[0]?.message ?? "Validation error" },
        { status: 422 }
      );
    }
    console.error("[login]", err);
    return NextResponse.json(
      { message: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
