/**
 * Typed API client — all requests go through the API gateway.
 * Automatically attaches the stored JWT access token and handles
 * 401 → refresh → retry once before redirecting to /login.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/* ------------------------------------------------------------------ */
/* Token helpers (localStorage — client-side only)                      */
/* ------------------------------------------------------------------ */
export const Tokens = {
  get access(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("dvr_access");
  },
  get refresh(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("dvr_refresh");
  },
  set(access: string, refresh: string) {
    localStorage.setItem("dvr_access", access);
    localStorage.setItem("dvr_refresh", refresh);
  },
  clear() {
    localStorage.removeItem("dvr_access");
    localStorage.removeItem("dvr_refresh");
  },
};

/* ------------------------------------------------------------------ */
/* Internal fetch wrapper                                               */
/* ------------------------------------------------------------------ */
async function request<T>(
  path: string,
  options?: RequestInit & { noAuth?: boolean },
  retried = false
): Promise<T> {
  const { noAuth = false, ...init } = options ?? {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (!noAuth && Tokens.access) {
    headers["Authorization"] = `Bearer ${Tokens.access}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  /* 401 → try token refresh once */
  if (res.status === 401 && !retried && Tokens.refresh) {
    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: Tokens.refresh }),
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      Tokens.set(data.accessToken, data.refreshToken ?? Tokens.refresh!);
      return request<T>(path, options, true);
    } else {
      Tokens.clear();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, err.message ?? "Request failed", err);
  }

  /* 204 No Content */
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Public convenience methods                                           */
/* ------------------------------------------------------------------ */
export const api = {
  get: <T>(path: string, opts?: RequestInit) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body: unknown, opts?: RequestInit) =>
    request<T>(path, {
      ...opts,
      method: "POST",
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown, opts?: RequestInit) =>
    request<T>(path, {
      ...opts,
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string, opts?: RequestInit) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

/* ------------------------------------------------------------------ */
/* Typed error                                                          */
/* ------------------------------------------------------------------ */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}
