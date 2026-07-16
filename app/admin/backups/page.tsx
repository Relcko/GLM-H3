import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchBackups } from "@/lib/admin/adapters";
import { HardDrive, Download, RotateCcw } from "lucide-react";

export default async function BackupsPage() {
  const backups = await fetchBackups();

  return (
    <div className="space-y-6">
      <PageHeader title="Backups" description="Database and system backup management" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Backups" }]} />
      <Card>
        <CardHeader><CardTitle>Backup History</CardTitle></CardHeader>
        <CardContent>
          {backups.map((bkp) => (
            <div key={bkp.id} className="flex items-center justify-between border-b py-3 last:border-0">
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <div><p className="text-sm font-medium">{bkp.name}</p><p className="text-xs text-muted-foreground">{bkp.type} · {bkp.size}{bkp.createdAt ? ` · ${new Date(bkp.createdAt).toLocaleDateString()}` : ""}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={bkp.status === "completed" ? "success" : bkp.status === "failed" ? "danger" : "info"}>{bkp.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
