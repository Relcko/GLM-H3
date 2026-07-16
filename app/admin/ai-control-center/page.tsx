import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Bot, MessageSquare, BarChart3, Sparkles } from "lucide-react";

const aiFeatures = [
  { name: "Investor Chatbot", status: "active", usage: 1247, desc: "AI-powered investor support chatbot", icon: MessageSquare },
  { name: "Sentiment Analysis", status: "active", usage: 892, desc: "Market sentiment analysis for property insights", icon: BarChart3 },
  { name: "Automated KYC", status: "active", usage: 345, desc: "AI-assisted KYC document verification", icon: Sparkles },
  { name: "Predictive Analytics", status: "beta", usage: 156, desc: "Property value and market trend predictions", icon: BarChart3 },
  { name: "Fraud Detection", status: "active", usage: 2100, desc: "Real-time transaction fraud detection", icon: Bot },
];

export default function AiControlCenterPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Platform" description="Manage AI services and machine learning models" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "AI Platform" }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {aiFeatures.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.name}>
              <CardHeader>
                <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><CardTitle className="text-base">{f.name}</CardTitle><Badge variant={f.status === "active" ? "success" : "warning"}>{f.status}</Badge></div>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{f.desc}</p><p className="mt-2 text-xs text-muted-foreground">{f.usage.toLocaleString()} requests this month</p></CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
