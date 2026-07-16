import type { EntityId, Money, Currency } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NftRepository } from "../repository";
import type { RoyaltyConfig } from "../types";
import { NftEventType, publishNftEvent } from "../events";

export class RoyaltyService {
  constructor(
    private readonly repository: NftRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  setConfig(actorId: EntityId, collectionId: EntityId, receiverId: EntityId, bps: number, maxBps: number = 1000): RoyaltyConfig {
    if (bps <= 0 || bps > 10000) {
      throw new Error(`Royalty bps must be between 1 and 10000, got ${bps}`);
    }

    if (bps > maxBps) {
      throw new Error(`Royalty bps ${bps} exceeds max ${maxBps}`);
    }

    const config: RoyaltyConfig = {
      collectionId,
      receiverId,
      bps,
      maxBps,
    };

    this.repository.saveRoyaltyConfig(config);

    return config;
  }

  getConfig(collectionId: EntityId): RoyaltyConfig | undefined {
    return this.repository.getRoyaltyConfig(collectionId);
  }

  calculateRoyalty(collectionId: EntityId, salePrice: bigint, currency: Currency): { receiverId: EntityId; amount: Money } | undefined {
    const config = this.repository.getRoyaltyConfig(collectionId);
    if (!config) return undefined;

    const royaltyAmount = (salePrice * BigInt(config.bps)) / 10000n;
    return {
      receiverId: config.receiverId,
      amount: { amount: royaltyAmount, currency },
    };
  }

  listByReceiver(receiverId: EntityId): RoyaltyConfig[] {
    return this.repository.listRoyaltyConfigsByReceiver(receiverId);
  }
}
