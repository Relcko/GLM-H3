"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatUnits } from "viem";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Section, Container } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import MagneticButton from "@/components/MagneticButton";
import { EASE_LUX } from "@/lib/motion";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "@/lib/presale/wallet";
import {
  DEFAULT_CHAIN_ID,
  SALE_META,
  CHAIN_IDS,
  getPresaleContract,
  getPaymentTokens,
} from "@/lib/presale/config";
import { PRESALE_ABI, ERC20_ABI } from "@/lib/presale/abi";
import {
  useTokenAllowance,
  useTokenBalance,
  usePreviewPurchase,
  useTokenPrice,
} from "@/lib/presale/services/reads";
import { estimateTokensForQuote, estimateRate } from "@/lib/presale/math";
import { saveTxEntry, CHAIN_EXPLORERS } from "@/lib/blockchain/txHistory";

type TxStage =
  | "idle"
  | "preparing"
  | "awaiting_wallet"
  | "submitting"
  | "awaiting_confirmation"
  | "complete"
  | "failed";

const TX_LABEL: Record<TxStage, string> = {
  idle: "",
  preparing: "Preparing",
  awaiting_wallet: "Waiting for Wallet",
  submitting: "Broadcasting",
  awaiting_confirmation: "Confirming on BNB Chain",
  complete: "Investment Complete",
  failed: "",
};

const CHAIN_LABELS: Record<number, string> = {
  [CHAIN_IDS.bsc]: "BNB Smart Chain",
  [CHAIN_IDS.bscTestnet]: "BNB Smart Chain Testnet",
  [CHAIN_IDS.polygon]: "Polygon",
};

function toRawAmount(amount: string, decimals: number): bigint {
  const parts = amount.split(".");
  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + frac) * 10n ** BigInt(Math.max(0, decimals - frac.length));
}

function getUSDTAddress(chainId: number): `0x${string}` | null {
  const tokens = getPaymentTokens(chainId);
  if (!tokens) return null;
  const usdt = tokens.find((t) => t.symbol === "USDT");
  return usdt?.address ?? null;
}

function TrustItem({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/20">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="institutional-label text-[0.48rem] text-white/35">{label}</span>
    </span>
  );
}

/**
 * AnimatedNumber — smooth, spring-free value transition.
 * Tweens a MotionValue with a luxury ease and mirrors it into text.
 * No flashing, no scaling — only a subtle numerical drift.
 */
function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const formatRef = useRef(format);
  formatRef.current = format;
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    const unsub = mv.on("change", (v) => setDisplay(formatRef.current(v)));
    return () => unsub();
  }, [mv]);

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.55, ease: EASE_LUX });
    return () => controls.stop();
  }, [value, mv]);

  return <span className={className}>{display}</span>;
}

