"use client";

import { useTreasurySnapshot } from "@/lib/investor/adapters";
import { TreasuryPanel } from "@/components/investor/TreasuryPanel";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull, GridHalf } from "@/components/shared/layout/Grid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Table } from "@/components/shared/ui/Table";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";
import { formatCurrency, formatDate } from "@/lib/shared/format";

function TreasuryContent() {
  const { data: treasury, isLoading, error } = useTreasurySnapshot();

  if (isLoading) return <SectionLoading />;
  if (error) return <EmptyState title="Failed to load treasury data" description="Please try refreshing the page." />;
  if (!treasury) return null;

  return (
    <>
      <TreasuryPanel snapshot={treasury} />
      <GridSection>
        <GridHalf>
          <Card>
            <CardHeader>
              <CardTitle>Asset Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {treasury.assetBreakdown.map((asset) => (
                  <div key={asset.type} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{asset.type}</p>
                      <p className="text-xs text-text-muted">{asset.percentage.toFixed(1)}% allocation</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(asset.value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </GridHalf>
        <GridHalf>
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-text-muted">Liquidity Ratio</span><span className="font-medium">{((treasury.liquidAssets / treasury.totalAssets) * 100).toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Total Distributed</span><span className="font-medium">{formatCurrency(treasury.totalDistributed)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Pending Distributions</span><span className="font-medium">{formatCurrency(treasury.pendingDistributions)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Next Distribution</span><span className="font-medium">{formatDate(treasury.nextDistribution)}</span></div>
              </div>
            </CardContent>
          </Card>
        </GridHalf>
      </GridSection>
      <GridSection>
        <GridFull>
          <Card>
            <CardHeader>
              <CardTitle>Distribution History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table
                columns={[
                  { key: "date", header: "Date", render: (d) => formatDate(d.date) },
                  { key: "type", header: "Type", render: (d) => <Badge variant="info">{d.type}</Badge> },
                  { key: "amount", header: "Amount", render: (d) => formatCurrency(d.amount), align: "right" },
                  { key: "status", header: "Status", render: (d) => (
                    <Badge variant={d.status === "completed" ? "success" : d.status === "pending" ? "warning" : "default"}>{d.status}</Badge>
                  )},
                  { key: "perToken", header: "Per Token", render: (d) => formatCurrency(d.perToken), align: "right" },
                ]}
                data={treasury.distributionHistory}
                keyExtractor={(d) => d.date}
              />
            </CardContent>
          </Card>
        </GridFull>
      </GridSection>
    </>
  );
}

export default function TreasuryPage() {
  return (
    <div>
      <PageHeader
        title="Treasury"
        description="Monitor treasury assets and distribution history"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Treasury", href: "/investor/treasury-history" },
        ]}
      />
      <ErrorBoundary context="investor-treasury">
        <TreasuryContent />
      </ErrorBoundary>
    </div>
  );
}
