import { createDocument, DocumentCategory, type Documents } from "@relcko/domain-core";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import { Action } from "@relcko/permission";
import type { Principal, MarketplaceAuthorization } from "../authorization";
import { subjectId } from "../authorization";
import { MarketplaceEventType, publishMarketplaceEvent } from "../events";
import { validateAddDocument } from "../validation";
import type { MarketplaceRepository } from "../repository";
import { PropertyNotFoundError } from "../errors";
import type { Logger } from "@relcko/logging";

/** Documents attached to a property (reuses the frozen `Documents` entity). */
export class PropertyDocumentsService {
  constructor(
    private readonly repository: MarketplaceRepository,
    private readonly auth: MarketplaceAuthorization,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async add(principal: Principal, input: unknown): Promise<Documents> {
    this.auth.assert(principal, Action.PublishProperty);
    const v = validateAddDocument(input);
    if (!this.repository.getProperty(v.propertyId)) throw new PropertyNotFoundError(v.propertyId);
    const doc = createDocument({
      propertyId: v.propertyId,
      uploaderId: subjectId(principal) as EntityId,
      category: v.category,
      filename: v.filename,
      url: v.url,
      size: v.size,
      isPublic: v.isPublic,
    });
    this.repository.saveDocument(doc);
    await publishMarketplaceEvent(
      this.events,
      MarketplaceEventType.DocumentAdded,
      v.propertyId,
      subjectId(principal) as EntityId,
      { documentId: doc.id, category: doc.category },
    );
    this.logger?.info("property document added", { propertyId: v.propertyId, documentId: doc.id });
    return doc;
  }

  list(principal: Principal, propertyId: EntityId, includePrivate = false): Documents[] {
    const docs = this.repository.listDocumentsByProperty(propertyId);
    if (includePrivate) {
      // Viewing private documents is a discipline-scoped (compliance) action.
      this.auth.assert(principal, Action.ReadAudit);
    }
    return includePrivate ? docs : docs.filter((d) => d.isPublic);
  }

  get(principal: Principal, id: EntityId, includePrivate = false): Documents {
    const doc = this.repository.getDocument(id);
    if (!doc) throw new PropertyNotFoundError(id);
    if (!doc.isPublic && includePrivate) this.auth.assert(principal, Action.ReadAudit);
    if (!doc.isPublic && !includePrivate) throw new PropertyNotFoundError(id);
    return doc;
  }

  async remove(principal: Principal, id: EntityId): Promise<void> {
    this.auth.assert(principal, Action.PublishProperty);
    const doc = this.repository.getDocument(id);
    if (!doc) throw new PropertyNotFoundError(id);
    this.repository.deleteDocument(id);
    await publishMarketplaceEvent(
      this.events,
      MarketplaceEventType.DocumentRemoved,
      doc.propertyId!,
      subjectId(principal) as EntityId,
      { documentId: id },
    );
  }
}
