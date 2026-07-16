"use client";

import { useInvestorMetrics } from "@/lib/investor/adapters";
import { usePortfolioSummary } from "@/lib/investor/adapters";
import { InvestorDashboardMetrics } from "@/components/investor/InvestorDashboardMetrics";
import { PortfolioAllocation } from "@/components/investor/PortfolioAllocation";
import { PerformanceChart } from "@/components/investor/PerformanceChart";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull, GridHalf, GridThird } from "@/components/shared/layout/Grid";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { formatCurrency } from "@/lib/shared/format";
import Link from "next/link";

function DashboardContent() {
  const { data: metrics, isLoading, error } = useInvestorMetrics();
  const { data: portfolio } = usePortfolioSummary();

  if (isLoading) return <SectionLoading />;
  if (error) return <EmptyState title="Failed to load dashboard" description="Please try refreshing the page." />;
  if (!metrics) return null;

  return (
    <>
      <InvestorDashboardMetrics metrics={metrics} />
      <GridSection className="mb-6">
        <GridHalf>
          {portfolio && <PortfolioAllocation allocation={portfolio.diversification} />}
        </GridHalf>
        <GridHalf>
          {portfolio && <PerformanceChart data={portfolio.performanceHistory} />}
        </GridHalf>
      </GridSection>
      <GridSection>
        <GridThird>
          <Card>
            <CardHeader>
              <CardTitle>Recent Investments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/50">No recent investments yet.</p>
              <Link href="/investor/marketplace">
                <Button variant="secondary" size="sm" className="mt-4">Explore Marketplace</Button>
              </Link>
            </CardContent>
          </Card>
        </GridThird>
        <GridThird>
          <Card>
            <CardHeader>
              <CardTitle>Governance Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/50">{metrics.pendingProposals} active proposal{metrics.pendingProposals !== 1 ? "s" : ""} awaiting your vote.</p>
              <Link href="/investor/governance">
                <Button variant="secondary" size="sm" className="mt-4">View Proposals</Button>
              </Link>
            </CardContent>
          </Card>
        </GridThird>
        <GridThird>
          <Card>
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/50">AI analysis of your portfolio is available.</p>
              <Link href="/investor/ai-advisor">
                <Button variant="secondary" size="sm" className="mt-4">View Insights</Button>
              </Link>
            </CardContent>
          </Card>
        </GridThird>
      </GridSection>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your portfolio at a glance"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Dashboard", href: "/investor/dashboard" },
        ]}
        action={
          <Link href="/investor/marketplace">
            <Button>Discover Investments</Button>
          </Link>
        }
      />
      <ErrorBoundary context="investor-dashboard">
        <DashboardContent />
      </ErrorBoundary>
    </div>
  );
}
