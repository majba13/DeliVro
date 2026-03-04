"use client";

import { motion } from "framer-motion";

const categories = ["Food", "Groceries", "Stationary", "Medicine", "Wear"];

export function CategorySlider() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
      <motion.div
        className="flex gap-3"
        animate={{ x: [0, -220, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        {[...categories, ...categories].map((category, index) => (
          <div key={`${category}-${index}`} className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            {category}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
