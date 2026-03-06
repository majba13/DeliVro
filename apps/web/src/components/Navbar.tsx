"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { CartDrawer } from "@/components/CartDrawer";

const NAV_LINKS = [
  { href: "/", label: "Shop" },
  { href: "/products", label: "Products" },
  { href: "/tracking", label: "Track Order" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { count, setOpen: openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  function handleLogout() {
    logout();
    setProfileOpen(false);
    router.push("/login");
  }

  return (
    <>
      <CartDrawer />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-main flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">D</span>
            DeliVro
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-brand-700 ${pathname === link.href ? "text-brand-700" : "text-slate-600"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Cart button */}
            <button
              onClick={() => openCart(true)}
              className="relative rounded-lg p-2 hover:bg-slate-100"
              aria-label="Open cart"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m5-9v9m4-9v9m5-9l2 9" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>

            {/* Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white uppercase">
                    {user.name.charAt(0)}
                  </span>
                  <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg"
                    >
                      <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-100">{user.email}</div>
                      <Link href="/orders" onClick={() => setProfileOpen(false)} className="block px-3 py-2 text-sm hover:bg-slate-50">My Orders</Link>
                      <Link href="/dashboard" onClick={() => setProfileOpen(false)} className="block px-3 py-2 text-sm hover:bg-slate-50">Dashboard</Link>
                      {(user.role === "SUPER_ADMIN" || user.role === "ADMIN") && (
                        <Link href="/admin" onClick={() => setProfileOpen(false)} className="block px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50">Admin Panel</Link>
                      )}
                      <button onClick={handleLogout} className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Sign out</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Sign in
              </Link>
            )}

            {/* Mobile hamburger */}
            <button className="rounded-lg p-2 hover:bg-slate-100 md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-slate-100 md:hidden"
            >
              <nav className="flex flex-col py-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
