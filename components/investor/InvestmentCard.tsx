"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Button } from "@/components/shared/ui/Button";
import { formatCurrency, formatPercent, formatDate } from "@/lib/shared/format";
import type { Investment } from "@/lib/investor/types";

interface Props {
  investment: Investment;
}

export function InvestmentCard({ investment }: Props) {
  const statusVariant = {
    active: "success" as const,
    pending: "warning" as const,
    settled: "default" as const,
    exited: "default" as const,
  };

  return (
    <Card variant="interactive" className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between mb-1">
          <Badge variant={statusVariant[investment.status]}>{investment.status}</Badge>
          {investment.nextDistribution && <span className="text-xs text-text-muted">Next: {formatDate(investment.nextDistribution)}</span>}
        </div>
        <CardTitle className="text-base">{investment.propertyName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-text-muted">Invested</span><p className="font-medium">{formatCurrency(investment.investedAmount)}</p></div>
          <div><span className="text-text-muted">Current Value</span><p className="font-medium text-accent-base">{formatCurrency(investment.currentValue)}</p></div>
          <div><span className="text-text-muted">Return</span><p className={`font-medium ${investment.returnAmount >= 0 ? "text-success-base" : "text-danger-base"}`}>{investment.returnAmount >= 0 ? "+" : ""}{formatCurrency(investment.returnAmount)}</p></div>
          <div><span className="text-text-muted">Return %</span><p className={`font-medium ${investment.returnPercentage >= 0 ? "text-success-base" : "text-danger-base"}`}>{investment.returnPercentage >= 0 ? "+" : ""}{formatPercent(investment.returnPercentage / 100)}</p></div>
          <div><span className="text-text-muted">Tokens</span><p className="font-medium">{investment.tokensOwned.toLocaleString()} @ {formatCurrency(investment.tokenPrice)}</p></div>
          <div><span className="text-text-muted">Purchased</span><p className="font-medium">{formatDate(investment.purchaseDate)}</p></div>
        </div>
        {investment.distributions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">Recent Distributions</p>
            <div className="space-y-1">
              {investment.distributions.slice(-3).map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">{formatDate(d.date)}</span>
                  <span className="font-medium">{formatCurrency(d.amount)}</span>
                  <Badge variant={d.status === "paid" ? "success" : "warning"} size="sm">{d.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
