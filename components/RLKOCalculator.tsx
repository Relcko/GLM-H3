"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCK_OPTIONS = [
  { label: "30D", days: 30,   apr: 3.35  },
  { label: "3M",  days: 90,   apr: 3.66  },
  { label: "6M",  days: 180,  apr: 4.57  },
  { label: "1Y",  days: 365,  apr: 6.09  },
  { label: "2Y",  days: 730,  apr: 9.14  },
  { label: "3Y",  days: 1095, apr: 12.19 },
  { label: "4Y",  days: 1460, apr: 24.38 },
];

const PLATINUM = "#E7E2D4";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ""));
  return isNaN(n) || n < 0 ? 0 : n;
}

function formatAmount(n: number): string {
  if (n === 0) return "";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatRLKO(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(3)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function calcResults(amount: number, lockIdx: number, price: number) {
  const { days, apr } = LOCK_OPTIONS[lockIdx];
  const rewards = amount * (apr / 100) * (days / 365);
  const rewardValue = rewards * price;
  return { apr, rewards, rewardValue };
}

// ─── Animated number ──────────────────────────────────────────────────────────

function AnimatedValue({ value, format }: { value: number; format: (n: number) => string }) {
  const spring = useSpring(value, { stiffness: 80, damping: 18, mass: 0.6 });
  const display = useTransform(spring, format);
  const [text, setText] = useState(format(value));

  useEffect(() => { spring.set(value); }, [value, spring]);
  useEffect(() => display.on("change", setText), [display]);

  return <span>{text}</span>;
}

// ─── Slider ───────────────────────────────────────────────────────────────────

function PriceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const MIN = 1.15;
  const MAX = 800;
  const pct = ((value - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="relative w-full">
      {/* Track */}
      <div className="relative h-1 w-full rounded-full bg-white/[0.08]">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, rgba(231,226,212,0.3) 0%, ${PLATINUM} 100%)`,
          }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Native input (invisible, on top) */}
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-1"
        style={{ zIndex: 2 }}
        aria-label="RLKO price estimate"
      />

      {/* Thumb */}
      <motion.div
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border border-white/20 shadow-[0_0_12px_rgba(231,226,212,0.25)]"
        style={{
          left: `calc(${pct}% - 8px)`,
          background: `radial-gradient(circle at 35% 35%, #fff 0%, ${PLATINUM} 60%, #b8b0a0 100%)`,
          zIndex: 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RLKOCalculator() {
  const [rawAmount, setRawAmount] = useState("10,000");
  const [lockIdx, setLockIdx]     = useState(3); // 1Y default
  const [price, setPrice]         = useState(1.15);
  const inputRef = useRef<HTMLInputElement>(null);

  const amount = parseAmount(rawAmount);
  const { apr, rewards, rewardValue } = calcResults(amount, lockIdx, price);

  const handleAmountBlur = useCallback(() => {
    const n = parseAmount(rawAmount);
    setRawAmount(n > 0 ? formatAmount(n) : "");
  }, [rawAmount]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9.,]/g, "");
    setRawAmount(v);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8, ease: EASE_LUX }}
      className="w-full rounded-[24px] border border-white/[0.07] bg-[#090B10]/80 backdrop-blur-2xl overflow-hidden"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 80px -24px rgba(0,0,0,0.7)" }}
    >
      {/* Top highlight */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, rgba(231,226,212,0.18) 40%, rgba(231,226,212,0.10) 60%, transparent)` }} />

      <div className="p-5 sm:p-6">

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: `linear-gradient(135deg, ${PLATINUM}22, ${PLATINUM}08)`, border: `1px solid ${PLATINUM}22` }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1L6.2 3.8L9 4.5L7 6.5L7.5 9.5L5 8L2.5 9.5L3 6.5L1 4.5L3.8 3.8L5 1Z" fill={PLATINUM} fillOpacity="0.9" />
              </svg>
            </span>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.35em]" style={{ color: `${PLATINUM}99` }}>
              RLKO Rewards Calculator
            </span>
          </div>
          <p className="text-xs leading-relaxed text-white/35 max-w-xs">
            Estimate potential rewards based on token amount, lock duration, and RLKO price.
          </p>
        </div>

        {/* Divider */}
        <div className="mb-5 h-px w-full bg-white/[0.05]" />

        {/* ── Inputs ── */}
        <div className="flex flex-col gap-5">

          {/* RLKO Amount */}
          <div>
            <label className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/35">RLKO Amount</span>
              {amount > 0 && (
                <span className="font-mono text-[0.6rem]" style={{ color: `${PLATINUM}70` }}>
                  {formatAmount(amount)} RLKO
                </span>
              )}
            </label>
            <div
              className="group relative flex items-center rounded-xl border bg-white/[0.03] transition-all duration-500"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
              onFocus={() => {}}
            >
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={rawAmount}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                placeholder="Enter RLKO amount"
                className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-white/20 outline-none"
                style={{ caretColor: PLATINUM }}
                aria-label="RLKO amount"
              />
              <span className="pr-4 font-mono text-xs text-white/25">RLKO</span>
              {/* Focus ring */}
              <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
                style={{ boxShadow: `0 0 0 1px ${PLATINUM}30, inset 0 1px 0 ${PLATINUM}08` }} />
            </div>
          </div>

          {/* Lock Duration */}
          <div>
            <label className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/35">
              Lock Duration
            </label>
            <div className="relative grid grid-cols-7 gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
              {/* Sliding pill */}
              <motion.div
                className="absolute top-1 bottom-1 rounded-lg"
                style={{
                  left: `calc(${(lockIdx / 7) * 100}% + 4px)`,
                  width: `calc(${(1 / 7) * 100}% - 8px / 7)`,
                  background: `linear-gradient(135deg, ${PLATINUM}18, ${PLATINUM}08)`,
                  border: `1px solid ${PLATINUM}22`,
                  boxShadow: `0 0 12px ${PLATINUM}10`,
                }}
                layout
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
              />
              {LOCK_OPTIONS.map((opt, i) => (
                <button
                  key={opt.label}
                  onClick={() => setLockIdx(i)}
                  className="relative z-10 rounded-lg py-2 text-center transition-colors duration-300"
                  aria-pressed={lockIdx === i}
                  aria-label={`Lock for ${opt.label}`}
                >
                  <span className={`font-mono text-[0.6rem] transition-colors duration-300 ${lockIdx === i ? "text-white" : "text-white/30"}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Slider */}
          <div>
            <label className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/35">RLKO Price Estimate</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.6rem] text-white/25">Current</span>
                <span className="font-mono text-xs font-medium" style={{ color: PLATINUM }}>
                  ${price.toFixed(2)}
                </span>
              </div>
            </label>
            <PriceSlider value={price} onChange={setPrice} />
            <div className="mt-2 flex justify-between">
              <span className="font-mono text-[0.55rem] text-white/20">$1.15</span>
              <span className="font-mono text-[0.55rem] text-white/20">$800.00</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 h-px w-full bg-white/[0.05]" />

        {/* ── Results ── */}
        <div>
          <span className="mb-3 block font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/25">
            Estimated Returns
          </span>

          <div className="grid grid-cols-3 gap-3">
            {/* APR */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
            >
              <div className="mb-1 font-mono text-[0.55rem] uppercase tracking-[0.25em] text-white/30">APR</div>
              <div className="font-display text-xl font-light" style={{ color: PLATINUM }}>
                <AnimatedValue value={apr} format={(n) => `${n.toFixed(1)}%`} />
              </div>
              <div className="mt-1 text-[0.6rem] text-white/25">Annual rate</div>
              {/* Corner glow */}
              <div className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full opacity-20"
                style={{ background: `radial-gradient(circle, ${PLATINUM}40, transparent 70%)` }} />
            </motion.div>

            {/* RLKO Rewards */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
            >
              <div className="mb-1 font-mono text-[0.55rem] uppercase tracking-[0.25em] text-white/30">Rewards</div>
              <div className="font-display text-xl font-light text-white">
                <AnimatedValue value={rewards} format={formatRLKO} />
              </div>
              <div className="mt-1 text-[0.6rem] text-white/25">RLKO tokens</div>
            </motion.div>

            {/* USD Value */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
            >
              <div className="mb-1 font-mono text-[0.55rem] uppercase tracking-[0.25em] text-white/30">Value</div>
              <div className="font-display text-xl font-light" style={{ color: "#3CE37D" }}>
                <AnimatedValue value={rewardValue} format={formatUSD} />
              </div>
              <div className="mt-1 text-[0.6rem] text-white/25">USD estimate</div>
            </motion.div>
          </div>

          {/* Summary bar */}
          <AnimatePresence>
            {amount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.4, ease: EASE_LUX }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    background: `linear-gradient(135deg, ${PLATINUM}08, ${PLATINUM}04)`,
                    border: `1px solid ${PLATINUM}14`,
                  }}
                >
                  <span className="text-xs text-white/40">
                    {formatAmount(amount)} RLKO · {LOCK_OPTIONS[lockIdx].label} lock · ${price.toFixed(2)}/RLKO
                  </span>
                  <span className="font-mono text-xs font-medium" style={{ color: "#3CE37D" }}>
                    +{apr.toFixed(1)}% APR
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Disclaimer */}
        <p className="mt-4 text-[0.58rem] leading-relaxed text-white/20">
          Estimates are illustrative only. Actual rewards depend on protocol conditions and are not guaranteed.
        </p>
      </div>
    </motion.div>
  );
}
