import type { EntityId, Json } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";

export const VaultEventType = {
  DocumentUploaded: "vault.document_uploaded",
  DocumentVerified: "vault.document_verified",
  DocumentRejected: "vault.document_rejected",
  DocumentAccessed: "vault.document_accessed",
  DocumentRemoved: "vault.document_removed",
  AccessGranted: "vault.access_granted",
  AccessRevoked: "vault.access_revoked",
  KYCSubmitted: "vault.kyc_submitted",
  KYCApproved: "vault.kyc_approved",
  KYCRejected: "vault.kyc_rejected",
} as const;

export type VaultEventType = (typeof VaultEventType)[keyof typeof VaultEventType];

export async function publishVaultEvent(
  bus: EventBus,
  type: string,
  aggregateId: EntityId,
  actorId: EntityId,
  payload: Json,
): Promise<void> {
  const envelope = createEnvelope({
    type,
    aggregateId,
    actorId,
    payload,
    source: "relcko.document-vault",
  });
  await bus.publish(envelope);
}
