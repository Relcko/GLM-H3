import type { EntityId, Money, Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { Campaign } from "../types";
import { CampaignStatus, RewardType } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { CampaignError } from "../errors";

export interface CreateCampaignInput {
  name: string;
  description: string;
  rewardType: RewardType;
  rewardValue: Money;
  maxParticipants: number;
  startAt: string;
  endAt: string;
  qualificationCriteria?: Record<string, unknown>;
}

export class CampaignEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async create(actorId: EntityId, input: CreateCampaignInput): Promise<Campaign> {
    const campaign: Campaign = {
      id: generateId("campaign") as EntityId,
      name: input.name,
      description: input.description,
      rewardType: input.rewardType,
      status: CampaignStatus.Draft,
      qualificationCriteria: input.qualificationCriteria ?? {},
      rewardValue: input.rewardValue,
      maxParticipants: input.maxParticipants,
      currentParticipants: 0,
      startAt: input.startAt,
      endAt: input.endAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveCampaign(campaign);

    await publishNetworkEvent(this.events, NetworkEventType.CampaignCreated, campaign.id, actorId, {
      campaignId: campaign.id as string,
      name: campaign.name,
      rewardType: campaign.rewardType,
    });

    this.logger?.info("campaign created", { campaignId: campaign.id, name: campaign.name });

    return campaign;
  }

  async start(actorId: EntityId, campaignId: EntityId): Promise<Campaign> {
    const campaign = this.getCampaign(campaignId);
    if (campaign.status !== CampaignStatus.Draft) {
      throw new CampaignError(`Campaign ${campaignId} cannot be started from status ${campaign.status}`);
    }

    const updated: Campaign = { ...campaign, status: CampaignStatus.Active, updatedAt: new Date().toISOString() };
    this.repository.saveCampaign(updated);

    await publishNetworkEvent(this.events, NetworkEventType.CampaignStarted, campaignId, actorId, {
      campaignId: campaignId as string,
    });

    return updated;
  }

  async complete(actorId: EntityId, campaignId: EntityId): Promise<Campaign> {
    const campaign = this.getCampaign(campaignId);
    const updated: Campaign = { ...campaign, status: CampaignStatus.Completed, updatedAt: new Date().toISOString() };
    this.repository.saveCampaign(updated);

    await publishNetworkEvent(this.events, NetworkEventType.CampaignCompleted, campaignId, actorId, {
      campaignId: campaignId as string,
    });

    return updated;
  }

  async cancel(actorId: EntityId, campaignId: EntityId): Promise<Campaign> {
    const campaign = this.getCampaign(campaignId);
    const updated: Campaign = { ...campaign, status: CampaignStatus.Cancelled, updatedAt: new Date().toISOString() };
    this.repository.saveCampaign(updated);

    await publishNetworkEvent(this.events, NetworkEventType.CampaignCancelled, campaignId, actorId, {
      campaignId: campaignId as string,
    });

    return updated;
  }

  getCampaign(id: EntityId): Campaign {
    const c = this.repository.getCampaign(id);
    if (!c) throw new CampaignError(`Campaign ${id} not found`);
    return c;
  }

  listActive(): Campaign[] {
    return this.repository.listActiveCampaigns();
  }

  registerParticipant(campaignId: EntityId): Campaign {
    const campaign = this.getCampaign(campaignId);
    if (campaign.currentParticipants >= campaign.maxParticipants) {
      throw new CampaignError(`Campaign ${campaignId} is full`);
    }
    const updated: Campaign = {
      ...campaign,
      currentParticipants: campaign.currentParticipants + 1,
      updatedAt: new Date().toISOString(),
    };
    this.repository.saveCampaign(updated);
    return updated;
  }
}
