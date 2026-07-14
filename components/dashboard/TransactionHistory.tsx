"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useChainId } from "@/lib/blockchain/wallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EASE_LUX } from "@/lib/motion";
import { DEFAULT_CHAIN_ID, CHAIN_IDS } from "@/lib/presale/config";
import { shortenAddress } from "@/lib/blockchain/format";
import MagneticButton from "@/components/MagneticButton";
import { CHAIN_EXPLORERS } from "@/lib/blockchain/txHistory";

export default function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();



  const [recentTxs, setRecentTxs] = useState<
    Array<{
      hash: string;
      type: string;
      timestamp: number;
      status: string;
    }>
  >([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("rlko_recent_txs");
    if (stored) {
      try {
        setRecentTxs(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const explorer = CHAIN_EXPLORERS[chainId] || CHAIN_EXPLORERS[DEFAULT_CHAIN_ID] || "https://bscscan.com";

  if (!isConnected) {
    return (
      <section id="transactions" className="relative scroll-mt-24">
          <div className="dashboard-glass p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/30">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-light text-white/70">
            No transaction history
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/40">
            Connect your wallet to view your presale transactions.
          </p>
          <MagneticButton onClick={openConnectModal} variant="primary" className="mt-5">
            Connect Wallet
          </MagneticButton>
        </div>
      </section>
    );
  }

  const hasTxs = recentTxs.length > 0;

  return (
    <section id="transactions" className="relative scroll-mt-24">
        <div className="dashboard-glass p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-light text-white/90">
              Transaction History
            </h3>
            <p className="mt-1 text-sm text-white/40">
              Your recent presale activity
            </p>
          </div>
          <a
            href={`${explorer}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/50 transition-colors duration-[280ms] ease-lux hover:text-accent"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17l10-10M17 7v10M17 7H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Explorer
          </a>
        </div>

        {hasTxs ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="pb-3 text-left font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/35">Transaction</th>
                  <th className="pb-3 text-left font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/35">Type</th>
                  <th className="pb-3 text-left font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/35">Status</th>
                  <th className="pb-3 text-right font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/35">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTxs.map((tx, i) => (
                  <motion.tr
                    key={tx.hash}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, ease: EASE_LUX }}
                    className="border-b border-white/[0.04] last:border-0 transition-colors duration-[280ms] ease-lux hover:bg-white/[0.03]"
                  >
                    <td className="py-2.5 pr-4">
                      <a
                        href={`${explorer}/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-accent/70 transition-colors hover:text-accent"
                      >
                        {shortenAddress(tx.hash)}
                      </a>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-white/50">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-wider ${
                          tx.status === "complete" || tx.status === "success"
                            ? "text-success"
                            : tx.status === "failed"
                              ? "text-warning"
                              : "text-white/40"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            tx.status === "complete" || tx.status === "success"
                              ? "bg-success"
                              : tx.status === "failed"
                                ? "bg-warning"
                                : "bg-white/30"
                          }`}
                        />
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-xs text-white/35">
                      {new Date(tx.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/15">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-4 text-sm text-white/30">
              No transactions yet. Complete a purchase to see it here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
