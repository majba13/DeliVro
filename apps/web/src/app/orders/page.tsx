"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items?: OrderItem[];
}

/* ------------------------------------------------------------------ */
/* Status badge                                                         */
/* ------------------------------------------------------------------ */
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  DISPATCHED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Demo data                                                            */
/* ------------------------------------------------------------------ */
const DEMO_ORDERS: Order[] = [
  { id: "ORD-001", status: "DELIVERED", total: 63.9, paymentMethod: "STRIPE", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), items: [{ productName: "Fresh Atlantic Salmon", quantity: 2, price: 22.5 }, { productName: "Multi-Vitamin Pack", quantity: 1, price: 18.9 }] },
  { id: "ORD-002", status: "DISPATCHED", total: 55.2, paymentMethod: "BKASH", createdAt: new Date(Date.now() - 86400000).toISOString(), items: [{ productName: "Organic Basmati Rice 5kg", quantity: 3, price: 11.2 }, { productName: "Green Tea 100 bags", quantity: 2, price: 8.4 }] },
  { id: "ORD-003", status: "PENDING", total: 34.7, paymentMethod: "COD", createdAt: new Date().toISOString(), items: [{ productName: "Classic Denim Jacket", quantity: 1, price: 34.7 }] },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  /* Guard */
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ orders: Order[] }>("/api/orders/my")
      .then((data) => {
        if (data.orders?.length) setOrders(data.orders);
        else setOrders(DEMO_ORDERS);
      })
      .catch(() => setOrders(DEMO_ORDERS))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || (!user && !loading)) return null;

  return (
    <main>
      <Navbar />
      <section className="container-main py-10">
        <h1 className="mb-2 text-2xl font-bold">My Orders</h1>
        <p className="mb-8 text-sm text-slate-500">Track and manage all your orders.</p>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No orders yet.</p>
            <Link href="/products" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  className="flex w-full items-center justify-between p-4 text-left"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-semibold">{order.id}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.paymentMethod}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">${order.total.toFixed(2)}</span>
                    {order.status === "DISPATCHED" || order.status === "PROCESSING" ? (
                      <Link
                        href={`/tracking?orderId=${order.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        Track
                      </Link>
                    ) : null}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 text-slate-400 transition-transform ${expanded === order.id ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expanded === order.id && order.items && (
                  <div className="border-t border-slate-100 px-4 pb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-400">
                          <th className="py-2 font-medium">Item</th>
                          <th className="py-2 font-medium text-center">Qty</th>
                          <th className="py-2 font-medium text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, i) => (
                          <tr key={i} className="border-t border-slate-50">
                            <td className="py-1.5">{item.productName}</td>
                            <td className="py-1.5 text-center text-slate-500">{item.quantity}</td>
                            <td className="py-1.5 text-right font-medium">${(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
