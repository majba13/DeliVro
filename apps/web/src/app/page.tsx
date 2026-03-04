import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { CategorySlider } from "@/components/CategorySlider";
import { ProductCarousel } from "@/components/ProductCarousel";
import { Footer } from "@/components/Footer";

const demoProducts = [
  { id: "1", name: "Fresh Salmon", category: "Food", price: 22.5 },
  { id: "2", name: "Organic Rice", category: "Groceries", price: 11.2 },
  { id: "3", name: "Notebook Set", category: "Stationary", price: 7.8 },
  { id: "4", name: "Vitamin Pack", category: "Medicine", price: 18.9 },
  { id: "5", name: "Denim Jacket", category: "Wear", price: 34.7 },
  { id: "6", name: "Mango Juice x6", category: "Food", price: 9.6 },
  { id: "7", name: "Wireless Earbuds", category: "Electronics", price: 49.99 },
  { id: "8", name: "Yoga Mat Pro", category: "Sports", price: 27.0 },
];

const FEATURES = [
  { icon: "⚡", title: "Same-day Delivery", desc: "Express delivery available in select zones. Real-time GPS tracking included." },
  { icon: "🔒", title: "Secure Payments", desc: "Stripe, bKash, Nagad, Rocket, Bank Transfer, and Cash on Delivery accepted." },
  { icon: "🤖", title: "AI Recommendations", desc: "Personalized product suggestions powered by our machine learning engine." },
  { icon: "📱", title: "Works Everywhere", desc: "Progressive Web App — install on any device, works offline." },
];

const STATS = [
  { value: "50,000+", label: "Happy Customers" },
  { value: "2,500+", label: "Products Listed" },
  { value: "200+", label: "Shop Partners" },
  { value: "99.9%", label: "Uptime SLA" },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-900 to-indigo-900 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,rgba(99,102,241,0.3),transparent_70%)]" />
          <div className="container-main relative py-24 md:py-32">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Enterprise E-Commerce &amp; Delivery Platform
              </div>
              <h1 className="text-4xl font-black leading-tight md:text-6xl">
                Everything delivered,<br />
                <span className="text-brand-400">faster &amp; smarter.</span>
              </h1>
              <p className="mt-4 max-w-lg text-base text-slate-300">
                Multi-vendor marketplace with real-time delivery tracking, AI-powered recommendations, and secure multi-channel payments — built for Bangladesh and beyond.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/products" className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-400">
                  Shop Now
                </Link>
                <Link href="/register" className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Become a Seller
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-b border-slate-200 bg-white">
          <div className="container-main grid grid-cols-2 divide-x divide-slate-100 py-6 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="px-6 text-center">
                <p className="text-2xl font-black text-brand-700">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="container-main py-10">
          <h2 className="mb-4 text-xl font-bold">Shop by Category</h2>
          <CategorySlider />
        </section>

        {/* Featured products */}
        <section className="container-main py-4 pb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Featured Products</h2>
            <Link href="/products" className="text-sm font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <ProductCarousel products={demoProducts} />
        </section>

        {/* Features */}
        <section className="bg-slate-50 py-16">
          <div className="container-main">
            <h2 className="mb-2 text-center text-2xl font-bold">Why DeliVro?</h2>
            <p className="mb-10 text-center text-sm text-slate-500">Built with enterprise-grade infrastructure for scale and reliability.</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                  <div className="mb-3 text-3xl">{f.icon}</div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-brand-600 py-16 text-white">
          <div className="container-main text-center">
            <h2 className="text-3xl font-black">Ready to start selling?</h2>
            <p className="mt-2 text-brand-200">Join 200+ shop partners already growing with DeliVro.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/register" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                Open Your Shop
              </Link>
              <Link href="/products" className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Explore Products
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
