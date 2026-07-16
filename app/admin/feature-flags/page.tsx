"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Switch } from "@/components/shared/ui/Switch";
import { fetchFeatureFlags } from "@/lib/admin/adapters";
import type { FeatureFlag } from "@/lib/admin/types";
import { Flag } from "lucide-react";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatureFlags().then((data) => { setFlags(data); setLoading(false); });
  }, []);

  const toggleFlag = (key: string) => {
    setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Feature Flags" description="Toggle platform features on and off" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Feature Flags" }]} />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-3">
          {flags.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-start gap-3">
                  <Flag className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div><p className="text-sm font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{f.description}</p><p className="text-xs text-muted-foreground mt-1">Key: <code className="rounded bg-muted px-1">{f.key}</code> · {f.category} · Updated by {f.updatedBy}</p></div>
                </div>
                <Switch checked={f.enabled} onChange={() => toggleFlag(f.key)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
