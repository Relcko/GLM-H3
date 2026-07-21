import crypto from "node:crypto";

export class SettlementReferenceService {
  computeSettlementRef(distributionId: string, recipientId: string, manifestHash: string): string {
    return crypto
      .createHash("sha256")
      .update(`${distributionId}:${recipientId}:${manifestHash}`)
      .digest("hex");
  }
}

export const SETTLEMENT_REF_LENGTH = 64;
