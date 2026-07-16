import { describe, it, expect } from "vitest";
import { createEventBus } from "@relcko/events";
import { createOperationsModule } from "@relcko/operations";
import { createAdministrationModule } from "@relcko/administration";
import { createGovernanceModule } from "@relcko/governance";
import { createPortfolioModule } from "@relcko/portfolio";
import { createTreasuryContext } from "@relcko/treasury";
import { AiOrchestrator } from "@relcko/ai-platform";

describe("composition root smoke", () => {
  it("instantiates every composition root and exposes its services", () => {
    const events = createEventBus();
    const ops = createOperationsModule({ events, autoStart: false });
    expect(ops.health).toBeDefined();
    expect(ops.alerts).toBeDefined();
    expect(ops.analytics).toBeDefined();

    const admin = createAdministrationModule({ events, operations: ops as never, autoObserve: false });
    expect(admin.service.emergency).toBeDefined();
    expect(admin.dashboard).toBeDefined();
    expect(admin.analytics).toBeDefined();
    expect(admin.timeline).toBeDefined();

    const gov = createGovernanceModule({ events });
    expect(gov.proposalService).toBeDefined();

    const port = createPortfolioModule({ events });
    expect(port.portfolioService).toBeDefined();

    const treasury = createTreasuryContext({ events });
    expect(treasury.ledgerService).toBeDefined();

    const ai = new AiOrchestrator({} as never);
    expect(ai.listAdvisors().length).toBeGreaterThan(0);
  });
});
