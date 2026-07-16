import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { ProgressIndicator as Progress } from "@/components/shared/loading/ProgressIndicator";
import { fetchAdminProperties } from "@/lib/admin/adapters";

export default async function PropertiesPage() {
  const properties = await fetchAdminProperties();

  return (
    <div className="space-y-6">
      <PageHeader title="Properties" description="Manage real estate asset tokens" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Properties" }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <Badge variant={p.status === "active" ? "success" : p.status === "pending" ? "warning" : "default"}>{p.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{p.type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Token Price</span><span>${p.tokenPrice}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tokens</span><span>{p.availableTokens.toLocaleString()} / {p.totalTokens.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Investors</span><span>{p.investors}</span></div>
                <div className="space-y-1"><div className="flex justify-between text-xs"><span>Funded</span><span>{p.fundedPercentage}%</span></div><Progress value={p.fundedPercentage} className="h-2" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
