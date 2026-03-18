"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

interface Shop {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isApproved: boolean;
  isActive: boolean;
  deliveryFee: number;
  createdAt: string;
  owner: { id: string; name: string | null; email: string };
  _count: { products: number };
}

const BADGE = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  inactive: "bg-slate-100 text-slate-500",
};

export default function AdminShopsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");
  const [acting, setActing] = useState<string | null>(null);

  const allowed = !authLoading && user && ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  useEffect(() => {
    if (!authLoading && !allowed) router.replace("/dashboard");
  }, [authLoading, allowed, router]);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ shops: Shop[]; total: number }>("/api/shops?all=true");
      setShops(data.shops);
    } catch {
      toast("Failed to load shops", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (allowed) fetchShops();
  }, [allowed, fetchShops]);

  const handleAction = async (shopId: string, action: "approve" | "reject" | "deactivate") => {
    setActing(shopId);
    try {
      if (action === "deactivate") {
        await api.delete(`/api/shops/${shopId}`);
      } else {
        await api.patch(`/api/shops/${shopId}`, { isApproved: action === "approve" });
      }
      toast(`Shop ${action}d`, "success");
      await fetchShops();
    } catch {
      toast("Action failed", "error");
    } finally {
      setActing(null);
    }
  };

  const filtered = shops.filter((s) => {
    if (filter === "pending") return !s.isApproved && s.isActive;
    if (filter === "approved") return s.isApproved;
    return true;
  });

  if (!allowed && !authLoading) return null;

  return (
    <div className="container-main py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shop Management</h1>
          <p className="text-sm text-slate-500 mt-1">{shops.length} total shops</p>
        </div>
        <Link href="/admin" className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
          ← Admin
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f}
            {f === "pending" && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-white text-[10px]">
                {shops.filter((s) => !s.isApproved && s.isActive).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="text-4xl">✅</div>
          <p className="text-slate-500">No {filter} shops</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((shop) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold">{shop.name}</h3>
                    <p className="text-xs text-slate-400">{shop.category}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      !shop.isActive ? BADGE.inactive : shop.isApproved ? BADGE.approved : BADGE.pending
                    }`}
                  >
                    {!shop.isActive ? "Inactive" : shop.isApproved ? "Approved" : "Pending"}
                  </span>
                </div>

                {shop.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{shop.description}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
                  <span>👤 {shop.owner.name ?? shop.owner.email}</span>
                  <span>📦 {shop._count.products} products</span>
                  <span>🚚 ৳{shop.deliveryFee} fee</span>
                  <span>📅 {new Date(shop.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2 mt-2">
                  {!shop.isApproved && shop.isActive && (
                    <>
                      <button
                        onClick={() => handleAction(shop.id, "approve")}
                        disabled={acting === shop.id}
                        className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(shop.id, "reject")}
                        disabled={acting === shop.id}
                        className="flex-1 rounded-lg bg-red-50 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {shop.isApproved && shop.isActive && (
                    <button
                      onClick={() => handleAction(shop.id, "deactivate")}
                      disabled={acting === shop.id}
                      className="flex-1 rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  )}
                  <Link
                    href={`/shops/${shop.id}`}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    View
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
