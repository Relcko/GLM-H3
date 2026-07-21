import type { EntityId } from "@relcko/types";
import type {
  VaultDocument,
  AccessGrant,
  VerificationRecord,
  AccessGrantScope,
  VaultFolder,
  VaultDocumentCategory,
} from "./types";
import { VaultDocumentStatus } from "./types";
import type { VaultRepository } from "./repository";

export class InMemoryVaultRepository implements VaultRepository {
  private readonly documents = new Map<EntityId, VaultDocument>();
  private readonly accessGrants = new Map<EntityId, AccessGrant>();
  private readonly verificationRecords = new Map<EntityId, VerificationRecord>();
  private readonly folders = new Map<EntityId, VaultFolder>();
  private readonly processedEvents = new Set<string>();

  saveDocument(doc: VaultDocument): void { this.documents.set(doc.id, doc); }
  getDocument(id: EntityId): VaultDocument | undefined { return this.documents.get(id); }
  listDocumentsByOwner(ownerId: EntityId): VaultDocument[] {
    return [...this.documents.values()].filter(d => d.ownerId === ownerId);
  }
  listDocumentsByProperty(propertyId: EntityId): VaultDocument[] {
    return [...this.documents.values()].filter(d => d.propertyId === propertyId);
  }
  listDocumentsByCategory(ownerId: EntityId, category: string): VaultDocument[] {
    return [...this.documents.values()].filter(d => d.ownerId === ownerId && d.category === category);
  }
  removeDocument(id: EntityId): void { this.documents.delete(id); }

  saveAccessGrant(grant: AccessGrant): void { this.accessGrants.set(grant.id, grant); }
  getAccessGrant(id: EntityId): AccessGrant | undefined { return this.accessGrants.get(id); }
  listAccessGrantsByDocument(documentId: EntityId): AccessGrant[] {
    return [...this.accessGrants.values()].filter(g => g.documentId === documentId);
  }
  listAccessGrantsByGrantee(granteeId: EntityId): AccessGrant[] {
    return [...this.accessGrants.values()].filter(g => g.granteeId === granteeId);
  }
  revokeAccessGrant(id: EntityId): void {
    const grant = this.accessGrants.get(id);
    if (grant) {
      this.accessGrants.set(id, { ...grant, revokedAt: new Date().toISOString() });
    }
  }
  isAccessGranted(granteeId: EntityId, documentId: EntityId, scope: AccessGrantScope): boolean {
    return [...this.accessGrants.values()].some(g =>
      g.granteeId === granteeId &&
      g.documentId === documentId &&
      g.scope === scope &&
      !g.revokedAt &&
      (!g.expiresAt || g.expiresAt > new Date().toISOString()),
    );
  }

  saveVerificationRecord(record: VerificationRecord): void { this.verificationRecords.set(record.id, record); }
  getVerificationRecord(id: EntityId): VerificationRecord | undefined { return this.verificationRecords.get(id); }
  listVerificationRecordsByDocument(documentId: EntityId): VerificationRecord[] {
    return [...this.verificationRecords.values()].filter(r => r.documentId === documentId);
  }

  saveFolder(folder: VaultFolder): void { this.folders.set(folder.id, folder); }
  getFolder(id: EntityId): VaultFolder | undefined { return this.folders.get(id); }
  listFoldersByOwner(ownerId: EntityId): VaultFolder[] {
    return [...this.folders.values()].filter(f => f.ownerId === ownerId);
  }

  isEventProcessed(eventId: string): boolean { return this.processedEvents.has(eventId); }
  markEventProcessed(eventId: string): void { this.processedEvents.add(eventId); }
}
