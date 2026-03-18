/**
 * POST /api/auth/reset-password
 * Validates the reset token and updates the user's password.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RESET_SECRET = new TextEncoder().encode(
  process.env.JWT_RESET_SECRET ??
    process.env.JWT_ACCESS_SECRET ??
    "dev-reset-secret"
);

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const { token, password } = schema.parse(await req.json());

    const { payload } = await jwtVerify(token, RESET_SECRET);

    if (payload["type"] !== "password-reset" || !payload.sub) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: payload.sub as string },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: err.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    // JWT verification failed or expired
    return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
  }
}
