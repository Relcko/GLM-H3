import { describe, it, expect, beforeEach } from "vitest";
import { generateId } from "@relcko/utils";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import DividendService from "../services/dividend-service";
import type { PortfolioAdapter, EligibleInvestor } from "../services/portfolio-adapter";
import { ScheduleStatus, TreasuryEventType } from "../types";
import type { DividendSchedule, OwnershipSnapshot, SnapshotPosition } from "../types";

function createMockEventBus() {
  const events: unknown[] = [];
  return { events, publish: async (e: unknown) => { events.push(e); } };
}

function createMockPortfolioAdapter(investors: EligibleInvestor[] = []): PortfolioAdapter {
  return { getEligibleInvestors: async () => investors };
}

function lastEvent(events: unknown[]): Record<string, unknown> {
  return events[events.length - 1] as Record<string, unknown>;
}

describe("DividendSchedule", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let dividendService: DividendService;
  const actorId = "actor-schedule" as never;
  const propertyId = "property-1" as never;
  const period = "2026-Q2";

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    const portfolioAdapter = createMockPortfolioAdapter([
      { investorId: "inv-1" as never, units: 100n },
      { investorId: "inv-2" as never, units: 200n },
    ]);
    dividendService = new DividendService(repository, events as never, portfolioAdapter);
  });

  describe("createSchedule", () => {
    it("creates schedule with Draft status", async () => {
      const schedule = await dividendService.createSchedule(actorId, {
        propertyId,
        period,
        totalAmount: 30000n,
        perTokenAmount: 100n,
        currency: "USDT",
      });

      expect(schedule.status).toBe(ScheduleStatus.Draft);
      expect(schedule.propertyId).toBe(propertyId);
      expect(schedule.period).toBe(period);
      expect(schedule.createdAt).toBeDefined();
    });

    it("emits DividendScheduleCreated event", async () => {
      const schedule = await dividendService.createSchedule(actorId, {
        propertyId,
        period,
        totalAmount: 30000n,
        perTokenAmount: 100n,
        currency: "USDT",
      });

      const event = lastEvent(events.events);
      expect(event).toBeDefined();
      expect(event).toHaveProperty("type", TreasuryEventType.DividendScheduleCreated);
      expect(event).toHaveProperty("aggregateId", schedule.id);
    });

    it("persists schedule in repository", async () => {
      const schedule = await dividendService.createSchedule(actorId, {
        propertyId,
        period,
        totalAmount: 30000n,
        perTokenAmount: 100n,
        currency: "USDT",
      });

      const stored = repository.getSchedule(schedule.id);
      expect(stored).toBeDefined();
      expect(stored!.id).toBe(schedule.id);
      expect(stored!.status).toBe(ScheduleStatus.Draft);
    });
  });

  describe("activateSchedule", () => {
    it("transitions Draft to Scheduled", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });

      const activated = await dividendService.activateSchedule(actorId, draft.id);
      expect(activated.status).toBe(ScheduleStatus.Scheduled);
    });

    it("emits DividendScheduled event", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });

      await dividendService.activateSchedule(actorId, draft.id);
      const event = lastEvent(events.events);
      expect(event).toHaveProperty("type", TreasuryEventType.DividendScheduled);
    });

    it("rejects activation from non-Draft status", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);

      await expect(
        dividendService.activateSchedule(actorId, draft.id),
      ).rejects.toThrow();
    });

    it("rejects activation for unknown schedule", async () => {
      await expect(
        dividendService.activateSchedule(actorId, "nonexistent" as never),
      ).rejects.toThrow();
    });
  });

  describe("createSnapshot", () => {
    it("transitions Scheduled to Snapshotted", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);

      const snapshot = await dividendService.createSnapshot(actorId, draft.id);
      expect(snapshot.id).toBeDefined();
      expect(snapshot.scheduleId).toBe(draft.id);

      const updated = dividendService.getSchedule(draft.id);
      expect(updated!.status).toBe(ScheduleStatus.Snapshotted);
    });

    it("computes totalSupply from eligible investors", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);
      const snapshot = await dividendService.createSnapshot(actorId, draft.id);

      expect(snapshot.totalSupply).toBe(300n);
    });

    it("creates positions with correct ownership percentages", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);
      await dividendService.createSnapshot(actorId, draft.id);

      const positions = dividendService.getPositions(draft.id);
      expect(positions).toHaveLength(2);
      expect(positions[0].investorId).toBe("inv-1" as never);
      expect(positions[0].quantity).toBe(100n);
      expect(positions[0].ownershipPercentage).toBeCloseTo(33.33, 0);
      expect(positions[1].investorId).toBe("inv-2" as never);
      expect(positions[1].quantity).toBe(200n);
      expect(positions[1].ownershipPercentage).toBeCloseTo(66.66, 0);
    });

    it("emits OwnershipSnapshotted event", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);
      await dividendService.createSnapshot(actorId, draft.id);

      const event = lastEvent(events.events);
      expect(event).toHaveProperty("type", TreasuryEventType.OwnershipSnapshotted);
    });

    it("rejects snapshot from non-Scheduled status", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });

      await expect(
        dividendService.createSnapshot(actorId, draft.id),
      ).rejects.toThrow();
    });

    it("rejects snapshot for unknown schedule", async () => {
      await expect(
        dividendService.createSnapshot(actorId, "nonexistent" as never),
      ).rejects.toThrow();
    });
  });

  describe("closeSchedule", () => {
    it("transitions Snapshotted to Closed", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);
      await dividendService.createSnapshot(actorId, draft.id);

      const closed = await dividendService.closeSchedule(actorId, draft.id);
      expect(closed.status).toBe(ScheduleStatus.Closed);

      const stored = dividendService.getSchedule(draft.id);
      expect(stored!.status).toBe(ScheduleStatus.Closed);
    });

    it("emits DividendCompleted event", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);
      await dividendService.createSnapshot(actorId, draft.id);

      await dividendService.closeSchedule(actorId, draft.id);
      const event = lastEvent(events.events);
      expect(event).toHaveProperty("type", TreasuryEventType.DividendCompleted);
    });

    it("rejects close from non-Snapshotted status", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);

      await expect(
        dividendService.closeSchedule(actorId, draft.id),
      ).rejects.toThrow();
    });

    it("rejects close for unknown schedule", async () => {
      await expect(
        dividendService.closeSchedule(actorId, "nonexistent" as never),
      ).rejects.toThrow();
    });
  });

  describe("cancelSchedule", () => {
    it("cancels from Draft status", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });

      const cancelled = await dividendService.cancelSchedule(actorId, draft.id);
      expect(cancelled.status).toBe(ScheduleStatus.Cancelled);
    });

    it("cancels from Scheduled status", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);

      const cancelled = await dividendService.cancelSchedule(actorId, draft.id);
      expect(cancelled.status).toBe(ScheduleStatus.Cancelled);
    });

    it("rejects cancel from Snapshotted status", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);
      await dividendService.createSnapshot(actorId, draft.id);

      await expect(
        dividendService.cancelSchedule(actorId, draft.id),
      ).rejects.toThrow();
    });

    it("rejects cancel for unknown schedule", async () => {
      await expect(
        dividendService.cancelSchedule(actorId, "nonexistent" as never),
      ).rejects.toThrow();
    });

    it("does not emit any event on cancel", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });

      const beforeCount = events.events.length;
      await dividendService.cancelSchedule(actorId, draft.id);
      expect(events.events.length).toBe(beforeCount);
    });
  });

  describe("full lifecycle", () => {
    it("follows Draft → Scheduled → Snapshotted → Closed", async () => {
      const s1 = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      expect(s1.status).toBe(ScheduleStatus.Draft);

      const s2 = await dividendService.activateSchedule(actorId, s1.id);
      expect(s2.status).toBe(ScheduleStatus.Scheduled);

      const snap = await dividendService.createSnapshot(actorId, s1.id);
      expect(snap.totalSupply).toBe(300n);

      const s3 = await dividendService.closeSchedule(actorId, s1.id);
      expect(s3.status).toBe(ScheduleStatus.Closed);

      const stored = dividendService.getSchedule(s1.id);
      expect(stored!.status).toBe(ScheduleStatus.Closed);
    });
  });

  describe("queries", () => {
    it("getSchedule returns schedule by id", async () => {
      const schedule = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });

      const result = dividendService.getSchedule(schedule.id);
      expect(result).toBeDefined();
      expect(result!.id).toBe(schedule.id);
    });

    it("getSchedule returns undefined for unknown id", async () => {
      const result = dividendService.getSchedule("unknown" as never);
      expect(result).toBeUndefined();
    });

    it("listSchedules returns all schedules when no propertyId given", async () => {
      await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.createSchedule(actorId, {
        propertyId: "property-2" as never, period, totalAmount: 10000n, perTokenAmount: 50n, currency: "USDT",
      });

      const all = dividendService.listSchedules();
      expect(all).toHaveLength(2);
    });

    it("listSchedules filters by propertyId", async () => {
      await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.createSchedule(actorId, {
        propertyId: "property-2" as never, period, totalAmount: 10000n, perTokenAmount: 50n, currency: "USDT",
      });

      const filtered = dividendService.listSchedules(propertyId);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].propertyId).toBe(propertyId);
    });

    it("getSnapshot returns snapshot by scheduleId", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);
      const snapshot = await dividendService.createSnapshot(actorId, draft.id);

      const result = dividendService.getSnapshot(draft.id);
      expect(result).toBeDefined();
      expect(result!.id).toBe(snapshot.id);
      expect(result!.scheduleId).toBe(draft.id);
    });

    it("getSnapshot returns undefined when no snapshot exists", async () => {
      const result = dividendService.getSnapshot("nosnapshot" as never);
      expect(result).toBeUndefined();
    });

    it("getPositions returns correct positions for snapshot", async () => {
      const draft = await dividendService.createSchedule(actorId, {
        propertyId, period, totalAmount: 30000n, perTokenAmount: 100n, currency: "USDT",
      });
      await dividendService.activateSchedule(actorId, draft.id);
      await dividendService.createSnapshot(actorId, draft.id);

      const positions = dividendService.getPositions(draft.id);
      expect(positions).toHaveLength(2);
    });

    it("getPositions returns empty array for unknown snapshot", async () => {
      const positions = dividendService.getPositions("unknown" as never);
      expect(positions).toEqual([]);
    });
  });

  describe("existing DividendService remains unchanged", () => {
    it("proposeDividend still creates pending proposal", async () => {
      const proposal = await dividendService.proposeDividend(actorId, {
        period: "2026-Q1",
        totalAmount: { amount: 30000n, currency: "USDT" as never },
        perUnitAmount: { amount: 100n, currency: "USDT" as never },
        eligibleUnits: 300n,
      });

      expect(proposal.status).toBe("pending");
      expect(proposal.period).toBe("2026-Q1");
    });
  });
});
