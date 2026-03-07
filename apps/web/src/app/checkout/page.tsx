"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ApiError } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
type PaymentMethod = "STRIPE" | "BKASH" | "NAGAD" | "ROCKET" | "BANK" | "COD";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { value: "STRIPE", label: "Card / Stripe", icon: "💳", desc: "Visa, Mastercard, Amex" },
  { value: "BKASH", label: "bKash", icon: "📱", desc: "Mobile payments" },
  { value: "NAGAD", label: "Nagad", icon: "📱", desc: "Mobile payments" },
  { value: "ROCKET", label: "Rocket", icon: "📱", desc: "Dutch-Bangla MFS" },
  { value: "BANK", label: "Bank Transfer", icon: "🏦", desc: "Direct bank transfer" },
  { value: "COD", label: "Cash on Delivery", icon: "💵", desc: "Pay when delivered" },
];

const MFS_METHODS: PaymentMethod[] = ["BKASH", "NAGAD", "ROCKET"];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, total, clearCart, cartLoading } = useCart();
  const { toast } = useToast();

  const [method, setMethod] = useState<PaymentMethod>("STRIPE");
  const [address, setAddress] = useState({ street: "", city: "", zip: "" });
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const delivery = 50; // BDT 50 fixed delivery fee — matches backend
  const grandTotal = total + delivery;

  async function placeOrder() {
    if (!user) { toast("Please sign in to checkout", "warning"); router.push("/login?callbackUrl=/checkout"); return; }
    if (items.length === 0) { toast("Your cart is empty", "warning"); return; }
    if (!address.street || !address.city) { toast("Please enter a delivery address", "warning"); return; }

    setLoading(true);
    try {
      /* 1. Create order — pass local items as fallback in case DB cart sync failed */
      const orderRes = await api.post<{ order: { id: string; total: number } }>("/api/orders", {
        deliveryAddress: {
          street: address.street,
          city: address.city,
          zip: address.zip || undefined,
          country: "Bangladesh",
        },
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity, price: i.price })),
      });
      const orderId = orderRes.order.id;

      /* 2. Create payment record */
      await api.post("/api/payments", {
        orderId,
        method,
        amount: orderRes.order.total,
      });

      /* 3. Clear local cart state (server cart already cleared by order API) */
      clearCart();

      /* 4. Route by method */
      if (MFS_METHODS.includes(method)) {
        // Redirect to dedicated payment page
        router.push(`/payment/${orderId}?method=${method}`);
      } else {
        // COD or Bank → show success here
        setPlaced(orderId);
        toast("Order placed successfully! 🎉", "success");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Order failed. Please try again.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  /* ---- Success screen ---- */
  if (placed) {
    return (
      <main>
        <Navbar />
        <section className="container-main flex flex-col items-center justify-center py-24 text-center">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
            ✅
          </motion.div>
          <h2 className="text-2xl font-bold">Order Placed!</h2>
          <p className="mt-2 text-slate-500">Order <strong>#{placed.slice(-8).toUpperCase()}</strong> is confirmed.</p>
          <div className="mt-8 flex gap-3">
            <Link href="/orders" className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              View Orders
            </Link>
            <Link href="/tracking" className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold hover:bg-slate-50">
              Track Delivery
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <section className="container-main py-10">
        <h1 className="mb-8 text-2xl font-bold">Checkout</h1>
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: address + payment */}
          <div className="space-y-6 lg:col-span-3">
            {/* Delivery address */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 font-semibold">Delivery Address</h2>
              <div className="space-y-3">
                <input
                  type="text" value={address.street} onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                  placeholder="Street address"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    placeholder="City"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                  <input
                    type="text" value={address.zip} onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
                    placeholder="ZIP / Postal code"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 font-semibold">Payment Method</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMethod(opt.value)}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                      method === opt.value ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="mt-1 text-sm font-semibold">{opt.label}</span>
                    <span className="text-xs text-slate-500">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {/* MFS info banner */}
              <AnimatePresence>
                {MFS_METHODS.includes(method) && (
                  <motion.div
                    key="mfs-info"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <p className="text-sm font-medium text-blue-800">
                        📱 {method} Instructions will be shown after placing order
                      </p>
                      <p className="mt-1 text-xs text-blue-600">
                        You will be guided through the payment steps with merchant number and reference.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: order summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 font-semibold">Order Summary</h2>
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">Your cart is empty. <Link href="/" className="text-brand-600 hover:underline">Continue shopping</Link>.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {items.map((item) => (
                    <li key={item.id} className="flex justify-between">
                      <span className="truncate pr-2 text-slate-700">{item.name} × {item.quantity}</span>
                      <span className="shrink-0 font-medium">৳{(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span>৳{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Delivery</span>
                  <span className="text-emerald-600">৳{delivery.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>৳{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={loading || authLoading || cartLoading || !user || items.length === 0}
                className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {loading || cartLoading ? "Loading…" : MFS_METHODS.includes(method)
                  ? `Proceed to ${method} Payment →`
                  : `Confirm Order · ৳${grandTotal.toFixed(2)}`}
              </button>

              {!user && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link> to place an order.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
