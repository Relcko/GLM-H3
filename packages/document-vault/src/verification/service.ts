import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { VaultRepository } from "../repository";
import type { VerificationRecord } from "../types";
import { VaultDocumentStatus } from "../types";
import { assertVerificationInvariants } from "../domain";
import { VaultEventType, publishVaultEvent } from "../events";

export class VerificationService {
  constructor(
    private readonly repository: VaultRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  verify(actorId: EntityId, documentId: EntityId, verifierId: EntityId): VerificationRecord {
    const doc = this.repository.getDocument(documentId);
    if (!doc) throw new Error(`Document ${documentId} not found`);

    const record: VerificationRecord = {
      id: generateId("vault-verify") as EntityId,
      documentId,
      verifierId,
      status: "verified",
      verifiedAt: new Date().toISOString(),
    };

    assertVerificationInvariants(record);
    this.repository.saveVerificationRecord(record);

    const updatedDoc = { ...doc, status: VaultDocumentStatus.Verified, verifiedById: verifierId, verifiedAt: record.verifiedAt };
    this.repository.saveDocument(updatedDoc);

    publishVaultEvent(this.events, VaultEventType.DocumentVerified, documentId, actorId, {
      documentId: documentId as string,
      verifierId: verifierId as string,
      status: "verified",
    });

    this.logger?.info("document verified", { documentId, verifierId });
    return record;
  }

  reject(actorId: EntityId, documentId: EntityId, verifierId: EntityId, reason: string): VerificationRecord {
    const doc = this.repository.getDocument(documentId);
    if (!doc) throw new Error(`Document ${documentId} not found`);

    const record: VerificationRecord = {
      id: generateId("vault-verify") as EntityId,
      documentId,
      verifierId,
      status: "rejected",
      reason,
      verifiedAt: new Date().toISOString(),
    };

    assertVerificationInvariants(record);
    this.repository.saveVerificationRecord(record);

    const updatedDoc = { ...doc, status: VaultDocumentStatus.Rejected };
    this.repository.saveDocument(updatedDoc);

    publishVaultEvent(this.events, VaultEventType.DocumentRejected, documentId, actorId, {
      documentId: documentId as string,
      verifierId: verifierId as string,
      reason,
    });

    this.logger?.info("document rejected", { documentId, verifierId, reason });
    return record;
  }

  getVerificationHistory(documentId: EntityId): VerificationRecord[] {
    return this.repository.listVerificationRecordsByDocument(documentId);
  }
}
