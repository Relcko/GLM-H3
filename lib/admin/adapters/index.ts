import type { AdminMetrics, AdminUser, AdminProperty, AdminInvestment, AdminAuditEntry, AdminJob, AdminBackup, AdminNotification, AdminAnnouncement, FeatureFlag, EmergencyState, SystemHealth, TreasuryOverview, GovernanceOverview } from "@/lib/admin/types";

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  return {
    platformHealth: "healthy",
    onlineUsers: 847,
    totalUsers: 2847,
    pendingKyc: 23,
    pendingCompliance: 12,
    pendingApprovals: 8,
    treasuryBalance: 14250000,
    activeProposals: 5,
    activeProperties: 18,
    activeInvestments: 342,
    totalTransactions: 12847,
    systemAlerts: 3,
    openIncidents: 1,
    queueDepth: 47,
    workerCount: 12,
    workerUtilization: 0.78,
    lastAuditEvent: new Date(Date.now() - 120000).toISOString(),
  };
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return [
    { id: "usr_1", email: "alice@example.com", name: "Alice Wang", role: "investor", status: "active", kycLevel: "tier_3", mfaEnabled: true, lastLogin: "2026-07-16T14:22:00Z", createdAt: "2025-11-01T08:00:00Z" },
    { id: "usr_2", email: "bob@example.com", name: "Bob Smith", role: "investor", status: "active", kycLevel: "tier_2", mfaEnabled: true, lastLogin: "2026-07-15T09:10:00Z", createdAt: "2026-01-15T08:00:00Z" },
    { id: "usr_3", email: "carol@example.com", name: "Carol Davis", role: "admin", status: "active", kycLevel: "tier_3", mfaEnabled: true, lastLogin: "2026-07-16T16:00:00Z", createdAt: "2025-06-01T08:00:00Z" },
    { id: "usr_4", email: "dave@example.com", name: "Dave Lee", role: "investor", status: "suspended", kycLevel: "tier_1", mfaEnabled: false, lastLogin: "2026-06-30T12:00:00Z", createdAt: "2026-03-10T08:00:00Z" },
    { id: "usr_5", email: "eve@example.com", name: "Eve Chen", role: "operator", status: "active", kycLevel: "tier_3", mfaEnabled: true, lastLogin: "2026-07-16T10:30:00Z", createdAt: "2025-09-20T08:00:00Z" },
    { id: "usr_6", email: "frank@example.com", name: "Frank Miller", role: "investor", status: "pending", kycLevel: "none", mfaEnabled: false, lastLogin: "", createdAt: "2026-07-16T11:00:00Z" },
    { id: "usr_7", email: "grace@example.com", name: "Grace Kim", role: "compliance_officer", status: "active", kycLevel: "tier_3", mfaEnabled: true, lastLogin: "2026-07-16T15:45:00Z", createdAt: "2025-08-05T08:00:00Z" },
    { id: "usr_8", email: "henry@example.com", name: "Henry Park", role: "investor", status: "active", kycLevel: "tier_2", mfaEnabled: false, lastLogin: "2026-07-14T18:20:00Z", createdAt: "2026-02-28T08:00:00Z" },
  ];
}

