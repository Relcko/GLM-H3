import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { ProgressIndicator as Progress } from "@/components/shared/loading/ProgressIndicator";
import { fetchAdminJobs } from "@/lib/admin/adapters";
import { Timer, Play, CheckCircle, XCircle, Clock } from "lucide-react";

export default async function JobsPage() {
  const jobs = await fetchAdminJobs();

  return (
    <div className="space-y-6">
      <PageHeader title="Jobs" description="Scheduled and background job management" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Jobs" }]} />
      <Card>
        <CardHeader><CardTitle>Scheduled Jobs</CardTitle></CardHeader>
        <CardContent>
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between border-b py-3 last:border-0">
              <div><p className="text-sm font-medium">{job.name}</p><p className="text-xs text-muted-foreground">{job.type} · Started {job.startedAt ? new Date(job.startedAt).toLocaleString() : "Queued"}</p>{job.error && <p className="text-xs text-destructive">{job.error}</p>}</div>
              <div className="flex items-center gap-3">
                <div className="w-24"><Progress value={job.progress} className="h-2" /></div>
                <Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "danger" : job.status === "running" ? "info" : "default"}>{job.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
