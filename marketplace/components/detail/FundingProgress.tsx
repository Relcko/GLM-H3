import { PropertyProgress } from "../PropertyStats";
import { fundingRemaining } from "@/marketplace/utils/investment";
import { formatCompactCurrency, formatPercent } from "@/marketplace/utils/format";
import type { MarketplaceProperty } from "@/marketplace/types";

export function FundingProgress({ property }: { property: MarketplaceProperty }) {
  const remaining = fundingRemaining(property);
  return (
    <div className="space-y-4">
      <PropertyProgress value={property.fundingProgress} />
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="dashboard-label text-[0.5rem]">Raised</div>
          <div className="mt-1 text-sm font-medium tabular-nums text-white/90">
            {formatCompactCurrency(property.raisedAmount)}
          </div>
        </div>
        <div>
          <div className="dashboard-label text-[0.5rem]">Target</div>
          <div className="mt-1 text-sm font-medium tabular-nums text-white/90">
            {formatCompactCurrency(property.targetRaise)}
          </div>
        </div>
        <div>
          <div className="dashboard-label text-[0.5rem]">Remaining</div>
          <div className="mt-1 text-sm font-medium tabular-nums text-accent">
            {formatCompactCurrency(remaining)}
          </div>
        </div>
      </div>
      <p className="text-xs text-white/40">
        {formatPercent(property.fundingProgress * 100, 0)} of the offering is funded.
        {property.status === "active" &&
          ` ${formatCompactCurrency(remaining)} still available to allocate.`}
      </p>
    </div>
  );
}
