import type { Address, ChainId, EntityId } from "@relcko/types";
import { asAddress, asChainId } from "@relcko/types";
import { createWallet } from "@relcko/domain-core";
import type { EventBus } from "@relcko/events";
import type { IdentityRepository } from "./repository";
import {
  buildWalletChallengeMessage,
  createSignatureVerifier,
  NonceService,
  type SignatureVerifier,
} from "./crypto";
import { IdentityEventType, publishIdentityEvent } from "./events";
import {
  Account,
  LoginChallenge,
  WalletProviderKind,
} from "./types";
import { deriveVerification, touch } from "./account";
import { IdentityError, WalletError } from "./errors";

/** Provider seam: each supported wallet type is a connector (future HW pluggable). */
export interface WalletConnector {
  readonly kind: WalletProviderKind;
  buildChallengeMessage(params: {
    address: string;
    chainId: number;
    nonce: string;
    action: string;
  }): string;
}

class GenericWalletConnector implements WalletConnector {
  constructor(public readonly kind: WalletProviderKind) {}
  buildChallengeMessage(params: { address: string; chainId: number; nonce: string; action: string }): string {
    return buildWalletChallengeMessage(params);
  }
}

export function createWalletConnector(kind: WalletProviderKind): WalletConnector {
  return new GenericWalletConnector(kind);
}

export const SUPPORTED_WALLET_PROVIDERS: readonly WalletProviderKind[] = [
  WalletProviderKind.MetaMask,
  WalletProviderKind.WalletConnect,
  WalletProviderKind.Coinbase,
  WalletProviderKind.Injected,
  WalletProviderKind.Hardware,
];

export interface WalletServiceOptions {
  readonly bus: EventBus;
  readonly nonce?: NonceService;
  readonly verifier?: SignatureVerifier;
  readonly nonceTtlSeconds?: number;
}

export class WalletService {
  private readonly nonce: NonceService;
  private readonly verifier: SignatureVerifier;
  private readonly nonceTtl: number;

  constructor(
    private readonly repo: IdentityRepository,
    private readonly options: WalletServiceOptions,
  ) {
    this.nonce = options.nonce ?? new NonceService();
    this.verifier = options.verifier ?? createSignatureVerifier();
    this.nonceTtl = options.nonceTtlSeconds ?? 300;
  }

  /** Issue a single-use nonce + the exact message the wallet must sign. */
  async challenge(
    address: Address,
    chainId: ChainId,
    provider: WalletProviderKind,
  ): Promise<LoginChallenge> {
    const connector = createWalletConnector(provider);
    const nonce = this.nonce.issue(`wallet:${address}`, this.nonceTtl);
    const message = connector.buildChallengeMessage({
      address,
      chainId: Number(chainId),
      nonce,
      action: "wallet-authentication",
    });
    const issuedAt = new Date().toISOString();
    return {
      address,
      chainId,
      nonce,
      message,
      issuedAt,
      expiresAt: new Date(Date.now() + this.nonceTtl * 1000).toISOString(),
    };
  }

  private assertSignature(
    message: string,
    signature: string,
    publicKey: string,
    nonce: string,
    address: Address,
  ): void {
    if (!message.includes(nonce) || !message.toLowerCase().includes(address.toLowerCase())) {
      throw new WalletError("Challenge message is not bound to this nonce/address", "WALLET_MSG_BIND");
    }
    if (!this.verifier.verify(message, signature, publicKey)) {
      throw new WalletError("Signature verification failed", "WALLET_SIG_INVALID");
    }
  }

  /** Consume the single-use nonce and verify the wallet signature (replay-safe). */
  async assertOwnership(input: {
    address: Address;
    chainId: ChainId;
    message: string;
    nonce: string;
    signature: string;
    publicKey: string;
  }): Promise<void> {
    this.nonce.consume(`wallet:${input.address}`, input.nonce);
    this.assertSignature(input.message, input.signature, input.publicKey, input.nonce, input.address);
  }

  /** Same as assertOwnership but returns a boolean instead of throwing. */
  async verifyOwnership(input: {
    address: Address;
    chainId: ChainId;
    message: string;
    nonce: string;
    signature: string;
    publicKey: string;
  }): Promise<boolean> {
    try {
      await this.assertOwnership(input);
      return true;
    } catch {
      return false;
    }
  }

