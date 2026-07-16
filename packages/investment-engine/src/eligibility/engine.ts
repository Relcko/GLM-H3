import type { Property, Investment } from "@relcko/domain-core";
import { PropertyStatus } from "@relcko/domain-core";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type { InvestmentRequest, EligibilityCheck } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import { EligibilityError } from "../errors";

export interface EligibilityContext {
  readonly property: Property;
  readonly investorId: EntityId;
  readonly tokens: bigint;
  readonly amount: bigint;
  readonly chainId: number;
  readonly existingInvestments: readonly Investment[];
}

export class EligibilityEngine {
  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  check(ctx: EligibilityContext): EligibilityCheck {
    const reasons: string[] = [];
    const { property } = ctx;

    if (property.status !== PropertyStatus.Active) {
      reasons.push("property is not active for investment");
    }

    if (ctx.tokens <= 0n) {
      reasons.push("tokens must be positive");
    }

    if (ctx.tokens > property.availableTokens) {
      reasons.push("requested tokens exceed available supply");
    }

    const expectedAmount = property.tokenPrice.amount * ctx.tokens;
    if (ctx.amount !== expectedAmount) {
      reasons.push("amount must equal tokens * token price");
    }

    if (ctx.amount < property.minInvestment.amount) {
      reasons.push("amount is below the minimum investment");
    }

    return { eligible: reasons.length === 0, reasons };
  }

  async assertAndPublish(actorId: EntityId, request: InvestmentRequest, property: Property): Promise<EligibilityCheck> {
    const existingInvestments = this.repository.listInvestmentsByInvestor(request.investorId);
    const ctx: EligibilityContext = {
      property,
      investorId: request.investorId,
      tokens: request.tokens,
      amount: request.amount,
      chainId: request.chainId,
      existingInvestments,
    };

    const result = this.check(ctx);

    if (!result.eligible) {
      await publishInvestmentEvent(this.events, InvestmentEventType.InvestmentEligibilityFailed, request.investorId, actorId, {
        propertyId: request.propertyId as string,
        reasons: [...result.reasons],
      });
      this.logger?.warn("eligibility failed", { investorId: request.investorId as string, propertyId: request.propertyId as string, reasons: result.reasons });
      throw new EligibilityError("Investment eligibility check failed", result.reasons, {
        investorId: request.investorId,
        propertyId: request.propertyId,
      });
    }

    await publishInvestmentEvent(this.events, InvestmentEventType.InvestmentEligibilityPassed, request.investorId, actorId, {
      propertyId: request.propertyId as string,
    });

    return result;
  }
}
