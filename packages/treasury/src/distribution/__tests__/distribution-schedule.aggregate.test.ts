import { describe, it, expect } from "vitest";
import { DistributionScheduleAggregate } from "../domain/distribution-schedule.aggregate";
import { type ScheduleId, DistributionType, ScheduleStatus } from "../domain/value-objects";
import { DistributionInvalidStatusError, ScheduleInvalidStatusError } from "../domain/errors";
import type { DomainEvent } from "@relcko/kernel";

function makeId(seed = "sched-1"): ScheduleId {
  return seed as unknown as ScheduleId;
}

function makeSchedule(id?: ScheduleId): DistributionScheduleAggregate {
  return DistributionScheduleAggregate.create(id ?? makeId(), {
    distributionType: DistributionType.Dividend,
    propertyId: "prop-1",
    periodStart: Date.now(),
    periodEnd: Date.now() + 86400000,
    totalAmount: 1000000n,
    perUnitAmount: 500n,
    currency: "USD",
  });
}

describe("DistributionScheduleAggregate", () => {
  describe("create", () => {
    it("creates with Draft status", () => {
      const sched = makeSchedule();
      expect(sched.status).toBe(ScheduleStatus.Draft);
      expect(sched.version).toBe(1);
    });
  });

  describe("activate", () => {
    it("transitions Draft -> Executing (via Scheduled)", () => {
      const sched = makeSchedule();
      sched.activate({ activatedBy: "operator-1" });
      expect(sched.status).toBe(ScheduleStatus.Executing);
      expect(sched.version).toBe(2);
    });

    it("rejects activate from Executing", () => {
      const sched = makeSchedule();
      sched.activate({ activatedBy: "op-1" });
      expect(() => sched.activate({ activatedBy: "op-2" })).toThrow(ScheduleInvalidStatusError);
    });

    it("rejects activate from Completed", () => {
      const sched = makeSchedule();
      sched.activate({ activatedBy: "op-1" });
      sched.close({ closedBy: "op-1", reason: null });
      expect(() => sched.activate({ activatedBy: "op-2" })).toThrow(ScheduleInvalidStatusError);
    });
  });

  describe("close", () => {
    it("transitions Executing -> Completed", () => {
      const sched = makeSchedule();
      sched.activate({ activatedBy: "op-1" });
      sched.close({ closedBy: "op-1", reason: "all paid" });
      expect(sched.status).toBe(ScheduleStatus.Completed);
      expect(sched.version).toBe(3);
    });

    it("rejects close from Draft", () => {
      const sched = makeSchedule();
      expect(() => sched.close({ closedBy: "op-1", reason: "x" })).toThrow(ScheduleInvalidStatusError);
    });
  });

  describe("cancel", () => {
    it("cancels from Draft", () => {
      const sched = makeSchedule();
      sched.cancel({ closedBy: "manager-1", reason: "not needed" });
      expect(sched.status).toBe(ScheduleStatus.Cancelled);
    });

    it("rejects cancel from Executing", () => {
      const sched = makeSchedule();
      sched.activate({ activatedBy: "op-1" });
      expect(() => sched.cancel({ closedBy: "manager-1", reason: "x" })).toThrow(ScheduleInvalidStatusError);
    });

    it("rejects cancel from Completed", () => {
      const sched = makeSchedule();
      sched.activate({ activatedBy: "op-1" });
      sched.close({ closedBy: "op-1", reason: "done" });
      expect(() => sched.cancel({ closedBy: "manager-1", reason: "x" })).toThrow(ScheduleInvalidStatusError);
    });
  });

  describe("loadFromHistory (event replay)", () => {
    it("reconstructs full lifecycle", () => {
      const original = makeSchedule(makeId("replay-1"));
      original.activate({ activatedBy: "op-1" });
      original.close({ closedBy: "op-1", reason: "done" });

      const events = [...original.getUncommittedEvents()] as DomainEvent[];
      original.markEventsAsCommitted();

      const replayed = DistributionScheduleAggregate.loadFromHistory(makeId("replay-1"), events);
      expect(replayed.status).toBe(ScheduleStatus.Completed);
      expect(replayed.version).toBe(3);
    });

    it("replays cancel from Draft", () => {
      const original = makeSchedule(makeId("replay-cancel"));
      original.cancel({ closedBy: "mgr-1", reason: "cancelled" });

      const events = [...original.getUncommittedEvents()] as DomainEvent[];
      original.markEventsAsCommitted();

      const replayed = DistributionScheduleAggregate.loadFromHistory(makeId("replay-cancel"), events);
      expect(replayed.status).toBe(ScheduleStatus.Cancelled);
      expect(replayed.version).toBe(2);
    });
  });

  describe("version tracking", () => {
    it("increments version through lifecycle", () => {
      const sched = makeSchedule();
      expect(sched.version).toBe(1);
      sched.activate({ activatedBy: "op-1" });
      expect(sched.version).toBe(2);
      sched.close({ closedBy: "op-1", reason: "done" });
      expect(sched.version).toBe(3);
    });
  });
});
