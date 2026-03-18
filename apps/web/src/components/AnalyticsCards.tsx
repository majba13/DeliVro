"use client";

interface AnalyticsPoint {
  label: string;
  value: number;
}

interface AnalyticsCardsProps {
  title?: string;
  data?: AnalyticsPoint[];
}

const fallbackData: AnalyticsPoint[] = [
  { label: "PENDING", value: 12 },
  { label: "CONFIRMED", value: 18 },
  { label: "PREPARING", value: 9 },
  { label: "ON WAY", value: 14 },
  { label: "DELIVERED", value: 42 },
];

export function AnalyticsCards({ title = "Order Analytics", data = fallbackData }: AnalyticsCardsProps) {
  const source = data.length > 0 ? data : fallbackData;
  const max = Math.max(...source.map((p) => p.value), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <div className="mt-4 flex items-end gap-2">
        {source.map((point) => (
          <div key={point.label} className="flex w-full flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-brand-500"
              style={{ height: `${Math.max(8, (point.value / max) * 120)}px` }}
              title={`${point.label}: ${point.value}`}
            />
            <span className="text-[10px] text-slate-500">{point.label.slice(0, 7)}</span>
            <span className="text-[10px] font-semibold text-slate-700">{point.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
