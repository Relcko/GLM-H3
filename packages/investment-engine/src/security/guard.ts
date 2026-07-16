import type { EntityId } from "@relcko/types";
import type { InvestmentEngineRepository } from "../repository";
import { ReplayError, DoubleSubmitError, ChainVerificationError, SignatureVerificationError } from "../errors";

export class SecurityGuard {
  constructor(private readonly repository: InvestmentEngineRepository) {}

  checkReplay(eventId: string): void {
    if (this.repository.isEventProcessed(eventId)) {
      throw new ReplayError(eventId);
    }
    this.repository.markEventProcessed(eventId);
  }

  checkDoubleSubmit(idempotencyKey: string): void {
    if (this.repository.isIdempotencyKeyUsed(idempotencyKey)) {
      throw new DoubleSubmitError(idempotencyKey);
    }
    this.repository.markIdempotencyKey(idempotencyKey);
  }

  verifyChain(expectedChainId: number, actualChainId: number): void {
    if (expectedChainId !== actualChainId) {
      throw new ChainVerificationError(expectedChainId, actualChainId);
    }
  }

  verifySignature(
    message: string,
    signature: string,
    expectedAddress: string,
    verifyFn: (message: string, signature: string, address: string) => boolean,
  ): void {
    if (!verifyFn(message, signature, expectedAddress)) {
      throw new SignatureVerificationError("Signature does not match expected address");
    }
  }

  verifyConfirmation(
    txHash: string,
    confirmations: number,
    requiredConfirmations: number,
    getCurrentConfirmations: (txHash: string) => Promise<number>,
  ): Promise<boolean> {
    return this.verifyTransactionConfirmations(txHash, confirmations, requiredConfirmations, getCurrentConfirmations);
  }

  private async verifyTransactionConfirmations(
    txHash: string,
    currentConfirmations: number,
    requiredConfirmations: number,
    getCurrentConfirmations: (txHash: string) => Promise<number>,
  ): Promise<boolean> {
    if (currentConfirmations >= requiredConfirmations) return true;
    const freshConfirmations = await getCurrentConfirmations(txHash);
    return freshConfirmations >= requiredConfirmations;
  }
}