export async function fetchAdminProperties(): Promise<AdminProperty[]> {
  return [
    { id: "prop_1", name: "Luxury Tower Manhattan", type: "commercial", status: "active", tokenPrice: 125.0, totalTokens: 10000, availableTokens: 2400, fundedPercentage: 76, investors: 89, createdAt: "2025-12-01T08:00:00Z" },
    { id: "prop_2", name: "Greenfield Residences Austin", type: "residential", status: "active", tokenPrice: 85.0, totalTokens: 20000, availableTokens: 5000, fundedPercentage: 75, investors: 142, createdAt: "2026-02-15T08:00:00Z" },
    { id: "prop_3", name: "Tech Park Silicon Valley", type: "commercial", status: "pending", tokenPrice: 250.0, totalTokens: 8000, availableTokens: 8000, fundedPercentage: 0, investors: 0, createdAt: "2026-07-01T08:00:00Z" },
    { id: "prop_4", name: "Waterfront Condos Miami", type: "residential", status: "active", tokenPrice: 175.0, totalTokens: 5000, availableTokens: 750, fundedPercentage: 85, investors: 67, createdAt: "2025-10-20T08:00:00Z" },
    { id: "prop_5", name: "Downtown Revival Detroit", type: "mixed", status: "active", tokenPrice: 45.0, totalTokens: 50000, availableTokens: 15000, fundedPercentage: 70, investors: 234, createdAt: "2025-09-01T08:00:00Z" },
    { id: "prop_6", name: "Seaside Heights Resort", type: "hospitality", status: "inactive", tokenPrice: 150.0, totalTokens: 12000, availableTokens: 12000, fundedPercentage: 0, investors: 0, createdAt: "2026-06-10T08:00:00Z" },
  ];
}

export async function fetchAdminInvestments(): Promise<AdminInvestment[]> {
  return [
    { id: "inv_1", investorName: "Alice Wang", propertyName: "Luxury Tower Manhattan", amount: 50000, tokens: 400, status: "active", createdAt: "2026-01-10T09:00:00Z" },
    { id: "inv_2", investorName: "Bob Smith", propertyName: "Greenfield Residences Austin", amount: 25000, tokens: 294, status: "active", createdAt: "2026-03-05T10:00:00Z" },
    { id: "inv_3", investorName: "Henry Park", propertyName: "Downtown Revival Detroit", amount: 10000, tokens: 222, status: "active", createdAt: "2026-04-12T11:00:00Z" },
    { id: "inv_4", investorName: "Alice Wang", propertyName: "Waterfront Condos Miami", amount: 75000, tokens: 428, status: "active", createdAt: "2026-02-20T08:00:00Z" },
    { id: "inv_5", investorName: "Frank Miller", propertyName: "Tech Park Silicon Valley", amount: 25000, tokens: 100, status: "pending", createdAt: "2026-07-16T12:00:00Z" },
    { id: "inv_6", investorName: "Eve Chen", propertyName: "Luxury Tower Manhattan", amount: 100000, tokens: 800, status: "active", createdAt: "2026-01-15T13:00:00Z" },
    { id: "inv_7", investorName: "Grace Kim", propertyName: "Waterfront Condos Miami", amount: 50000, tokens: 285, status: "active", createdAt: "2026-03-01T14:00:00Z" },
    { id: "inv_8", investorName: "Dave Lee", propertyName: "Greenfield Residences Austin", amount: 15000, tokens: 176, status: "active", createdAt: "2026-03-10T15:00:00Z" },
  ];
}

export async function fetchAuditLogs(): Promise<AdminAuditEntry[]> {
  const now = Date.now();
  return [
    { id: "aud_1", actor: "Carol Davis", action: "user.suspend", resource: "User", resourceId: "usr_4", details: "Suspended user Dave Lee", ip: "192.168.1.100", timestamp: new Date(now - 300000).toISOString() },
    { id: "aud_2", actor: "System", action: "kyc.approve", resource: "KYC", resourceId: "kyc_23", details: "Auto-approved KYC Tier 2", ip: "127.0.0.1", timestamp: new Date(now - 600000).toISOString() },
    { id: "aud_3", actor: "Admin System", action: "property.create", resource: "Property", resourceId: "prop_3", details: "Created Tech Park Silicon Valley", ip: "127.0.0.1", timestamp: new Date(now - 3600000).toISOString() },
    { id: "aud_4", actor: "Grace Kim", action: "compliance.flag", resource: "Investment", resourceId: "inv_5", details: "Flagged investment for review", ip: "10.0.0.45", timestamp: new Date(now - 7200000).toISOString() },
    { id: "aud_5", actor: "Henry Park", action: "auth.login", resource: "Session", resourceId: "sess_89", details: "Login from new device", ip: "203.0.113.50", timestamp: new Date(now - 14400000).toISOString() },
    { id: "aud_6", actor: "Carol Davis", action: "role.update", resource: "Role", resourceId: "role_admin", details: "Updated admin permissions", ip: "192.168.1.100", timestamp: new Date(now - 86400000).toISOString() },
    { id: "aud_7", actor: "System", action: "backup.create", resource: "Backup", resourceId: "bkp_12", details: "Automated daily backup completed", ip: "127.0.0.1", timestamp: new Date(now - 43200000).toISOString() },
    { id: "aud_8", actor: "Bob Smith", action: "auth.mfa_challenge", resource: "Session", resourceId: "sess_91", details: "MFA challenge passed", ip: "198.51.100.20", timestamp: new Date(now - 18000000).toISOString() },
  ];
}

