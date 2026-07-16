import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Checkbox } from "@/components/shared/ui/Checkbox";

const permissionGroups = [
  { group: "Users", perms: ["user.create", "user.read", "user.update", "user.delete", "user.suspend"] },
  { group: "Properties", perms: ["property.create", "property.read", "property.update", "property.delete", "property.approve"] },
  { group: "Investments", perms: ["investment.read", "investment.approve", "investment.reject", "investment.refund"] },
  { group: "Treasury", perms: ["treasury.read", "treasury.transfer", "treasury.distribute", "treasury.reconcile"] },
  { group: "Governance", perms: ["governance.read", "governance.create", "governance.vote", "governance.execute"] },
  { group: "System", perms: ["system.read", "system.update", "system.maintenance", "system.emergency"] },
];

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Permissions" description="Granular permission management across modules" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Permissions" }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {permissionGroups.map((group) => (
          <Card key={group.group}>
            <CardHeader><CardTitle className="text-lg">{group.group}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.perms.map((perm) => (
                  <div key={perm} className="flex items-center gap-2"><Checkbox id={perm} /><label htmlFor={perm} className="text-sm">{perm}</label></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
