"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useTrackingSocket } from "@/hooks/useTrackingSocket";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Timeline step component                                              */
/* ------------------------------------------------------------------ */
const TIMELINE = [
  { status: "PENDING",    label: "Order Placed",       icon: "📋" },
  { status: "CONFIRMED",  label: "Confirmed",           icon: "✅" },
  { status: "PROCESSING", label: "Being Prepared",      icon: "🏪" },
  { status: "DISPATCHED", label: "Out for Delivery",    icon: "🚚" },
  { status: "DELIVERED",  label: "Delivered",           icon: "🎉" },
];

function TrackingContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") ?? "demo-order-1";
  const update = useTrackingSocket(orderId);

  const currentStatus = (update as { status?: string })?.status ?? "DISPATCHED";
  const currentIdx = TIMELINE.findIndex((s) => s.status === currentStatus);

  return (
    <section className="container-main py-10">
      <h1 className="mb-2 text-2xl font-bold">Live Delivery Tracking</h1>
      <p className="mb-8 text-sm text-slate-500">Order: <strong>{orderId}</strong></p>

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
                {i < TIMELINE.length - 1 && (
                  <div className={`absolute hidden`} />
                )}
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
          {currentStatus === "DELIVERED" ? "Your order has been delivered!" : `Status: ${currentStatus.replace(/_/g, " ")}`}
        </p>
      </div>

      {/* Real-time data */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          <h2 className="text-sm font-semibold">Live Updates</h2>
        </div>
        <pre className="overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-300">
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
