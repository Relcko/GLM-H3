import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchAdminUsers } from "@/lib/admin/adapters";

export default async function UsersPage() {
  const users = await fetchAdminUsers();

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage platform users and accounts" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users" }]} />
      <Card>
        <CardHeader><CardTitle>All Users ({users.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">KYC</th>
                  <th className="pb-3 font-medium">MFA</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{u.name}</td>
                    <td className="py-3 text-muted-foreground">{u.email}</td>
                    <td className="py-3"><Badge variant="default">{u.role}</Badge></td>
                    <td className="py-3">{u.kycLevel}</td>
                    <td className="py-3">{u.mfaEnabled ? "Yes" : "No"}</td>
                    <td className="py-3"><Badge variant={u.status === "active" ? "success" : u.status === "suspended" ? "danger" : "warning"}>{u.status}</Badge></td>
                    <td className="py-3 text-xs text-muted-foreground">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}</td>
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
