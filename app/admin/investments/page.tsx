import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchAdminInvestments } from "@/lib/admin/adapters";

export default async function InvestmentsPage() {
  const investments = await fetchAdminInvestments();

  return (
    <div className="space-y-6">
      <PageHeader title="Investments" description="Overview of all platform investments" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Investments" }]} />
      <Card>
        <CardHeader><CardTitle>All Investments ({investments.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Investor</th>
                  <th className="pb-3 font-medium">Property</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Tokens</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{inv.investorName}</td>
                    <td className="py-3 text-muted-foreground">{inv.propertyName}</td>
                    <td className="py-3">${inv.amount.toLocaleString()}</td>
                    <td className="py-3">{inv.tokens}</td>
                    <td className="py-3"><Badge variant={inv.status === "active" ? "success" : "warning"}>{inv.status}</Badge></td>
                    <td className="py-3 text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
