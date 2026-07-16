"use client";

import { useProperties } from "@/lib/investor/adapters";
import { MarketplaceGrid } from "@/components/investor/MarketplaceGrid";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull } from "@/components/shared/layout/Grid";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";

function MarketplaceContent() {
  const { data: properties, isLoading, error } = useProperties();

  if (isLoading) return <SectionLoading />;
  if (error) return <EmptyState title="Failed to load marketplace" description="Please try refreshing the page." />;
  if (!properties || properties.length === 0) {
    return <EmptyState title="No properties available" description="Check back later for new investment opportunities." />;
  }

  return (
    <GridSection>
      <GridFull>
        <MarketplaceGrid properties={properties} />
      </GridFull>
    </GridSection>
  );
}

export default function MarketplacePage() {
  return (
    <div>
      <PageHeader
        title="Property Marketplace"
        description="Discover and invest in premium real estate assets"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Marketplace", href: "/investor/marketplace" },
        ]}
      />
      <ErrorBoundary context="investor-marketplace">
        <MarketplaceContent />
      </ErrorBoundary>
    </div>
  );
}
