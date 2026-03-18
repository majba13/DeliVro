"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { api } from "@/lib/api";

const CATEGORIES = ["All", "FOOD", "GROCERIES", "MEDICINE", "EMERGENCY", "WEAR", "ELECTRONICS", "STATIONARY"];
const EMOJI: Record<string, string> = {
  FOOD: "🍱", GROCERIES: "🛒", MEDICINE: "💊", EMERGENCY: "🚨",
  STATIONARY: "📚", WEAR: "👗", ELECTRONICS: "📱",
};

interface Shop {
  id: string;
  name: string;
  description: string | null;
  category: string;
  logo: string | null;
  deliveryFee: number;
  minOrderAmt: number;
  avgRating: number | null;
  totalReviews: number | null;
  isApproved: boolean;
  _count?: { products: number };
}

function Stars({ rating = 0 }: { rating?: number | null }) {
  const r = rating ?? 0;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`h-3 w-3 ${i < Math.floor(r) ? "text-amber-400" : "text-slate-200"}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927C9.349 2.006 10.651 2.006 10.951 2.927l1.286 3.958a1 1 0 00.95.69h4.161c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 14.347l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.644 9.385c-.783-.57-.38-1.81.589-1.81h4.16a1 1 0 00.951-.69l1.287-3.958z" />
        </svg>
      ))}
      <span className="ml-1 text-[10px] text-slate-500">{r > 0 ? r.toFixed(1) : "New"}</span>
    </span>
  );
}

function ShopCard({ shop }: { shop: Shop }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden"
    >
      {/* Banner placeholder */}
      <div className="relative h-28 bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center">
        <span className="text-5xl opacity-60">{EMOJI[shop.category] ?? "🏪"}</span>
        <span className="absolute bottom-2 right-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 backdrop-blur">
          {shop.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold group-hover:text-brand-700 transition-colors">{shop.name}</h3>
        {shop.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{shop.description}</p>
        )}

        <div className="mt-2">
          <Stars rating={shop.avgRating} />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>🚚 ৳{shop.deliveryFee} delivery</span>
          <span>{shop._count?.products ?? 0} products</span>
        </div>

        <Link
          href={`/shops/${shop.id}`}
          className="mt-3 block rounded-lg bg-brand-50 py-2 text-center text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
        >
          Visit Shop →
        </Link>
      </div>
    </motion.div>
  );
}

function ShopsContent() {
  const params = useSearchParams();
  const urlCategory = params.get("category") ?? "All";
  const urlQuery = params.get("q") ?? "";
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(urlCategory);
  const [q, setQ] = useState(urlQuery);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setCategory(urlCategory);
  }, [urlCategory]);

  useEffect(() => {
    setQ(urlQuery);
  }, [urlQuery]);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (category !== "All") sp.set("category", category);
      if (q) sp.set("q", q);
      const data = await api.get<{ shops: Shop[]; total: number }>(`/api/shops?${sp.toString()}`);
      setShops(data.shops);
      setTotal(data.total);
    } catch {
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, [category, q]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  return (
    <div className="container-main py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Browse Shops</h1>
        <p className="mt-1 text-sm text-slate-500">{total} shops available</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shops…"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === cat
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "All" ? "All" : `${EMOJI[cat] ?? ""} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : shops.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="text-5xl">🏪</div>
          <h2 className="text-lg font-semibold">No shops found</h2>
          <p className="text-sm text-slate-500">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      )}
    </div>
  );
}

export default function ShopsPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div className="container-main py-8 text-slate-400">Loading shops…</div>}>
          <ShopsContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
