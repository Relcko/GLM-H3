"use client";

import { useUserNFTs, useNFTCollections } from "@/lib/investor/adapters";
import { NFTGrid } from "@/components/investor/NFTGrid";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull, GridThird } from "@/components/shared/layout/Grid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Tabs } from "@/components/shared/ui/Tabs";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";
import { formatCurrency } from "@/lib/shared/format";

function NFTsContent() {
  const { data: nfts, isLoading: nftsLoading } = useUserNFTs();
  const { data: collections, isLoading: colLoading } = useNFTCollections();

  if (nftsLoading || colLoading) return <SectionLoading />;

  return (
    <Tabs
      tabs={[
        {
          id: "my-nfts",
          label: "My NFTs",
          content: nfts && nfts.length > 0 ? (
            <GridSection>
              <NFTGrid nfts={nfts} />
            </GridSection>
          ) : (
            <EmptyState title="No NFTs owned" description="Acquire property NFTs through the marketplace." />
          ),
        },
        {
          id: "collections",
          label: "Collections",
          content: collections && collections.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((col) => (
                <Card key={col.id} variant="interactive" className="w-full">
                  <CardHeader>
                    <CardTitle>{col.name}</CardTitle>
                    <Badge variant="accent">{col.symbol}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-text-muted">Supply</span><p className="font-medium">{col.totalSupply.toLocaleString()}</p></div>
                      <div><span className="text-text-muted">Floor</span><p className="font-medium">{formatCurrency(col.floorPrice)} ETH</p></div>
                      <div><span className="text-text-muted">24h Vol</span><p className="font-medium">{formatCurrency(col.volume24h)}</p></div>
                      <div><span className="text-text-muted">Owners</span><p className="font-medium">{col.owners.toLocaleString()}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No collections" description="No NFT collections available." />
          ),
        },
      ]}
    />
  );
}

export default function NFTsPage() {
  return (
    <div>
      <PageHeader
        title="Real Estate NFTs"
        description="Browse your real estate-backed NFT collection"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "NFTs", href: "/investor/nfts" },
        ]}
      />
      <ErrorBoundary context="investor-nfts">
        <NFTsContent />
      </ErrorBoundary>
    </div>
  );
}
