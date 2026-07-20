"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import {
  amountForFractions,
  checkEligibility,
  clampAmount,
  expectedAnnualReturn,
  expectedAnnualTotal,
  expectedYield,
  fractionsForAmount,
  fundingRemaining,
} from "@/marketplace/utils/investment";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/marketplace/utils/format";
import type { MarketplaceProperty } from "@/marketplace/types";

export function InvestmentPanel({ property }: { property: MarketplaceProperty }) {
  const max = fundingRemaining(property);
  const min = property.minInvestment;

  const [amount, setAmount] = useState(min);
  const [noted, setNoted] = useState(false);

  const safeAmount = useMemo(() => clampAmount(amount, property), [amount, property]);
  const fractions = useMemo(
    () => fractionsForAmount(safeAmount, property.tokenPrice),
    [safeAmount, property.tokenPrice]
  );
  const roi = useMemo(
    () => expectedAnnualReturn(safeAmount, property.expectedRoi),
    [safeAmount, property.expectedRoi]
  );
  const yieldAmt = useMemo(
    () => expectedYield(safeAmount, property.rentalYield),
    [safeAmount, property.rentalYield]
  );
  const total = useMemo(
    () => expectedAnnualTotal(safeAmount, property.expectedRoi, property.rentalYield),
    [safeAmount, property.expectedRoi, property.rentalYield]
  );
  const remainingAfter = useMemo(() => Math.max(0, max - safeAmount), [max, safeAmount]);
  const eligibility = useMemo(
    () => checkEligibility(safeAmount, property),
    [safeAmount, property]
  );

  const quick = [
    { label: "Min", value: min },
    { label: "2×", value: min * 2 },
    { label: "5×", value: min * 5 },
    { label: "Max", value: max },
  ];

  const onSlider = (v: number) => {
    setNoted(false);
    setAmount(v);
  };

  return (
    <div className="dashboard-glass-strong overflow-hidden rounded-2xl">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="dashboard-label">Investment Calculator</div>
        <div className="mt-1 font-display text-lg font-light text-white/95">
          Model your allocation
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* Amount */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="invest-amount" className="dashboard-label">
              Investment Amount
            </label>
            <span className="text-xs text-white/40">{property.blockchain}</span>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
              $
            </span>
            <input
              id="invest-amount"
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={property.tokenPrice}
              value={safeAmount}
              onChange={(e) => {
                setNoted(false);
                const n = Number(e.target.value);
                setAmount(Number.isFinite(n) ? n : 0);
              }}
              className="dashboard-input !rounded-xl !py-3 !pl-7 !pr-3 text-lg tabular-nums"
            />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={property.tokenPrice}
            value={safeAmount}
            onChange={(e) => onSlider(Number(e.target.value))}
            aria-label="Investment amount slider"
            className="mt-3 w-full accent-accent"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => onSlider(clampAmount(q.value, property))}
                className="rounded-full border border-white/10 px-3 py-1 text-[0.7rem] text-white/60 transition-colors hover:border-accent/30 hover:text-accent"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fraction preview */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="dashboard-label">Fraction Preview</span>
            <span className="text-lg font-medium tabular-nums text-white/95">
              {fractions.toLocaleString("en-US")}{" "}
              <span className="text-sm text-white/40">fractions</span>
            </span>
          </div>
          <div className="mt-1 text-xs text-white/40">
            {formatCurrency(property.tokenPrice)} per fraction ·{" "}
            {formatCurrency(amountForFractions(fractions, property.tokenPrice))} allocated
          </div>
        </div>

        {/* Expected returns */}
        <div className="grid grid-cols-3 gap-2">
          <ReturnStat label="ROI / yr" value={formatCompactCurrency(roi)} />
          <ReturnStat label="Yield / yr" value={formatCompactCurrency(yieldAmt)} />
          <ReturnStat label="Total / yr" value={formatCompactCurrency(total)} accent />
        </div>

        {/* Breakdown */}
        <dl className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
          <Row k="Expected ROI" v={formatPercent(property.expectedRoi)} />
          <Row k="Rental Yield" v={formatPercent(property.rentalYield)} />
          <Row k="Funding Remaining" v={formatCompactCurrency(max)} />
          <Row k="Remaining After" v={formatCompactCurrency(remainingAfter)} accent />
        </dl>

        {/* Eligibility */}
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            eligibility.eligible
              ? "border-[#3CE37D]/25 bg-[#3CE37D]/10 text-[#3CE37D]"
              : "border-white/10 bg-white/[0.02] text-white/60"
          }`}
        >
          {eligibility.reason}
        </div>

        {/* CTA (UI only) */}
        <motion.button
          type="button"
          disabled={!eligibility.eligible}
          onClick={() => setNoted(true)}
          whileTap={eligibility.eligible ? { scale: 0.98 } : undefined}
          transition={{ duration: 0.2, ease: EASE_LUX }}
          className={`w-full rounded-full py-3 text-sm font-medium tracking-wide transition-all duration-300 ease-lux ${
            eligibility.eligible
              ? "bg-white text-black"
              : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/35"
          }`}
        >
          {eligibility.eligible ? "Reserve Allocation" : "Not Available"}
        </motion.button>
        {noted && eligibility.eligible && (
          <p className="text-center text-xs text-white/45">
            Primary investment opens after KYC verification — enabled in a later milestone.
          </p>
        )}
        <p className="text-center text-[0.65rem] text-white/30">
          Projections are illustrative. Capital at risk. Not financial advice.
        </p>
      </div>
    </div>
  );
}

function ReturnStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <span className="dashboard-label text-[0.5rem]">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${accent ? "text-accent" : "text-white/90"}`}>
        {value}
      </span>
    </div>
  );
}

function Row({ k, v, accent = false }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/50">{k}</dt>
      <dd className={`tabular-nums ${accent ? "text-accent" : "text-white/85"}`}>{v}</dd>
    </div>
  );
}
