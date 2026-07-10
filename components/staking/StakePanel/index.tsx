"use client";

import { useState, useCallback } from "react";
import { Section, Container } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import MagneticButton from "@/components/MagneticButton";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "@/lib/blockchain/wallet";
import { STAKING_ABI } from "@/lib/staking/abi";
import { STAKING_PLANS, getStakingContract, getRlkoToken, MIN_STAKE_AMOUNT, type StakePlan } from "@/lib/staking/config";
import { ERC20_ABI } from "@/lib/blockchain/erc20";
import { EASE_LUX } from "@/lib/motion";
import { SALE_META } from "@/lib/presale/config";

const QUICK_AMOUNTS = [25, 50, 75, 100];

export default function StakePanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [amount, setAmount] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<StakePlan>(STAKING_PLANS[0]);
  const [step, setStep] = useState<"idle" | "approving" | "staking">("idle");

  const stakingContract = getStakingContract(chainId);
  const rlkoToken = getRlkoToken(chainId);

  const { data: balance } = useReadContract({
    address: rlkoToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!rlkoToken && !!address },
  });

  const { data: allowance } = useReadContract({
    address: rlkoToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && stakingContract ? [address, stakingContract] : undefined,
    chainId,
    query: { enabled: !!rlkoToken && !!address && !!stakingContract },
  });

  const { writeContract, isPending: isWritePending, data: writeHash } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: writeHash });

  const numericAmount = parseFloat(amount) || 0;
  const rawAmount = BigInt(Math.floor(numericAmount * 1e18));
  const needsApproval = allowance !== undefined ? rawAmount > allowance : true;
  const balanceNum = balance !== undefined ? Number(balance) / 1e18 : 0;
  const reward = numericAmount > 0 ? (numericAmount * selectedPlan.returnPct) / 100 : 0;
  const totalReturn = numericAmount + reward;

  const handleApprove = useCallback(() => {
    if (!rlkoToken || !stakingContract) return;
    setStep("approving");
    writeContract({
      address: rlkoToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [stakingContract, rawAmount],
    });
  }, [rlkoToken, stakingContract, rawAmount, writeContract]);

  const handleStake = useCallback(() => {
    if (!stakingContract) return;
    setStep("staking");
    writeContract({
      address: stakingContract,
      abi: STAKING_ABI,
      functionName: "stake",
      args: [rawAmount, BigInt(selectedPlan.durationDays)],
    });
  }, [stakingContract, rawAmount, selectedPlan, writeContract]);

  if (!isConnected) return null;

  return (
    <Reveal>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
        <h3 className="font-display text-xl font-light text-white/90">
          Stake {SALE_META.tokenSymbol}
        </h3>
        <p className="mt-2 text-sm text-white/45">
          Lock your tokens and earn fixed returns.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/40">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-lg text-white/90 outline-none transition-all duration-300 placeholder:text-white/20 focus:border-accent/40 focus:bg-accent/[0.02]"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[0.55rem] uppercase tracking-wider text-white/30">
                  Balance: {balanceNum.toFixed(2)}
                </span>
                <div className="flex gap-1">
                  {QUICK_AMOUNTS.map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setAmount(((balanceNum * pct) / 100).toFixed(2))}
                      className="rounded-md border border-white/[0.06] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-accent/70 transition-colors hover:text-accent"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/40">
                Lock Period
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {STAKING_PLANS.map((plan) => (
                  <button
                    key={plan.durationDays}
                    onClick={() => setSelectedPlan(plan)}
                    className={`rounded-lg border px-2 py-2 text-center text-[0.65rem] transition-all duration-300 ${
                      selectedPlan.durationDays === plan.durationDays
                        ? "border-accent/50 bg-accent/10 text-accent"
                        : "border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    <div className="font-medium">{plan.label}</div>
                    <div className="mt-0.5 text-[0.55rem] opacity-70">{plan.multiplier}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-white/[0.03] px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Fixed Return</span>
                <span className="font-display text-accent">{selectedPlan.returnPct}%</span>
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Est. Reward</span>
                <span className="font-display text-white/80">
                  {reward.toFixed(2)} {SALE_META.tokenSymbol}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">You Receive</span>
                <span className="font-display text-white/90">
                  {totalReturn.toFixed(2)} {SALE_META.tokenSymbol}
                </span>
              </div>
            </div>

            <div className="pt-2">
              {needsApproval ? (
                <MagneticButton
                  onClick={handleApprove}
                  variant="primary"
                  className="w-full"
                  disabled={numericAmount <= 0 || numericAmount < MIN_STAKE_AMOUNT}
                >
                  {step === "approving" || isWritePending ? "Approving..." : `Approve ${SALE_META.tokenSymbol}`}
                </MagneticButton>
              ) : (
                <MagneticButton
                  onClick={handleStake}
                  variant="primary"
                  className="w-full"
                  disabled={numericAmount <= 0 || numericAmount < MIN_STAKE_AMOUNT}
                >
                  {step === "staking" || isWritePending ? "Staking..." : `Stake ${SALE_META.tokenSymbol}`}
                </MagneticButton>
              )}
            </div>

            {numericAmount > 0 && numericAmount < MIN_STAKE_AMOUNT && (
              <p className="text-xs text-warning/70">
                Minimum stake: {MIN_STAKE_AMOUNT} {SALE_META.tokenSymbol}
              </p>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