export default function PresalePurchasePanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { data: nativeBal } = useBalance({ address });
  const usdtAddress = getUSDTAddress(chainId);
  const { data: usdtBal } = useReadContract({
    address: usdtAddress ?? undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!usdtAddress && !!address },
  });

  const {
    data: writeResult,
    writeContract,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isTxLoading,
    isSuccess: isTxSuccess,
    isError: isTxError,
  } = useWaitForTransactionReceipt({ hash: writeResult });

  const presaleContract = getPresaleContract(chainId);
  const tokens = getPaymentTokens(chainId);
  const isDefaultChain = chainId === DEFAULT_CHAIN_ID;

  // Live token price (display-only read used for the Receive estimate).
  const { data: livePrice } = useTokenPrice(DEFAULT_CHAIN_ID);

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string | null>(
    tokens.length > 0 ? tokens[0].symbol : null
  );
  const selectedToken = tokens.find((t) => t.symbol === selectedTokenSymbol) ?? tokens[0] ?? null;
  const [amount, setAmount] = useState("");

  const [intentNonce, setIntentNonce] = useState(0);

  // Tracks whether the current tx flow is approve or buy
  const [pendingAction, setPendingAction] = useState<"approve" | "buy" | null>(null);

  // Purchase modal state
  const [showModal, setShowModal] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const selectedDecimals = selectedToken?.decimals ?? 18;
  const rawAmount = toRawAmount(amount || "0", selectedDecimals);

  const { data: allowance } = useTokenAllowance(
    chainId,
    selectedToken?.address ?? null,
    address,
    presaleContract
  );

  const { data: tokenBal } = useTokenBalance(
    chainId,
    selectedToken?.address ?? null,
    address
  );

  const isNative = selectedToken?.address === null;
  const previewQty = numericAmount > 0 ? rawAmount : 0n;
  const { data: previewData } = usePreviewPurchase(chainId, previewQty > 0n ? previewQty : undefined, isNative);

  const needsApproval =
    selectedToken?.address &&
    allowance !== undefined &&
    rawAmount > (allowance as bigint);

  const txStage: TxStage = (() => {
    if (!intentNonce) return "idle";
    if (isTxSuccess) return "complete";
    if (isTxError) return "failed";
    if (writeError) return "failed";
    if (isTxLoading) return "awaiting_confirmation";
    if (writeResult && !isTxLoading) return "submitting";
    if (isWritePending) return "awaiting_wallet";
    return "preparing";
  })();

  const friendlyError: string | null = (() => {
    if (txStage !== "failed" || !writeError) return null;
    const msg = writeError.message?.toLowerCase() || "";
    if (msg.includes("user rejected") || msg.includes("denied") || msg.includes("cancelled"))
      return "Wallet connection rejected";
    return "Transaction failed. Please try again.";
  })();

  const active = intentNonce !== 0 && txStage !== "idle" && txStage !== "complete" && txStage !== "failed";

  // Save tx to history when complete
  useEffect(() => {
    if (txStage === "complete" && writeResult && pendingAction === "buy") {
      saveTxEntry({
        hash: writeResult,
        type: "buy",
        amount,
        timestamp: Date.now(),
        status: "complete",
        network: chainId,
      });
    }
  }, [txStage, writeResult, pendingAction, amount, chainId]);

  // Auto-buy after approve completes
  const prevStageRef = useRef<TxStage>("idle");
  const [needsAutoBuy, setNeedsAutoBuy] = useState(false);

  useEffect(() => {
    const prev = prevStageRef.current;
    prevStageRef.current = txStage;

    if (pendingAction === "approve" && prev === "awaiting_confirmation" && txStage === "complete") {
      // Approve just completed — trigger buy
      setNeedsAutoBuy(true);
    }

    if (pendingAction === "approve" && txStage === "failed") {
      // Approve failed — reset
      setPendingAction(null);
      setNeedsAutoBuy(false);
    }
  }, [txStage, pendingAction]);

  // Fire the actual buy when needsAutoBuy is set
  useEffect(() => {
    if (needsAutoBuy && pendingAction === "approve") {
      setNeedsAutoBuy(false);
      setPendingAction("buy");
      if (presaleContract) {
        setIntentNonce((n) => n + 1);
        if (!selectedToken?.address) {
          const tx = {
            address: presaleContract,
            abi: PRESALE_ABI,
            functionName: "buyWithNative" as const,
            value: rawAmount,
            chainId,
            account: address,
          };

          writeContract(tx);
        } else {
          const tx = {
            address: presaleContract,
            abi: PRESALE_ABI,
            functionName: "buyWithToken" as const,
            args: [selectedToken.address, rawAmount] as const,
            chainId,
            account: address,
          };

          writeContract(tx);
        }
      }
    }
  }, [needsAutoBuy, pendingAction, presaleContract, selectedToken, rawAmount, writeContract]);

  // Scroll lock when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showModal]);

  // Reset tx state after timeout
  useEffect(() => {
    if (txStage === "complete" || txStage === "failed") {
      const t = setTimeout(() => {
        setIntentNonce(0);
        if (txStage === "complete" && pendingAction === "buy") {
          // Keep modal on success until user dismisses
        }
        if (txStage === "failed") {
          setPendingAction(null);
        }
      }, txStage === "complete" ? 500 : 5000);
      return () => clearTimeout(t);
    }
  }, [txStage, pendingAction]);

  const formattedNative =
    nativeBal && nativeBal.value > 0n
      ? `${Number(formatUnits(nativeBal.value, nativeBal.decimals)).toFixed(4)} ${nativeBal.symbol}`
      : "—";

  const formattedUSDT =
    usdtBal !== undefined
      ? `${Number(formatUnits(usdtBal as bigint, 18)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
      : "—";

  const handleApprove = () => {
    if (!selectedToken?.address || !presaleContract) return;
    setPendingAction("approve");
    setIntentNonce((n) => n + 1);
    const tx = {
      address: selectedToken.address,
      abi: ERC20_ABI,
      functionName: "approve" as const,
      args: [presaleContract, rawAmount] as const,
      chainId,
      account: address,
    };

    writeContract(tx);
  };

  const handleBuy = () => {
    if (!presaleContract) return;
    setPendingAction("buy");
    setIntentNonce((n) => n + 1);
    if (!selectedToken?.address) {
      const tx = {
        address: presaleContract,
        abi: PRESALE_ABI,
        functionName: "buyWithNative" as const,
        value: rawAmount,
        chainId,
        account: address,
      };

      writeContract(tx);
    } else {
      const tx = {
        address: presaleContract,
        abi: PRESALE_ABI,
        functionName: "buyWithToken" as const,
        args: [selectedToken.address, rawAmount] as const,
        chainId,
        account: address,
      };

      writeContract(tx);
    }
  };

  const handleBuyClick = () => {
    if (needsApproval) {
      handleApprove();
    } else {
      setShowModal(true);
    }
  };

  const handleConfirmPurchase = () => {
    setShowModal(false);
    handleBuy();
  };

  const handleCloseModal = useCallback(() => {
    if (txStage === "complete" || txStage === "failed" || txStage === "idle") {
      setShowModal(false);
      if (txStage === "complete" || txStage === "failed") {
        setIntentNonce(0);
        setPendingAction(null);
      }
    }
  }, [txStage]);

  // On-chain preview singleton — drives summary, rate, and modal
  const previewToken = previewData?.[1] as bigint | undefined;

  const estimatedTokens =
    previewToken !== undefined
      ? Number(formatUnits(previewToken, 18))
      : numericAmount > 0
        ? estimateTokensForQuote(numericAmount)
        : 0;

  const rate =
    previewToken !== undefined && previewQty > 0n
      ? Number(formatUnits(previewToken, 18)) / Number(formatUnits(previewQty, selectedDecimals))
      : estimateRate();

  // ── Receive estimate (display-only) ──
  const priceNum = livePrice !== undefined ? Number(formatUnits(livePrice as bigint, 18)) : 0;

  // Estimated USD value of the tokens you will receive, at the current price.
  const estimatedValueNum = estimatedTokens * priceNum;

  const explorer = CHAIN_EXPLORERS[chainId] || CHAIN_EXPLORERS[DEFAULT_CHAIN_ID] || "https://bscscan.com";

  return (
    <Section id="purchase" height="auto" center={false} className="py-10 lg:py-12">
      <Container>
        <div className="mx-auto w-full max-w-[1280px]">
          <Reveal>
            <div className="console-glass rounded-[24px] overflow-hidden">
              {/* ── DISCONNECTED: CONNECT CONSOLE ─────────────────────── */}
              {!isConnected && (
                <div className="grid place-items-center px-6 py-16 sm:py-20 lg:py-24">
                  <div className="max-w-md text-center">
                    <h3 className="font-display text-2xl font-light text-white/90 sm:text-3xl">
                      Connect to Invest
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/45">
                      Secure wallet connection to begin your allocation in premium tokenized real estate.
                    </p>
                    <div className="mt-8 flex justify-center">
                      <ConnectButton.Custom>
                        {({ openConnectModal }) => (
                          <MagneticButton onClick={openConnectModal} variant="primary">
                            Connect Wallet
                          </MagneticButton>
                        )}
                      </ConnectButton.Custom>
                    </div>
                  </div>
                </div>
              )}

              {/* ── WRONG NETWORK: SWITCH PANEL ──────────────────────── */}
              {isConnected && !isDefaultChain && (
                <div className="grid gap-6 px-6 py-10 sm:py-12 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:px-10">
                  <ConnectButton.Custom>
                    {({ account, chain }) => (
                      <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="institutional-label text-[0.52rem]">Wallet</span>
                          <span className="flex items-center gap-1.5">
                            <motion.span
                              className="h-1.5 w-1.5 rounded-full bg-success"
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2.4, repeat: Infinity, ease: EASE_LUX }}
                            />
                            <span className="institutional-label text-[0.5rem] text-success/70">Connected</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="institutional-label text-[0.46rem]">Address</div>
                            <div className="mt-1 font-mono text-xs text-white/70 truncate">
                              {account?.address
                                ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                                : address
                                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                                  : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="institutional-label text-[0.46rem]">Network</div>
                            <div className="mt-1 font-mono text-xs text-white/70 truncate">
                              {chain?.name ?? CHAIN_LABELS[chainId] ?? `Chain ${chainId}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </ConnectButton.Custom>

                  <div className="flex flex-col gap-2 rounded-[16px] border border-warning/20 bg-warning/5 px-5 py-5">
                    <span className="institutional-label text-[0.5rem] text-warning/80">Wrong Network</span>
                    <p className="text-sm text-warning/80">
                      Switch to BNB Smart Chain to participate in the {SALE_META.tokenSymbol} presale.
                    </p>
                    <button
                      type="button"
                      onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}
                      className="self-start rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs text-accent transition-colors hover:bg-accent/20"
                    >
                      Switch Network
                    </button>
                  </div>
                </div>
              )}

              {/* ── INVESTMENT CONSOLE (connected on default chain) ───── */}
              {isConnected && isDefaultChain && (
                <div className="grid grid-cols-1 gap-y-8 gap-x-8 px-5 py-6 sm:px-7 lg:grid-cols-2 lg:px-8 xl:grid-cols-[0.95fr_0.95fr_1.35fr_1.45fr_1.1fr] xl:gap-0 xl:px-0 xl:py-8 xl:divide-x xl:divide-white/[0.06]">

                  {/* ═══ Wallet ═══ */}
                  <ConnectButton.Custom>
                    {({ account, chain }) => (
                      <div className="flex flex-col gap-3 xl:px-7 xl:py-2">
                        <span className="institutional-label text-[0.5rem]">Wallet</span>
                        <div className="flex items-center gap-1.5">
                          <motion.span
                            className="h-1.5 w-1.5 rounded-full bg-success"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: EASE_LUX }}
                          />
                          <span className="institutional-label text-[0.5rem] text-success/70">Connected</span>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
                          <div>
                            <dt className="institutional-label text-[0.46rem]">Address</dt>
                            <dd                         className="mt-0.5 font-mono text-white/85 truncate">
                              {account?.address
                                ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                                : address
                                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                                  : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="institutional-label text-[0.46rem]">Network</dt>
                            <dd                         className="mt-0.5 font-mono text-white/85 truncate">
                              {chainId === DEFAULT_CHAIN_ID
                                ? "BSC Testnet"
                                : chain?.name ?? CHAIN_LABELS[chainId] ?? `Chain ${chainId}`}
                            </dd>
                          </div>
                          <div>
                            <dt className="institutional-label text-[0.46rem]">{selectedToken?.address ? "Token" : "Native"}</dt>
                            <dd                         className="mt-0.5 font-mono text-white/85 truncate">
                              {selectedToken?.address ? formattedUSDT : formattedNative}
                            </dd>
                          </div>
                          <div>
                            <dt className="institutional-label text-[0.46rem]">Balance</dt>
                            <dd                         className="mt-0.5 font-mono text-white/85 truncate">
                              {formattedNative}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </ConnectButton.Custom>

                  {/* ═══ Payment ═══ */}
                  <div className="flex flex-col gap-3 xl:px-7 xl:py-2">
                    <span className="institutional-label text-[0.5rem]">Payment</span>
                    <div
                      role="radiogroup"
                      aria-label="Payment method"
                      className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-1.5"
                    >
                      {tokens.map((t) => {
                        const sel = selectedToken?.symbol === t.symbol;
                        return (
                          <button
                            key={t.symbol}
                            onClick={() => setSelectedTokenSymbol(t.symbol)}
                            role="radio"
                            aria-checked={sel}
                            className={`lux-chip relative flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 ${
                              sel
                                ? "border border-accent/30 bg-accent/[0.08] text-accent shadow-[0_0_20px_rgba(71,194,255,0.12)] ring-1 ring-accent/20"
                                : "border border-transparent text-white/55"
                            }`}
                          >
                            {t.address ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
                                <path d="M7 10h10M7 14h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                              </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                              </svg>
                            )}
                            <span className="font-medium tracking-wide">{t.symbol}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ═══ Investment ═══ */}
                  <div className="flex flex-col gap-3.5 xl:px-7 xl:py-2">
                    <label className="institutional-label text-[0.5rem]" htmlFor="invest-amount">
                      Investment
                    </label>
                    <div className="relative rounded-[18px] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-[280ms] ease-lux focus-within:border-accent/40 focus-within:bg-accent/[0.03] focus-within:shadow-[0_0_22px_-8px_rgba(71,194,255,0.30)]">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-accent/70">
                          {selectedToken?.address ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
                              <path d="M7 10h10M7 14h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="font-mono text-xs text-white/45">{selectedToken?.symbol || "BNB"}</span>
                      </div>
                      <input
                        id="invest-amount"
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={active}
                        aria-label={`Amount in ${selectedToken?.symbol || "BNB"}`}
                        className="w-full bg-transparent pt-2.5 text-3xl font-light tracking-tight tabular-nums text-white/90 outline-none placeholder:text-white/20 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-0 disabled:opacity-40 sm:text-4xl"
                      />
                    </div>
                    {tokenBal !== undefined && !active && (
                      <div className="grid grid-cols-4 gap-1.5">
                        {[25, 50, 75].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => {
                              const bal = formatUnits(tokenBal as bigint, selectedDecimals);
                              setAmount((parseFloat(bal) * pct / 100).toFixed(selectedDecimals <= 6 ? 2 : 4));
                            }}
                            className="lux-chip rounded-xl border border-white/[0.08] bg-white/[0.02] py-2 font-mono text-[0.6rem] uppercase tracking-wider text-white/55 transition-all active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                          >
                            {pct}%
                          </button>
                        ))}
                        <button
                          onClick={() => setAmount(formatUnits(tokenBal as bigint, selectedDecimals))}
                          className="lux-chip rounded-xl border border-white/[0.08] bg-white/[0.02] py-2 font-mono text-[0.6rem] uppercase tracking-wider text-white/55 transition-all active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                        >
                          MAX
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ═══ Receive ═══ — largest typography on the page */}
                  <div className="flex flex-col gap-3 xl:px-7 xl:py-2">
                    <span className="institutional-label text-[0.5rem]">You Receive</span>
                    <div className="font-display text-4xl font-light leading-[1.05] tracking-tight tabular-nums text-accent xl:text-[2.9rem]">
                      <AnimatedNumber
                        value={estimatedTokens}
                        format={(n) => n.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      />
                      <span className="ml-2 font-mono text-base uppercase tracking-wider text-white/45 xl:text-lg">
                        {SALE_META.tokenSymbol}
                      </span>
                    </div>
                    <div className="mt-0.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="institutional-label text-[0.46rem]">Estimated Value</span>
                        <AnimatedNumber
                          value={estimatedValueNum}
                          format={(n) => (n > 0 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—")}
                          className="institutional-figure font-mono text-xs text-white/80"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="institutional-label text-[0.46rem]">Current Price</span>
                        <span className="institutional-figure font-mono text-xs text-white/80">
                          {priceNum > 0 ? `$${priceNum.toFixed(4)}` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="institutional-label text-[0.46rem]">Rate</span>
                        <span className="institutional-figure font-mono text-xs text-white/55">
                          1 {selectedToken?.symbol || "BNB"} = {rate.toFixed(2)} {SALE_META.tokenSymbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ═══ Action ═══ */}
                  <div className="flex flex-col gap-3 xl:px-7 xl:py-2">
                    <span className="institutional-label text-[0.5rem]">Action</span>
                    {!showModal && pendingAction !== "approve" && pendingAction !== "buy" ? (
                      needsApproval ? (
                        <MagneticButton
                          onClick={handleApprove}
                          variant="primary"
                          className="lux-action w-full tracking-wide"
                          disabled={numericAmount <= 0 || active}
                        >
                          {active ? TX_LABEL[txStage] || "Processing..." : `Approve ${selectedToken?.symbol}`}
                        </MagneticButton>
                      ) : (
                        <MagneticButton
                          onClick={handleBuyClick}
                          variant="gold"
                          className="lux-action w-full tracking-wide"
                          disabled={numericAmount <= 0 || !presaleContract || active}
                        >
                          {active ? TX_LABEL[txStage] || "Processing..." : `Buy ${SALE_META.tokenSymbol}`}
                        </MagneticButton>
                      )
                    ) : null}

                    {(pendingAction === "approve" || pendingAction === "buy") && active && (
                      <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
                        <motion.span
                          className="h-2 w-2 rounded-full bg-accent"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: EASE_LUX }}
                        />
                        <span className="font-display text-sm font-light text-white/70">
                          {pendingAction === "approve" ? "Approving..." : TX_LABEL[txStage]}
                        </span>
                      </div>
                    )}

                    <p className="mt-1 max-w-[16rem] text-[0.7rem] leading-relaxed tracking-wide text-white/35">
                      Settlement is on-chain and instantaneous upon confirmation on BNB Smart Chain.
                    </p>
                  </div>
                </div>
              )}

              {/* ── BOTTOM: single trust row ──────────────────────────── */}
              <div className="border-t border-white/[0.06]">
                <ul className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-center gap-x-7 gap-y-2 px-5 py-4 sm:gap-x-9 sm:px-7 xl:px-9">
                  <li className="flex items-center gap-1.5"><TrustItem label="Instant Delivery" /></li>
                  <li className="flex items-center gap-1.5"><TrustItem label="Secure Wallet" /></li>
                  <li className="flex items-center gap-1.5"><TrustItem label="Audited Contract" /></li>
                  <li className="flex items-center gap-1.5"><TrustItem label="On-chain Settlement" /></li>
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>

      {/* ── Purchase Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[9999] grid place-items-center bg-black/90 backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_LUX }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="relative w-full max-w-lg mx-4 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0E0F13] shadow-2xl"
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ duration: 0.25, ease: EASE_LUX }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0E0F13] px-6 py-4">
                <h3 className="font-display text-lg font-light text-white/90">
                  {txStage === "complete"
                    ? "Investment Complete"
                    : txStage === "failed"
                      ? "Transaction Failed"
                      : "Confirm Purchase"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-6 space-y-6">
                {/* Processing screen */}
                {(active || txStage === "preparing" || txStage === "awaiting_wallet" || txStage === "submitting" || txStage === "awaiting_confirmation") && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <motion.div
                      className="mb-6 h-14 w-14 rounded-full border-2 border-accent/30"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="flex h-full items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    </motion.div>
                    <h4 className="font-display text-xl font-light text-white/80">
                      {TX_LABEL[txStage]}
                    </h4>
                    <p className="mt-2 max-w-xs text-sm text-white/40">
                      {txStage === "awaiting_wallet" && "Please confirm the transaction in your wallet."}
                      {txStage === "submitting" && "Broadcasting your transaction to the network."}
                      {txStage === "awaiting_confirmation" && "Waiting for blockchain confirmation."}
                      {txStage === "preparing" && "Preparing your transaction."}
                    </p>
                  </div>
                )}

                {/* Success screen */}
                {txStage === "complete" && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-success">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h4 className="font-display text-xl font-light text-white/90">
                      Purchase Successful
                    </h4>
                    <p className="mt-2 text-sm text-white/50">
                      You received{" "}
                      <span className="text-accent">
                        {estimatedTokens.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </span>{" "}
                      {SALE_META.tokenSymbol}
                    </p>
                    {writeResult && (
                      <a
                        href={`${explorer}/tx/${writeResult}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs text-white/50 transition-colors hover:text-accent"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M7 17l10-10M17 7v10M17 7H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        View on Explorer
                      </a>
                    )}
                  </div>
                )}

                {/* Failed screen */}
                {txStage === "failed" && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-warning/20">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-warning">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                        <path d="M12 8v4M12 16h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <h4 className="font-display text-xl font-light text-white/80">
                      Transaction Failed
                    </h4>
                    <p className="mt-2 text-sm text-white/40">
                      {friendlyError || "Something went wrong. Please try again."}
                    </p>
                  </div>
                )}

                {/* Idle summary */}
                {txStage === "idle" && (
                  <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="institutional-label text-[0.5rem]">You Pay</span>
                        <span className="font-display text-lg text-white/90">
                          {numericAmount.toLocaleString("en-US", { maximumFractionDigits: 4 })} {selectedToken?.symbol || "BNB"}
                        </span>
                      </div>
                      <div className="h-px bg-white/[0.05]" />
                      <div className="flex items-center justify-between">
                        <span className="institutional-label text-[0.5rem]">You Receive</span>
                        <span className="font-display text-lg text-accent">
                          {estimatedTokens.toLocaleString("en-US", { maximumFractionDigits: 2 })} {SALE_META.tokenSymbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="institutional-label text-[0.5rem]">Rate</span>
                        <span className="font-mono text-xs text-white/45">
                          1 {selectedToken?.symbol || "BNB"} = {rate.toFixed(2)} {SALE_META.tokenSymbol}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky footer */}
              <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-white/[0.06] bg-[#0E0F13] px-6 py-4">
                {(txStage === "idle" || txStage === "complete" || txStage === "failed") && (
                  <>
                    {txStage === "idle" && (
                      <button
                        onClick={handleCloseModal}
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
                      >
                        Cancel
                      </button>
                    )}
                    <MagneticButton
                      onClick={txStage === "idle" ? handleConfirmPurchase : handleCloseModal}
                      variant="primary"
                      className="px-6"
                    >
                      {txStage === "idle" ? "Confirm Purchase" : "Done"}
                    </MagneticButton>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}