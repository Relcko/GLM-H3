import type { EntityId } from "@relcko/types";
import type { VaultDocument, AccessGrant, VerificationRecord, AccessGrantScope, VaultFolder } from "./types";

export interface VaultRepository {
  saveDocument(doc: VaultDocument): void;
  getDocument(id: EntityId): VaultDocument | undefined;
  listDocumentsByOwner(ownerId: EntityId): VaultDocument[];
  listDocumentsByProperty(propertyId: EntityId): VaultDocument[];
  listDocumentsByCategory(ownerId: EntityId, category: string): VaultDocument[];
  removeDocument(id: EntityId): void;

  saveAccessGrant(grant: AccessGrant): void;
  getAccessGrant(id: EntityId): AccessGrant | undefined;
  listAccessGrantsByDocument(documentId: EntityId): AccessGrant[];
  listAccessGrantsByGrantee(granteeId: EntityId): AccessGrant[];
  revokeAccessGrant(id: EntityId): void;
  isAccessGranted(granteeId: EntityId, documentId: EntityId, scope: AccessGrantScope): boolean;

  saveVerificationRecord(record: VerificationRecord): void;
  getVerificationRecord(id: EntityId): VerificationRecord | undefined;
  listVerificationRecordsByDocument(documentId: EntityId): VerificationRecord[];

  saveFolder(folder: VaultFolder): void;
  getFolder(id: EntityId): VaultFolder | undefined;
  listFoldersByOwner(ownerId: EntityId): VaultFolder[];

  isEventProcessed(eventId: string): boolean;
  markEventProcessed(eventId: string): void;
}
