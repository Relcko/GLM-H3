import { formatCompactCurrency, formatPercent } from "@/marketplace/utils/format";

export function MarketplaceHeader({
  totalProperties,
  totalTargetRaise,
  avgRoi,
  activeCount,
}: {
  totalProperties: number;
  totalTargetRaise: number;
  avgRoi: number;
  activeCount: number;
}) {
  const stats = [
    { label: "Properties", value: String(totalProperties) },
    { label: "Total Raise", value: formatCompactCurrency(totalTargetRaise) },
    { label: "Avg. Expected ROI", value: formatPercent(avgRoi) },
    { label: "Active Listings", value: String(activeCount) },
  ];

  return (
    <header className="mb-6">
      <div className="mb-2 flex items-center gap-3">
        <span className="dashboard-accent-line" />
        <span className="dashboard-label">Relcko Marketplace</span>
      </div>
      <h1 className="font-display text-3xl font-light tracking-[-0.02em] text-white/95 sm:text-4xl">
        Tokenized Real Estate
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
        Browse fractional ownership in premium properties worldwide — each backed
        by an SPV, verified on-chain, and reachable from $1.
      </p>

      <div className="summary-band mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/[0.015] px-5 py-4">
            <div className="dashboard-label text-[0.5rem]">{s.label}</div>
            <div className="institutional-figure mt-1 text-xl text-white/90">
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </header>
  );
}
