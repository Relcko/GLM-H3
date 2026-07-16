import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchAdminProperties } from "@/lib/admin/adapters";

export default async function MarketplacePage() {
  const properties = await fetchAdminProperties();

  return (
    <div className="space-y-6">
      <PageHeader title="Marketplace" description="Monitor and manage the property token marketplace" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Marketplace" }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {properties.filter((p) => p.status === "active" || p.status === "pending").map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <Badge variant={p.status === "active" ? "success" : "warning"}>{p.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Price per Token</span><span className="font-medium">${p.tokenPrice}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Available</span><span className="font-medium">{p.availableTokens.toLocaleString()} tokens</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Value</span><span className="font-medium">${(p.tokenPrice * p.totalTokens).toLocaleString()}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
