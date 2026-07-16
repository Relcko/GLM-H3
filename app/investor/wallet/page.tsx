"use client";

import { useWalletBalance, useTransactions } from "@/lib/investor/adapters";
import { WalletPanel } from "@/components/investor/WalletPanel";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull } from "@/components/shared/layout/Grid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Table } from "@/components/shared/ui/Table";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";
import { formatCurrency, formatDate, shortenAddress } from "@/lib/shared/format";
import { Button } from "@/components/shared/ui/Button";

function WalletContent() {
  const { data: balance, isLoading: balLoading } = useWalletBalance();
  const { data: transactions, isLoading: txLoading } = useTransactions();

  if (balLoading || txLoading) return <SectionLoading />;

  return (
    <>
      {balance && <WalletPanel balance={balance} />}
      <GridSection>
        <GridFull>
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions && transactions.length > 0 ? (
                <Table
                  columns={[
                    { key: "type", header: "Type", render: (t) => (
                      <Badge variant={t.type === "dividend" || t.type === "claim" ? "success" : t.type === "investment" ? "accent" : t.type === "transfer" ? "info" : "default"} size="sm">
                        {t.type}
                      </Badge>
                    )},
                    { key: "amount", header: "Amount", render: (t) => formatCurrency(t.amount), align: "right" },
                    { key: "token", header: "Token", render: (t) => <Badge variant="default" size="sm">{t.token}</Badge> },
                    { key: "status", header: "Status", render: (t) => (
                      <Badge variant={t.status === "confirmed" ? "success" : t.status === "pending" ? "warning" : "danger"} size="sm">{t.status}</Badge>
                    )},
                    { key: "date", header: "Date", render: (t) => <span className="text-sm text-text-muted">{formatDate(t.timestamp)}</span> },
                    { key: "hash", header: "Tx Hash", render: (t) => <span className="text-xs font-mono text-text-muted">{shortenAddress(t.hash)}</span> },
                  ]}
                  data={transactions}
                  keyExtractor={(t) => t.hash}
                />
              ) : (
                <EmptyState title="No transactions" description="Your transaction history will appear here." />
              )}
            </CardContent>
          </Card>
        </GridFull>
      </GridSection>
    </>
  );
}

export default function WalletPage() {
  return (
    <div>
      <PageHeader
        title="Wallet"
        description="Manage your digital wallet and transactions"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Wallet", href: "/investor/wallet" },
        ]}
      />
      <ErrorBoundary context="investor-wallet">
        <WalletContent />
      </ErrorBoundary>
    </div>
  );
}
