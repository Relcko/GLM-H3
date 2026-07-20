import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { VaultRepository } from "../repository";
import type { VaultDocument, VaultFolder } from "../types";
import { VaultDocumentCategory, VaultDocumentStatus, AccessGrantScope } from "../types";
import { createVaultDocument, assertVaultDocumentInvariants } from "../domain";
import { VaultEventType, publishVaultEvent } from "../events";

export interface UploadDocumentInput {
  readonly ownerId: EntityId;
  readonly uploaderId: EntityId;
  readonly category: VaultDocumentCategory;
  readonly filename: string;
  readonly mimeType: string;
  readonly url: string;
  readonly size: number;
  readonly isPublic: boolean;
  readonly hash: string;
  readonly propertyId?: EntityId;
  readonly folderId?: EntityId;
}

export class VaultService {
  constructor(
    private readonly repository: VaultRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  upload(actorId: EntityId, input: UploadDocumentInput): VaultDocument {
    const doc = createVaultDocument({
      id: generateId("vault-doc"),
      ownerId: input.ownerId as string,
      uploaderId: input.uploaderId as string,
      propertyId: input.propertyId as string | undefined,
      folderId: input.folderId as string | undefined,
      category: input.category,
      filename: input.filename,
      mimeType: input.mimeType,
      url: input.url,
      size: input.size,
      isPublic: input.isPublic,
      hash: input.hash,
    });

    assertVaultDocumentInvariants(doc);
    this.repository.saveDocument(doc);

    publishVaultEvent(this.events, VaultEventType.DocumentUploaded, doc.id, actorId, {
      documentId: doc.id as string,
      ownerId: doc.ownerId as string,
      category: doc.category,
      filename: doc.filename,
      isPublic: doc.isPublic,
      size: doc.size,
    });

    this.logger?.info("vault document uploaded", { documentId: doc.id, category: doc.category });
    return doc;
  }

  get(documentId: EntityId): VaultDocument | undefined {
    return this.repository.getDocument(documentId);
  }

  listByOwner(ownerId: EntityId): VaultDocument[] {
    return this.repository.listDocumentsByOwner(ownerId);
  }

  listByCategory(ownerId: EntityId, category: VaultDocumentCategory): VaultDocument[] {
    return this.repository.listDocumentsByCategory(ownerId, category);
  }

  remove(actorId: EntityId, documentId: EntityId): void {
    const doc = this.repository.getDocument(documentId);
    if (!doc) return;

    this.repository.removeDocument(documentId);

    publishVaultEvent(this.events, VaultEventType.DocumentRemoved, documentId, actorId, {
      documentId: documentId as string,
      category: doc.category,
    });

    this.logger?.info("vault document removed", { documentId });
  }

  createFolder(actorId: EntityId, ownerId: EntityId, name: string, parentId?: EntityId): VaultFolder {
    const folder: VaultFolder = {
      id: generateId("vault-folder") as EntityId,
      ownerId,
      name,
      parentId,
      createdAt: new Date().toISOString(),
    };
    this.repository.saveFolder(folder);
    return folder;
  }

  listFolders(ownerId: EntityId): VaultFolder[] {
    return this.repository.listFoldersByOwner(ownerId);
  }
}
