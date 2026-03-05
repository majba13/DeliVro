"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const CATEGORIES = [
  { label: "FOOD",        slug: "Food",        emoji: "🍱", bg: "from-orange-50 to-orange-100",  border: "border-orange-200", text: "text-orange-700",  desc: "Fresh meals & snacks" },
  { label: "GROCERIES",   slug: "Groceries",   emoji: "🛒", bg: "from-green-50 to-green-100",    border: "border-green-200",  text: "text-green-700",   desc: "Daily essentials" },
  { label: "MEDICINE",    slug: "Medicine",    emoji: "💊", bg: "from-red-50 to-red-100",        border: "border-red-200",    text: "text-red-700",     desc: "Health & wellness" },
  { label: "STATIONARY",  slug: "Stationary",  emoji: "📚", bg: "from-blue-50 to-blue-100",      border: "border-blue-200",   text: "text-blue-700",    desc: "Office & school" },
  { label: "WEAR",        slug: "Wear",        emoji: "👗", bg: "from-purple-50 to-purple-100",  border: "border-purple-200", text: "text-purple-700",  desc: "Fashion & apparel" },
  { label: "ELECTRONICS", slug: "Electronics", emoji: "📱", bg: "from-indigo-50 to-indigo-100",  border: "border-indigo-200", text: "text-indigo-700",  desc: "Gadgets & devices" },
];

export function CategorySlider() {
  return (
    /* 3 cols mobile-up → keeps 3x2 grid on all sizes */
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {CATEGORIES.map((cat, i) => (
        <motion.div
          key={cat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, ease: "easeOut" }}
          whileHover={{ scale: 1.04, y: -4 }}
          whileTap={{ scale: 0.97 }}
        >
          <Link
            href={`/products?category=${cat.slug}`}
            className={`flex flex-col items-center justify-center rounded-2xl border bg-gradient-to-br ${cat.bg} ${cat.border} p-4 shadow-sm transition-shadow hover:shadow-md text-center gap-1`}
          >
            <span className="text-3xl sm:text-4xl leading-none">{cat.emoji}</span>
            <span className={`mt-1 text-xs font-bold tracking-wide ${cat.text}`}>{cat.label}</span>
            <span className="hidden text-[10px] text-slate-500 sm:block">{cat.desc}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
