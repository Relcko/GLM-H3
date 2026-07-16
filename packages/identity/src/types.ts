import type { Address, ChainId, EntityId } from "@relcko/types";
import { Role } from "@relcko/types";
import { MfaLevel } from "@relcko/permission";
import type { Agent, Investor, KycStatus, Wallet } from "@relcko/domain-core";

/**
 * Identity & Authentication domain types. These extend (never modify) the
 * frozen `@relcko/domain-core` entities (Investor, Agent, Wallet, KYC) by
 * adding the account aggregate, organizations, guardians, sessions and
 * authentication challenges that the V2.0 foundation did not define.
 */

export enum AccountType {
  Individual = "individual",
  Institutional = "institutional",
  Corporate = "corporate",
}

export enum AccountStatus {
  Pending = "pending",
  Active = "active",
  Suspended = "suspended",
  Closed = "closed",
}

export enum VerificationStatus {
  Unverified = "unverified",
  Partial = "partial",
  Verified = "verified",
}

export enum WalletProviderKind {
  MetaMask = "metamask",
  WalletConnect = "walletconnect",
  Coinbase = "coinbase",
  Injected = "injected",
  Hardware = "hardware",
}

/** A guardian enables social/account recovery without a central reset. */
export interface Guardian {
  readonly id: EntityId;
  readonly accountId: EntityId;
  readonly guardianAccountId: EntityId;
  readonly approved: boolean;
  readonly addedAt: string;
}

/** Organization profile backing institutional / corporate accounts. */
export interface Organization {
  readonly id: EntityId;
  readonly accountId: EntityId;
  readonly legalName: string;
  readonly jurisdiction: string;
  readonly kind: AccountType.Institutional | AccountType.Corporate;
  readonly memberAccountIds: readonly EntityId[];
  readonly createdAt: string;
}

/**
 * The account aggregate: the root identity for a person or organization.
 * Wallets and organizations are referenced by id and resolved on demand.
 */
export interface Account {
  readonly id: EntityId;
  readonly type: AccountType;
  readonly status: AccountStatus;
  readonly role: Role;
  readonly email?: string;
  readonly emailVerified: boolean;
  /** scrypt-derived password material, only present for email logins. */
  readonly passwordHash?: string;
  readonly primaryWalletId?: EntityId;
  readonly walletIds: readonly EntityId[];
  readonly organizationId?: EntityId;
  readonly verification: VerificationStatus;
  readonly kycStatus?: KycStatus;
  readonly mfaLevel: MfaLevel;
  /** Opaque MFA shared secret (TOTP-style); absent until MFA is enrolled. */
  readonly mfaSecret?: string;
  readonly guardianIds: readonly EntityId[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Aggregated identity view returned by the resolver. */
export interface ResolvedIdentity {
  readonly account: Account;
  readonly wallets: readonly Wallet[];
  readonly investor?: Investor;
  readonly agent?: Agent;
  readonly organization?: Organization;
  readonly verification: VerificationStatus;
  readonly role: Role;
}

/** A single sign-in session bound to an account and (optionally) a device. */
export interface Session {
  readonly id: EntityId;
  readonly accountId: EntityId;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessExpiresAt: string;
  readonly refreshExpiresAt: string;
  readonly deviceFingerprint?: string;
  readonly trustedDevice: boolean;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly createdAt: string;
  readonly lastActivityAt: string;
  readonly revoked: boolean;
}

export interface LoginChallenge {
  readonly address: Address;
  readonly chainId: ChainId;
  readonly nonce: string;
  readonly message: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly sessionId: EntityId;
  readonly accessExpiresAt: string;
  readonly refreshExpiresAt: string;
}

export type { Address, ChainId, EntityId, Investor, Agent, Wallet, KycStatus };
