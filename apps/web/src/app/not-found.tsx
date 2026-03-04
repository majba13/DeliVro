import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page Not Found" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 to-indigo-50 px-4 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-lg text-5xl">
        📦
      </div>
      <div>
        <h1 className="text-6xl font-black text-brand-700">404</h1>
        <h2 className="mt-2 text-xl font-semibold">Page not found</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Looks like this page got lost in delivery. Let&apos;s get you back on track.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Go Home
        </Link>
        <Link href="/products" className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold hover:bg-slate-50">
          Browse Products
        </Link>
      </div>
    </div>
  );
}
