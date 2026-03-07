/**
 * Shared JWT verification helper for API route handlers.
 * Returns the user payload from a Bearer token in the Authorization header.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-in-production"
);

export interface TokenPayload {
  sub: string;          // userId
  userId: string;       // alias for sub
  role: string;
  email?: string;
}

/** Returns the decoded payload or a 401 NextResponse to return immediately. */
export async function requireAuth(
  req: NextRequest
): Promise<TokenPayload | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), ACCESS_SECRET);
    return {
      sub: payload.sub as string,
      userId: payload.sub as string, // alias for easier access
      role: payload["role"] as string,
      email: payload["email"] as string | undefined,
    };
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

/**
 * requireRole — factory that builds a guard checking the caller has one of
 * the specified roles.  Returns the TokenPayload on success or a
 * 401/403 NextResponse that the route should return immediately.
 *
 * Usage:
 *   const auth = await requireRole(req, "SUPER_ADMIN");
 *   if (isAuthError(auth)) return auth;
 *
 * Multiple allowed roles:
 *   const auth = await requireRole(req, "SUPER_ADMIN", "ADMIN");
 */
export async function requireRole(
  req: NextRequest,
  ...roles: string[]
): Promise<TokenPayload | NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  if (!roles.includes(auth.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return auth;
}

/** Narrow helper: check if the result is a NextResponse (auth failed). */
export function isAuthError(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}

export const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  SHOP_OWNER: "ShopOwner",
  DELIVERY_MAN: "DeliveryMan",
  CUSTOMER: "Customer",
};
