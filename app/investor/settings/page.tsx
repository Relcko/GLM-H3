"use client";

import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull } from "@/components/shared/layout/Grid";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Select } from "@/components/shared/ui/Select";
import { Switch } from "@/components/shared/ui/Switch";
import { Button } from "@/components/shared/ui/Button";
import { useToast } from "@/components/shared/notifications/Toast";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";
import { useState } from "react";

function SettingsForm() {
  const { addToast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState("usd");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    addToast({ title: "Settings saved", message: "Your preferences have been updated.", type: "success" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
          <CardDescription>Customize how your portfolio data is displayed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Display Currency"
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            options={[
              { value: "usd", label: "USD ($)" },
              { value: "eur", label: "EUR (€)" },
              { value: "gbp", label: "GBP (£)" },
              { value: "eth", label: "ETH" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Switch
            checked={twoFactorEnabled}
            onChange={setTwoFactorEnabled}
            label="Two-factor authentication"
            id="2fa"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure your notification preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Switch
            checked={notificationsEnabled}
            onChange={setNotificationsEnabled}
            label="Enable push notifications"
            id="push-notif"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
          <CardDescription>Manage API keys for programmatic access.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted mb-4">No API keys generated yet.</p>
          <Button variant="secondary" onClick={() => addToast({ title: "Coming soon", message: "API key management will be available soon.", type: "info" })}>
            Generate API Key
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => addToast({ title: "Changes discarded", type: "warning" })}>Discard</Button>
        <Button onClick={handleSave} loading={saving}>Save Settings</Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Customize your account preferences"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Settings", href: "/investor/settings" },
        ]}
      />
      <GridSection>
        <GridFull>
          <ErrorBoundary context="investor-settings">
            <SettingsForm />
          </ErrorBoundary>
        </GridFull>
      </GridSection>
    </div>
  );
}
