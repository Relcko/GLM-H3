import type { IHashService } from "../infrastructure/services/hash-service";
import type { IClock } from "../infrastructure/services/clock";
import {
  ApprovalAcceptedEvent,
  ApprovalRejectedEvent,
} from "./security-events";

export enum KeyStatus {
  Active = "active",
  Revoked = "revoked",
  Compromised = "compromised",
}

export interface SignerKey {
  readonly keyId: string;
  readonly ownerId: string;
  readonly status: KeyStatus;
  readonly publicKey: string;
  readonly addedAt: number;
}

export interface ApprovalProposal {
  readonly proposalId: string;
  readonly digest: string;
  readonly threshold: number;
  readonly allowedSigners: readonly string[];
  readonly epoch: number;
  readonly expiresAt: number;
}

export interface SignedApproval {
  readonly signerKeyId: string;
  readonly signature: string;
  readonly signedAt: number;
}

export const SIGNATURE_PREFIX = "sig:approval:";

export interface ApprovalVerificationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface ApprovalPolicyDeps {
  readonly hashService: IHashService;
  readonly clock: IClock;
}

export class ApprovalPolicy {
  private _eventVersion = 0;
  private _uncommittedEvents: (ApprovalAcceptedEvent | ApprovalRejectedEvent)[] = [];

  constructor(private readonly deps: ApprovalPolicyDeps) {}

  get uncommittedEvents(): readonly (ApprovalAcceptedEvent | ApprovalRejectedEvent)[] {
    return [...this._uncommittedEvents];
  }

  clearEvents(): void {
    this._uncommittedEvents.length = 0;
    this._eventVersion = 0;
  }

  computeDigest(content: string): string {
    return this.deps.hashService.sha256(content);
  }

  verifyProposalDigest(proposal: ApprovalProposal, computedDigest: string): boolean {
    return proposal.digest === computedDigest;
  }

  verifySignature(key: SignerKey, digest: string, signature: string): boolean {
    const expected = this.deps.hashService.sha256(`${SIGNATURE_PREFIX}${key.keyId}:${digest}`);
    return signature === expected;
  }

  verifyThreshold(approvals: readonly SignedApproval[], threshold: number): boolean {
    if (threshold <= 0) return true;
    return approvals.length >= threshold;
  }

  verifySignerUniqueness(approvals: readonly SignedApproval[]): boolean {
    const seen = new Set<string>();
    for (const a of approvals) {
      if (seen.has(a.signerKeyId)) return false;
      seen.add(a.signerKeyId);
    }
    return true;
  }

  verifyKeyStatus(key: SignerKey): boolean {
    return key.status === KeyStatus.Active;
  }

  verifyExpiry(proposal: ApprovalProposal, now: number): boolean {
    return now < proposal.expiresAt;
  }

  verifyEpoch(proposal: ApprovalProposal, currentEpoch: number): boolean {
    return proposal.epoch === currentEpoch;
  }

  verifySignerAllowed(proposal: ApprovalProposal, signerKeyId: string): boolean {
    return proposal.allowedSigners.includes(signerKeyId);
  }

  isDuplicateSignature(
    existingApprovals: readonly SignedApproval[],
    newSignature: SignedApproval,
  ): boolean {
    return existingApprovals.some(
      (a) => a.signerKeyId === newSignature.signerKeyId || a.signature === newSignature.signature,
    );
  }

  verifyAll(
    proposal: ApprovalProposal,
    approvals: readonly SignedApproval[],
    keys: readonly SignerKey[],
    currentEpoch: number,
    now: number,
  ): ApprovalVerificationResult {
    const errors: string[] = [];

    if (!this.verifyExpiry(proposal, now)) {
      errors.push(`Proposal ${proposal.proposalId} expired at ${new Date(proposal.expiresAt).toISOString()}`);
    }

    if (!this.verifyEpoch(proposal, currentEpoch)) {
      errors.push(`Proposal ${proposal.proposalId} epoch ${proposal.epoch} does not match current epoch ${currentEpoch}`);
    }

    if (!this.verifySignerUniqueness(approvals)) {
      errors.push("Duplicate signer detected: a signer appears more than once");
    }

    if (!this.verifyThreshold(approvals, proposal.threshold)) {
      errors.push(`Threshold not met: required ${proposal.threshold}, got ${approvals.length}`);
    }

    if (errors.length > 0) {
      this._emitRejected(proposal.proposalId, "unknown", errors.join("; "));
      return { valid: false, errors };
    }

    const keyMap = new Map<string, SignerKey>();
    for (const key of keys) {
      keyMap.set(key.keyId, key);
    }

    for (const approval of approvals) {
      const key = keyMap.get(approval.signerKeyId);
      if (!key) {
        errors.push(`Signer key ${approval.signerKeyId} not found in key registry`);
        continue;
      }

      if (!this.verifyKeyStatus(key)) {
        errors.push(`Signer key ${approval.signerKeyId} has status ${key.status}, expected ${KeyStatus.Active}`);
      }

      if (!this.verifySignerAllowed(proposal, approval.signerKeyId)) {
        errors.push(`Signer key ${approval.signerKeyId} is not in the allowed signers list for proposal ${proposal.proposalId}`);
      }

      if (!this.verifySignature(key, proposal.digest, approval.signature)) {
        errors.push(`Invalid signature for signer key ${approval.signerKeyId}`);
      }
    }

    if (errors.length > 0) {
      this._emitRejected(proposal.proposalId, approvals[0]?.signerKeyId ?? "unknown", errors.join("; "));
      return { valid: false, errors };
    }

    this._emitAccepted(proposal.proposalId, approvals.map((a) => a.signerKeyId).join(","), currentEpoch);
    return { valid: true, errors: [] };
  }

  private _emitAccepted(proposalId: string, approverId: string, epoch: number): void {
    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new ApprovalAcceptedEvent(`proposal:${proposalId}`, this._eventVersion, {
        proposalId,
        approverId,
        epoch,
        acceptedAt: this.deps.clock.nowMs(),
      }),
    );
  }

  private _emitRejected(proposalId: string, approverId: string, reason: string): void {
    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new ApprovalRejectedEvent(`proposal:${proposalId}`, this._eventVersion, {
        proposalId,
        approverId,
        reason,
        rejectedAt: this.deps.clock.nowMs(),
      }),
    );
  }
}
