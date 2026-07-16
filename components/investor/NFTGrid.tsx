"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Button } from "@/components/shared/ui/Button";
import { formatCurrency, formatPercent, formatDate } from "@/lib/shared/format";
import type { NFTProperty } from "@/lib/investor/types";

interface Props {
  nfts: NFTProperty[];
}

export function NFTGrid({ nfts }: Props) {
  const statusVariant = {
    owned: "success" as const,
    listed: "warning" as const,
    fractionalized: "accent" as const,
    pending: "default" as const,
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {nfts.map((nft) => (
        <Card key={nft.id} variant="interactive" className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between mb-1">
              <Badge variant={statusVariant[nft.status]}>{nft.status}</Badge>
              <span className="text-xs text-text-muted">{nft.collectionName}</span>
            </div>
            <CardTitle className="text-base">{nft.name}</CardTitle>
            <CardDescription className="text-xs">Token ID: {nft.tokenId}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-muted">Value</span><p className="font-medium">{formatCurrency(nft.value)}</p></div>
              <div><span className="text-text-muted">Equity Share</span><p className="font-medium">{formatPercent(nft.equityShare / 100)}</p></div>
              <div><span className="text-text-muted">Rental Share</span><p className="font-medium">{formatPercent(nft.rentalShare / 100)}</p></div>
              <div><span className="text-text-muted">Acquired</span><p className="font-medium">{formatDate(nft.acquired)}</p></div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" size="sm" fullWidth>
              {nft.status === "listed" ? "View Listing" : nft.status === "fractionalized" ? "View Fractions" : "View Details"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
