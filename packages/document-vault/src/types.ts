import type { EntityId, Money, Timestamp } from "@relcko/types";

export enum VaultDocumentCategory {
  Legal = "legal",
  Financial = "financial",
  Title = "title",
  Inspection = "inspection",
  Kyc = "kyc",
  Spv = "spv",
  Tax = "tax",
}

export enum VaultDocumentStatus {
  Uploaded = "uploaded",
  Verified = "verified",
  Rejected = "rejected",
  Expired = "expired",
  Redacted = "redacted",
}

export enum AccessGrantScope {
  Read = "read",
  Download = "download",
  Admin = "admin",
}

export interface VaultDocument {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly propertyId?: EntityId;
  readonly uploaderId: EntityId;
  readonly folderId?: EntityId;
  readonly category: VaultDocumentCategory;
  readonly filename: string;
  readonly mimeType: string;
  readonly url: string;
  readonly size: number;
  readonly isPublic: boolean;
  readonly status: VaultDocumentStatus;
  readonly hash: string;
  readonly verifiedById?: EntityId;
  readonly verifiedAt?: Timestamp;
  readonly uploadedAt: Timestamp;
  readonly expiresAt?: Timestamp;
}

export interface AccessGrant {
  readonly id: EntityId;
  readonly documentId: EntityId;
  readonly granteeId: EntityId;
  readonly grantorId: EntityId;
  readonly scope: AccessGrantScope;
  readonly reason: string;
  readonly grantedAt: Timestamp;
  readonly expiresAt?: Timestamp;
  readonly revokedAt?: Timestamp;
}

export interface VerificationRecord {
  readonly id: EntityId;
  readonly documentId: EntityId;
  readonly verifierId: EntityId;
  readonly status: "verified" | "rejected";
  readonly reason?: string;
  readonly verifiedAt: Timestamp;
}

export interface VaultFolder {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly name: string;
  readonly parentId?: EntityId;
  readonly createdAt: Timestamp;
}

export interface AuthorizedDownloadToken {
  readonly token: string;
  readonly documentId: EntityId;
  readonly granteeId: EntityId;
  readonly scope: AccessGrantScope;
  readonly expiresAt: Timestamp;
  readonly url: string;
}
