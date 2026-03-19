"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useTrackingSocket } from "@/hooks/useTrackingSocket";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

interface Order {
  id: string;
  status: string;
  createdAt: string;
  total: number;
}

/* ------------------------------------------------------------------ */
/* Timeline step component                                              */
/* ------------------------------------------------------------------ */
const TIMELINE = [
  { status: "PENDING",    label: "Order Placed",       icon: "📋" },
  { status: "CONFIRMED",  label: "Confirmed",           icon: "✅" },
  { status: "PREPARING", label: "Being Prepared",      icon: "🏪" },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery",    icon: "🚚" },
  { status: "DELIVERED",  label: "Delivered",           icon: "🎉" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50",
  CONFIRMED: "border-blue-200 bg-blue-50",
  PREPARING: "border-purple-200 bg-purple-50",
  OUT_FOR_DELIVERY: "border-indigo-200 bg-indigo-50",
  DELIVERED: "border-emerald-200 bg-emerald-50",
  CANCELLED: "border-red-200 bg-red-50",
};

function OrderSelector({ onSelect }: { onSelect: (orderId: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    api
      .get<{ orders: Order[] }>("/api/orders")
      .then((data) => {
        setOrders(data.orders ?? []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center text-slate-400">
        <div className="text-5xl">📭</div>
        <p>No orders to track yet</p>
        <Link href="/products" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">Select an order to track:</p>
      {orders.map((order) => (
        <motion.button
          key={order.id}
          onClick={() => onSelect(order.id)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${STATUS_COLORS[order.status] ?? "border-slate-200 bg-slate-50"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Order #{order.id.slice(-8).toUpperCase()}</p>
              <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">৳{order.total}</p>
              <p className="text-xs text-slate-600">{order.status}</p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function TrackingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("orderId") ?? "";
  const update = useTrackingSocket(orderId);

  const handleSelectOrder = (newOrderId: string) => {
    router.push(`/tracking?orderId=${newOrderId}`);
  };

  if (!orderId) {
    return (
      <section className="container-main py-10">
        <h1 className="mb-2 text-2xl font-bold">📍 Live Delivery Tracking</h1>
        <p className="mb-8 text-sm text-slate-500">Track your orders in real-time with live GPS updates and delivery status.</p>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <OrderSelector onSelect={handleSelectOrder} />
        </div>
      </section>
    );
  }

  const currentStatus = (update as { status?: string })?.status ?? "OUT_FOR_DELIVERY";
  const currentIdx = TIMELINE.findIndex((s) => s.status === currentStatus);
  const etaMinutes = (update as { etaMinutes?: number })?.etaMinutes;

  return (
    <section className="container-main py-10">
      <button
        onClick={() => router.push("/tracking")}
        className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        ← Back to Orders
      </button>

      <h1 className="mb-2 text-2xl font-bold">📍 Live Delivery Tracking</h1>
      <p className="mb-8 text-sm text-slate-500">Order: <strong>#{orderId.slice(-8).toUpperCase()}</strong> {etaMinutes && <span>• ETA: <strong>{etaMinutes} mins</strong></span>}</p>

      {/* Timeline */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          {TIMELINE.map((step, i) => {
            const done = i <= currentIdx;
            const current = i === currentIdx;
            return (
              <div key={step.status} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  animate={current ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-colors ${
                    done ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {step.icon}
                </motion.div>
                <p className={`text-center text-[10px] font-medium ${done ? "text-brand-700" : "text-slate-400"}`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
        {/* Connecting line */}
        <div className="relative -mt-14 mb-6 flex items-center px-5">
          <div className="h-0.5 w-full bg-slate-100" />
          <div
            className="absolute left-5 h-0.5 bg-brand-500 transition-all duration-700"
            style={{ width: `${(currentIdx / (TIMELINE.length - 1)) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-center text-sm font-semibold text-brand-700">
          {currentStatus === "DELIVERED" ? "✅ Your order has been delivered!" : currentStatus === "OUT_FOR_DELIVERY" ? "🚚 Out for delivery!" : `Status: ${currentStatus.replace(/_/g, " ")}`}
        </p>
      </div>

      {/* Real-time data */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          <h2 className="text-sm font-semibold">Live Updates</h2>
        </div>
        <pre className="overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-300 max-h-60">
          {JSON.stringify(update ?? { message: "Connecting to delivery feed…" }, null, 2)}
        </pre>
        <p className="mt-2 text-xs text-slate-400">
          Powered by WebSocket → SSE → Firebase RTDB fallback
        </p>
      </div>
    </section>
  );
}

export default function TrackingPage() {
  return (
    <main>
      <Navbar />
      <Suspense fallback={<div className="container-main py-10 text-slate-400">Loading tracker…</div>}>
        <TrackingContent />
      </Suspense>
    </main>
  );
}
