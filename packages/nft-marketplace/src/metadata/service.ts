import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftMetadata, NftAttribute, NftLocalization } from "../types";
import { NftEventType, publishNftEvent } from "../events";
import { MetadataError } from "../errors";

export interface CreateMetadataInput {
  nftId: EntityId;
  name: string;
  description: string;
  image: string;
  externalUrl?: string;
  animationUrl?: string;
  attributes?: readonly NftAttribute[];
  properties?: Record<string, unknown>;
  localization?: NftLocalization;
}

export class MetadataService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(actorId: EntityId, input: CreateMetadataInput): Promise<NftMetadata> {
    const existing = this.repository.getMetadata(input.nftId);
    if (existing) return this.update(actorId, input.nftId, input);

    const metadata: NftMetadata = {
      id: generateId("nftmd") as EntityId,
      nftId: input.nftId,
      name: input.name,
      description: input.description,
      image: input.image,
      externalUrl: input.externalUrl,
      animationUrl: input.animationUrl,
      attributes: input.attributes ?? [],
      properties: input.properties ?? {},
      localization: input.localization,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveMetadata(metadata);
    return metadata;
  }

  async update(actorId: EntityId, nftId: EntityId, input: Partial<CreateMetadataInput>): Promise<NftMetadata> {
    const existing = this.repository.getMetadata(nftId);
    if (!existing) throw new MetadataError(`Metadata not found for NFT ${nftId}`);

    const updated: NftMetadata = {
      ...existing,
      ...input,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveMetadata(updated);

    await publishNftEvent(this.events, NftEventType.NftMetadataUpdated, nftId, actorId, {
      nftId: nftId as string,
      version: updated.version,
    });

    this.logger?.info("metadata updated", { nftId, version: updated.version });

    return updated;
  }

  get(nftId: EntityId): NftMetadata | undefined {
    return this.repository.getMetadata(nftId);
  }

  generateUri(metadata: NftMetadata): string {
    return `ipfs://metadata/${metadata.id}/${metadata.version}`;
  }
}
