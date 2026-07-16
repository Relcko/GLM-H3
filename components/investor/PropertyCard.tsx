"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Button } from "@/components/shared/ui/Button";
import { formatCurrency, formatPercent } from "@/lib/shared/format";
import type { Property } from "@/lib/investor/types";
import { useRouter } from "next/navigation";

interface Props {
  property: Property;
}

export function PropertyCard({ property }: Props) {
  const router = useRouter();

  const statusVariant = {
    available: "success" as const,
    "partially-funded": "warning" as const,
    "fully-funded": "info" as const,
    "under-development": "accent" as const,
    operational: "default" as const,
    sold: "default" as const,
  };

  const riskVariant = {
    low: "success" as const,
    medium: "warning" as const,
    high: "danger" as const,
  };

  return (
    <Card variant="interactive" className="w-full" onClick={() => router.push(`/investor/marketplace/${property.slug}`)}>
      <CardHeader>
        <div className="flex items-center justify-between mb-1">
          <Badge variant={statusVariant[property.status]}>{property.status.replace("-", " ")}</Badge>
          <Badge variant={riskVariant[property.risk]} size="sm">{property.risk} risk</Badge>
        </div>
        <CardTitle className="text-base">{property.name}</CardTitle>
        <CardDescription className="line-clamp-2">{property.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="h-4 w-4 shrink-0">📍</span>
            <span className="truncate">{property.location.city}, {property.location.state}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-text-muted">Type</span><p className="font-medium capitalize">{property.type}</p></div>
            <div><span className="text-text-muted">Token Price</span><p className="font-medium">{formatCurrency(property.valuation.tokenPrice)}</p></div>
            <div><span className="text-text-muted">Annual Return</span><p className="font-medium text-success-base">{property.financials.annualReturn}%</p></div>
            <div><span className="text-text-muted">Net Yield</span><p className="font-medium">{property.financials.netYield}%</p></div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center justify-between">
          <div>
            <p className="text-lg font-bold">{formatCurrency(property.valuation.totalValue)}</p>
            <p className="text-xs text-text-muted">Total Value</p>
          </div>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/investor/marketplace/${property.slug}`); }}>
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
