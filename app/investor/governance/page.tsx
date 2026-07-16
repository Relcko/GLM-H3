"use client";

import { useProposals, useGovernanceStats } from "@/lib/investor/adapters";
import { GovernancePanel } from "@/components/investor/GovernancePanel";
import { ProposalCard } from "@/components/investor/ProposalCard";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull } from "@/components/shared/layout/Grid";
import { Tabs } from "@/components/shared/ui/Tabs";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";

function GovernanceContent() {
  const { data: proposals, isLoading: propLoading } = useProposals();
  const { data: stats, isLoading: statsLoading } = useGovernanceStats();

  if (propLoading || statsLoading) return <SectionLoading />;

  const active = proposals?.filter((p) => p.status === "active") ?? [];
  const passed = proposals?.filter((p) => p.status === "passed" || p.status === "executed") ?? [];
  const other = proposals?.filter((p) => !["active", "passed", "executed"].includes(p.status)) ?? [];

  return (
    <>
      {stats && <GovernancePanel stats={stats} />}
      <GridSection>
        <GridFull>
          <Tabs
            tabs={[
              {
                id: "active",
                label: "Active",
                content: active.length > 0 ? (
                  <div className="space-y-4">{active.map((p) => <ProposalCard key={p.id} proposal={p} />)}</div>
                ) : <EmptyState title="No active proposals" description="Check back when new proposals are created." />,
                badge: active.length,
              },
              {
                id: "passed",
                label: "Passed",
                content: passed.length > 0 ? (
                  <div className="space-y-4">{passed.map((p) => <ProposalCard key={p.id} proposal={p} />)}</div>
                ) : <EmptyState title="No passed proposals" description="No proposals have passed yet." />,
              },
              {
                id: "all",
                label: "All Proposals",
                content: proposals && proposals.length > 0 ? (
                  <div className="space-y-4">{proposals.map((p) => <ProposalCard key={p.id} proposal={p} />)}</div>
                ) : <EmptyState title="No proposals" description="The governance system is being initialized." />,
              },
            ]}
          />
        </GridFull>
      </GridSection>
    </>
  );
}

export default function GovernancePage() {
  return (
    <div>
      <PageHeader
        title="Governance"
        description="Participate in platform governance and voting"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Governance", href: "/investor/governance" },
        ]}
      />
      <ErrorBoundary context="investor-governance">
        <GovernanceContent />
      </ErrorBoundary>
    </div>
  );
}
