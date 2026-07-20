import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { TreasuryRepository } from "../repository";
import type { CashflowProjection, CashflowLine } from "../types";
import { CashflowError } from "../errors";
import { TreasuryEventType, publishTreasuryEvent } from "../events";

export class CashflowProjectionService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async projectCashflow(
    actorId: EntityId,
    period: string,
    openingBalance: bigint,
    inflows: CashflowLine[],
    outflows: CashflowLine[],
  ): Promise<CashflowProjection> {
    if (inflows.length === 0 && outflows.length === 0) {
      throw new CashflowError("At least one inflow or outflow is required for projection");
    }

    const totalInflows = inflows.reduce((sum, i) => sum + i.amount, 0n);
    const totalOutflows = outflows.reduce((sum, o) => sum + o.amount, 0n);
    const netCashflow = totalInflows - totalOutflows;
    const closingBalance = openingBalance + netCashflow;

    const projection: CashflowProjection = {
      id: generateId(),
      period,
      inflows,
      outflows,
      netCashflow,
      openingBalance,
      closingBalance,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveCashflowProjection(projection);

    await publishTreasuryEvent(this.events, TreasuryEventType.CashflowProjected, projection.id, actorId, {
      projectionId: projection.id as string,
      period,
      openingBalance: openingBalance.toString(),
      netCashflow: netCashflow.toString(),
      closingBalance: closingBalance.toString(),
      inflowsCount: inflows.length,
      outflowsCount: outflows.length,
    });

    this.logger?.info("cashflow projected", { period, netCashflow: netCashflow.toString(), closingBalance: closingBalance.toString() });

    return projection;
  }

  getProjection(period: string): CashflowProjection | undefined {
    return this.repository.getCashflowProjection(period);
  }
}
