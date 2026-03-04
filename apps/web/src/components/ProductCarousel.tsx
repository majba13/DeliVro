"use client";

import { motion } from "framer-motion";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
};

export function ProductCarousel({ products }: { products: Product[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-2 text-sm text-brand-700">{product.category}</div>
          <h3 className="font-semibold">{product.name}</h3>
          <p className="mt-2 text-lg font-bold">${product.price.toFixed(2)}</p>
          <button className="mt-3 w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Add to cart
          </button>
        </motion.div>
      ))}
    </div>
  );
}
