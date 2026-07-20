import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { PortfolioSnapshot, PortfolioHolding } from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";
import { SnapshotNotFoundError } from "../errors";

export interface SnapshotComparison {
  readonly snapshot1Id: EntityId;
  readonly snapshot2Id: EntityId;
  readonly totalInvestedChange: bigint;
  readonly currentValueChange: bigint;
  readonly unrealizedGainLossChange: bigint;
  readonly realizedGainLossChange: bigint;
  readonly roiChange: number;
  readonly rentalYieldChange: number;
  readonly assetCountChange: number;
  readonly nftCountChange: number;
  readonly investmentCountChange: number;
  readonly period1: string;
  readonly period2: string;
}

export class PortfolioSnapshotEngine {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  createSnapshot(actorId: EntityId, investorId: EntityId, period: string): PortfolioSnapshot {
    const portfolio = this.repository.getPortfolioByInvestor(investorId);
    const holdings = this.repository.listHoldingsByInvestor(investorId);

    const assetCount = holdings.length;
    const nftCount = holdings.filter(h => h.assetType === "nft").length;
    const investmentCount = holdings.filter(h => h.assetType === "investment").length;

    const snapshot: PortfolioSnapshot = {
      id: generateId("snapshot") as EntityId,
      investorId,
      totalInvested: portfolio?.totalInvested ?? { amount: 0n, currency: Currency.USDT },
      currentValue: portfolio?.currentValue ?? { amount: 0n, currency: Currency.USDT },
      unrealizedGainLoss: portfolio?.unrealizedGainLoss ?? 0n,
      realizedGainLoss: portfolio?.realizedGainLoss ?? 0n,
      roi: portfolio?.roi ?? 0,
      rentalYield: portfolio?.rentalYield ?? 0,
      assetCount,
      nftCount,
      investmentCount,
      period,
      snapshotAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.repository.saveSnapshot(snapshot);

    const portfolioId = portfolio?.id ?? snapshot.id;
    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioSnapshotCreated, portfolioId, actorId, {
      snapshotId: snapshot.id as string,
      investorId: investorId as string,
      period,
      assetCount,
    });

    this.logger?.info("portfolio snapshot created", { snapshotId: snapshot.id, investorId, period });
    return snapshot;
  }

  getSnapshot(id: EntityId): PortfolioSnapshot | undefined {
    return this.repository.getSnapshot(id);
  }

  listSnapshots(investorId: EntityId): PortfolioSnapshot[] {
    return this.repository.listSnapshotsByInvestor(investorId);
  }

  listSnapshotsByPeriod(investorId: EntityId, period: string): PortfolioSnapshot[] {
    return this.repository.listSnapshotsByPeriod(investorId, period);
  }

  compareSnapshots(snapshotId1: EntityId, snapshotId2: EntityId): SnapshotComparison {
    const s1 = this.repository.getSnapshot(snapshotId1);
    if (!s1) throw new SnapshotNotFoundError(snapshotId1 as string);

    const s2 = this.repository.getSnapshot(snapshotId2);
    if (!s2) throw new SnapshotNotFoundError(snapshotId2 as string);

    return {
      snapshot1Id: snapshotId1,
      snapshot2Id: snapshotId2,
      totalInvestedChange: s2.totalInvested.amount - s1.totalInvested.amount,
      currentValueChange: s2.currentValue.amount - s1.currentValue.amount,
      unrealizedGainLossChange: s2.unrealizedGainLoss - s1.unrealizedGainLoss,
      realizedGainLossChange: s2.realizedGainLoss - s1.realizedGainLoss,
      roiChange: s2.roi - s1.roi,
      rentalYieldChange: s2.rentalYield - s1.rentalYield,
      assetCountChange: s2.assetCount - s1.assetCount,
      nftCountChange: s2.nftCount - s1.nftCount,
      investmentCountChange: s2.investmentCount - s1.investmentCount,
      period1: s1.period,
      period2: s2.period,
    };
  }
}
