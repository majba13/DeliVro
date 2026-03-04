"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { api, ApiError } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  rating?: number;
}

/* ------------------------------------------------------------------ */
/* Fallback demo data (shown when API is unavailable)                   */
/* ------------------------------------------------------------------ */
const DEMO_PRODUCTS: Product[] = [
  { id: "1", name: "Fresh Atlantic Salmon", description: "Wild-caught, premium quality", price: 22.5, category: "Food", stock: 40, rating: 4.8 },
  { id: "2", name: "Organic Basmati Rice 5kg", description: "Aged aromatic basmati", price: 11.2, category: "Groceries", stock: 120, rating: 4.6 },
  { id: "3", name: "Premium Notebook Set", description: "A5 hardcover, 200 pages", price: 7.8, category: "Stationary", stock: 80, rating: 4.4 },
  { id: "4", name: "Multi-Vitamin Pack", description: "30-day supply, all essentials", price: 18.9, category: "Medicine", stock: 60, rating: 4.7 },
  { id: "5", name: "Classic Denim Jacket", description: "Regular fit, stonewash blue", price: 34.7, category: "Wear", stock: 25, rating: 4.5 },
  { id: "6", name: "Mango Juice 1L x6", description: "100% natural, no added sugar", price: 9.6, category: "Food", stock: 90, rating: 4.3 },
  { id: "7", name: "Wireless Earbuds", description: "BT 5.3, ANC, 30hr battery", price: 49.99, category: "Electronics", stock: 15, rating: 4.9 },
  { id: "8", name: "Yoga Mat Pro", description: "Non-slip, 6mm comfort layer", price: 27.0, category: "Sports", stock: 35, rating: 4.6 },
  { id: "9", name: "Green Tea 100 bags", description: "Premium Japanese sencha", price: 8.4, category: "Groceries", stock: 150, rating: 4.7 },
  { id: "10", name: "Paracetamol 500mg x20", description: "Fast-acting pain relief", price: 3.5, category: "Medicine", stock: 200, rating: 4.8 },
  { id: "11", name: "Running Sneakers", description: "Lightweight mesh, size 7-12", price: 62.0, category: "Wear", stock: 20, rating: 4.5 },
  { id: "12", name: "Ballpoint Pen Set x10", description: "Smooth 0.7mm ink, blue/black", price: 4.2, category: "Stationary", stock: 300, rating: 4.2 },
];

const CATEGORIES = ["All", "Food", "Groceries", "Medicine", "Wear", "Stationary", "Electronics", "Sports"];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating", label: "Top Rated" },
];

/* ------------------------------------------------------------------ */
/* Star rating widget                                                   */
/* ------------------------------------------------------------------ */
function Stars({ rating = 4.5 }: { rating?: number }) {
  const full = Math.floor(rating);
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${i < full ? "text-amber-400" : "text-slate-200"}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927C9.349 2.006 10.651 2.006 10.951 2.927l1.286 3.958a1 1 0 00.95.69h4.161c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 14.347l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.644 9.385c-.783-.57-.38-1.81.589-1.81h4.16a1 1 0 00.951-.69l1.287-3.958z" />
        </svg>
      ))}
      <span className="ml-1 text-[10px] text-slate-500">{rating.toFixed(1)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Product card                                                         */
/* ------------------------------------------------------------------ */
function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { toast } = useToast();

  function handleAdd() {
    addItem({ id: product.id, name: product.name, price: product.price });
    toast(`${product.name} added to cart`, "success");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image placeholder */}
      <div className="mb-3 flex h-36 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-indigo-100 text-3xl font-black text-brand-300">
        {product.name.charAt(0)}
      </div>
      <span className="mb-1 text-xs font-medium text-brand-700">{product.category}</span>
      <h3 className="flex-1 text-sm font-semibold leading-snug">{product.name}</h3>
      {product.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.description}</p>
      )}
      <Stars rating={product.rating} />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
        <span className={`text-xs ${product.stock > 10 ? "text-emerald-600" : "text-amber-600"}`}>
          {product.stock > 0 ? `${product.stock} left` : "Out of stock"}
        </span>
      </div>
      <button
        onClick={handleAdd}
        disabled={product.stock === 0}
        className="mt-3 w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
      >
        Add to cart
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");

  /* Fetch real products from API */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<{ products: Product[] }>("/api/products")
      .then((data) => {
        if (!cancelled && data.products?.length) setProducts(data.products);
      })
      .catch(() => {
        /* keep demo data on error */
      })
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const filtered = products
    .filter((p) => {
      const matchCat = category === "All" || p.category === category;
      const matchQ = query.trim() === "" || p.name.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    })
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });

  return (
    <main>
      <Navbar />
      <section className="container-main py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-sm text-slate-500">{filtered.length} items</p>
          </div>
          {/* Search */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:w-60"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                category === cat ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 hover:border-brand-300"
              }`}
            >
              {cat}
            </button>
          ))}
          <div className="ml-auto">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs outline-none focus:border-brand-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-200 h-64" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No products found. Try a different search or category.</p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence>
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </main>
  );
}
