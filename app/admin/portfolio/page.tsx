import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchAdminProperties, fetchAdminInvestments } from "@/lib/admin/adapters";
import { PieChart, TrendingUp } from "lucide-react";

export default async function PortfolioPage() {
  const [properties, investments] = await Promise.all([fetchAdminProperties(), fetchAdminInvestments()]);
  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalTokens = investments.reduce((s, i) => s + i.tokens, 0);
  const totalPropertyValue = properties.reduce((s, p) => s + p.tokenPrice * p.totalTokens, 0);
  const fundedValue = properties.reduce((s, p) => s + p.tokenPrice * p.totalTokens * (p.fundedPercentage / 100), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Portfolio Oversight" description="Aggregated view of all platform investments" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Portfolio" }]} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Invested</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalInvested.toLocaleString()}</div><p className="text-xs text-muted-foreground">{totalTokens.toLocaleString()} tokens across {investments.length} investments</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Portfolio Value</CardTitle><PieChart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalPropertyValue.toLocaleString()}</div><p className="text-xs text-muted-foreground">${fundedValue.toLocaleString()} currently funded</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Properties</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{properties.length}</div><p className="text-xs text-muted-foreground">{properties.filter((p) => p.status === "active").length} active · {properties.filter((p) => p.status === "pending").length} pending</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Property Allocation</CardTitle></CardHeader>
        <CardContent>
          {properties.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b py-2 last:border-0">
              <div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.type}</p></div>
              <div className="text-right"><p className="text-sm">${(p.tokenPrice * p.totalTokens).toLocaleString()}</p><p className="text-xs text-muted-foreground">{p.fundedPercentage}% funded</p></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
