"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { api } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

interface ShopDetail {
  id: string;
  name: string;
  description: string | null;
  category: string;
  logo: string | null;
  banner: string | null;
  deliveryFee: number;
  minOrderAmt: number;
  avgRating: number | null;
  totalReviews: number | null;
  address: string | null;
  phone: string | null;
  isApproved: boolean;
  products: Product[];
  owner: { name: string | null };
  _count: { products: number };
}

interface Product {
  id: string;
  name: string;
  price: number;
  discount: number | null;
  images: string[];
  unit: string | null;
  category: string;
  inStock: boolean;
  avgRating: number | null;
}

function Stars({ rating = 0 }: { rating?: number | null }) {
  const r = rating ?? 0;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`h-4 w-4 ${i < Math.floor(r) ? "text-amber-400" : "text-slate-200"}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927C9.349 2.006 10.651 2.006 10.951 2.927l1.286 3.958a1 1 0 00.95.69h4.161c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 14.347l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.644 9.385c-.783-.57-.38-1.81.589-1.81h4.16a1 1 0 00.951-.69l1.287-3.958z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-slate-500">{r > 0 ? r.toFixed(1) : "New"}</span>
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const discountedPrice = product.discount
    ? Math.round(product.price * (1 - product.discount / 100))
    : product.price;

  const handleAdd = () => {
    addItem({ id: product.id, name: product.name, price: discountedPrice, imageUrl: product.images[0] });
    toast(`${product.name} added to cart`, "success");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-square w-full rounded-lg bg-slate-100 overflow-hidden mb-3">
        {product.images[0] ? (
          <Image src={product.images[0]} alt={product.name} width={200} height={200} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🛍️</div>
        )}
      </div>

      <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
      {product.unit && <p className="text-xs text-slate-400 mt-0.5">{product.unit}</p>}

      <div className="mt-1.5 flex items-center gap-2">
        <span className="font-bold text-brand-700">৳{discountedPrice}</span>
        {product.discount && (
          <>
            <span className="text-xs text-slate-400 line-through">৳{product.price}</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">-{product.discount}%</span>
          </>
        )}
      </div>

      <div className="mt-1">
        <Stars rating={product.avgRating} />
      </div>

      <button
        onClick={handleAdd}
        disabled={!product.inStock}
        className="mt-3 w-full rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {product.inStock ? "Add to Cart" : "Out of Stock"}
      </button>
    </motion.div>
  );
}

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .get<ShopDetail>(`/api/shops/${id}`)
      .then(setShop)
      .catch(() => setError("Shop not found or unavailable."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container-main py-12">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100 mb-6" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-60 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !shop) {
    return (
      <>
        <Navbar />
        <div className="container-main py-20 text-center">
          <div className="text-5xl mb-4">🏪</div>
          <h1 className="text-xl font-bold mb-2">{error || "Shop not found"}</h1>
          <Link href="/shops" className="text-brand-600 hover:underline text-sm">← Back to shops</Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Shop header */}
        <div className="relative bg-gradient-to-br from-brand-600 to-indigo-700 text-white">
          <div className="container-main py-10">
            <Link href="/shops" className="mb-6 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white">
              ← All Shops
            </Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Logo */}
              <div className="h-20 w-20 rounded-2xl border-2 border-white/30 bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center text-4xl">
                {shop.logo ? (
                  <Image src={shop.logo} alt={shop.name} width={80} height={80} className="h-full w-full object-cover" />
                ) : (
                  "🏪"
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-2xl font-bold">{shop.name}</h1>
                {shop.description && <p className="mt-1 text-sm text-white/80 max-w-lg">{shop.description}</p>}
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/70">
                  {shop.address && <span>📍 {shop.address}</span>}
                  {shop.phone && <span>📞 {shop.phone}</span>}
                  <span>🚚 ৳{shop.deliveryFee} delivery fee</span>
                  <span>🛒 Min. ৳{shop.minOrderAmt}</span>
                </div>
              </div>

              <div className="text-right">
                <Stars rating={shop.avgRating} />
                <p className="mt-1 text-xs text-white/60">{shop.totalReviews ?? 0} reviews</p>
                <p className="mt-1 text-xs text-white/60">{shop._count.products} products</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div className="container-main py-8">
          <h2 className="mb-4 text-lg font-bold">Products</h2>
          {shop.products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="text-4xl">📦</div>
              <p className="text-slate-500">No products in this shop yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shop.products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
