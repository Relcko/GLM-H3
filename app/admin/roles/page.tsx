import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";

const roles = [
  { id: "role_admin", name: "Administrator", users: 3, permissions: "Full system access", color: "danger" as const },
  { id: "role_operator", name: "Operator", users: 5, permissions: "Daily operations & monitoring", color: "accent" as const },
  { id: "role_compliance", name: "Compliance Officer", users: 2, permissions: "KYC/AML review & reporting", color: "info" as const },
  { id: "role_investor", name: "Investor", users: 2341, permissions: "Invest, trade, view portfolio", color: "default" as const },
  { id: "role_viewer", name: "Viewer", users: 12, permissions: "Read-only access", color: "default" as const },
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Roles" description="Define and manage user roles" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Roles" }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Badge variant={role.color}>{role.name}</Badge></CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{role.permissions}</p><p className="mt-2 text-xs text-muted-foreground">{role.users} users</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
