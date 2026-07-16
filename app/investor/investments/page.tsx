"use client";

import { useInvestments } from "@/lib/investor/adapters";
import { InvestmentCard } from "@/components/investor/InvestmentCard";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull } from "@/components/shared/layout/Grid";
import { Tabs } from "@/components/shared/ui/Tabs";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";

function InvestmentsContent() {
  const { data: investments, isLoading, error } = useInvestments();

  if (isLoading) return <SectionLoading />;
  if (error) return <EmptyState title="Failed to load investments" description="Please try refreshing the page." />;

  const active = investments?.filter((i) => i.status === "active") ?? [];
  const pending = investments?.filter((i) => i.status === "pending") ?? [];
  const settled = investments?.filter((i) => i.status === "settled" || i.status === "exited") ?? [];

  if (!investments || investments.length === 0) {
    return <EmptyState title="No investments yet" description="Start by exploring the marketplace." />;
  }

  return (
    <Tabs
      tabs={[
        {
          id: "active",
          label: "Active",
          content: (
            <GridSection>
              {active.map((inv) => <InvestmentCard key={inv.id} investment={inv} />)}
              {active.length === 0 && <p className="text-text-muted">No active investments.</p>}
            </GridSection>
          ),
          badge: active.length,
        },
        {
          id: "pending",
          label: "Pending",
          content: (
            <GridSection>
              {pending.map((inv) => <InvestmentCard key={inv.id} investment={inv} />)}
              {pending.length === 0 && <p className="text-text-muted">No pending investments.</p>}
            </GridSection>
          ),
          badge: pending.length,
        },
        {
          id: "settled",
          label: "Settled",
          content: (
            <GridSection>
              {settled.map((inv) => <InvestmentCard key={inv.id} investment={inv} />)}
              {settled.length === 0 && <p className="text-text-muted">No settled investments.</p>}
            </GridSection>
          ),
          badge: settled.length,
        },
      ]}
    />
  );
}

export default function InvestmentsPage() {
  return (
    <div>
      <PageHeader
        title="My Investments"
        description="Manage your active and past investments"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Investments", href: "/investor/investments" },
        ]}
      />
      <ErrorBoundary context="investor-investments">
        <InvestmentsContent />
      </ErrorBoundary>
    </div>
  );
}