  /** Persist a verified wallet to an account (no signature re-check). */
  async attachWallet(
    accountId: EntityId,
    input: { address: Address; chainId: ChainId; provider: WalletProviderKind },
  ): Promise<Account> {
    const account = await this.requireAccount(accountId);
    const existing = await this.repo.findWalletByAddress(input.address);
    if (existing && existing.investorId !== accountId) {
      throw new WalletError("Wallet already linked to another account", "WALLET_LINKED_ELSEWHERE");
    }
    if (existing && existing.investorId === accountId) {
      return account; // idempotent
    }
    const wallet = createWallet({
      investorId: accountId,
      address: input.address,
      chainId: Number(input.chainId),
      verified: true,
    });
    await this.repo.saveWallet(wallet);
    const updated: Account = touch({
      ...account,
      walletIds: [...account.walletIds, wallet.id],
      primaryWalletId: account.primaryWalletId ?? wallet.id,
      verification: deriveVerification({ ...account, walletIds: [...account.walletIds, wallet.id] }),
    });
    await this.repo.saveAccount(updated);
    await publishIdentityEvent(this.options.bus, {
      type: IdentityEventType.WalletLinked,
      aggregateId: accountId,
      actorId: accountId,
      payload: { walletId: wallet.id, address: input.address, chainId: Number(input.chainId), provider: input.provider },
    });
    return updated;
  }

  /** Link a verified wallet to an account (verifies ownership then persists). */
  async link(
    accountId: EntityId,
    input: {
      address: Address;
      chainId: ChainId;
      provider: WalletProviderKind;
      message: string;
      nonce: string;
      signature: string;
      publicKey: string;
    },
  ): Promise<Account> {
    await this.assertOwnership(input);
    return this.attachWallet(accountId, input);
  }

  async unlink(accountId: EntityId, walletId: EntityId): Promise<Account> {
    const account = await this.requireAccount(accountId);
    const wallet = await this.repo.getWallet(walletId);
    if (!wallet || wallet.investorId !== accountId) {
      throw new WalletError("Wallet not found for this account", "WALLET_NOT_FOUND");
    }
    const remainingCredentials = account.walletIds.length - 1 + (account.email ? 1 : 0);
    if (remainingCredentials <= 0) {
      throw new IdentityError("Cannot remove the last authentication credential", "LAST_CREDENTIAL");
    }
    await this.repo.deleteWallet(walletId);
    const walletIds = account.walletIds.filter((id) => id !== walletId);
    const primaryWalletId =
      account.primaryWalletId === walletId ? walletIds[0] : account.primaryWalletId;
    const updated: Account = touch({
      ...account,
      walletIds,
      primaryWalletId,
      verification: deriveVerification({ ...account, walletIds }),
    });
    await this.repo.saveAccount(updated);

    await publishIdentityEvent(this.options.bus, {
      type: IdentityEventType.WalletRemoved,
      aggregateId: accountId,
      actorId: accountId,
      payload: { walletId, address: wallet.address },
    });
    return updated;
  }

  async setPrimary(accountId: EntityId, walletId: EntityId): Promise<Account> {
    const account = await this.requireAccount(accountId);
    const wallet = await this.repo.getWallet(walletId);
    if (!wallet || wallet.investorId !== accountId) {
      throw new WalletError("Wallet not found for this account", "WALLET_NOT_FOUND");
    }
    const updated = touch({ ...account, primaryWalletId: walletId });
    await this.repo.saveAccount(updated);
    return updated;
  }

  async list(accountId: EntityId) {
    return this.repo.getWalletsByAccount(accountId);
  }

  /** Re-verify ownership of an already-linked wallet (session refresh / recovery). */
  async reverifyWalletOwnership(
    accountId: EntityId,
    walletId: EntityId,
    input: { message: string; nonce: string; signature: string; publicKey: string },
  ): Promise<boolean> {
    const account = await this.requireAccount(accountId);
    const wallet = await this.repo.getWallet(walletId);
    if (!wallet || wallet.investorId !== accountId) {
      throw new WalletError("Wallet not found for this account", "WALLET_NOT_FOUND");
    }
    try {
      this.nonce.consume(`wallet:${wallet.address}`, input.nonce);
    } catch {
      return false;
    }
    try {
      this.assertSignature(input.message, input.signature, input.publicKey, input.nonce, wallet.address);
    } catch {
      return false;
    }
    return true;
  }

  private async requireAccount(accountId: EntityId): Promise<Account> {
    const account = await this.repo.getAccount(accountId);
    if (!account) throw new IdentityError("Account not found", "ACCOUNT_NOT_FOUND", { accountId });
    return account;
  }
}
