import { describe, it, expect, beforeEach } from "vitest";
import { createProperty, AssetType } from "@relcko/domain-core";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { createMockEventBus } from "@relcko/testing";
import { ReservationEngine, RESERVATION_DURATION_MS } from "../reservation/engine";
import { ReservationConflictError, ReservationExpiredError } from "../errors";
import { Currency } from "@relcko/types";

describe("ReservationEngine", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let bus: ReturnType<typeof createMockEventBus>;
  let engine: ReservationEngine;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    bus = createMockEventBus();
    engine = new ReservationEngine(repo, bus);
  });

  const makeRequest = (overrides = {}) => ({
    investorId: "investor_1" as any,
    propertyId: "prop_1" as any,
    fractionId: "frac_1" as any,
    tokens: 10n,
    amount: 100n,
    currency: Currency.USDT,
    paymentMethod: "native_token" as any,
    chainId: 97,
    walletAddress: "0x1234567890abcdef1234567890abcdef12345678" as any,
    idempotencyKey: "unique-key-1",
    ...overrides,
  });

  it("creates a reservation and investment", async () => {
    const request = makeRequest();
    const { investment, reservation } = await engine.create("actor_1" as any, request);

    expect(investment).toBeDefined();
    expect(investment.investorId).toBe("investor_1");
    expect(investment.propertyId).toBe("prop_1");
    expect(investment.tokens).toBe(10n);

    expect(reservation).toBeDefined();
    expect(reservation.investmentId).toBe(investment.id);
    expect(reservation.investorId).toBe("investor_1");
    expect(reservation.tokens).toBe(10n);
  });

  it("rejects duplicate active reservation", async () => {
    const request = makeRequest({ idempotencyKey: "key-1" });
    await engine.create("actor_1" as any, request);

    await expect(engine.create("actor_1" as any, request)).rejects.toThrow(ReservationConflictError);
  });

  it("publishes reservation event", async () => {
    const request = makeRequest();
    await engine.create("actor_1" as any, request);

    expect(bus.publishedOfType("investment.reserved").length).toBe(1);
  });

  it("expired reservation throws on wallet confirm", async () => {
    const request = makeRequest();
    const { reservation } = await engine.create("actor_1" as any, request);

    const expiredReservation = { ...reservation, expiresAt: new Date(Date.now() - 1000).toISOString() };
    repo.saveReservation(expiredReservation);

    await expect(engine.confirmWallet("actor_1" as any, reservation.id)).rejects.toThrow(ReservationExpiredError);
  });

  it("confirms wallet for valid reservation", async () => {
    const request = makeRequest();
    const { reservation } = await engine.create("actor_1" as any, request);

    await engine.confirmWallet("actor_1" as any, reservation.id);
    expect(bus.publishedOfType("investment.wallet_confirmed").length).toBe(1);
  });

  it("cancels reservation", async () => {
    const request = makeRequest();
    const { reservation } = await engine.create("actor_1" as any, request);

    await engine.cancel("actor_1" as any, reservation.id);
    expect(repo.getReservation(reservation.id)).toBeUndefined();
  });

  it("detects expired reservation", () => {
    const expired = {
      id: "res_1" as any,
      investmentId: "inv_1" as any,
      investorId: "investor_1" as any,
      propertyId: "prop_1" as any,
      tokens: 10n,
      amount: { amount: 100n, currency: Currency.USDT },
      paymentMethod: "native_token" as any,
      chainId: 97,
      walletAddress: "0x1234" as any,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    expect(engine.isExpired(expired)).toBe(true);

    const active = { ...expired, expiresAt: new Date(Date.now() + 3600000).toISOString() };
    expect(engine.isExpired(active)).toBe(false);
  });
});
