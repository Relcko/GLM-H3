import { DetailStat } from "./primitives";
import { formatCompactCurrency, formatPercent } from "@/marketplace/utils/format";
import type { MarketplaceProperty } from "@/marketplace/types";

export function PropertyMetrics({ property }: { property: MarketplaceProperty }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <DetailStat label="Expected ROI" value={formatPercent(property.expectedRoi)} accent />
      <DetailStat label="Rental Yield" value={formatPercent(property.rentalYield)} />
      <DetailStat label="Appreciation" value={formatPercent(property.appreciationRate)} />
      <DetailStat label="Occupancy" value={formatPercent(property.occupancy, 0)} />
      <DetailStat label="Asset Value" value={formatCompactCurrency(property.totalValue)} />
      <DetailStat label="Token Standard" value="ERC-1155" />
    </div>
  );
}
