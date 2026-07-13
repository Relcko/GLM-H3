"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useAccount, useChainId } from "@/lib/blockchain/wallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useReadContract } from "wagmi";
import { STAKING_ABI } from "@/lib/staking/abi";
import { getStakingContract, getRlkoToken } from "@/lib/staking/config";
import { ERC20_ABI } from "@/lib/blockchain/erc20";
import { SALE_META, DEFAULT_CHAIN_ID } from "@/lib/presale/config";
import { useTokenPrice, useUserInvestment } from "@/lib/presale/services/reads";
import { formatUnits } from "viem";
import { formatWithCommas } from "@/lib/blockchain/format";
import { EASE_LUX } from "@/lib/motion";
import { SkeletonGrid } from "./Skeleton";

const KPIValue = memo(function KPIValue({
  value,
  label,
  accent = false,
  icon,
  highlight = false,
  prefix = "",
  delay = 0,
}: {
  value: string;
  label: string;
  accent?: boolean;
  icon?: React.ReactNode;
  highlight?: boolean;
  prefix?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE_LUX, delay }}
      className="dashboard-card group overflow-hidden px-5 py-4 sm:px-6 sm:py-5"
    >
      <div className="pointer-events-none absolute -inset-x-4 -top-4 h-24 bg-gradient-to-b from-accent/[0.02] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      {icon && (
        <div
          className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 ${
            highlight
              ? "bg-success/15 text-success shadow-[0_0_12px_rgba(60,227,125,0.1)]"
              : accent
                ? "bg-accent/10 text-accent shadow-[0_0_12px_rgba(0,212,255,0.08)]"
                : "bg-white/[0.04] text-white/40"
          }`}
        >
          {icon}
        </div>
      )}
      <div className={`dashboard-label ${highlight ? "!text-success/60" : ""}`}>
        {label}
      </div>
      <div
        className={`mt-1 font-display text-xl font-light tracking-tight dashboard-number sm:text-2xl ${
          accent ? "text-cyber" : highlight ? "text-success" : "text-white/90"
        }`}
      >
        {prefix}{value}
      </div>
    </motion.div>
  );
});

export default function PortfolioKPI() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();

  const stakingContract = getStakingContract(chainId);
  const rlkoToken = getRlkoToken(chainId);

  const { data: balance, isLoading: balLoading } = useReadContract({
    address: rlkoToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!rlkoToken && !!address },
  });

  const { data: stakes, isLoading: stakesLoading } = useReadContract({
    address: stakingContract ?? undefined,
    abi: STAKING_ABI,
    functionName: "getStakesOfUser",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!stakingContract && !!address },
  });

  const { data: tokenPrice } = useTokenPrice(DEFAULT_CHAIN_ID);
  const { data: userInvestment } = useUserInvestment(DEFAULT_CHAIN_ID, address);

  const balanceNum = useMemo(() => balance !== undefined ? Number(balance) / 1e18 : 0, [balance]);
  const priceNum = useMemo(() => tokenPrice !== undefined ? Number(formatUnits(tokenPrice as bigint, 18)) : 0, [tokenPrice]);

  const { stakedAmount, activeStakes } = useMemo(() => {
    let staked = 0;
    let active = 0;
    if (stakes && Array.isArray(stakes)) {
      for (const s of stakes as Array<{ amount: bigint; claimed: boolean; emergencyWithdraw: boolean }>) {
        staked += Number(s.amount) / 1e18;
        if (!s.claimed && !s.emergencyWithdraw) {
          active++;
        }
      }
    }
    return { stakedAmount: staked, activeStakes: active };
  }, [stakes]);

  const investmentNum = useMemo(() => userInvestment !== undefined ? Number(formatUnits(userInvestment as bigint, 18)) : 0, [userInvestment]);
  const portfolioValue = balanceNum + stakedAmount;
  const estUsdValue = portfolioValue * priceNum;

  const isLoading = balLoading || stakesLoading;

  if (!isConnected) {
    return (
      <div className="dashboard-card overflow-hidden p-8 text-center sm:p-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/30">
            <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="16" cy="13.5" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <h3 className="font-display text-lg font-light text-white/70">Portfolio Overview</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/40">Connect your wallet to view your portfolio KPIs.</p>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: EASE_LUX }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="dashboard-accent-line" />
            <span className="dashboard-label">Portfolio KPIs</span>
          </div>
          <p className="mt-1 text-sm text-white/40">Real-time performance metrics</p>
        </div>
        {estUsdValue > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_LUX }}
            className="hidden items-center gap-2.5 rounded-xl dashboard-glass px-4 py-2.5 sm:flex"
          >
            <span className="dashboard-label">Est. Value</span>
            <span className="font-display text-base text-cyber dashboard-number">${formatWithCommas(estUsdValue, 2)}</span>
          </motion.div>
        )}
      </div>

      {isLoading ? (
        <SkeletonGrid cards={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPIValue
            label="Wallet Balance"
            value={`${formatWithCommas(balanceNum, 2)} ${SALE_META.tokenSymbol}`}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="16" cy="13.5" r="1.5" fill="currentColor" />
              </svg>
            }
            delay={0.05}
          />
          <KPIValue
            label="Total Staked"
            value={`${formatWithCommas(stakedAmount, 2)} ${SALE_META.tokenSymbol}`}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M12 8v8M9 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            }
            delay={0.1}
          />
          <KPIValue
            label="Active Stakes"
            value={`${activeStakes}`}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            delay={0.15}
          />
          <KPIValue
            label="Total Invested"
            value={`${formatWithCommas(investmentNum, 2)} USDT`}
            accent
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 12h3l2-5 3 9 3-7 2 3h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            delay={0.2}
          />
        </div>
      )}
    </motion.div>
  );
}
