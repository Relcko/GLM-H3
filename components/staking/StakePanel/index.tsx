"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Reveal } from "@/components/Reveal";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "@/lib/blockchain/wallet";
import { STAKING_ABI } from "@/lib/staking/abi";
import { STAKING_PLANS, getStakingContract, getRlkoToken, MIN_STAKE_AMOUNT, type StakePlan } from "@/lib/staking/config";
import { ERC20_ABI } from "@/lib/blockchain/erc20";
import { EASE_LUX } from "@/lib/motion";
import { SALE_META, DEFAULT_CHAIN_ID } from "@/lib/presale/config";
import { CHAIN_IDS } from "@/lib/blockchain/chains";
import { saveTxEntry } from "@/lib/blockchain/txHistory";
import { trackEvent } from "@/lib/analytics";

const QUICK_AMOUNTS = [25, 50, 75, 100];

const StakePanel = memo(function StakePanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<StakePlan>(STAKING_PLANS[0]);
  const [step, setStep] = useState<"idle" | "approving" | "staking">("idle");

  const stakingContract = getStakingContract(chainId);
  const rlkoToken = getRlkoToken(chainId);
  const isBSC = chainId === CHAIN_IDS.bsc || chainId === CHAIN_IDS.bscTestnet;

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

  const { writeContract, isPending: isWritePending, data: writeHash, error: writeError } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: writeHash });

  const numericAmount = parseFloat(amount) || 0;
  const rawAmount = BigInt(Math.floor(numericAmount * 1e18));
  const needsApproval = allowance !== undefined ? rawAmount > allowance : true;
  const balanceNum = balance !== undefined ? Number(balance) / 1e18 : 0;
  const reward = numericAmount > 0 ? (numericAmount * selectedPlan.returnPct) / 100 : 0;
  const totalReturn = numericAmount + reward;

  useEffect(() => {
    if (isTxSuccess && step === "staking") {
      trackEvent({ type: "stake_success", chainId, txHash: writeHash, amount: rawAmount.toString() });
      saveTxEntry({
        hash: writeHash || "",
        type: "Stake",
        amount: `${numericAmount.toFixed(2)} RLKO`,
        timestamp: Date.now(),
        status: "complete",
        network: chainId,
      });
      queryClient.invalidateQueries();
      setStep("idle");
      setAmount("");
    }
    if (isTxSuccess && step === "approving") {
      setStep("idle");
    }
  }, [isTxSuccess, writeHash, step, numericAmount, chainId, queryClient, rawAmount]);

  useEffect(() => {
    if (writeError) {
      trackEvent({ type: "stake_failed", chainId, error: writeError.message ?? "Unknown error" });
      setStep("idle");
    }
  }, [writeError, chainId]);

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

  const planIndex = STAKING_PLANS.findIndex((p) => p.durationDays === selectedPlan.durationDays);
  const isPlanValid = planIndex !== -1;
  const isOverBalance = balance !== undefined && rawAmount > balance;

  const handleStake = useCallback(() => {
    if (!stakingContract || planIndex === -1) return;
    setStep("staking");
    writeContract({
      address: stakingContract,
      abi: STAKING_ABI,
      functionName: "stake",
      args: [rawAmount, BigInt(planIndex)],
    });
  }, [stakingContract, rawAmount, planIndex, writeContract]);

  if (!isConnected) {
    return (
      <Reveal>
        <div className="dashboard-glass rounded-2xl p-6 sm:p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/30">
              <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="16" cy="13.5" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-light text-white/70">Stake {SALE_META.tokenSymbol}</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/40">Connect your wallet to stake tokens and earn rewards.</p>
          {openConnectModal && (
            <button onClick={openConnectModal} className="dashboard-btn dashboard-btn-primary mt-5">
              Connect Wallet
            </button>
          )}
        </div>
      </Reveal>
    );
  }

  if (!isBSC || !stakingContract) {
    return (
      <Reveal>
        <div className="dashboard-glass rounded-2xl p-6 sm:p-8">
          <h3 className="font-display text-xl font-light text-white/90">Stake {SALE_META.tokenSymbol}</h3>
          <div className="mt-4 rounded-xl border border-warning/20 bg-warning/8 px-4 py-3 text-sm text-warning/80">
            Staking is only available on BNB Smart Chain. Please switch your network.
          </div>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <div className="dashboard-glass rounded-2xl p-6 sm:p-8">
        <h3 className="font-display text-xl font-light text-white/90">
          Stake {SALE_META.tokenSymbol}
        </h3>
        <p className="mt-2 text-sm text-white/45">
          Lock your tokens and earn fixed returns.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block dashboard-label">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="dashboard-input text-lg"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="dashboard-label">Balance: {balanceNum.toFixed(2)}</span>
                <div className="flex gap-1">
                  {QUICK_AMOUNTS.map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setAmount(((balanceNum * pct) / 100).toFixed(2))}
                      className="rounded-lg border border-white/[0.06] px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider text-accent/60 transition-all duration-200 hover:border-accent/30 hover:text-accent hover:bg-accent/5"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block dashboard-label">Lock Period</label>
              <div className="grid grid-cols-4 gap-1.5">
                {STAKING_PLANS.map((plan) => (
                  <button
                    key={plan.durationDays}
                    onClick={() => setSelectedPlan(plan)}
                    className={`rounded-lg border px-2 py-2.5 text-center text-[0.65rem] transition-all duration-300 ${
                      selectedPlan.durationDays === plan.durationDays
                        ? "border-accent/40 bg-accent/10 text-accent shadow-[inset_0_1px_0_rgba(0,212,255,0.1)]"
                        : "border-white/[0.08] text-white/45 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    <div className="font-medium">{plan.label}</div>
                    <div className="mt-0.5 text-[0.55rem] opacity-70">{plan.multiplier}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
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

            <div className="pt-3">
              {needsApproval ? (
                <button
                  onClick={handleApprove}
                  disabled={numericAmount <= 0 || numericAmount < MIN_STAKE_AMOUNT || step === "approving" || (step === "staking" && isTxLoading)}
                  className="dashboard-btn dashboard-btn-primary w-full text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    {step === "approving" && (
                      <motion.span
                        className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    {step === "approving" ? "Approving..." : `Approve ${SALE_META.tokenSymbol}`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleStake}
                  disabled={numericAmount <= 0 || numericAmount < MIN_STAKE_AMOUNT || step === "staking" || (step === "approving" && isWritePending) || isOverBalance}
                  className="dashboard-btn dashboard-btn-primary w-full text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    {step === "staking" && (
                      <motion.span
                        className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    {step === "staking" ? "Staking..." : `Stake ${SALE_META.tokenSymbol}`}
                  </span>
                </button>
              )}
            </div>

            {!isPlanValid && (
              <p className="mt-2 text-xs text-warning/70">
                Invalid staking plan.
              </p>
            )}

            {writeError && (
              <p className="mt-2 text-xs text-warning/70">
                Transaction failed. Please try again.
              </p>
            )}

            {numericAmount > 0 && numericAmount < MIN_STAKE_AMOUNT && (
              <p className="mt-2 text-xs text-warning/70">
                Minimum stake: {MIN_STAKE_AMOUNT} {SALE_META.tokenSymbol}
              </p>
            )}

            {numericAmount > 0 && isOverBalance && (
              <p className="mt-2 text-xs text-warning/70">
                Insufficient {SALE_META.tokenSymbol} balance.
              </p>
            )}

            {isTxLoading && (
              <p className="mt-2 text-xs text-white/40 text-center">
                Confirming on BNB Chain...
              </p>
            )}

            {isTxSuccess && step === "idle" && (
              <p className="mt-2 text-xs text-success/70 text-center">
                Stake confirmed successfully.
              </p>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
});

export default StakePanel;
