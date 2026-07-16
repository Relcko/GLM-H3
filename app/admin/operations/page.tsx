import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { ProgressIndicator as Progress } from "@/components/shared/loading/ProgressIndicator";
import { fetchAdminJobs, fetchAdminMetrics } from "@/lib/admin/adapters";
import { Settings, Timer, Activity, AlertCircle } from "lucide-react";

export default async function OperationsPage() {
  const [jobs, metrics] = await Promise.all([fetchAdminJobs(), fetchAdminMetrics()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Operations" description="Platform operations and background jobs" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Operations" }]} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Jobs</CardTitle><Settings className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{jobs.filter((j) => j.status === "running").length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Queue Depth</CardTitle><Timer className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics.queueDepth}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Failed</CardTitle><AlertCircle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold">{jobs.filter((j) => j.status === "failed").length}</div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Background Jobs</CardTitle></CardHeader><CardContent>
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center justify-between border-b py-3 last:border-0">
            <div><p className="text-sm font-medium">{job.name}</p><p className="text-xs text-muted-foreground">{job.type}</p></div>
            <div className="flex items-center gap-3">
              <div className="w-24"><Progress value={job.progress} className="h-2" /></div>
              <Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "danger" : job.status === "running" ? "info" : "default"}>{job.status}</Badge>
            </div>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}
