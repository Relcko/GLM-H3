import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { ProgressIndicator as Progress } from "@/components/shared/loading/ProgressIndicator";
import { fetchAdminUsers } from "@/lib/admin/adapters";
import { Scan, CheckCircle, XCircle, Clock } from "lucide-react";

export default async function KycAmlPage() {
  const users = await fetchAdminUsers();
  const tierCounts = { none: 0, tier_1: 0, tier_2: 0, tier_3: 0 };
  users.forEach((u) => { const t = u.kycLevel as keyof typeof tierCounts; if (t in tierCounts) tierCounts[t]++; });

  return (
    <div className="space-y-6">
      <PageHeader title="KYC / AML" description="Know Your Customer and Anti-Money Laundering checks" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "KYC/AML" }]} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">No KYC</CardTitle><XCircle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold">{tierCounts.none}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tier 1</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{tierCounts.tier_1}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tier 2</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{tierCounts.tier_2}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tier 3</CardTitle><Scan className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{tierCounts.tier_3}</div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>KYC Distribution</CardTitle></CardHeader><CardContent>
        {Object.entries(tierCounts).map(([tier, count]) => (
          <div key={tier} className="flex items-center gap-4 py-2">
            <span className="w-20 text-sm capitalize">{tier.replace("_", " ")}</span>
            <Progress value={users.length > 0 ? (count / users.length) * 100 : 0} className="flex-1" />
            <span className="w-10 text-right text-sm text-muted-foreground">{count}</span>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}
