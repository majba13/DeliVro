"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

export type CarouselProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  rating?: number;
};

/* ─── Single product slide card ───────────────────────────────────── */
function SlideCard({ product, visible }: { product: CarouselProduct; visible: boolean }) {
  const { addItem, setOpen } = useCart();
  const { toast } = useToast();

  function handleAdd() {
    addItem({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl });
    setOpen(true);
    toast(`${product.name} added to cart ✓`, "success");
  }

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -60 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="absolute inset-0 flex gap-6 rounded-2xl bg-white p-5 shadow-md border border-slate-100"
    >
      {/* Image / placeholder */}
      <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl bg-brand-50">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">
            {CATEGORY_EMOJI[product.category.toUpperCase()] ?? "🛒"}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
          {product.category}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 line-clamp-2">{product.name}</h3>
          {product.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{product.description}</p>
          )}
          {product.rating !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className={`h-3.5 w-3.5 ${i < Math.floor(product.rating!) ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927C9.349 2.006 10.651 2.006 10.951 2.927l1.286 3.958a1 1 0 00.95.69h4.161c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 14.347l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.644 9.385c-.783-.57-.38-1.81.589-1.81h4.16a1 1 0 00.951-.69l1.287-3.958z" />
                </svg>
              ))}
              <span className="text-xs text-slate-500">{product.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xl font-black text-brand-700">${product.price.toFixed(2)}</p>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95"
          >
            Add to cart
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const CATEGORY_EMOJI: Record<string, string> = {
  FOOD: "🍱", GROCERIES: "🛒", STATIONARY: "📚", MEDICINE: "💊",
  WEAR: "👗", ELECTRONICS: "📱", SPORTS: "⚽"
};

/* ─── Main carousel — groups products by category, one slider each ─── */
export function ProductCarousel({ products }: { products: CarouselProduct[] }) {
  // Group by category
  const byCategory = products.reduce<Record<string, CarouselProduct[]>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  const categories = Object.keys(byCategory);

  return (
    <div className="space-y-10">
      {categories.map((cat) => (
        <CategorySlider key={cat} category={cat} products={byCategory[cat]} />
      ))}
    </div>
  );
}

/* ─── Per-category auto-sliding carousel ─────────────────────────── */
function CategorySlider({ category, products }: { category: string; products: CarouselProduct[] }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setIndex((i) => (i + 1) % products.length), [products.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + products.length) % products.length), [products.length]);

  // Auto-advance every 4 s
  useEffect(() => {
    timerRef.current = setInterval(next, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next]);

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4000);
  };

  function goNext() { reset(); next(); }
  function goPrev() { reset(); prev(); }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">
          {CATEGORY_EMOJI[category.toUpperCase()] ?? "🛒"} {category}
        </h3>
        <div className="flex gap-2">
          <button onClick={goPrev} aria-label="Previous" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-brand-400 hover:text-brand-600">
            ‹
          </button>
          <button onClick={goNext} aria-label="Next" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-brand-400 hover:text-brand-600">
            ›
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div className="relative h-52 overflow-hidden rounded-2xl">
        <AnimatePresence mode="popLayout">
          <SlideCard key={products[index].id} product={products[index]} visible={true} />
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="mt-3 flex justify-center gap-1.5">
        {products.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => { setIndex(i); reset(); }}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-brand-600" : "w-1.5 bg-slate-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
