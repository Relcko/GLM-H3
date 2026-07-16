import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { ProgressIndicator as Progress } from "@/components/shared/loading/ProgressIndicator";
import { fetchSystemHealth } from "@/lib/admin/adapters";
import { Activity, Database, Cpu, HardDrive, Wifi } from "lucide-react";

export default async function MonitoringPage() {
  const health = await fetchSystemHealth();

  const services = [
    { name: "Database", status: health.database, icon: Database },
    { name: "Blockchain", status: health.blockchain, icon: Wifi },
    { name: "API Gateway", status: "connected" as const, icon: Activity },
    { name: "Message Queue", status: "connected" as const, icon: Activity },
    { name: "Cache Layer", status: "connected" as const, icon: Cpu },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Monitoring" description="System and infrastructure monitoring" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Monitoring" }]} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">CPU Usage</CardTitle><Cpu className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(health.cpu * 100).toFixed(0)}%</div><Progress value={health.cpu * 100} className="mt-2 h-2" /></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Memory</CardTitle><HardDrive className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(health.memory * 100).toFixed(0)}%</div><Progress value={health.memory * 100} className="mt-2 h-2" /></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Disk</CardTitle><HardDrive className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(health.disk * 100).toFixed(0)}%</div><Progress value={health.disk * 100} className="mt-2 h-2" /></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Service Status</CardTitle></CardHeader><CardContent>
        {services.map((svc) => (
          <div key={svc.name} className="flex items-center justify-between border-b py-3 last:border-0">
            <div className="flex items-center gap-2"><svc.icon className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{svc.name}</span></div>
            <Badge variant={svc.status === "connected" ? "success" : "danger"}>{svc.status}</Badge>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}
