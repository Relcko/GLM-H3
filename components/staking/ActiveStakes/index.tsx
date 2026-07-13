"use client";

import { memo, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Reveal } from "@/components/Reveal";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "@/lib/blockchain/wallet";
import { STAKING_ABI } from "@/lib/staking/abi";
import { getStakingContract, STAKING_PLANS, WITHDRAW_PENALTY_BPS } from "@/lib/staking/config";
import { EASE_LUX } from "@/lib/motion";
import { SALE_META } from "@/lib/presale/config";
import { formatWithCommas, timestampToDate, daysToHuman } from "@/lib/blockchain/format";
import { saveTxEntry } from "@/lib/blockchain/txHistory";
import { trackEvent } from "@/lib/analytics";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  "30 Days": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4v4M16 4v4M4 11h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "3 Months": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "6 Months": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "1 Year": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2v4M12 22v-4M4 12H2M22 12h-2M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

function getIcon(label: string): React.ReactNode {
  return PLAN_ICONS[label] || PLAN_ICONS["30 Days"];
}

const ActiveStakes = memo(function ActiveStakes() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const queryClient = useQueryClient();
  const stakingContract = getStakingContract(chainId);

  const { data: stakes, refetch } = useReadContract({
    address: stakingContract ?? undefined,
    abi: STAKING_ABI,
    functionName: "getStakesOfUser",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!stakingContract && !!address },
  });

  const { writeContract, data: writeHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: writeHash,
  });

  const [claimingIndex, setClaimingIndex] = useState<number | null>(null);
  const [withdrawingIndex, setWithdrawingIndex] = useState<number | null>(null);
  const [confirmWithdrawIndex, setConfirmWithdrawIndex] = useState<number | null>(null);

  const activeActionIndex = claimingIndex ?? withdrawingIndex;

  useEffect(() => {
    if (isTxSuccess && claimingIndex !== null) {
      trackEvent({ type: "claim_success", chainId, txHash: writeHash });
      const stakesArr = stakes as Array<{ amount: bigint; totalReturn: bigint }> | undefined;
      const claimedStake = stakesArr?.[claimingIndex];
      const amt = claimedStake ? Number(claimedStake.totalReturn) / 1e18 : 0;
      saveTxEntry({
        hash: writeHash || "",
        type: "Claim",
        amount: `${amt.toFixed(2)} ${SALE_META.tokenSymbol}`,
        timestamp: Date.now(),
        status: "complete",
        network: chainId,
      });
      queryClient.invalidateQueries();
      setClaimingIndex(null);
    }
    if (isTxSuccess && withdrawingIndex !== null) {
      trackEvent({ type: "withdraw_success", chainId, txHash: writeHash });
      const stakesArr = stakes as Array<{ amount: bigint }> | undefined;
      const withdrawnStake = stakesArr?.[withdrawingIndex];
      const amt = withdrawnStake ? Number(withdrawnStake.amount) / 1e18 : 0;
      saveTxEntry({
        hash: writeHash || "",
        type: "Emergency Withdraw",
        amount: `${amt.toFixed(2)} ${SALE_META.tokenSymbol}`,
        timestamp: Date.now(),
        status: "complete",
        network: chainId,
      });
      queryClient.invalidateQueries();
      setWithdrawingIndex(null);
    }
    if (writeError && activeActionIndex !== null) {
      const eventType =
        claimingIndex !== null ? "claim_failed" : "withdraw_failed";
      trackEvent({ type: eventType, chainId, error: writeError.message ?? "Unknown error" });
      setClaimingIndex(null);
      setWithdrawingIndex(null);
    }
  }, [isTxSuccess, writeError, writeHash, claimingIndex, withdrawingIndex, stakes, chainId, queryClient]);

  const handleClaim = useCallback(
    (index: number) => {
      if (!stakingContract) return;
      setClaimingIndex(index);
      writeContract({
        address: stakingContract,
        abi: STAKING_ABI,
        functionName: "claim",
        args: [BigInt(index)],
      });
    },
    [stakingContract, writeContract]
  );

  const handleEmergencyWithdraw = useCallback(
    (index: number) => {
      if (!stakingContract) return;
      setConfirmWithdrawIndex(null);
      setWithdrawingIndex(index);
      writeContract({
        address: stakingContract,
        abi: STAKING_ABI,
        functionName: "emergencyWithdraw",
        args: [BigInt(index)],
      });
    },
    [stakingContract, writeContract]
  );

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1e3));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1e3)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isConnected) {
    return (
      <Reveal>
        <div className="dashboard-glass rounded-2xl p-6 sm:p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/30">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-light text-white/70">Active Stakes</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/40">
            Connect your wallet to view your active stakes.
          </p>
          {openConnectModal && (
            <button onClick={openConnectModal} className="dashboard-btn dashboard-btn-primary mt-5">
              Connect Wallet
            </button>
          )}
        </div>
      </Reveal>
    );
  }

  if (!stakes || !Array.isArray(stakes) || stakes.length === 0) {
    return (
      <Reveal>
        <div className="dashboard-glass rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <span className="dashboard-accent-line" />
            <span className="dashboard-label">Active Stakes</span>
          </div>
          <div className="flex flex-col items-center py-8 text-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/12">
              <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 4v4M16 4v4M4 11h16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <p className="mt-4 text-sm text-white/30">
              No active stakes. Stake RLKO tokens to start earning rewards.
            </p>
          </div>
        </div>
      </Reveal>
    );
  }

  const stakeList = stakes as Array<{
    amount: bigint;
    totalReturn: bigint;
    planDays: bigint;
    planReturn: bigint;
    stakedOn: bigint;
    maturesOn: bigint;
    claimed: boolean;
    emergencyWithdraw: boolean;
  }>;

  const penaltyPct = WITHDRAW_PENALTY_BPS / 100;

  return (
    <Reveal>
      <div className="dashboard-glass rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="dashboard-accent-line" />
          <span className="dashboard-label">Active Stakes</span>
        </div>
        <div className="space-y-3">
          {stakeList.map((s, i) => {
            const amt = Number(s.amount) / 1e18;
            const ret = Number(s.totalReturn) / 1e18;
            const matured = Number(s.maturesOn) < now;
            const plan = STAKING_PLANS.find((p) => p.durationDays === Number(s.planDays));
            const isPending = claimingIndex === i || withdrawingIndex === i;
            const isConfirming = confirmWithdrawIndex === i;
            const isWithdrawn = s.emergencyWithdraw;
            const isDone = s.claimed || isWithdrawn;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ease: EASE_LUX }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      isDone
                        ? "bg-white/5 text-white/30"
                        : matured
                          ? "bg-success/10 text-success"
                          : "bg-accent/10 text-accent"
                    }`}
                  >
                    {plan?.label ? getIcon(plan.label) : getIcon("30 Days")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base text-white/90 dashboard-number">
                        {formatWithCommas(amt)} {SALE_META.tokenSymbol}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider ${
                          s.claimed
                            ? "bg-white/5 text-white/30"
                            : isWithdrawn
                              ? "bg-warning/10 text-warning/70"
                              : matured
                                ? "bg-success/15 text-success"
                                : "bg-warning/10 text-warning/80"
                        }`}
                      >
                        {s.claimed ? "Claimed" : isWithdrawn ? "Withdrawn" : matured ? "Ready" : "Locked"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[0.5rem] uppercase tracking-wider text-white/35">
                      <span>{plan?.label ?? daysToHuman(Number(s.planDays))}</span>
                      <span>Return: {Number(s.planReturn) / 100}%</span>
                      <span>Matures: {timestampToDate(Number(s.maturesOn))}</span>
                    </div>
                  </div>
                </div>

                {!isDone && matured && (
                  <button
                    onClick={() => handleClaim(i)}
                    disabled={isPending && isTxLoading}
                    className="dashboard-btn dashboard-btn-primary !px-4 !py-2 !text-[0.65rem] shrink-0 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-1.5">
                      {claimingIndex === i && (
                        <motion.span
                          className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                      {claimingIndex === i ? "Claiming..." : "Claim Rewards"}
                    </span>
                  </button>
                )}

                {!isDone && !matured && !isWithdrawn && (
                  <>
                    {confirmWithdrawIndex !== i ? (
                      <button
                        onClick={() => setConfirmWithdrawIndex(i)}
                        disabled={isPending}
                        className="rounded-lg border border-warning/20 bg-warning/8 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-wider text-warning/80 transition-all hover:bg-warning/15 disabled:opacity-40 shrink-0"
                      >
                        Emergency
                      </button>
                    ) : null}

                    {withdrawingIndex === i && (
                      <div className="flex items-center gap-2 text-[0.65rem] text-warning/80 shrink-0">
                        <motion.span
                          className="h-3 w-3 rounded-full border-2 border-warning/40 border-t-warning"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Withdrawing...
                      </div>
                    )}
                  </>
                )}

                {writeError && claimingIndex === i && (
                  <span className="text-[0.5rem] text-warning/70">Claim failed</span>
                )}
                {writeError && withdrawingIndex === i && (
                  <span className="text-[0.5rem] text-warning/70">Withdraw failed</span>
                )}

                {isTxSuccess && withdrawingIndex === i && (
                  <span className="text-[0.5rem] text-success/70">Withdrawn</span>
                )}

                <AnimatePresence>
                  {isConfirming && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: EASE_LUX }}
                      className="w-full overflow-hidden"
                    >
                      <div className="mt-2 rounded-xl border border-warning/20 bg-warning/[0.04] px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-warning"
                          >
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                            <path d="M12 8v4M12 16h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.6rem] font-medium text-warning/90">
                              Early withdrawal penalty applies
                            </p>
                            <p className="mt-1 text-[0.55rem] leading-relaxed text-white/40">
                              You will forfeit all accrued rewards and receive your staked amount
                              minus a {penaltyPct}% penalty ({formatWithCommas(amt * (penaltyPct / 100))}{" "}
                              {SALE_META.tokenSymbol}). This action cannot be undone.
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() => handleEmergencyWithdraw(i)}
                                disabled={isPending}
                                className="rounded-lg bg-warning/15 px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-wider text-warning/90 transition-all hover:bg-warning/25 disabled:opacity-40"
                              >
                                Confirm Withdraw
                              </button>
                              <button
                                onClick={() => setConfirmWithdrawIndex(null)}
                                disabled={isPending}
                                className="rounded-lg border border-white/[0.08] px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-wider text-white/40 transition-all hover:bg-white/[0.04] disabled:opacity-40"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
});

export default ActiveStakes;
