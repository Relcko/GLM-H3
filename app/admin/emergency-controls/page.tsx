"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/shared/ui/Textarea";
import { Switch } from "@/components/shared/ui/Switch";
import { AlertTriangle, Shield, Lock, Wrench, Ban } from "lucide-react";

interface EmergencyBannerProps {
  active: boolean;
  reason: string;
}

function EmergencyBanner({ active, reason }: EmergencyBannerProps) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border-2 border-destructive bg-destructive/10 p-4">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <div><p className="font-semibold text-destructive">Emergency Active</p><p className="text-sm text-muted-foreground">{reason}</p></div>
    </div>
  );
}

function DualConfirmationButton({ onConfirm, label, variant }: { onConfirm: () => void; label: string; variant?: "primary" | "danger" }) {
  const [stage, setStage] = useState(0);
  return (
    <div className="space-y-2">
      {stage === 0 && <Button variant={variant || "danger"} onClick={() => setStage(1)}>{label}</Button>}
      {stage === 1 && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-destructive font-medium">Are you sure? This action is irreversible.</p>
          <Button variant="danger" onClick={() => { onConfirm(); setStage(0); }}>Confirm</Button>
          <Button variant="secondary" onClick={() => setStage(0)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

export default function EmergencyControlsPage() {
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [systemLocked, setSystemLocked] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmationInput, setConfirmationInput] = useState("");

  const activateEmergency = () => {
    if (confirmationInput.toUpperCase() !== "CONFIRM") return;
    setEmergencyActive(true);
    setConfirmationInput("");
  };

  const deactivateEmergency = () => {
    setEmergencyActive(false);
    setReason("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Emergency Controls" description="Emergency shutdown, maintenance mode, and system lock" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Emergency Controls" }]} />

      <EmergencyBanner active={emergencyActive} reason={reason} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={emergencyActive ? "border-destructive" : ""}>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Emergency Shutdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Immediately halt all platform operations including investments, trading, and distributions.</p>
            {!emergencyActive ? (
              <div className="space-y-3">
                <Textarea placeholder="Reason for emergency activation..." value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Type &quot;CONFIRM&quot; to proceed:</p>
                  <Input value={confirmationInput} onChange={(e) => setConfirmationInput(e.target.value)} placeholder="Type CONFIRM" />
                </div>
                <Button variant="danger" disabled={confirmationInput.toUpperCase() !== "CONFIRM" || !reason} onClick={activateEmergency}>
                  <Ban className="mr-2 h-4 w-4" />Activate Emergency Shutdown
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={deactivateEmergency}>Deactivate Emergency</Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />Maintenance Mode</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Enable maintenance mode to restrict user access during platform updates.</p>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Maintenance Mode</span><Switch checked={maintenanceMode} onChange={setMaintenanceMode} /></div>
            {maintenanceMode && <p className="text-xs text-destructive">Users will see a maintenance page. Ongoing transactions will be paused.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />System Lock</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Lock the entire system to prevent any state-changing operations.</p>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">System Lock</span><Switch checked={systemLocked} onChange={setSystemLocked} /></div>
            {systemLocked && <p className="text-xs text-destructive">All write operations are blocked. Only admins can view data.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Audit Confirmation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">All emergency actions are logged to the audit trail for compliance review.</p>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">Recent Emergency Actions</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                <li>• No recent emergency actions recorded</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
