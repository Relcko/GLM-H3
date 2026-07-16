import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { PortfolioHolding, PortfolioHealthResult } from "../types";
import { PortfolioAssetType } from "../types";

export class PortfolioHealthEngine {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly logger?: Logger,
  ) {}

  checkHealth(actorId: EntityId, investorId: EntityId): PortfolioHealthResult {
    const portfolio = this.repository.getPortfolioByInvestor(investorId);
    const holdings = this.repository.listHoldingsByInvestor(investorId);

    const diversificationScore = this.calculateDiversificationScore(holdings);
    const riskScore = this.calculateRiskScore(holdings);
    const liquidityScore = this.calculateLiquidityScore(holdings);

    const score = Math.round((diversificationScore + riskScore + liquidityScore) / 3);

    const totalValue = holdings.reduce((s, h) => s + h.currentValue.amount, 0n);
    const concentrationRisk = holdings.length > 0
      && holdings.some(h => h.currentValue.amount > 0n && h.currentValue.amount * 100n / totalValue > 40n);

    const returnThreshold = 0;
    const underperformingAssets = holdings
      .filter(h => h.returnPercentage < returnThreshold)
      .map(h => h.name);

    const health: PortfolioHealthResult = {
      score,
      diversificationScore,
      riskScore,
      liquidityScore,
      concentrationRisk,
      underperformingAssets,
      recommendations: this.generateRecommendations({
        score,
        diversificationScore,
        riskScore,
        liquidityScore,
        concentrationRisk,
        underperformingAssets,
        recommendations: [],
      }),
    };

    this.repository.saveHealthResult(investorId, health);

    this.logger?.info("portfolio health checked", { investorId, score });

    return health;
  }

  getHealth(investorId: EntityId): PortfolioHealthResult | undefined {
    return this.repository.getHealthResult(investorId);
  }

  calculateDiversificationScore(holdings: PortfolioHolding[]): number {
    if (holdings.length === 0) return 0;

    const typeCount = new Set(holdings.map(h => h.assetType)).size;
    const typeScore = Math.min(typeCount / Object.keys(PortfolioAssetType).length * 40, 40);

    const names = new Set(holdings.map(h => h.name));
    const nameScore = Math.min(names.size * 5, 30);

    const totalValue = holdings.reduce((s, h) => s + h.currentValue.amount, 0n);
    let concentrationPenalty = 0;
    for (const h of holdings) {
      const pct = totalValue > 0n ? Number(h.currentValue.amount * 100n / totalValue) : 0;
      if (pct > 30) concentrationPenalty += 10;
    }

    return Math.max(Math.min(typeScore + nameScore - concentrationPenalty, 100), 0);
  }

  calculateRiskScore(holdings: PortfolioHolding[]): number {
    if (holdings.length === 0) return 100;

    const totalInvested = holdings.reduce((s, h) => s + h.costBasis.amount, 0n);
    const totalValue = holdings.reduce((s, h) => s + h.currentValue.amount, 0n);

    const lossMaking = holdings.filter(h => h.profitLoss < 0n);
    const lossRatio = holdings.length > 0 ? lossMaking.length / holdings.length : 0;

    const lossPenalty = lossRatio * 30;

    const drawdown = totalInvested > 0n
      ? Math.max(0, Number((totalInvested - totalValue) * 100n / totalInvested))
      : 0;
    const drawdownPenalty = Math.min(drawdown * 2, 40);

    const nftCount = holdings.filter(h => h.assetType === PortfolioAssetType.Nft).length;
    const nftPenalty = nftCount * 5;

    return Math.max(Math.min(100 - lossPenalty - drawdownPenalty - nftPenalty, 100), 0);
  }

  calculateLiquidityScore(holdings: PortfolioHolding[]): number {
    if (holdings.length === 0) return 100;

    const nftCount = holdings.filter(h => h.assetType === PortfolioAssetType.Nft).length;
    const investmentCount = holdings.filter(h => h.assetType === PortfolioAssetType.Investment).length;
    const fractionCount = holdings.filter(h => h.assetType === PortfolioAssetType.Fraction).length;

    const nftPenalty = nftCount * 15;
    const fractionPenalty = fractionCount * 10;
    const investmentBonus = investmentCount * 5;

    return Math.max(Math.min(60 - nftPenalty - fractionPenalty + investmentBonus, 100), 0);
  }

  generateRecommendations(health: PortfolioHealthResult): string[] {
    const recommendations: string[] = [];

    if (health.diversificationScore < 30) {
      recommendations.push("Consider diversifying your portfolio across more asset types");
    }

    if (health.riskScore < 40) {
      recommendations.push("Your portfolio has elevated risk. Consider rebalancing with lower-risk assets");
    }

    if (health.liquidityScore < 30) {
      recommendations.push("Portfolio liquidity is low. Consider adding more liquid investments");
    }

    if (health.concentrationRisk) {
      recommendations.push("Your portfolio has concentrated positions. Consider reducing exposure to large holdings");
    }

    if (health.underperformingAssets.length > 0) {
      recommendations.push(`Review underperforming assets: ${health.underperformingAssets.join(", ")}`);
    }

    if (health.score < 50) {
      recommendations.push("Overall portfolio health is low. Consider a comprehensive portfolio review");
    }

    return recommendations;
  }
}
