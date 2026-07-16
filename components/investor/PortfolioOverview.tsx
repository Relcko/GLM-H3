"use client";

import { usePortfolioSummary } from "@/lib/investor/adapters";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { formatCurrency, formatPercent } from "@/lib/shared/format";

export function PortfolioOverview() {
  const { data: portfolio } = usePortfolioSummary();

  if (!portfolio) return null;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card variant="dashboard">
        <CardContent><p className="text-xs font-medium uppercase tracking-wider text-text-muted">Total Invested</p><p className="mt-1 text-xl font-semibold">{formatCurrency(portfolio.totalInvested)}</p></CardContent>
      </Card>
      <Card variant="dashboard">
        <CardContent><p className="text-xs font-medium uppercase tracking-wider text-text-muted">Current Value</p><p className="mt-1 text-xl font-semibold text-accent-base">{formatCurrency(portfolio.currentValue)}</p></CardContent>
      </Card>
      <Card variant="dashboard">
        <CardContent><p className="text-xs font-medium uppercase tracking-wider text-text-muted">Total Return</p><p className="mt-1 text-xl font-semibold text-success-base">+{formatCurrency(portfolio.totalReturn)}</p></CardContent>
      </Card>
      <Card variant="dashboard">
        <CardContent><p className="text-xs font-medium uppercase tracking-wider text-text-muted">Return %</p><p className="mt-1 text-xl font-semibold text-success-base">{formatPercent(portfolio.returnPercentage / 100)}</p></CardContent>
      </Card>
    </div>
  );
}
