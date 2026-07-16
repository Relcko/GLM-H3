"use client";

import { Card, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { formatCurrency } from "@/lib/shared/format";
import type { WalletBalance } from "@/lib/investor/types";

interface Props {
  balance: WalletBalance;
}

const TEXT_COLORS = {
  accent: "text-accent-base",
  info: "text-accent-base",
  success: "text-success-base",
  default: "text-text-primary",
} as const;

export function WalletPanel({ balance }: Props) {
  const items = [
    { label: "RLKO", value: formatCurrency(balance.rlko), subtitle: `${balance.rlko.toLocaleString()} RLKO`, color: TEXT_COLORS.accent },
    { label: "ETH", value: formatCurrency(balance.eth * 2500), subtitle: `${balance.eth} ETH`, color: TEXT_COLORS.info },
    { label: "USDC", value: formatCurrency(balance.usdc), subtitle: `${balance.usdc.toLocaleString()} USDC`, color: TEXT_COLORS.success },
    { label: "USDT", value: formatCurrency(balance.usdt), subtitle: `${balance.usdt.toLocaleString()} USDT`, color: TEXT_COLORS.default },
  ];

  return (
    <div className="mb-6">
      <Card variant="elevated">
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Total Wallet Value</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(balance.totalUsdValue)}</p>
            </div>
            <Badge variant="success" size="lg">Connected</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.label} className="rounded-lg bg-bg-tertiary/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{item.label}</p>
                <p className={`mt-1 text-lg font-semibold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-text-muted mt-0.5">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
