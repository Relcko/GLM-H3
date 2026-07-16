"use client";

import { Card, CardContent } from "@/components/shared/ui/Card";
import { formatCurrency } from "@/lib/shared/format";
import type { TreasurySnapshot } from "@/lib/investor/types";

interface Props {
  snapshot: TreasurySnapshot;
}

export function TreasuryPanel({ snapshot }: Props) {
  const items = [
    { label: "Total Assets", value: formatCurrency(snapshot.totalAssets) },
    { label: "Liquid Assets", value: formatCurrency(snapshot.liquidAssets) },
    { label: "Invested Assets", value: formatCurrency(snapshot.investedAssets) },
    { label: "Total Distributed", value: formatCurrency(snapshot.totalDistributed) },
  ];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} variant="dashboard">
          <CardContent>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{item.label}</p>
            <p className="mt-1 text-xl font-semibold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
