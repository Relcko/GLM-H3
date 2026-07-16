import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchAdminUsers } from "@/lib/admin/adapters";
import { Shield, AlertTriangle } from "lucide-react";

export default async function CompliancePage() {
  const users = await fetchAdminUsers();
  const flaggedInvestments = 12;
  const pendingReviews = users.filter((u) => u.status === "pending").length;
  const suspendedAccounts = users.filter((u) => u.status === "suspended").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Compliance" description="Platform compliance and regulatory oversight" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Compliance" }]} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending Reviews</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{pendingReviews}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Flagged Investments</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{flaggedInvestments}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Suspended Accounts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{suspendedAccounts}</div></CardContent></Card>
      </div>
    </div>
  );
}
