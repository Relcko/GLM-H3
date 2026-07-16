"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { formatCurrency } from "@/lib/shared/format";
import type { AssetAllocation } from "@/lib/investor/types";

interface Props {
  allocation: AssetAllocation[];
}

export function PortfolioAllocation({ allocation }: Props) {
  const total = allocation.reduce((s, a) => s + a.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="relative mb-4 flex h-3 w-full overflow-hidden rounded-full bg-bg-tertiary"
          role="img"
          aria-label={`Portfolio allocation across ${allocation.length} asset types`}
        >
          {allocation.map((a) => (
            <div
              key={a.category}
              style={{ width: `${a.percentage}%`, backgroundColor: a.color }}
              className="transition-all duration-300 hover:opacity-80 first:rounded-l-full last:rounded-r-full"
              title={`${a.category}: ${a.percentage.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="space-y-2">
          {allocation.map((a) => (
            <div
              key={a.category}
              className="group flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: a.color }}
                />
                <span className="text-sm text-text-primary">{a.category}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium tabular-nums">{formatCurrency(a.value)}</p>
                <p className="text-[11px] tabular-nums text-text-muted">{a.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
