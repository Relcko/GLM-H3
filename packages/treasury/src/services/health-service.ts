import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { TreasuryRepository } from "../repository";
import type { TreasuryHealthResult } from "../types";
import { TreasuryAccountType, TreasuryHealthStatus } from "../types";
import { HealthError } from "../errors";
import { TreasuryEventType, publishTreasuryEvent } from "../events";

export class HealthService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async checkHealth(actorId: EntityId): Promise<TreasuryHealthResult> {
    const allAccounts = this.repository.listAllAccounts();
    if (allAccounts.length === 0) throw new HealthError("No accounts found to check health");

    const totalAssets = allAccounts
      .filter(a => a.accountType === TreasuryAccountType.Asset)
      .reduce((sum, a) => sum + a.balance, 0n);

    const totalLiabilities = allAccounts
      .filter(a => a.accountType === TreasuryAccountType.Liability)
      .reduce((sum, a) => sum + a.balance, 0n);

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

    const liquidityRatio = currentLiabilities > 0n ? Number(liquidAssets) / Number(currentLiabilities) : Infinity;
    const solvencyRatio = totalLiabilities > 0n ? Number(totalAssets) / Number(totalLiabilities) : Infinity;
    const reserveRatio = totalAssets > 0n ? Number(totalReserves) / Number(totalAssets) : 0;

    const liquidityScore = this.scoreLiquidity(liquidityRatio);
    const solvencyScore = this.scoreSolvency(solvencyRatio);
    const reserveScore = this.scoreReserve(reserveRatio);
    const overall = Math.round((liquidityScore + solvencyScore + reserveScore) / 3);

    const warnings: string[] = [];
    if (liquidityRatio < 1.0) warnings.push("Liquidity ratio is below 1.0, indicating potential short-term insolvency");
    else if (liquidityRatio < 1.5) warnings.push("Liquidity ratio is below optimal threshold");
    if (solvencyRatio < 1.0) warnings.push("Solvency ratio is below 1.0, total liabilities exceed total assets");
    else if (solvencyRatio < 1.2) warnings.push("Solvency ratio is below comfortable threshold");
    if (reserveRatio < 0.15) warnings.push("Reserve ratio is critically low, below 15%");
    else if (reserveRatio < 0.25) warnings.push("Reserve ratio is below recommended 30% threshold");

    const recommendations = this.generateRecommendations(liquidityScore, solvencyScore, reserveScore, overall);

    let status: TreasuryHealthStatus;
    if (overall >= 70) status = TreasuryHealthStatus.Healthy;
    else if (overall >= 40) status = TreasuryHealthStatus.Warning;
    else status = TreasuryHealthStatus.Critical;

    const result: TreasuryHealthResult = {
      status,
      score: overall,
      liquidityScore,
      solvencyScore,
      reserveScore,
      warnings,
      recommendations,
      computedAt: new Date().toISOString(),
    };

    this.repository.saveHealthResult(result);

    await publishTreasuryEvent(this.events, TreasuryEventType.HealthChecked, "treasury-health" as EntityId, actorId, {
      status,
      score: overall,
      liquidityScore,
      solvencyScore,
      reserveScore,
      warningsCount: warnings.length,
    });

    this.logger?.info("health checked", { status, score: overall });

    return result;
  }

  getLatestHealthResult(): TreasuryHealthResult | undefined {
    return this.repository.getLatestHealthResult();
  }

  private scoreLiquidity(ratio: number): number {
    if (ratio >= 2.0) return 100;
    if (ratio >= 1.0) return 60;
    return 20;
  }

  private scoreSolvency(ratio: number): number {
    if (ratio >= 1.5) return 100;
    if (ratio >= 1.0) return 60;
    return 20;
  }

  private scoreReserve(ratio: number): number {
    if (ratio >= 0.3) return 100;
    if (ratio >= 0.15) return 60;
    return 20;
  }

  private generateRecommendations(
    liquidityScore: number,
    solvencyScore: number,
    reserveScore: number,
    overall: number,
  ): string[] {
    const recommendations: string[] = [];

    if (liquidityScore < 60) recommendations.push("Increase liquid assets or reduce short-term liabilities to improve liquidity");
    if (solvencyScore < 60) recommendations.push("Reduce debt or increase assets to improve solvency position");
    if (reserveScore < 60) recommendations.push("Allocate more funds to reserve accounts to meet reserve targets");
    if (overall < 40) recommendations.push("Immediate treasury restructuring required — consider emergency measures");
    else if (overall < 70) recommendations.push("Treasury health needs attention — review allocation and rebalancing strategies");

    if (recommendations.length === 0) recommendations.push("Treasury is in good health — continue current strategy");

    return recommendations;
  }
}
