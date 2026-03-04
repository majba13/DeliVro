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

/* ------------------------------------------------------------------ */
/* MFS phone number step                                                */
/* ------------------------------------------------------------------ */
function MfsForm({ method, onSubmit }: { method: PaymentMethod; onSubmit: (phone: string, txId: string) => void }) {
  const [phone, setPhone] = useState("");
  const [txId, setTxId] = useState("");
  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">{method} Number</label>
        <input
          type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Transaction ID</label>
        <input
          type="text" value={txId} onChange={(e) => setTxId(e.target.value)}
          placeholder="e.g. 8N3XK9FR2"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <button
        onClick={() => onSubmit(phone, txId)}
        disabled={!phone || !txId}
        className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        Confirm Payment
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const { toast } = useToast();

  const [method, setMethod] = useState<PaymentMethod>("STRIPE");
  const [address, setAddress] = useState({ line1: "", city: "", zip: "" });
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const delivery = 4;
  const grandTotal = total + delivery;

  async function placeOrder(extraPayment?: Record<string, string>) {
    if (!user) { toast("Please sign in to checkout", "warning"); router.push("/login"); return; }
    if (items.length === 0) { toast("Your cart is empty", "warning"); return; }
    if (!address.line1 || !address.city) { toast("Please enter a delivery address", "warning"); return; }

    setLoading(true);
    try {
      /* 1. Create order */
      const orderRes = await api.post<{ id: string }>("/api/orders", {
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity, price: i.price })),
        deliveryAddress: address,
        paymentMethod: method,
      });

      /* 2. Create payment */
      await api.post("/api/payments", {
        orderId: orderRes.id,
        method,
        amount: grandTotal,
        currency: "USD",
        ...extraPayment,
      });

      clearCart();
      setPlaced(orderRes.id);
      toast("Order placed successfully! 🎉", "success");
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
          <p className="mt-2 text-slate-500">Order <strong>{placed}</strong> is confirmed.</p>
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
                  type="text" value={address.line1} onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
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

              {/* MFS additional fields */}
              <AnimatePresence>
                {["BKASH", "NAGAD", "ROCKET"].includes(method) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <MfsForm method={method} onSubmit={(phone, txId) => placeOrder({ mfsNumber: phone, transactionId: txId })} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: order summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 font-semibold">Order Summary</h2>
              <ul className="space-y-2 text-sm">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span className="text-slate-700 truncate pr-2">{item.name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Delivery</span>
                  <span className="text-emerald-600">${delivery.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Place order — only shown for non-MFS or COD */}
              {(method === "STRIPE" || method === "BANK" || method === "COD") && (
                <button
                  onClick={() => placeOrder()}
                  disabled={loading || items.length === 0}
                  className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? "Placing order…" : `Pay $${grandTotal.toFixed(2)} · ${method}`}
                </button>
              )}

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
