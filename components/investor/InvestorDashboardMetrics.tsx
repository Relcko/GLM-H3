"use client";

import { Card, CardContent } from "@/components/shared/ui/Card";
import { formatCurrency, formatPercent } from "@/lib/shared/format";
import type { InvestorMetrics } from "@/lib/investor/types";

const TEXT_COLORS = {
  default: "text-text-primary",
  success: "text-success-base",
  accent: "text-accent-base",
  info: "text-accent-base",
  warning: "text-warning-base",
  danger: "text-danger-base",
} as const;

function computeDailyChange(value: number, totalReturn: number): { change: number; percent: number } {
  const change = totalReturn / 365;
  const percent = (change / value) * 100;
  return { change, percent };
}

export function InvestorDashboardMetrics({ metrics }: Props) {
  const daily = computeDailyChange(metrics.totalPortfolioValue, metrics.totalReturn);
  const isUp = daily.change >= 0;

  const items = [
    {
      label: "Portfolio Value",
      value: formatCurrency(metrics.totalPortfolioValue),
      color: TEXT_COLORS.accent,
      subtitle: undefined as string | undefined,
      featured: true,
    },
    {
      label: "Today's Change",
      value: `${isUp ? "+" : ""}${formatCurrency(daily.change)} (${isUp ? "+" : ""}${daily.percent.toFixed(2)}%)`,
      color: isUp ? TEXT_COLORS.success : TEXT_COLORS.danger,
      subtitle: undefined,
      featured: false,
    },
    {
      label: "Total Return",
      value: `+${formatCurrency(metrics.totalReturn)} (${formatPercent(metrics.returnPercentage / 100)})`,
      color: TEXT_COLORS.success,
      subtitle: undefined,
      featured: false,
    },
    {
      label: "Active Investments",
      value: metrics.activeInvestments.toString(),
      color: TEXT_COLORS.info,
      subtitle: `${metrics.pendingTransactions} pending`,
      featured: false,
    },
    {
      label: "Next Distribution",
      value: metrics.nextDistribution ? formatCurrency(metrics.nextDistribution.amount) : "N/A",
      color: TEXT_COLORS.warning,
      subtitle: metrics.nextDistribution?.date ? `Expected: ${metrics.nextDistribution.date}` : undefined,
      featured: false,
    },
  ];

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <Card
          key={item.label}
          variant="dashboard"
          className={item.featured ? "lg:col-span-1" : ""}
        >
          <CardContent>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">{item.label}</p>
            <p className={`mt-1.5 text-lg font-semibold ${item.color}`}>{item.value}</p>
            {item.subtitle && <p className="mt-0.5 text-[11px] text-text-muted">{item.subtitle}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface Props {
  metrics: InvestorMetrics;
}
