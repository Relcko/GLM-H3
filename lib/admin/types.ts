export interface AdminMetrics {
  platformHealth: "healthy" | "degraded" | "critical";
  onlineUsers: number;
  totalUsers: number;
  pendingKyc: number;
  pendingCompliance: number;
  pendingApprovals: number;
  treasuryBalance: number;
  activeProposals: number;
  activeProperties: number;
  activeInvestments: number;
  totalTransactions: number;
  systemAlerts: number;
  openIncidents: number;
  queueDepth: number;
  workerCount: number;
  workerUtilization: number;
  lastAuditEvent: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: "active" | "suspended" | "pending";
  kycLevel: string;
  mfaEnabled: boolean;
  lastLogin: string;
  createdAt: string;
}

export interface AdminProperty {
  id: string;
  name: string;
  type: string;
  status: string;
  tokenPrice: number;
  totalTokens: number;
  availableTokens: number;
  fundedPercentage: number;
  investors: number;
  createdAt: string;
}

export interface AdminInvestment {
  id: string;
  investorName: string;
  propertyName: string;
  amount: number;
  tokens: number;
  status: string;
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ip: string;
  timestamp: string;
}

export interface AdminJob {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed" | "queued";
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface AdminBackup {
  id: string;
  name: string;
  size: string;
  type: "full" | "incremental";
  status: "completed" | "running" | "failed";
  createdAt: string;
  expiresAt: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "critical";
  audience: string;
  read: boolean;
  createdAt: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high" | "urgent";
  published: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  description: string;
  category: string;
  updatedAt: string;
  updatedBy: string;
}

export interface EmergencyState {
  active: boolean;
  reason: string;
  activatedBy: string;
  activatedAt: string;
  maintenanceWindow: boolean;
  systemLocked: boolean;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "critical";
  uptime: string;
  cpu: number;
  memory: number;
  disk: number;
  database: "connected" | "disconnected" | "degraded";
  blockchain: "connected" | "disconnected" | "degraded";
  lastChecked: string;
}

export interface TreasuryOverview {
  totalAssets: number;
  liquidAssets: number;
  investedAssets: number;
  totalDistributed: number;
  pendingDistributions: number;
  accountCount: number;
}

export interface GovernanceOverview {
  totalProposals: number;
  activeProposals: number;
  totalVoters: number;
  voterParticipation: number;
  totalDelegations: number;
  pendingExecution: number;
}