export async function fetchAdminJobs(): Promise<AdminJob[]> {
  return [
    { id: "job_1", name: "KYC Bulk Verification", type: "compliance", status: "running", progress: 67, startedAt: "2026-07-16T14:00:00Z" },
    { id: "job_2", name: "Distributions Run", type: "finance", status: "completed", progress: 100, startedAt: "2026-07-16T08:00:00Z", completedAt: "2026-07-16T08:45:00Z" },
    { id: "job_3", name: "Data Export - Q2 Report", type: "export", status: "completed", progress: 100, startedAt: "2026-07-15T22:00:00Z", completedAt: "2026-07-15T22:30:00Z" },
    { id: "job_4", name: "Blockchain Sync", type: "sync", status: "running", progress: 42, startedAt: "2026-07-16T15:00:00Z" },
    { id: "job_5", name: "Audit Log Rotation", type: "maintenance", status: "queued", progress: 0, startedAt: "" },
    { id: "job_6", name: "Index Rebuild", type: "maintenance", status: "failed", progress: 33, startedAt: "2026-07-16T12:00:00Z", error: "Timeout after 30m" },
  ];
}

export async function fetchBackups(): Promise<AdminBackup[]> {
  return [
    { id: "bkp_1", name: "pre-q2-distribution", size: "2.4 GB", type: "full", status: "completed", createdAt: "2026-07-16T07:00:00Z", expiresAt: "2026-08-16T07:00:00Z" },
    { id: "bkp_2", name: "daily-2026-07-15", size: "450 MB", type: "incremental", status: "completed", createdAt: "2026-07-15T23:00:00Z", expiresAt: "2026-07-22T23:00:00Z" },
    { id: "bkp_3", name: "pre-deploy-v3.1", size: "2.4 GB", type: "full", status: "completed", createdAt: "2026-07-14T06:00:00Z", expiresAt: "2026-08-14T06:00:00Z" },
    { id: "bkp_4", name: "daily-2026-07-16", size: "0 B", type: "incremental", status: "running", createdAt: "", expiresAt: "" },
  ];
}

export async function fetchNotifications(): Promise<AdminNotification[]> {
  return [
    { id: "notif_1", title: "KYC Pending Review", message: "23 new KYC applications require review", type: "info", audience: "compliance", read: false, createdAt: "2026-07-16T12:00:00Z" },
    { id: "notif_2", title: "Distribution Complete", message: "Q2 distributions have been processed successfully", type: "success", audience: "all", read: false, createdAt: "2026-07-16T08:45:00Z" },
    { id: "notif_3", title: "System Alert", message: "Database replication lag detected (2.3s)", type: "warning", audience: "admin", read: false, createdAt: "2026-07-16T10:30:00Z" },
    { id: "notif_4", title: "Emergency Maintenance", message: "Scheduled maintenance window tonight 02:00-04:00 UTC", type: "info", audience: "all", read: true, createdAt: "2026-07-15T16:00:00Z" },
    { id: "notif_5", title: "Blockchain Disconnect", message: "Ethereum node temporarily disconnected (resolved)", type: "critical", audience: "admin", read: true, createdAt: "2026-07-15T14:20:00Z" },
  ];
}

