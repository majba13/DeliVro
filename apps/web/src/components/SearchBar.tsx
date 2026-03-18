"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

interface SearchProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  unit?: string | null;
  imageUrl?: string | null;
  shop?: { id: string; name: string } | null;
}

interface SearchShop {
  id: string;
  name: string;
  category: string;
  logo?: string | null;
  _count?: { products: number };
}

interface SearchResponse {
  products: SearchProduct[];
  shops: SearchShop[];
  total: number;
}

export function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [shops, setShops] = useState<SearchShop[]>([]);

  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!canSearch) {
      setProducts([]);
      setShops([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const sp = new URLSearchParams({ q: query.trim(), limit: "5" });
        const data = await api.get<SearchResponse>(`/api/search?${sp.toString()}`);
        setProducts(data.products ?? []);
        setShops(data.shops ?? []);
        setOpen(true);
      } catch {
        setProducts([]);
        setShops([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [canSearch, query]);

  const hasResults = products.length > 0 || shops.length > 0;
  const showDropdown = open && (loading || canSearch);

  const totalLabel = useMemo(() => {
    const count = products.length + shops.length;
    return count === 1 ? "1 result" : `${count} results`;
  }, [products.length, shops.length]);

  function goToFullSearch() {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(q)}`);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              goToFullSearch();
            }
          }}
          placeholder="Search products and shops..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-24 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          aria-label="Search products and shops"
        />

        <button
          type="button"
          onClick={goToFullSearch}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700"
        >
          Search
        </button>
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-[28rem] overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {loading && <p className="px-2 py-3 text-xs text-slate-500">Searching...</p>}

          {!loading && !hasResults && canSearch && (
            <div className="px-2 py-4 text-center text-xs text-slate-500">
              <p>No matches for "{query.trim()}".</p>
              <button onClick={goToFullSearch} className="mt-2 text-brand-600 hover:underline">
                View full results
              </button>
            </div>
          )}

          {!loading && hasResults && (
            <>
              <div className="mb-1 px-2 py-1 text-[11px] text-slate-500">{totalLabel}</div>

              {products.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Products</p>
                  {products.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products?q=${encodeURIComponent(p.name)}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                        <p className="truncate text-xs text-slate-500">{p.category}{p.shop?.name ? ` • ${p.shop.name}` : ""}</p>
                      </div>
                      <span className="ml-3 shrink-0 text-xs font-semibold text-brand-700">৳{Number(p.price).toFixed(2)}</span>
                    </Link>
                  ))}
                </div>
              )}

              {shops.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Shops</p>
                  {shops.map((s) => (
                    <Link
                      key={s.id}
                      href={`/shops/${s.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                        <p className="truncate text-xs text-slate-500">{s.category}</p>
                      </div>
                      <span className="ml-3 shrink-0 text-[11px] text-slate-500">{s._count?.products ?? 0} items</span>
                    </Link>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={goToFullSearch}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                See all results
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
