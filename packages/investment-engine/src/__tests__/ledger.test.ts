import { describe, it, expect, beforeEach } from "vitest";
import { createInvestment } from "@relcko/domain-core";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { createMockEventBus } from "@relcko/testing";
import { LedgerAdapter, type TreasuryLedger } from "../ledger/adapter";
import { Currency } from "@relcko/types";

const eid = (s: string) => s as never;
const addr = (s: string) => s as never;

describe("LedgerAdapter", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let bus: ReturnType<typeof createMockEventBus>;
  let adapter: LedgerAdapter;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    bus = createMockEventBus();
    adapter = new LedgerAdapter(repo, bus);
  });

  const makeTx = () => ({
    id: eid("tx_1"),
    investmentId: eid("inv_1"),
    reservationId: eid("res_1"),
    investorId: eid("investor_1"),
    chainId: 97,
    from: addr("0xfrom"),
    to: addr("0xto"),
    amount: 1000n,
    currency: Currency.USDT,
    method: "native_token" as never,
    status: "confirmed" as never,
    confirmations: 12,
    requiredConfirmations: 12,
    blockNumber: 12345,
    txHash: addr("0xtxhash"),
    retryCount: 0,
    maxRetries: 3,
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  } as never);

  it("records an investment ledger entry", async () => {
    const investment = createInvestment({
      investorId: eid("investor_1"),
      propertyId: eid("prop_1"),
      fractionId: eid("frac_1"),
      tokens: 100n,
      amount: 1000,
      currency: Currency.USDT,
      kycVerified: true,
    });

    const entry = await adapter.recordInvestment(eid("actor_1"), investment, makeTx());
    expect(entry).toBeDefined();
    expect(entry.investmentId).toBe(investment.id);
    expect(entry.type).toBe("investment");
    expect(entry.txHash).toBe("0xtxhash");

    const entries = adapter.listEntries(investment.id);
    expect(entries.length).toBe(1);
  });

  it("records refund entry", async () => {
    const investment = createInvestment({
      investorId: eid("investor_1"),
      propertyId: eid("prop_1"),
      fractionId: eid("frac_1"),
      tokens: 100n,
      amount: 1000,
      currency: Currency.USDT,
      kycVerified: true,
    });

    const entry = await adapter.recordRefund(eid("actor_1"), investment);
    expect(entry.type).toBe("refund");
    expect(entry.amount.amount).toBe(-1000000000n);
  });

  it("records through treasury when available", async () => {
    const treasuryCalls: string[] = [];
    const mockTreasury: TreasuryLedger = {
      async recordDebit(accountId, amount, currency, reference) {
        treasuryCalls.push(`debit:${reference}`);
      },
      async recordCredit(accountId, amount, currency, reference) {
        treasuryCalls.push(`credit:${reference}`);
      },
      async getBalance(accountId, currency) {
        return 0n;
      },
    };

    const adapterWithTreasury = new LedgerAdapter(repo, bus, undefined, mockTreasury);

    const investment = createInvestment({
      investorId: eid("investor_1"),
      propertyId: eid("prop_1"),
      fractionId: eid("frac_1"),
      tokens: 100n,
      amount: 1000,
      currency: Currency.USDT,
      kycVerified: true,
    });

    await adapterWithTreasury.recordInvestment(eid("actor_1"), investment, makeTx());
    expect(treasuryCalls.length).toBe(1);
    expect(treasuryCalls[0]).toContain("credit:investment:");
  });
});
