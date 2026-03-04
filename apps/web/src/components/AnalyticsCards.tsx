"use client";

const monthlyOrders = [52, 61, 70, 68, 77, 90];

export function AnalyticsCards() {
  const max = Math.max(...monthlyOrders);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">Order Analytics (6 months)</h3>
      <div className="mt-4 flex items-end gap-2">
        {monthlyOrders.map((value, index) => (
          <div key={index} className="flex w-full flex-col items-center gap-1">
            <div className="w-full rounded-t bg-brand-500" style={{ height: `${(value / max) * 120}px` }} />
            <span className="text-xs text-slate-500">M{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
