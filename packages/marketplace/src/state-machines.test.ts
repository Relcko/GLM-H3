import { describe, it, expect } from "vitest";
import { PropertyStatus, createProperty, InvestmentStatus } from "@relcko/domain-core";
import { PropertyStateMachine } from "./property/state-machine";
import { InvestmentStateMachine } from "./investment/state-machine";
import { makePropertyInput } from "./test-helpers";

describe("PropertyStateMachine (frozen lifecycle)", () => {
  const sm = new PropertyStateMachine();

  it("permits the canonical draft -> upcoming -> active -> sold_out -> closed path", () => {
    expect(sm.canTransition(PropertyStatus.Draft, PropertyStatus.Upcoming)).toBe(true);
    expect(sm.canTransition(PropertyStatus.Upcoming, PropertyStatus.Active)).toBe(true);
    expect(sm.canTransition(PropertyStatus.Active, PropertyStatus.SoldOut)).toBe(true);
    expect(sm.canTransition(PropertyStatus.SoldOut, PropertyStatus.Closed)).toBe(true);
  });

  it("rejects transitions that skip states", () => {
    expect(sm.canTransition(PropertyStatus.Draft, PropertyStatus.Active)).toBe(false);
    expect(sm.canTransition(PropertyStatus.Upcoming, PropertyStatus.SoldOut)).toBe(false);
    expect(sm.canTransition(PropertyStatus.Closed, PropertyStatus.Draft)).toBe(false);
  });

  it("applies a transition immutably (no new states introduced)", () => {
    const p = createProperty(makePropertyInput());
    expect(p.status).toBe(PropertyStatus.Draft);
    const updated = sm.transition(p, PropertyStatus.Upcoming);
    expect(updated.status).toBe(PropertyStatus.Upcoming);
    expect(p.status).toBe(PropertyStatus.Draft);
  });
});

describe("InvestmentStateMachine (frozen lifecycle)", () => {
  const sm = new InvestmentStateMachine();

  it("permits pending -> processing -> confirmed | failed -> refunded", () => {
    expect(sm.canTransition(InvestmentStatus.Pending, InvestmentStatus.Processing)).toBe(true);
    expect(sm.canTransition(InvestmentStatus.Processing, InvestmentStatus.Confirmed)).toBe(true);
    expect(sm.canTransition(InvestmentStatus.Pending, InvestmentStatus.Failed)).toBe(true);
    expect(sm.canTransition(InvestmentStatus.Failed, InvestmentStatus.Refunded)).toBe(true);
  });

  it("rejects invalid transitions (e.g. pending -> confirmed)", () => {
    expect(sm.canTransition(InvestmentStatus.Pending, InvestmentStatus.Confirmed)).toBe(false);
    expect(sm.canTransition(InvestmentStatus.Confirmed, InvestmentStatus.Refunded)).toBe(false);
  });
});
