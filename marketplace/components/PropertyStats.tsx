import { formatPercent } from "@/marketplace/utils/format";

/**
 * Funding progress bar. `value` is 0..1. Uses the RC18 health-bar language.
 */
export function PropertyProgress({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="dashboard-label">Funding</span>
        <span className="text-xs font-medium tabular-nums text-white/80">
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="health-bar h-1.5">
        <div
          className="health-bar-fill bg-gradient-to-r from-accent to-accent-blue"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Small per-property stats row: ROI, yield, occupancy. */
export function PropertyStats({
  expectedRoi,
  rentalYield,
  occupancy,
  className = "",
}: {
  expectedRoi: number;
  rentalYield: number;
  occupancy: number;
  className?: string;
}) {
  const items = [
    { label: "Expected ROI", value: formatPercent(expectedRoi) },
    { label: "Rental Yield", value: formatPercent(rentalYield) },
    { label: "Occupancy", value: formatPercent(occupancy, 0) },
  ];
  return (
    <div
      className={`grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 ${className}`}
    >
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-0.5">
          <span className="dashboard-label text-[0.5rem]">{it.label}</span>
          <span className="text-sm font-medium tabular-nums text-white/90">
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}
