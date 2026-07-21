import type { IClock } from "../infrastructure/services/clock";
import type { IIdempotencyLedger } from "../saga/idempotency-ledger.interface";
import { ReplayDetectedEvent } from "./security-events";

export interface CommandDigest {
  readonly commandType: string;
  readonly payloadHash: string;
  readonly nonce: string;
  readonly timestamp: number;
}

export interface ReplayValidationRequest {
  readonly nonce: string;
  readonly timestamp: number;
  readonly expiresAt: number | null;
  readonly commandDigest: string;
  readonly approvalDigest: string | null;
  readonly settlementRef: string | null;
  readonly idempotencyKey: string | null;
  readonly correlationId: string | null;
}

export interface ReplayValidationResult {
  readonly valid: boolean;
  readonly reason: string | null;
}

export const MAX_TIMESTAMP_AGE_MS = 300_000;
export const SETTLEMENT_REF_PREFIX = "stl:";

export class ReplayProtectionService {
  private _seenNonces = new Set<string>();
  private _seenDigests = new Set<string>();
  private _seenSettlementRefs = new Set<string>();
  private _eventVersion = 0;
  private _uncommittedEvents: ReplayDetectedEvent[] = [];

  constructor(
    private readonly clock: IClock,
    private readonly idempotencyLedger?: IIdempotencyLedger,
  ) {}

  get uncommittedEvents(): readonly ReplayDetectedEvent[] {
    return [...this._uncommittedEvents];
  }

  clearEvents(): void {
    this._uncommittedEvents.length = 0;
    this._eventVersion = 0;
  }

  validateNonce(nonce: string): boolean {
    if (!nonce || nonce.length === 0) return false;
    if (this._seenNonces.has(nonce)) return false;
    this._seenNonces.add(nonce);
    return true;
  }

  validateTimestamp(timestamp: number, maxAgeMs: number = MAX_TIMESTAMP_AGE_MS): boolean {
    if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
    const now = this.clock.nowMs();
    return now - timestamp <= maxAgeMs && timestamp <= now + 5_000;
  }

  validateExpiry(expiresAt: number | null): boolean {
    if (expiresAt === null) return true;
    const now = this.clock.nowMs();
    return now < expiresAt;
  }

  validateCommandDigest(digest: string): boolean {
    if (!digest || digest.length === 0) return false;
    if (this._seenDigests.has(digest)) return false;
    this._seenDigests.add(digest);
    return true;
  }

  validateApprovalDigest(digest: string | null, seenApprovalDigests: Set<string>): boolean {
    if (digest === null) return true;
    if (!digest || digest.length === 0) return false;
    if (seenApprovalDigests.has(digest)) return false;
    seenApprovalDigests.add(digest);
    return true;
  }

  validateSettlementRef(ref: string | null): boolean {
    if (ref === null) return true;
    if (!ref || ref.length === 0) return false;
    if (!ref.startsWith(SETTLEMENT_REF_PREFIX)) return false;
    if (this._seenSettlementRefs.has(ref)) return false;
    this._seenSettlementRefs.add(ref);
    return true;
  }

  async validateIdempotency(key: string | null): Promise<boolean> {
    if (key === null) return true;
    if (!this.idempotencyLedger) return true;
    const exists = await this.idempotencyLedger.exists(key);
    return !exists;
  }

  computeCommandDigest(input: CommandDigest): string {
    const msg = `${input.commandType}:${input.payloadHash}:${input.nonce}:${input.timestamp}`;
    let hash = 0;
    for (let i = 0; i < msg.length; i++) {
      const char = msg.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `cd:${Math.abs(hash).toString(16)}`;
  }

  async validateAll(request: ReplayValidationRequest): Promise<ReplayValidationResult> {
    const seenApprovalDigests = new Set<string>();

    if (!this.validateNonce(request.nonce)) {
      return this._reject("replay", `Nonce ${request.nonce} already seen or invalid`, request.correlationId);
    }

    if (!this.validateTimestamp(request.timestamp)) {
      return this._reject("replay", `Timestamp ${request.timestamp} is outside acceptable window`, request.correlationId);
    }

    if (!this.validateExpiry(request.expiresAt)) {
      return this._reject("expired", `Request expired at ${new Date(request.expiresAt ?? 0).toISOString()}`, request.correlationId);
    }

    if (!this.validateCommandDigest(request.commandDigest)) {
      return this._reject("replay", `Command digest ${request.commandDigest} already processed`, request.correlationId);
    }

    if (!this.validateApprovalDigest(request.approvalDigest, seenApprovalDigests)) {
      return this._reject("replay", `Approval digest ${request.approvalDigest} already processed`, request.correlationId);
    }

    if (!this.validateSettlementRef(request.settlementRef)) {
      return this._reject("duplicate", `Settlement ref ${request.settlementRef} already used`, request.correlationId);
    }

    const idempotent = await this.validateIdempotency(request.idempotencyKey);
    if (!idempotent) {
      return this._reject("duplicate", `Idempotency key ${request.idempotencyKey} already processed`, request.correlationId);
    }

    return { valid: true, reason: null };
  }

  isSettlementRefDuplicate(ref: string): boolean {
    return this._seenSettlementRefs.has(ref);
  }

  markSettlementRefSeen(ref: string): void {
    this._seenSettlementRefs.add(ref);
  }

  hasSeenNonce(nonce: string): boolean {
    return this._seenNonces.has(nonce);
  }

  hasSeenDigest(digest: string): boolean {
    return this._seenDigests.has(digest);
  }

  clear(): void {
    this._seenNonces.clear();
    this._seenDigests.clear();
    this._seenSettlementRefs.clear();
    this._uncommittedEvents.length = 0;
    this._eventVersion = 0;
  }

  private _reject(replayType: string, reason: string, correlationId: string | null): ReplayValidationResult {
    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new ReplayDetectedEvent(`replay:${replayType}`, this._eventVersion, {
        replayType,
        digest: reason,
        correlationId,
        detectedAt: this.clock.nowMs(),
      }),
    );
    return { valid: false, reason };
  }
}
