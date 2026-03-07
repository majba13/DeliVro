/**
 * Lightweight auth context — provides user info and login/logout helpers
 * throughout the app via React Context.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, Tokens } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SHOP_OWNER"
  | "DELIVERY_MAN"
  | "CUSTOMER"
  | "SuperAdmin"
  | "Admin"
  | "ShopOwner"
  | "DeliveryMan"
  | "Customer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

/* ------------------------------------------------------------------ */
/* Context                                                              */
/* ------------------------------------------------------------------ */
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* Hydrate from stored token on mount */
  useEffect(() => {
    const access = Tokens.access;
    if (!access) {
      setLoading(false);
      return;
    }
    api
      .get<AuthUser>("/api/auth/me")
      .then((u) => {
        // Backend may return user directly or wrapped in { user }
        const user = (u as any).id ? u : (u as any).user as AuthUser;
        setUser(user);
      })
      .catch((err: unknown) => {
        // Only clear tokens for auth failures, not network/server errors
        if ((err as { status?: number })?.status === 401) Tokens.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>("/api/auth/login", { identity: email, password }, { noAuth: true } as never);
    Tokens.set(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>("/api/auth/register", payload, { noAuth: true } as never);
    Tokens.set(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    Tokens.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isLoading: loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
