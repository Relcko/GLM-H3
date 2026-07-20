import type { Address, EntityId } from "@relcko/types";
import type { Wallet } from "@relcko/domain-core";
import {
  Account,
  AccountType,
  Guardian,
  Organization,
} from "./types";

/**
 * Persistence seam for the identity module. The interface is async so a real
 * datastore can be dropped in; the in-memory implementation is used by tests
 * and local runs. It owns accounts, wallets, organizations and guardians.
 */

export interface IdentityRepository {
  saveAccount(account: Account): Promise<void>;
  getAccount(id: EntityId): Promise<Account | undefined>;
  findAccountByEmail(email: string): Promise<Account | undefined>;
  findAccountByWalletAddress(address: Address): Promise<Account | undefined>;

  saveWallet(wallet: Wallet): Promise<void>;
  getWallet(id: EntityId): Promise<Wallet | undefined>;
  getWalletsByAccount(accountId: EntityId): Promise<Wallet[]>;
  findWalletByAddress(address: Address): Promise<Wallet | undefined>;
  deleteWallet(id: EntityId): Promise<void>;

  saveOrganization(org: Organization): Promise<void>;
  getOrganization(id: EntityId): Promise<Organization | undefined>;

  saveGuardian(guardian: Guardian): Promise<void>;
  getGuardian(id: EntityId): Promise<Guardian | undefined>;
  getGuardiansByAccount(accountId: EntityId): Promise<Guardian[]>;
}

export class InMemoryIdentityRepository implements IdentityRepository {
  private readonly accounts = new Map<string, Account>();
  private readonly wallets = new Map<string, Wallet>();
  private readonly organizations = new Map<string, Organization>();
  private readonly guardians = new Map<string, Guardian>();

  async saveAccount(account: Account): Promise<void> {
    this.accounts.set(account.id, account);
  }
  async getAccount(id: EntityId): Promise<Account | undefined> {
    return this.accounts.get(id);
  }
  async findAccountByEmail(email: string): Promise<Account | undefined> {
    const lower = email.toLowerCase();
    return [...this.accounts.values()].find((a) => a.email?.toLowerCase() === lower);
  }
  async findAccountByWalletAddress(address: Address): Promise<Account | undefined> {
    const wallet = await this.findWalletByAddress(address);
    return wallet ? this.accounts.get(wallet.investorId) : undefined;
  }

  async saveWallet(wallet: Wallet): Promise<void> {
    this.wallets.set(wallet.id, wallet);
  }
  async getWallet(id: EntityId): Promise<Wallet | undefined> {
    return this.wallets.get(id);
  }
  async getWalletsByAccount(accountId: EntityId): Promise<Wallet[]> {
    return [...this.wallets.values()].filter((w) => w.investorId === accountId);
  }
  async findWalletByAddress(address: Address): Promise<Wallet | undefined> {
    const lower = address.toLowerCase();
    return [...this.wallets.values()].find((w) => w.address.toLowerCase() === lower);
  }
  async deleteWallet(id: EntityId): Promise<void> {
    this.wallets.delete(id);
  }

  async saveOrganization(org: Organization): Promise<void> {
    this.organizations.set(org.id, org);
  }
  async getOrganization(id: EntityId): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async saveGuardian(guardian: Guardian): Promise<void> {
    this.guardians.set(guardian.id, guardian);
  }
  async getGuardian(id: EntityId): Promise<Guardian | undefined> {
    return this.guardians.get(id);
  }
  async getGuardiansByAccount(accountId: EntityId): Promise<Guardian[]> {
    return [...this.guardians.values()].filter((g) => g.accountId === accountId);
  }
}
