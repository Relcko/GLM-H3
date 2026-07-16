import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchTreasuryOverview } from "@/lib/admin/adapters";
import { Wallet, ArrowUpRight, ArrowDownRight, Banknote } from "lucide-react";

export default async function TreasuryPage() {
  const treasury = await fetchTreasuryOverview();

  return (
    <div className="space-y-6">
      <PageHeader title="Treasury" description="Manage platform treasury and distributions" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Treasury" }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Assets</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${(treasury.totalAssets / 1e6).toFixed(2)}M</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Liquid Assets</CardTitle><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${(treasury.liquidAssets / 1e6).toFixed(2)}M</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Invested Assets</CardTitle><ArrowDownRight className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${(treasury.investedAssets / 1e6).toFixed(2)}M</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Distributed</CardTitle><Banknote className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${(treasury.totalDistributed / 1e6).toFixed(2)}M</div></CardContent></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Treasury Accounts</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{treasury.accountCount} active accounts</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Pending Distributions</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${treasury.pendingDistributions.toLocaleString()}</div><p className="text-xs text-muted-foreground">Awaiting approval</p></CardContent></Card>
      </div>
    </div>
  );
}
