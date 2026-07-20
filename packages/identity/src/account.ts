import { generateId } from "@relcko/utils";
import { Role } from "@relcko/types";
import { MfaLevel } from "@relcko/permission";
import type { KycStatus } from "@relcko/domain-core";
import { Account, AccountStatus, AccountType, VerificationStatus } from "./types";

/**
 * Account construction + derivation helpers. Centralized so the verification
 * status rule lives in exactly one place (no duplicated business logic).
 */

export interface CreateAccountInput {
  readonly type: AccountType;
  readonly role?: Role;
  readonly email?: string;
  readonly emailVerified?: boolean;
  readonly passwordHash?: string;
  readonly organizationId?: string;
  readonly mfaLevel?: MfaLevel;
  readonly kycStatus?: KycStatus;
  readonly status?: AccountStatus;
}

export function createAccount(input: CreateAccountInput): Account {
  const now = new Date().toISOString();
  return {
    id: generateId("acc"),
    type: input.type,
    status: input.status ?? AccountStatus.Pending,
    role: input.role ?? Role.Investor,
    email: input.email,
    emailVerified: input.emailVerified ?? false,
    passwordHash: input.passwordHash,
    walletIds: [],
    organizationId: input.organizationId as Account["organizationId"],
    verification: VerificationStatus.Unverified,
    kycStatus: input.kycStatus,
    mfaLevel: input.mfaLevel ?? MfaLevel.None,
    mfaSecret: undefined,
    guardianIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Verification is Verified only with approved KYC; otherwise scales with credentials. */
export function deriveVerification(account: Account): VerificationStatus {
  if (account.kycStatus === "approved") return VerificationStatus.Verified;
  if (account.walletIds.length > 0 || account.email) return VerificationStatus.Partial;
  return VerificationStatus.Unverified;
}

export function touch(account: Account): Account {
  return { ...account, updatedAt: new Date().toISOString() };
}
