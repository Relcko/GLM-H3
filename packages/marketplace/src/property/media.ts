import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import { Action } from "@relcko/permission";
import type { Principal, MarketplaceAuthorization } from "../authorization";
import { subjectId } from "../authorization";
import { MarketplaceEventType, publishMarketplaceEvent } from "../events";
import { validateAddMedia } from "../validation";
import type { MarketplaceRepository } from "../repository";
import { NotFoundError, PropertyNotFoundError } from "../errors";
import { MediaKind, type MediaAsset } from "../types";
import type { Logger } from "@relcko/logging";

/** Media gallery for a property (images, video, floor plans, certificates, 3D). */
export class PropertyMediaService {
  constructor(
    private readonly repository: MarketplaceRepository,
    private readonly auth: MarketplaceAuthorization,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async add(principal: Principal, input: unknown): Promise<MediaAsset> {
    this.auth.assert(principal, Action.PublishProperty);
    const v = validateAddMedia(input);
    if (!this.repository.getProperty(v.propertyId)) throw new PropertyNotFoundError(v.propertyId);
    const media: MediaAsset = {
      id: generateId("med"),
      propertyId: v.propertyId,
      kind: v.kind,
      url: v.url,
      title: v.title,
      size: v.size,
      uploadedBy: subjectId(principal) as EntityId,
      uploadedAt: new Date().toISOString(),
    };
    this.repository.saveMedia(media);
    await publishMarketplaceEvent(
      this.events,
      MarketplaceEventType.MediaAdded,
      v.propertyId,
      subjectId(principal) as EntityId,
      { mediaId: media.id, kind: media.kind },
    );
    this.logger?.info("property media added", { propertyId: v.propertyId, mediaId: media.id });
    return media;
  }

  list(propertyId: EntityId, kind?: MediaKind): MediaAsset[] {
    const all = this.repository.listMediaByProperty(propertyId);
    return kind ? all.filter((m) => m.kind === kind) : all;
  }

  get(id: EntityId): MediaAsset {
    const m = this.repository.getMedia(id);
    if (!m) throw new NotFoundError("Media", id);
    return m;
  }

  async remove(principal: Principal, id: EntityId): Promise<void> {
    this.auth.assert(principal, Action.PublishProperty);
    const m = this.repository.getMedia(id);
    if (!m) throw new NotFoundError("Media", id);
    this.repository.deleteMedia(id);
    await publishMarketplaceEvent(
      this.events,
      MarketplaceEventType.MediaRemoved,
      m.propertyId,
      subjectId(principal) as EntityId,
      { mediaId: id },
    );
  }
}
