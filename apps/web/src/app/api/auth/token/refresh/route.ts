/**
 * POST /api/auth/token/refresh
 * Issues a new access token from a valid refresh token.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-in-production"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-in-production"
);

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = z
      .object({ refreshToken: z.string() })
      .parse(await req.json());

    const { payload } = await jwtVerify(refreshToken, REFRESH_SECRET);
    if (payload.t !== "refresh")
      return NextResponse.json(
        { message: "Invalid refresh token" },
        { status: 401 }
      );

    const accessToken = await new SignJWT({
      sub: payload.sub,
      role: payload.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .sign(ACCESS_SECRET);

    return NextResponse.json({ accessToken });
  } catch {
    return NextResponse.json(
      { message: "Invalid or expired refresh token" },
      { status: 401 }
    );
  }
}
