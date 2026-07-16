import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Cog, Globe, Shield, Mail, CreditCard, Key } from "lucide-react";

const configGroups = [
  { title: "General", icon: Globe, items: [{ label: "Platform Name", value: "Relcko" }, { label: "Environment", value: "Production" }, { label: "URL", value: "https://relcko.com" }, { label: "Timezone", value: "UTC" }] },
  { title: "Security", icon: Shield, items: [{ label: "Session Timeout", value: "60 minutes" }, { label: "Max Login Attempts", value: "5" }, { label: "Password Policy", value: "Strong" }, { label: "MFA Enforcement", value: "Optional" }] },
  { title: "Email", icon: Mail, items: [{ label: "SMTP Host", value: "smtp.relcko.com" }, { label: "From Address", value: "noreply@relcko.com" }, { label: "Rate Limit", value: "100/hr" }] },
  { title: "Payments", icon: CreditCard, items: [{ label: "Currency", value: "USD" }, { label: "Min Investment", value: "$1,000" }, { label: "Max Investment", value: "$250,000" }, { label: "Payment Gateway", value: "Stripe" }] },
  { title: "API", icon: Key, items: [{ label: "Rate Limit", value: "1000/min" }, { label: "Webhook URL", value: "https://api.relcko.com/webhooks" }, { label: "API Version", value: "v3" }] },
];

export default function SystemConfigurationPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="System Configuration" description="Global platform settings" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "System Config" }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {configGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><group.icon className="h-4 w-4" />{group.title}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.label} className="flex justify-between text-sm"><span className="text-muted-foreground">{item.label}</span><span className="font-medium">{item.value}</span></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
