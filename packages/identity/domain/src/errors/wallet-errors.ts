import { IdentityDomainError } from './identity-domain-error';

export class WalletNotFoundError extends IdentityDomainError {
  constructor(walletId: string, context?: Record<string, unknown>) {
    super('WALLET_NOT_FOUND', `Wallet ${walletId} not found`, { walletId, ...context });
  }
}

export class WalletAlreadyLinkedError extends IdentityDomainError {
  constructor(address: string, context?: Record<string, unknown>) {
    super('WALLET_ALREADY_LINKED', `Wallet ${address} is already linked to another user`, {
      address,
      ...context,
    });
  }
}

export class WalletVerificationFailedError extends IdentityDomainError {
  constructor(address: string, reason: string, context?: Record<string, unknown>) {
    super('WALLET_VERIFICATION_FAILED', `Wallet ${address} verification failed: ${reason}`, {
      address,
      reason,
      ...context,
    });
  }
}

export class WalletNotVerifiedError extends IdentityDomainError {
  constructor(walletId: string, context?: Record<string, unknown>) {
    super('WALLET_NOT_VERIFIED', `Wallet ${walletId} is not verified`, { walletId, ...context });
  }
}
