import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchAuditLogs } from "@/lib/admin/adapters";
import { FileSearch, Globe } from "lucide-react";

export default async function AuditLogsPage() {
  const logs = await fetchAuditLogs();

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Immutable record of all platform actions" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit Logs" }]} />
      <Card>
        <CardHeader><CardTitle>Recent Events</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Actor</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Resource</th>
                  <th className="pb-3 font-medium">Details</th>
                  <th className="pb-3 font-medium">IP</th>
                  <th className="pb-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{log.actor}</td>
                    <td className="py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.action}</code></td>
                    <td className="py-3 text-muted-foreground">{log.resource}</td>
                    <td className="py-3 text-muted-foreground">{log.details}</td>
                    <td className="py-3 text-xs text-muted-foreground">{log.ip}</td>
                    <td className="py-3 text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
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
