import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PerformanceEngine } from "../performance/service";
import { ROIEngine } from "../roi/service";
import type { PortfolioPerformanceEntry, ROIResult } from "../types";
import { Currency } from "@relcko/types";

describe("PerformanceEngine", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let performanceEngine: PerformanceEngine;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    performanceEngine = new PerformanceEngine(repository, events);
  });

  it("computes performance entry", () => {
    const entry = performanceEngine.computePerformance(
      actorId,
      investorId,
      "2026-Q1",
      { amount: 10000n, currency: Currency.USDT },
      { amount: 15000n, currency: Currency.USDT },
      { amount: 2000n, currency: Currency.USDT },
    );

    expect(entry.period).toBe("2026-Q1");
    expect(entry.startValue.amount).toBe(10000n);
    expect(entry.endValue.amount).toBe(15000n);
    expect(entry.netContribution.amount).toBe(2000n);
    expect(entry.gainLoss).toBe(5000n);
    expect(entry.returnPercentage).toBeGreaterThan(0);
  });

  it("lists performance entries", () => {
    performanceEngine.computePerformance(
      actorId, investorId, "2026-Q1",
      { amount: 10000n, currency: Currency.USDT },
      { amount: 15000n, currency: Currency.USDT },
      { amount: 2000n, currency: Currency.USDT },
    );
    performanceEngine.computePerformance(
      actorId, investorId, "2026-Q2",
      { amount: 15000n, currency: Currency.USDT },
      { amount: 18000n, currency: Currency.USDT },
      { amount: 1000n, currency: Currency.USDT },
    );

    const entries = performanceEngine.listPerformance(investorId);
    expect(entries.length).toBe(2);
  });
});

describe("ROIEngine", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let roiEngine: ROIEngine;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    roiEngine = new ROIEngine(repository, events);
  });

  it("computes ROI", () => {
    const result = roiEngine.computeROI(
      actorId,
      investorId,
      { amount: 10000n, currency: Currency.USDT },
      { amount: 15000n, currency: Currency.USDT },
      { amount: 500n, currency: Currency.USDT },
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    );

    expect(result.investmentAmount.amount).toBe(10000n);
    expect(result.currentValue.amount).toBe(15000n);
    expect(result.cashflowReceived.amount).toBe(500n);
    expect(result.roi).toBeGreaterThan(0);
    expect(result.totalReturn).toBe(5500n);
  });

  it("calculates simple ROI", () => {
    const roi = roiEngine.calculateROI(
      { amount: 1000n, currency: Currency.USDT },
      { amount: 1500n, currency: Currency.USDT },
    );
    expect(roi).toBe(50);
  });

  it("calculates annualized ROI", () => {
    const annualized = roiEngine.calculateAnnualizedROI(50, 365);
    expect(annualized).toBe(50);
  });
});
