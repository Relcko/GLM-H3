"use client";

import { useNotificationSettings } from "@/lib/investor/adapters";
import { NotificationSettings as NotificationSettingsComponent } from "@/components/investor/NotificationSettings";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Tabs } from "@/components/shared/ui/Tabs";
import { useNotifications } from "@/components/shared/providers/NotificationProvider";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";
import { formatRelativeTime } from "@/lib/shared/format";
import { Button } from "@/components/shared/ui/Button";

function NotificationsContent() {
  const { notifications, markRead, markAllRead, acknowledge } = useNotifications();
  const { data: settings, isLoading: settingsLoading } = useNotificationSettings();

  if (settingsLoading) return <SectionLoading />;

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <Tabs
      tabs={[
        {
          id: "all",
          label: "All",
          content: notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.length > 0 && (
                <button onClick={markAllRead} className="text-sm text-accent-base hover:text-accent-hover">Mark all as read</button>
              )}
              {notifications.map((n) => (
                <Card key={n.id} variant={n.read ? "default" : "interactive"} padding="sm" className="cursor-pointer" onClick={() => markRead(n.id)}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!n.read && <span className="block h-2 w-2 rounded-full bg-accent-base shrink-0" />}
                          <p className={`text-sm font-medium truncate ${n.read ? "text-text-primary" : "text-text-primary"}`}>{n.title}</p>
                        </div>
                        <p className="text-sm text-text-muted line-clamp-2">{n.message}</p>
                        <p className="text-xs text-text-muted mt-1">{formatRelativeTime(new Date(n.createdAt))}</p>
                      </div>
                      <Badge variant={n.type as any || "default"} size="sm">{n.type}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : <EmptyState title="No notifications" description="You're all caught up!" />,
          badge: unread.length,
        },
        {
          id: "unread",
          label: "Unread",
          content: unread.length > 0 ? (
            <div className="space-y-3">
              {unread.map((n) => (
                <Card key={n.id} variant="interactive" padding="sm" className="cursor-pointer" onClick={() => markRead(n.id)}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="block h-2 w-2 rounded-full bg-accent-base shrink-0" />
                          <p className="text-sm font-medium truncate">{n.title}</p>
                        </div>
                        <p className="text-sm text-text-muted line-clamp-2">{n.message}</p>
                        <p className="text-xs text-text-muted mt-1">{formatRelativeTime(new Date(n.createdAt))}</p>
                      </div>
                      <Badge variant={n.type as any || "default"} size="sm">{n.type}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : <EmptyState title="No unread notifications" description="All caught up!" />,
        },
        {
          id: "settings",
          label: "Settings",
          content: settings ? <NotificationSettingsComponent settings={settings} /> : <SectionLoading />,
        },
      ]}
    />
  );
}

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Stay informed with account activity alerts"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Notifications", href: "/investor/notifications" },
        ]}
      />
      <ErrorBoundary context="investor-notifications">
        <NotificationsContent />
      </ErrorBoundary>
    </div>
  );
}
