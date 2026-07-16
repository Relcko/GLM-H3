import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { NftMedia } from "../types";
import { NftMediaKind } from "../types";

export interface AddMediaInput {
  nftId: EntityId;
  url: string;
  kind: NftMediaKind;
  mimeType: string;
  size?: number;
}

export class MediaService {
  constructor(
    private readonly repository: NftRepository,
    private readonly logger?: Logger,
  ) {}

  add(actorId: EntityId, input: AddMediaInput): NftMedia {
    const media: NftMedia = {
      id: generateId("nftmed") as EntityId,
      nftId: input.nftId,
      kind: input.kind,
      url: input.url,
      mimeType: input.mimeType,
      size: input.size ?? 0,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveMedia(media);
    this.logger?.info("media added", { nftId: input.nftId, kind: input.kind });
    return media;
  }

  listByNft(nftId: EntityId): NftMedia[] {
    return this.repository.listMediaByNft(nftId);
  }
}
