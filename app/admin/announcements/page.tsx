import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchAnnouncements } from "@/lib/admin/adapters";
import { Megaphone } from "lucide-react";

const priorityColor = { low: "info" as const, medium: "default" as const, high: "danger" as const, urgent: "danger" as const };

export default async function AnnouncementsPage() {
  const announcements = await fetchAnnouncements();

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Create and manage platform-wide announcements" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Announcements" }]} />
      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Megaphone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2"><p className="text-sm font-medium">{a.title}</p><Badge variant={priorityColor[a.priority]}>{a.priority}</Badge>{!a.published && <Badge variant="default">Draft</Badge>}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">By {a.createdBy} · {new Date(a.createdAt).toLocaleDateString()}{a.publishedAt && ` · Published ${new Date(a.publishedAt).toLocaleDateString()}`}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
