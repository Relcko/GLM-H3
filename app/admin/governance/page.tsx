import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchGovernanceOverview } from "@/lib/admin/adapters";
import { Vote, Users, FileText, CheckCircle } from "lucide-react";

export default async function GovernancePage() {
  const gov = await fetchGovernanceOverview();

  return (
    <div className="space-y-6">
      <PageHeader title="Governance" description="Manage platform governance and proposals" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Governance" }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Proposals</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{gov.totalProposals}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle><Vote className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{gov.activeProposals}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Voters</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{gov.totalVoters.toLocaleString()}</div><p className="text-xs text-muted-foreground">{(gov.voterParticipation * 100).toFixed(0)}% participation</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending Execution</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{gov.pendingExecution}</div></CardContent></Card>
      </div>
    </div>
  );
}
