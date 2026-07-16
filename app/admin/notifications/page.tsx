import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { fetchNotifications } from "@/lib/admin/adapters";
import { Bell, Info, AlertTriangle, CheckCircle, AlertOctagon } from "lucide-react";

const typeIcon = { info: Info, warning: AlertTriangle, success: CheckCircle, critical: AlertOctagon };
const typeColor = { info: "default" as const, warning: "secondary" as const, success: "default" as const, critical: "destructive" as const };

export default async function NotificationsPage() {
  const notifications = await fetchNotifications();

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="System and platform notifications" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Notifications" }]} />
      <div className="space-y-3">
        {notifications.map((n) => {
          const Icon = typeIcon[n.type];
          return (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <CardContent className="flex items-start gap-3 p-4">
                <Icon className={`mt-0.5 h-5 w-5 ${n.type === "critical" ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2"><p className="text-sm font-medium">{n.title}</p>{!n.read && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}</div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()} · {n.audience}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
