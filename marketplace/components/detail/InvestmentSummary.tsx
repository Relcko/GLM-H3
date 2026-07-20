import { DetailStat } from "./primitives";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/marketplace/utils/format";
import type { MarketplaceProperty } from "@/marketplace/types";

export function InvestmentSummary({ property }: { property: MarketplaceProperty }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <DetailStat label="Target Raise" value={formatCompactCurrency(property.targetRaise)} />
      <DetailStat label="Raised" value={formatCompactCurrency(property.raisedAmount)} accent />
      <DetailStat
        label="Funding"
        value={formatPercent(property.fundingProgress * 100, 0)}
      />
      <DetailStat label="Min Investment" value={formatCurrency(property.minInvestment)} />
      <DetailStat label="Price / Fraction" value={formatCurrency(property.tokenPrice)} />
      <DetailStat
        label="Available"
        value={`${formatNumber(property.availableFractions)}`}
        sub="fractions"
      />
    </div>
  );
}
