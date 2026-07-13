"use client";

import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useChainId } from "@/lib/blockchain/wallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EASE_LUX } from "@/lib/motion";
import { DEFAULT_CHAIN_ID } from "@/lib/presale/config";
import { shortenAddress } from "@/lib/blockchain/format";
import { SkeletonTimeline } from "./Skeleton";
import { getTxHistory, CHAIN_EXPLORERS, type TxEntry } from "@/lib/blockchain/txHistory";

function TimelineDot({ status }: { status: string }) {
  const isComplete = status === "complete";
  const isFailed = status === "failed";
  return (
    <div className="relative flex flex-col items-center">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300 ${
          isComplete
            ? "border-success/30 bg-success/10 shadow-[0_0_8px_rgba(60,227,125,0.15)]"
            : isFailed
              ? "border-warning/30 bg-warning/10"
              : "border-white/[0.08] bg-white/[0.03]"
        }`}
      >
        {isComplete ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-success">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : isFailed ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-warning">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
        )}
      </div>
    </div>
  );
}

const TransactionTimeline = memo(function TransactionTimeline() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();

  const [recentTxs, setRecentTxs] = useState<TxEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRecentTxs(getTxHistory().slice(0, 10));
    setLoading(false);

    const handleTx = (e: StorageEvent) => {
      if (e.key === "rlko_recent_txs" && e.newValue) {
        try {
          setRecentTxs(JSON.parse(e.newValue).slice(0, 10));
        } catch {}
      }
    };
    window.addEventListener("storage", handleTx);
    return () => window.removeEventListener("storage", handleTx);
  }, []);

  const explorer = CHAIN_EXPLORERS[chainId] || CHAIN_EXPLORERS[DEFAULT_CHAIN_ID] || "https://bscscan.com";

  if (!isConnected) {
    return (
      <div className="dashboard-glass rounded-2xl p-6 text-center sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/30">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="font-display text-lg font-light text-white/70">Transaction Timeline</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/40">Connect your wallet to view your transaction history.</p>
        <button
          onClick={openConnectModal}
          className="dashboard-btn dashboard-btn-primary mt-5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="16" cy="13.5" r="1.5" fill="currentColor" />
          </svg>
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-glass rounded-2xl p-6 sm:p-8">
        <SkeletonTimeline items={4} />
      </div>
    );
  }

  const hasTxs = recentTxs.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE_LUX }}
      className="dashboard-glass overflow-hidden rounded-2xl"
    >
      <div className="px-6 py-5 sm:px-8 sm:py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="dashboard-accent-line" />
              <span className="dashboard-label">Transaction Timeline</span>
            </div>
            <p className="mt-1 text-sm text-white/40">
              {hasTxs ? `${recentTxs.length} recent transactions` : "Your recent presale activity"}
            </p>
          </div>
          <a
            href={`${explorer}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/50 transition-all duration-300 hover:border-accent/20 hover:text-accent hover:bg-accent/5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17l10-10M17 7v10M17 7H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Explorer
          </a>
        </div>

        {hasTxs ? (
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 -top-1 h-6 bg-gradient-to-b from-bg-base to-transparent z-10" />
            <div className="dashboard-scroll max-h-[420px] overflow-y-auto pr-1">
              <div className="space-y-0">
                {recentTxs.map((tx, i) => (
                  <motion.div
                    key={tx.hash}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, ease: EASE_LUX }}
                    className="relative flex gap-4 pb-6 last:pb-0 group"
                  >
                    <div className="flex flex-col items-center">
                      <TimelineDot status={tx.status} />
                      {i < recentTxs.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-gradient-to-b from-white/[0.06] to-transparent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 -mt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-white/50">
                          {tx.type}
                        </span>
                        <span
                          className={`font-mono text-[0.5rem] ${
                            tx.status === "complete"
                              ? "text-success"
                              : tx.status === "failed"
                                ? "text-warning"
                                : "text-white/30"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <a
                        href={`${explorer}/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs text-accent/60 transition-all duration-200 hover:text-accent group/link"
                      >
                        <span className="border-b border-transparent group-hover/link:border-accent/30 transition-colors">
                          {shortenAddress(tx.hash)}
                        </span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                          <path d="M7 17l10-10M17 7v10M17 7H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                      <div className="mt-1 font-mono text-[0.5rem] text-white/25 tabular-nums">
                        {new Date(tx.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 -bottom-1 h-6 bg-gradient-to-t from-bg-base to-transparent" />
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/12">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-4 text-sm text-white/30">No transactions yet. Complete a purchase to see it here.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default TransactionTimeline;
