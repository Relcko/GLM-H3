"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import { STAKING_PLANS, type StakePlan } from "@/lib/staking/config";
import { EASE_LUX } from "@/lib/motion";
import { SALE_META } from "@/lib/presale/config";

export default function RewardsCalculator() {
  const [amount, setAmount] = useState("1000");
  const [selectedPlan, setSelectedPlan] = useState<StakePlan>(STAKING_PLANS[2]);

  const numericAmount = parseFloat(amount) || 0;
  const reward = (numericAmount * selectedPlan.returnPct) / 100;
  const totalReturn = numericAmount + reward;

  return (
    <Reveal>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
        <h3 className="font-display text-lg font-light text-white/85">
          Rewards Calculator
        </h3>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/40">
                Amount to Stake
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-lg text-white/90 outline-none transition-all duration-300 placeholder:text-white/20 focus:border-accent/40 focus:bg-accent/[0.02]"
              />
            </div>

            <div>
              <label className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/40">
                Lock Period
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {STAKING_PLANS.map((plan) => (
                  <button
                    key={plan.durationDays}
                    onClick={() => setSelectedPlan(plan)}
                    className={`rounded-lg border px-3 py-2.5 text-center text-[0.7rem] transition-all duration-300 ${
                      selectedPlan.durationDays === plan.durationDays
                        ? "border-accent/50 bg-accent/10 text-accent"
                        : "border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    <div className="font-medium">{plan.label}</div>
                    <div className="mt-0.5 text-[0.55rem] opacity-70">{plan.returnPct}%</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <div className="rounded-xl bg-accent/10 px-5 py-4">
              <div className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-accent/70">
                Fixed Return Rate
              </div>
              <div className="mt-1 font-display text-3xl font-light text-accent">
                {selectedPlan.returnPct}%
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/35">
                  Est. Reward
                </div>
                <div className="mt-1 font-display text-lg text-white/85">
                  {reward.toFixed(2)} {SALE_META.tokenSymbol}
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/35">
                  Total Return
                </div>
                <div className="mt-1 font-display text-lg text-white/90">
                  {totalReturn.toFixed(2)} {SALE_META.tokenSymbol}
                </div>
              </div>
            </div>

            <p className="text-xs text-white/25">
              Estimated returns based on the selected lock period. Actual returns
              are fixed at the time of staking.
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
