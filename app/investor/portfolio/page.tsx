"use client";

import { usePortfolioSummary } from "@/lib/investor/adapters";
import { PortfolioOverview } from "@/components/investor/PortfolioOverview";
import { PortfolioAllocation } from "@/components/investor/PortfolioAllocation";
import { PerformanceChart } from "@/components/investor/PerformanceChart";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridHalf } from "@/components/shared/layout/Grid";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";

function PortfolioContent() {
  const { data: portfolio, isLoading, error } = usePortfolioSummary();

  if (isLoading) return <SectionLoading />;
  if (error) return <EmptyState title="Failed to load portfolio" description="Please try refreshing the page." />;
  if (!portfolio) return null;

  return (
    <>
      <PortfolioOverview />
      <GridSection>
        <GridHalf>
          <PortfolioAllocation allocation={portfolio.diversification} />
        </GridHalf>
        <GridHalf>
          <PerformanceChart data={portfolio.performanceHistory} />
        </GridHalf>
      </GridSection>
    </>
  );
}

export default function PortfolioPage() {
  return (
    <div>
      <PageHeader
        title="Portfolio"
        description="Track your investment performance and allocation"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Portfolio", href: "/investor/portfolio" },
        ]}
      />
      <ErrorBoundary context="investor-portfolio">
        <PortfolioContent />
      </ErrorBoundary>
    </div>
  );
}
