import { DomainError } from "@relcko/error";
import type { VaultDocument, AccessGrant, VerificationRecord } from "./types";
import { VaultDocumentCategory, VaultDocumentStatus, AccessGrantScope } from "./types";

export function assertVaultDocumentInvariants(doc: VaultDocument): void {
  if (!doc.filename || doc.filename.trim().length === 0) {
    throw new DomainError("document filename is required", "VAULT_DOC_FILENAME", { id: doc.id });
  }
  if (doc.category === VaultDocumentCategory.Kyc && doc.isPublic) {
    throw new DomainError("KYC documents must be private", "VAULT_DOC_KYC_PUBLIC", { id: doc.id });
  }
  if (doc.status === VaultDocumentStatus.Verified && !doc.verifiedById) {
    throw new DomainError("verified documents require verifier", "VAULT_DOC_VERIFIER", { id: doc.id });
  }
  if (doc.size <= 0) {
    throw new DomainError("document size must be > 0", "VAULT_DOC_SIZE", { id: doc.id });
  }
}

export function assertAccessGrantInvariants(grant: AccessGrant): void {
  if (grant.granteeId === grant.grantorId) {
    throw new DomainError("cannot grant access to self", "VAULT_GRANT_SELF", { id: grant.id });
  }
  if (grant.revokedAt && grant.revokedAt < grant.grantedAt) {
    throw new DomainError("revokedAt must be after grantedAt", "VAULT_GRANT_REVOKED_TIME", { id: grant.id });
  }
}

export function assertVerificationInvariants(record: VerificationRecord): void {
  if (record.status !== "verified" && record.status !== "rejected") {
    throw new DomainError("verification status must be verified or rejected", "VAULT_VERIFY_STATUS", { id: record.id });
  }
  if (record.status === "rejected" && !record.reason) {
    throw new DomainError("rejected verification requires reason", "VAULT_VERIFY_REASON", { id: record.id });
  }
}

export function createVaultDocument(input: {
  id: string;
  ownerId: string;
  uploaderId: string;
  category: VaultDocumentCategory;
  filename: string;
  mimeType: string;
  url: string;
  size: number;
  isPublic: boolean;
  hash: string;
  propertyId?: string;
  folderId?: string;
}): VaultDocument {
  return {
    id: input.id as never,
    ownerId: input.ownerId as never,
    uploaderId: input.uploaderId as never,
    category: input.category,
    filename: input.filename,
    mimeType: input.mimeType,
    url: input.url,
    size: input.size,
    isPublic: input.isPublic,
    status: VaultDocumentStatus.Uploaded,
    hash: input.hash,
    uploadedAt: new Date().toISOString(),
    propertyId: input.propertyId as never | undefined,
    folderId: input.folderId as never | undefined,
  };
}

export function createAccessGrant(input: {
  id: string;
  documentId: string;
  granteeId: string;
  grantorId: string;
  scope: AccessGrantScope;
  reason: string;
  expiresAt?: string;
}): AccessGrant {
  return {
    id: input.id as never,
    documentId: input.documentId as never,
    granteeId: input.granteeId as never,
    grantorId: input.grantorId as never,
    scope: input.scope,
    reason: input.reason,
    grantedAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
  };
}