export async function fetchAnnouncements(): Promise<AdminAnnouncement[]> {
  return [
    { id: "ann_1", title: "Platform Maintenance Tonight", content: "Scheduled maintenance from 02:00 to 04:00 UTC. All services may be intermittent.", priority: "high", published: true, publishedAt: "2026-07-15T10:00:00Z", expiresAt: "2026-07-17T04:00:00Z", createdBy: "Carol Davis", createdAt: "2026-07-15T09:30:00Z" },
    { id: "ann_2", title: "New Property Listing: Tech Park", content: "Tech Park Silicon Valley is now open for investment. 8,000 tokens at $250 each.", priority: "medium", published: true, publishedAt: "2026-07-14T08:00:00Z", createdBy: "Admin System", createdAt: "2026-07-14T07:00:00Z" },
    { id: "ann_3", title: "Q2 Distributions Processed", content: "All Q2 2026 distributions have been calculated and paid.", priority: "medium", published: true, publishedAt: "2026-07-13T14:00:00Z", createdBy: "System", createdAt: "2026-07-13T13:00:00Z" },
    { id: "ann_4", title: "KYC Tier Update", content: "New KYC Tier 4 requirements for high-value investors effective Aug 1.", priority: "low", published: false, createdBy: "Grace Kim", createdAt: "2026-07-16T09:00:00Z" },
  ];
}

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  return [
    { id: "ff_1", name: "AI Chatbot", key: "ai_chatbot", enabled: true, description: "Enable AI-powered chatbot for investor support", category: "ai", updatedAt: "2026-07-10T10:00:00Z", updatedBy: "Carol Davis" },
    { id: "ff_2", name: "NFT Marketplace", key: "nft_marketplace", enabled: false, description: "Enable NFT trading on marketplace", category: "marketplace", updatedAt: "2026-06-15T08:00:00Z", updatedBy: "Carol Davis" },
    { id: "ff_3", name: "Auto KYC Approval", key: "auto_kyc_approval", enabled: true, description: "Automatically approve Tier 1 KYC applications", category: "compliance", updatedAt: "2026-07-01T12:00:00Z", updatedBy: "Grace Kim" },
    { id: "ff_4", name: "Beta Dashboard", key: "beta_dashboard", enabled: true, description: "Enable new beta dashboard for investors", category: "ui", updatedAt: "2026-07-05T09:00:00Z", updatedBy: "System" },
    { id: "ff_5", name: "Emergency Shutdown", key: "emergency_shutdown", enabled: false, description: "Enable emergency system-wide shutdown capability", category: "system", updatedAt: "2026-06-01T08:00:00Z", updatedBy: "Carol Davis" },
    { id: "ff_6", name: "Advanced Analytics", key: "advanced_analytics", enabled: true, description: "Enable advanced analytics for admin dashboard", category: "analytics", updatedAt: "2026-07-12T14:00:00Z", updatedBy: "Carol Davis" },
  ];
}

export async function fetchEmergencyState(): Promise<EmergencyState> {
  return {
    active: false,
    reason: "",
    activatedBy: "",
    activatedAt: "",
    maintenanceWindow: false,
    systemLocked: false,
  };
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  return {
    status: "healthy",
    uptime: "14d 7h 23m",
    cpu: 0.42,
    memory: 0.68,
    disk: 0.57,
    database: "connected",
    blockchain: "connected",
    lastChecked: new Date().toISOString(),
  };
}

export async function fetchTreasuryOverview(): Promise<TreasuryOverview> {
  return {
    totalAssets: 24580000,
    liquidAssets: 7250000,
    investedAssets: 17330000,
    totalDistributed: 3840000,
    pendingDistributions: 125000,
    accountCount: 47,
  };
}

export async function fetchGovernanceOverview(): Promise<GovernanceOverview> {
  return {
    totalProposals: 28,
    activeProposals: 5,
    totalVoters: 1847,
    voterParticipation: 0.68,
    totalDelegations: 423,
    pendingExecution: 2,
  };
}
