"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { useAccount, useBalance, useChainId } from "@/lib/blockchain/wallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { DEFAULT_CHAIN_ID } from "@/lib/presale/config";
import { isChainSupported } from "@/lib/blockchain/chains";
import { formatUnits } from "viem";
import { EASE_LUX } from "@/lib/motion";
import { SkeletonMetric } from "./Skeleton";
import { useTokenBalance } from "@/lib/presale/services/reads";
import { getPaymentTokens } from "@/lib/presale/config";

function HealthRow({ label, status, detail }: { label: string; status: "ok" | "warn" | "error"; detail: string }) {
  const colors = {
    ok: { dot: "bg-success", text: "text-success", bg: "bg-success/10", bar: "bg-success w-full" },
    warn: { dot: "bg-warning", text: "text-warning/80", bg: "bg-warning/10", bar: "bg-warning w-2/3" },
    error: { dot: "bg-red-400", text: "text-red-400", bg: "bg-red-400/10", bar: "bg-red-400 w-1/3" },
  };
  const c = colors[status];
  return (
    <div className="group flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-3 transition-all duration-300 hover:bg-white/[0.05]">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-2 w-2 rounded-full ${c.dot} shadow-[0_0_6px_rgba(60,227,125,0.3)]`} />
        <div>
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white/40">{label}</span>
          <div className="mt-0.5 font-mono text-[0.5rem] text-white/20">{detail}</div>
        </div>
      </div>
      <div className="text-right">
        <span className={`font-mono text-[0.55rem] ${c.text}`}>
          {status === "ok" ? "Operational" : status === "warn" ? "Attention" : "Error"}
        </span>
        <div className={`health-bar mt-1 ${c.bg}`}>
          <div className={`health-bar-fill ${c.bar}`} />
        </div>
      </div>
    </div>
  );
}

const WalletHealth = memo(function WalletHealth() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const { data: nativeBal, isLoading } = useBalance({ address, chainId: chainId || DEFAULT_CHAIN_ID, query: { refetchInterval: 10_000, staleTime: 0, refetchIntervalInBackground: true } });

  const usdtAddress = (() => {
    const tokens = getPaymentTokens(chainId || DEFAULT_CHAIN_ID);
    return tokens.find((t) => t.symbol === "USDT")?.address ?? null;
  })();

  const { data: usdtBal } = useTokenBalance(chainId || DEFAULT_CHAIN_ID, usdtAddress, address ?? undefined);

  const nativeBalance = nativeBal ? Number(formatUnits(nativeBal.value, nativeBal.decimals)) : 0;
  const usdtBalance = usdtBal !== undefined ? Number(usdtBal) / 1e18 : 0;
  const isCorrectChain = chainId ? isChainSupported(chainId) : false;
  const hasGas = nativeBalance > 0.001;
  const hasUsdt = usdtBalance > 0;

  if (!isConnected) {
    return (
      <div className="dashboard-glass rounded-xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="dashboard-accent-line" />
            <span className="dashboard-label">Wallet Health</span>
          </div>
        </div>
        <button
          onClick={openConnectModal}
          className="w-full rounded-xl border border-accent/15 bg-accent/5 px-4 py-2.5 text-xs text-accent transition-all duration-300 hover:bg-accent/10 hover:border-accent/30 text-left"
        >
          <span className="font-mono">Connect to check wallet health</span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="dashboard-glass rounded-xl p-5">
        <div className="mb-3">
          <SkeletonMetric />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE_LUX }}
      className="dashboard-glass rounded-xl"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="dashboard-accent-line" />
            <span className="dashboard-label">Wallet Health</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success status-dot" />
            <span className="font-mono text-[0.5rem] uppercase tracking-wider text-success">Connected</span>
          </span>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:bg-white/[0.05]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="dashboard-label">Native Balance</div>
            <div className="mt-0.5 font-display text-base text-white/90 dashboard-number">
              {nativeBalance.toFixed(4)} {nativeBal?.symbol || "BNB"}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <HealthRow
            label="Network"
            status={isCorrectChain ? "ok" : "error"}
            detail={isCorrectChain ? "BNB Smart Chain" : `Chain ${chainId}`}
          />
          <HealthRow
            label="Gas Funds"
            status={hasGas ? "ok" : "warn"}
            detail={hasGas ? `${nativeBalance.toFixed(4)} ${nativeBal?.symbol || "BNB"}` : "Insufficient"}
          />
          <HealthRow
            label="USDT"
            status={hasUsdt ? "ok" : "warn"}
            detail={hasUsdt ? `${usdtBalance.toFixed(2)} USDT` : "No USDT"}
          />
        </div>
      </div>
    </motion.div>
  );
});

export default WalletHealth;
