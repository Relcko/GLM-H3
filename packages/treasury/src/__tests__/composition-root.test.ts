import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import { createTreasuryContext, TreasuryContext } from "../services/composition-root";

describe("createTreasuryContext (composition root)", () => {
  let ctx: TreasuryContext;

  beforeEach(() => {
    ctx = createTreasuryContext();
  });

  it("returns all expected services", () => {
    expect(ctx.repo).toBeDefined();
    expect(ctx.ledgerService).toBeDefined();
    expect(ctx.accountService).toBeDefined();
    expect(ctx.allocationService).toBeDefined();
    expect(ctx.reserveService).toBeDefined();
    expect(ctx.movementService).toBeDefined();
    expect(ctx.reconciliationService).toBeDefined();
    expect(ctx.reportingService).toBeDefined();
    expect(ctx.analyticsService).toBeDefined();
    expect(ctx.healthService).toBeDefined();
    expect(ctx.dividendService).toBeDefined();
    expect(ctx.buybackService).toBeDefined();
    expect(ctx.burnService).toBeDefined();
    expect(ctx.statementService).toBeDefined();
    expect(ctx.cashflowProjectionService).toBeDefined();
    expect(ctx.timelineService).toBeDefined();
    expect(ctx.searchService).toBeDefined();
    expect(ctx.eventsAdapter).toBeDefined();
    expect(ctx.portfolioAdapter).toBeDefined();
    expect(ctx.governanceAdapter).toBeDefined();
  });

  it("accepts custom repository", () => {
    const customRepo = new InMemoryTreasuryRepository();
    const custom = createTreasuryContext({ repository: customRepo });
    expect(custom.repo).toBe(customRepo);
  });

  it("services share the same repository instance", () => {
    const repo = new InMemoryTreasuryRepository();
    const custom = createTreasuryContext({ repository: repo });
    expect((custom.ledgerService as any).repository).toBe(repo);
    expect((custom.accountService as any).repository).toBe(repo);
    expect((custom.allocationService as any).repository).toBe(repo);
    expect((custom.reserveService as any).repository).toBe(repo);
    expect((custom.movementService as any).repository).toBe(repo);
    expect((custom.reconciliationService as any).repository).toBe(repo);
    expect((custom.reportingService as any).repository).toBe(repo);
    expect((custom.analyticsService as any).repository).toBe(repo);
    expect((custom.healthService as any).repository).toBe(repo);
    expect((custom.statementService as any).repository).toBe(repo);
    expect((custom.cashflowProjectionService as any).repository).toBe(repo);
    expect((custom.searchService as any).repository).toBe(repo);
  });
});
