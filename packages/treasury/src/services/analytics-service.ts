import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { TreasuryRepository } from "../repository";
import type { TreasuryAnalyticsEntry } from "../types";
import { TreasuryAccountType, DividendStatus, BuybackStatus, BurnStatus } from "../types";
import { AnalyticsError } from "../errors";
import { TreasuryEventType, publishTreasuryEvent } from "../events";

export class AnalyticsService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async computeAnalytics(actorId: EntityId, period: string): Promise<TreasuryAnalyticsEntry> {
    const allAccounts = this.repository.listAllAccounts();
    if (allAccounts.length === 0) throw new AnalyticsError("No accounts found to compute analytics");

    const totalAssets = allAccounts
      .filter(a => a.accountType === TreasuryAccountType.Asset)
      .reduce((sum, a) => sum + a.balance, 0n);

    const totalLiabilities = allAccounts
      .filter(a => a.accountType === TreasuryAccountType.Liability)
      .reduce((sum, a) => sum + a.balance, 0n);

    const totalEquity = allAccounts
      .filter(a => a.accountType === TreasuryAccountType.Equity)
      .reduce((sum, a) => sum + a.balance, 0n);

    const revenue = allAccounts
      .filter(a => a.accountType === TreasuryAccountType.Revenue)
      .reduce((sum, a) => sum + a.balance, 0n);

    const expenses = allAccounts
      .filter(a => a.accountType === TreasuryAccountType.Expense)
      .reduce((sum, a) => sum + a.balance, 0n);

    const netIncome = revenue - expenses;

    const reserveTypes = [
      TreasuryAccountType.EmergencyReserve,
      TreasuryAccountType.InsuranceReserve,
      TreasuryAccountType.PlatformReserve,
      TreasuryAccountType.BuybackReserve,
    ];
    const totalReserves = allAccounts
      .filter(a => reserveTypes.includes(a.accountType))
      .reduce((sum, a) => sum + a.balance, 0n);

    const liquidTypes = [TreasuryAccountType.Operating, TreasuryAccountType.Asset];
    const liquidAssets = allAccounts
      .filter(a => liquidTypes.includes(a.accountType))
      .reduce((sum, a) => sum + a.balance, 0n);

    const currentLiabilities = allAccounts
      .filter(a => a.accountType === TreasuryAccountType.Liability)
      .reduce((sum, a) => sum + a.balance, 0n);

    const dividendsDistributed = this.repository.listDividendProposalsByPeriod(period)
      .filter(p => p.status === DividendStatus.Distributed)
      .reduce((sum, p) => sum + p.totalDistributed.amount, 0n);

    const buybacksExecuted = this.repository.listBuybacksByStatus(BuybackStatus.Completed)
      .filter(b => b.updatedAt?.includes(period) ?? false).length;
    const burnExecuted = this.repository.listBurnsByStatus(BurnStatus.Completed)
      .filter(b => b.executedAt?.includes(period) ?? false).length;

    const reserveRatio = totalAssets > 0n ? Number(totalReserves) / Number(totalAssets) : 0;
    const liquidityRatio = currentLiabilities > 0n ? Number(liquidAssets) / Number(currentLiabilities) : 0;
    const solvencyRatio = totalLiabilities > 0n ? Number(totalAssets) / Number(totalLiabilities) : 0;

    const entry: TreasuryAnalyticsEntry = {
      id: generateId(),
      period,
      totalAssets,
      totalLiabilities,
      totalEquity,
      revenue,
      expenses,
      netIncome,
      dividendsDistributed,
      buybacksExecuted: BigInt(buybacksExecuted),
      burnExecuted: BigInt(burnExecuted),
      reserveRatio,
      liquidityRatio,
      solvencyRatio,
      computedAt: new Date().toISOString(),
    };

    this.repository.saveAnalytics(entry);

    await publishTreasuryEvent(this.events, TreasuryEventType.AnalyticsComputed, entry.id, actorId, {
      entryId: entry.id as string,
      period,
      totalAssets: totalAssets.toString(),
      totalLiabilities: totalLiabilities.toString(),
      netIncome: netIncome.toString(),
      reserveRatio,
      liquidityRatio,
      solvencyRatio,
    });

    this.logger?.info("analytics computed", { period, reserveRatio, liquidityRatio, solvencyRatio });

    return entry;
  }

  getLatestAnalytics(): TreasuryAnalyticsEntry | undefined {
    return this.repository.getLatestAnalytics();
  }

  listByPeriod(period: string): TreasuryAnalyticsEntry[] {
    return this.repository.listAnalyticsByPeriod(period);
  }
}
