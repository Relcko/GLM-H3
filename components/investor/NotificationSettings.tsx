"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Switch } from "@/components/shared/ui/Switch";
import { Input } from "@/components/shared/ui/Input";
import { Button } from "@/components/shared/ui/Button";
import { useToast } from "@/components/shared/notifications/Toast";
import type { NotificationSettings } from "@/lib/investor/types";

interface Props {
  settings: NotificationSettings;
}

export function NotificationSettings({ settings }: Props) {
  const { addToast } = useToast();
  const [emailDistributions, setEmailDistributions] = useState(settings.email.distributions);
  const [emailProposals, setEmailProposals] = useState(settings.email.proposals);
  const [emailSecurity, setEmailSecurity] = useState(settings.email.security);
  const [emailMarketing, setEmailMarketing] = useState(settings.email.marketing);
  const [pushDistributions, setPushDistributions] = useState(settings.push.distributions);
  const [pushProposals, setPushProposals] = useState(settings.push.proposals);
  const [pushPriceAlerts, setPushPriceAlerts] = useState(settings.push.priceAlerts);
  const [threshold, setThreshold] = useState(settings.distributionThreshold.toString());
  const [quietHours, setQuietHours] = useState(settings.quietHours.enabled);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    addToast({ title: "Notification settings saved", type: "success" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose which updates you receive via email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Switch checked={emailDistributions} onChange={setEmailDistributions} label="Distribution announcements" id="email-dist" />
          <Switch checked={emailProposals} onChange={setEmailProposals} label="Governance proposals" id="email-prop" />
          <Switch checked={emailSecurity} onChange={setEmailSecurity} label="Security alerts" id="email-sec" />
          <Switch checked={emailMarketing} onChange={setEmailMarketing} label="Marketing & updates" id="email-mkt" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>Manage in-app and browser push notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Switch checked={pushDistributions} onChange={setPushDistributions} label="Distribution received" id="push-dist" />
          <Switch checked={pushProposals} onChange={setPushProposals} label="New proposals" id="push-prop" />
          <Switch checked={pushPriceAlerts} onChange={setPushPriceAlerts} label="Price alerts" id="push-price" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Distribution threshold (USD)" type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} hint="Only notify for distributions above this amount" />
          <Switch checked={quietHours} onChange={setQuietHours} label="Enable quiet hours" id="quiet-hours" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>Save Preferences</Button>
      </div>
    </div>
  );
}
