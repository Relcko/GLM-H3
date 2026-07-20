import { generateId } from "@relcko/utils";
import { Role } from "@relcko/types";
import { MfaLevel } from "@relcko/permission";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { IdentityRepository } from "./repository";
import {
  Account,
  AccountStatus,
  AccountType,
  Guardian,
  Organization,
  ResolvedIdentity,
  VerificationStatus,
} from "./types";
import { createAccount, deriveVerification, touch } from "./account";
import { IdentityEventType, publishIdentityEvent } from "./events";
import { IdentityError } from "./errors";

export interface RegisterAccountInput {
  readonly email?: string;
  readonly role?: Role;
  readonly mfaLevel?: MfaLevel;
}

export interface UpdateProfileInput {
  readonly email?: string;
  readonly mfaLevel?: MfaLevel;
  readonly verification?: VerificationStatus;
}

export interface CreateOrganizationInput {
  readonly accountId: EntityId;
  readonly legalName: string;
  readonly jurisdiction: string;
  readonly kind: AccountType.Institutional | AccountType.Corporate;
  readonly memberAccountIds?: readonly EntityId[];
}

export class IdentityService {
  /** Guardian approvals accumulated for in-progress recoveries (keyed by account). */
  private readonly recoveryApprovals = new Map<string, Set<string>>();

  constructor(
    private readonly repo: IdentityRepository,
    private readonly bus: EventBus,
  ) {}

  async registerIndividual(input: RegisterAccountInput = {}): Promise<Account> {
    const account = createAccount({
      type: AccountType.Individual,
      role: input.role ?? Role.Investor,
      email: input.email,
      emailVerified: false,
      mfaLevel: input.mfaLevel ?? MfaLevel.None,
    });
    await this.repo.saveAccount(account);
    return account;
  }

  async registerInstitutional(input: CreateOrganizationInput): Promise<Account> {
    return this.registerOrganization(input, AccountType.Institutional);
  }

  async registerCorporate(input: CreateOrganizationInput): Promise<Account> {
    return this.registerOrganization(input, AccountType.Corporate);
  }

  private async registerOrganization(
    input: CreateOrganizationInput,
    kind: AccountType.Institutional | AccountType.Corporate,
  ): Promise<Account> {
    const account = createAccount({ type: kind, role: Role.Investor });
    await this.repo.saveAccount(account);
    const org: Organization = {
      id: generateId("org"),
      accountId: account.id,
      legalName: input.legalName,
      jurisdiction: input.jurisdiction,
      kind,
      memberAccountIds: [account.id, ...(input.memberAccountIds ?? [])],
      createdAt: new Date().toISOString(),
    };
    await this.repo.saveOrganization(org);
    const updated = touch({ ...account, organizationId: org.id, status: AccountStatus.Active });
    await this.repo.saveAccount(updated);
    return updated;
  }

  async getResolvedIdentity(accountId: EntityId): Promise<ResolvedIdentity> {
    const account = await this.repo.getAccount(accountId);
    if (!account) throw new IdentityError("Account not found", "ACCOUNT_NOT_FOUND", { accountId });
    const wallets = await this.repo.getWalletsByAccount(accountId);
    const organization = account.organizationId
      ? await this.repo.getOrganization(account.organizationId)
      : undefined;
    return {
      account,
      wallets,
      organization,
      verification: account.verification,
      role: account.role,
    };
  }

  async updateProfile(accountId: EntityId, patch: UpdateProfileInput): Promise<Account> {
    const account = await this.requireAccount(accountId);
    const next: Account = touch({
      ...account,
      email: patch.email ?? account.email,
      emailVerified: patch.email ? false : account.emailVerified,
      mfaLevel: patch.mfaLevel ?? account.mfaLevel,
      verification: patch.verification ?? deriveVerification(account),
    });
    await this.repo.saveAccount(next);
    await publishIdentityEvent(this.bus, {
      type: IdentityEventType.ProfileUpdated,
      aggregateId: accountId,
      actorId: accountId,
      payload: { fields: Object.keys(patch) },
    });
    return next;
  }

  async setEmailCredential(
    accountId: EntityId,
    email: string,
    passwordHash: string,
  ): Promise<Account> {
    const account = await this.requireAccount(accountId);
    const next: Account = touch({
      ...account,
      email,
      emailVerified: true,
      passwordHash,
      verification: deriveVerification({ ...account, email, walletIds: account.walletIds }),
    });
    await this.repo.saveAccount(next);
    await publishIdentityEvent(this.bus, {
      type: IdentityEventType.EmailLinked,
      aggregateId: accountId,
      actorId: accountId,
      payload: { email },
    });
    return next;
  }

  // ---- Guardian recovery -------------------------------------------------

  async addGuardian(accountId: EntityId, guardianAccountId: EntityId): Promise<Guardian> {
    const account = await this.requireAccount(accountId);
    const guardian: Guardian = {
      id: generateId("grd"),
      accountId,
      guardianAccountId,
      approved: false,
      addedAt: new Date().toISOString(),
    };
    await this.repo.saveGuardian(guardian);
    const updated = touch({ ...account, guardianIds: [...account.guardianIds, guardian.id] });
    await this.repo.saveAccount(updated);
    return guardian;
  }

  async approveGuardian(guardianId: EntityId): Promise<Guardian> {
    const guardian = await this.repo.getGuardian(guardianId);
    if (!guardian) throw new IdentityError("Guardian not found", "GUARDIAN_NOT_FOUND", { guardianId });
    const updated: Guardian = { ...guardian, approved: true };
    await this.repo.saveGuardian(updated);
    return updated;
  }

  async initiateRecovery(accountId: EntityId): Promise<void> {
    const account = await this.requireAccount(accountId);
    if (account.guardianIds.length === 0) {
      throw new IdentityError("No guardians enrolled for recovery", "NO_GUARDIANS");
    }
    this.recoveryApprovals.set(accountId, new Set());
  }

  async approveRecovery(accountId: EntityId, guardianId: EntityId): Promise<number> {
    const approvals = this.recoveryApprovals.get(accountId);
    if (!approvals) throw new IdentityError("Recovery not initiated", "RECOVERY_NOT_STARTED");
    const guardian = await this.repo.getGuardian(guardianId);
    if (!guardian || guardian.accountId !== accountId || !guardian.approved) {
      throw new IdentityError("Guardian not eligible to approve", "GUARDIAN_INELIGIBLE");
    }
    approvals.add(guardianId);
    return approvals.size;
  }

  async completeRecovery(
    accountId: EntityId,
    threshold: number,
    reset: { email?: string; passwordHash?: string } = {},
  ): Promise<Account> {
    const approvals = this.recoveryApprovals.get(accountId);
    if (!approvals || approvals.size < threshold) {
      throw new IdentityError("Insufficient guardian approvals", "RECOVERY_THRESHOLD");
    }
    const account = await this.requireAccount(accountId);
    const next: Account = touch({
      ...account,
      email: reset.email ?? account.email,
      passwordHash: reset.passwordHash ?? account.passwordHash,
      status: account.status === AccountStatus.Closed ? AccountStatus.Active : account.status,
      verification: deriveVerification({ ...account, email: reset.email ?? account.email, walletIds: account.walletIds }),
    });
    await this.repo.saveAccount(next);
    this.recoveryApprovals.delete(accountId);
    return next;
  }

  private async requireAccount(accountId: EntityId): Promise<Account> {
    const account = await this.repo.getAccount(accountId);
    if (!account) throw new IdentityError("Account not found", "ACCOUNT_NOT_FOUND", { accountId });
    return account;
  }
}
