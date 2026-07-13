"use client";

import { useMemo, useState, useEffect } from "react";
import { formatUnits } from "viem";
import { motion } from "framer-motion";
import { getAnalytics, getMetrics, clearAnalytics } from "@/lib/analytics";
import { useTokensRemaining, useTotalRaised, usePresaleStage } from "@/lib/presale/services/reads";
import { DEFAULT_CHAIN_ID } from "@/lib/blockchain/chains";
import { BETA_VERSION, BETA_CONTRACT_ADDRESSES } from "@/lib/beta";
import { fadeUp } from "@/lib/motion";

const EMPTY_METRICS = {
  totalInvestors: 0,
  totalPurchases: 0,
  failedPurchases: 0,
  totalVolume: 0n,
  totalStakes: 0,
  totalClaims: 0,
  totalWithdrawals: 0,
  totalFailed: 0,
  stakeFailed: 0,
  claimFailed: 0,
  networkSwitches: 0,
  rpcErrors: 0,
  totalEvents: 0,
};

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</div>
      <div className={`mt-1.5 font-mono text-lg font-medium ${accent ?? "text-white/90"}`}>{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [, forceUpdate] = useState(0);
  const metrics = useMemo(() => mounted ? getMetrics() : EMPTY_METRICS, [mounted]);

  const { data: tokensRemaining } = useTokensRemaining(DEFAULT_CHAIN_ID);
  const { data: totalRaised } = useTotalRaised(DEFAULT_CHAIN_ID);
  const { data: currentStage } = usePresaleStage(DEFAULT_CHAIN_ID);

  const stageDisplay = currentStage !== undefined
    ? `Stage ${Number(currentStage) + 1} / 3`
    : "\u2014";

  const remainingDisplay = tokensRemaining !== undefined
    ? `${Number(formatUnits(tokensRemaining as bigint, 18)).toLocaleString("en-US", { maximumFractionDigits: 0 })} RLKO`
    : "\u2014";

  const avgConfTime = useMemo(() => {
    if (!mounted) return "\u2014";
    const store = getAnalytics();
    const events = store.events;
    if (events.length < 2) return "\u2014";
    const recent = events.filter(
      (e) => e.type === "purchase_success" || e.type === "stake_success"
    );
    if (recent.length < 2) return "\u2014";
    let total = 0;
    let count = 0;
    for (let i = 1; i < recent.length; i++) {
      total += recent[i].timestamp - recent[i - 1].timestamp;
      count++;
    }
    const avg = total / count;
    if (avg < 1000) return "< 1s";
    if (avg < 60000) return `${(avg / 1000).toFixed(1)}s`;
    return `${(avg / 60000).toFixed(1)}m`;
  }, [mounted]);

  function refresh() {
    forceUpdate((n) => n + 1);
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="dashboard-accent-line" />
            <span className="dashboard-label">Admin</span>
            <span className="rounded border border-yellow-500/20 bg-yellow-500/8 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-yellow-400/80">
              v{BETA_VERSION} Beta
            </span>
          </div>
          <h2 className="mt-1 font-display text-xl font-light text-white/90">
            Operational Monitor
          </h2>
          <p className="mt-1 text-sm text-white/45">
            Read-only dashboard. Data from on-chain + local analytics.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="dashboard-btn rounded-xl px-3 py-2 text-xs"
          >
            Refresh
          </button>
          <button
            onClick={() => { clearAnalytics(); refresh(); }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 transition-all hover:bg-red-500/20"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Investors" value={metrics.totalInvestors.toString()} accent="text-accent" />
        <StatCard label="Total Purchases" value={metrics.totalPurchases.toString()} accent="text-accent" />
        <StatCard label="Total Volume" value={`${Number(formatUnits(metrics.totalVolume, 18)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`} accent="text-accent" />
        <StatCard label="Active Wallets" value={metrics.totalInvestors.toString()} accent="text-accent" />
        <StatCard label="Failed Txns" value={metrics.totalFailed.toString()} accent="text-red-400" />
        <StatCard label="Network Switches" value={metrics.networkSwitches.toString()} />
        <StatCard label="RPC Errors" value={metrics.rpcErrors.toString()} />
        <StatCard label="Total Events" value={metrics.totalEvents.toString()} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Stage Progress" value={stageDisplay} accent="text-accent" />
        <StatCard label="Remaining RLKO" value={remainingDisplay} accent="text-accent" />
        <StatCard label="Total Raised" value={totalRaised !== undefined ? `${Number(formatUnits(totalRaised as bigint, 18)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT` : "\u2014"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Stakes" value={metrics.totalStakes.toString()} />
        <StatCard label="Claims" value={metrics.totalClaims.toString()} />
        <StatCard label="Withdrawals" value={metrics.totalWithdrawals.toString()} />
        <StatCard label="Avg Confirmation" value={avgConfTime} />
        <StatCard label="Failed Stakes" value={metrics.stakeFailed.toString()} />
        <StatCard label="Failed Claims" value={metrics.claimFailed.toString()} />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
          Contract Addresses
        </div>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-white/40">RLKO</span>
            <span className="text-white/70">{BETA_CONTRACT_ADDRESSES.rlko}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">PaymentManager</span>
            <span className="text-white/70">{BETA_CONTRACT_ADDRESSES.paymentManager}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">MockUSDT</span>
            <span className="text-white/70">{BETA_CONTRACT_ADDRESSES.usdt}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/[0.02] p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(255,200,87,0.4)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-yellow-400/70">
            Beta Notice
          </span>
        </div>
        <p className="text-xs leading-relaxed text-white/40">
          This dashboard is read-only. All data is sourced from on-chain reads and anonymous
          local analytics (localStorage). No personal information is collected. Metrics reset
          if localStorage is cleared.
        </p>
      </div>
    </motion.div>
  );
}
