import type { IHashService } from "../infrastructure/services/hash-service";
import type { IClock } from "../infrastructure/services/clock";
import {
  SettlementVerifiedEvent,
  SettlementRejectedEvent,
} from "./security-events";

export interface SettlementRefValidationRequest {
  readonly settlementRef: string;
  readonly distributionId: string;
  readonly recipientId: string;
  readonly manifestHash: string;
  readonly source: "server" | "client";
}

export interface SettlementRefValidationResult {
  readonly valid: boolean;
  readonly reason: string | null;
}

export const SETTLEMENT_REF_LENGTH = 64;
export const SETTLEMENT_REF_SERVER_PREFIX = "stl";
export const SETTLEMENT_REF_PATTERN = /^stl:[a-f0-9]{61}$/;

export class SettlementSecurityService {
  private _seenRefs = new Set<string>();
  private _eventVersion = 0;
  private _uncommittedEvents: (SettlementVerifiedEvent | SettlementRejectedEvent)[] = [];

  constructor(
    private readonly hashService: IHashService,
    private readonly clock: IClock,
  ) {}

  get uncommittedEvents(): readonly (SettlementVerifiedEvent | SettlementRejectedEvent)[] {
    return [...this._uncommittedEvents];
  }

  clearEvents(): void {
    this._uncommittedEvents.length = 0;
    this._eventVersion = 0;
  }

  computeSettlementRef(distributionId: string, recipientId: string, manifestHash: string): string {
    const hash = this.hashService.sha256(`${distributionId}:${recipientId}:${manifestHash}`);
    return `${SETTLEMENT_REF_SERVER_PREFIX}:${hash}`;
  }

  validateRefFormat(ref: string): boolean {
    return SETTLEMENT_REF_PATTERN.test(ref);
  }

  validateRefSource(source: "server" | "client"): boolean {
    return source === "server";
  }

  validateRefUniqueness(ref: string): boolean {
    return !this._seenRefs.has(ref);
  }

  markRefSeen(ref: string): void {
    this._seenRefs.add(ref);
  }

  validateBeforePayment(
    request: SettlementRefValidationRequest,
  ): SettlementRefValidationResult {
    if (request.source !== "server") {
      this._emitRejected(request.settlementRef, request.distributionId, request.recipientId, `Settlement ref came from ${request.source} instead of server`);
      return { valid: false, reason: `Settlement ref must be generated server-side, got source=${request.source}` };
    }

    if (!this.validateRefFormat(request.settlementRef)) {
      this._emitRejected(request.settlementRef, request.distributionId, request.recipientId, `Invalid settlement ref format: ${request.settlementRef}`);
      return { valid: false, reason: `Settlement ref format invalid: ${request.settlementRef}` };
    }

    const expectedRef = this.computeSettlementRef(request.distributionId, request.recipientId, request.manifestHash);
    if (request.settlementRef !== expectedRef) {
      this._emitRejected(request.settlementRef, request.distributionId, request.recipientId, `Settlement ref mismatch: expected ${expectedRef}, got ${request.settlementRef}`);
      return { valid: false, reason: `Settlement ref does not match computed value` };
    }

    if (!this.validateRefUniqueness(request.settlementRef)) {
      this._emitRejected(request.settlementRef, request.distributionId, request.recipientId, `Duplicate settlement ref: ${request.settlementRef}`);
      return { valid: false, reason: `Settlement ref ${request.settlementRef} has already been used` };
    }

    this.markRefSeen(request.settlementRef);
    this._emitVerified(request.settlementRef, request.distributionId, request.recipientId);
    return { valid: true, reason: null };
  }

  clearSeenRefs(): void {
    this._seenRefs.clear();
  }

  private _emitVerified(ref: string, distributionId: string, recipientId: string): void {
    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new SettlementVerifiedEvent(`settlement:${ref}`, this._eventVersion, {
        settlementRef: ref,
        distributionId,
        recipientId,
        verifiedAt: this.clock.nowMs(),
      }),
    );
  }

  private _emitRejected(ref: string, distributionId: string, recipientId: string, reason: string): void {
    this._eventVersion += 1;
    this._uncommittedEvents.push(
      new SettlementRejectedEvent(`settlement:${ref}`, this._eventVersion, {
        settlementRef: ref,
        distributionId,
        recipientId,
        reason,
        rejectedAt: this.clock.nowMs(),
      }),
    );
  }
}
