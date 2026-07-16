import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Activity, Users, Wallet, AlertTriangle, TrendingUp, PieChart, Building2, Vote } from "lucide-react";
import { fetchAdminMetrics, fetchAdminInvestments, fetchAdminProperties, fetchSystemHealth, fetchTreasuryOverview } from "@/lib/admin/adapters";

export default async function ExecutiveDashboardPage() {
  const [metrics, investments, properties, health, treasury] = await Promise.all([
    fetchAdminMetrics(), fetchAdminInvestments(), fetchAdminProperties(),
    fetchSystemHealth(), fetchTreasuryOverview(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description="Enterprise operational overview"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Dashboard" }]}
      />

      <div className="flex items-center gap-2">
        <Badge variant={health.status === "healthy" ? "success" : "danger"}>
          {health.status === "healthy" ? "All Systems Operational" : "System Degraded"}
        </Badge>
        <span className="text-xs text-muted-foreground">Uptime: {health.uptime}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{health.status}</div>
            <p className="text-xs text-muted-foreground">
              CPU: {(health.cpu * 100).toFixed(0)}% · Mem: {(health.memory * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.onlineUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalUsers.toLocaleString()} total · {metrics.pendingKyc} pending KYC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Treasury Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(treasury.totalAssets / 1e6).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              ${(treasury.liquidAssets / 1e6).toFixed(1)}M liquid · {treasury.accountCount} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.openIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.systemAlerts} alerts · {metrics.pendingApprovals} approvals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Investments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeInvestments}</div>
            <p className="text-xs text-muted-foreground">
              {investments.length} recent · ${investments.reduce((s, i) => s + i.amount, 0).toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProperties}</div>
            <p className="text-xs text-muted-foreground">
              {properties.filter((p) => p.status === "active").length} active · {properties.filter((p) => p.status === "pending").length} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProposals}</div>
            <p className="text-xs text-muted-foreground">Governance participation active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Workers</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.workerCount}</div>
            <p className="text-xs text-muted-foreground">
              {(metrics.workerUtilization * 100).toFixed(0)}% utilization · queue: {metrics.queueDepth}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Investments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {investments.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{inv.investorName}</p>
                    <p className="text-xs text-muted-foreground">{inv.propertyName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${inv.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{inv.tokens} tokens</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <Badge variant={health.database === "connected" ? "success" : "danger"}>{health.database}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Blockchain</span>
                <Badge variant={health.blockchain === "connected" ? "success" : "danger"}>{health.blockchain}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Audit Event</span>
                <span className="text-xs text-muted-foreground">{new Date(metrics.lastAuditEvent).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Queue Depth</span>
                <span className="text-sm font-medium">{metrics.queueDepth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Transactions</span>
                <span className="text-sm font-medium">{metrics.totalTransactions.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Distributions (YTD)</span>
                <span className="text-sm font-medium">${(treasury.totalDistributed / 1e6).toFixed(1)}M</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
