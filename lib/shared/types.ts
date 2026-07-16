import type { Role } from "@relcko/types";
import type { AccountStatus as IdentityAccountStatus, VerificationStatus as IdentityVerificationStatus } from "@relcko/identity";
type AccountStatus = IdentityAccountStatus;
type VerificationStatus = IdentityVerificationStatus;

export type PortalType = "public" | "investor" | "agent" | "admin";

export type AuthState = "anonymous" | "authenticated" | "elevated" | "impersonating" | "expired" | "locked";

export type WalletState = "disconnected" | "connecting" | "connected" | "wrong-network" | "signing" | "verified" | "error";

export type KYCState = "not-started" | "in-progress" | "submitted" | "under-review" | "approved" | "rejected" | "remediation-required";

export type SessionStatus = "active" | "expiring" | "expired" | "revoked" | "locked";

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  roles: Role[];
  accountStatus: AccountStatus;
  kycState: KYCState;
  walletAddress?: string;
  verified: boolean;
}

export interface SessionContextValue {
  state: AuthState;
  user: UserProfile | null;
  sessionId: string | null;
  status: SessionStatus;
  expiresAt: number | null;
  impersonating: boolean;
}

export interface WalletContextValue {
  state: WalletState;
  address: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  acknowledged: boolean;
  createdAt: string;
  link?: string;
  category: NotificationCategory;
}

export type NotificationType = "transactional" | "portfolio" | "treasury" | "governance" | "referral" | "compliance" | "ai" | "administrative" | "security";

export type NotificationPriority = "critical" | "high" | "medium" | "low" | "informational";

export type NotificationCategory =
  | "investment-lifecycle"
  | "dividend"
  | "governance-event"
  | "nft-activity"
  | "document"
  | "security-alert"
  | "ai-insight"
  | "lead"
  | "commission"
  | "incident"
  | "system";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: NavItem[];
  requiredRoles?: Role[];
  requiredFeature?: string;
  isExternal?: boolean;
}

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  requiredRoles?: Role[];
}

export type LoadingState = "idle" | "loading" | "success" | "error" | "empty";
