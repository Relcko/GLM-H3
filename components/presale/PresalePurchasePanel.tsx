"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
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
  type PaymentToken,
} from "@/lib/presale/config";
import { PRESALE_ABI, ERC20_ABI } from "@/lib/presale/abi";
import {
  useTokenAllowance,
  useTokenBalance,
  usePreviewPurchase,
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

const glassCardClass =
  "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8";

function getUSDTAddress(chainId: number): `0x${string}` | null {
  const tokens = getPaymentTokens(chainId);
  if (!tokens) return null;
  const usdt = tokens.find((t) => t.symbol === "USDT");
  return usdt?.address ?? null;
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
          writeContract({
            address: presaleContract,
            abi: PRESALE_ABI,
            functionName: "buyWithNative",
            value: rawAmount,
          });
        } else {
          writeContract({
            address: presaleContract,
            abi: PRESALE_ABI,
            functionName: "buyWithToken",
            args: [selectedToken.address, rawAmount],
          });
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
    writeContract({
      address: selectedToken.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [presaleContract, rawAmount],
    });
  };

  const handleBuy = () => {
    if (!presaleContract) return;
    setPendingAction("buy");
    setIntentNonce((n) => n + 1);
    if (!selectedToken?.address) {
      writeContract({
        address: presaleContract,
        abi: PRESALE_ABI,
        functionName: "buyWithNative",
        value: rawAmount,
      });
    } else {
      writeContract({
        address: presaleContract,
        abi: PRESALE_ABI,
        functionName: "buyWithToken",
        args: [selectedToken.address, rawAmount],
      });
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

  const explorer = CHAIN_EXPLORERS[chainId] || CHAIN_EXPLORERS[DEFAULT_CHAIN_ID] || "https://bscscan.com";

  return (
    <Section id="purchase" height="auto" center={false} className="py-16">
      <Container>
        <Reveal>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-accent/50" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.45em] text-accent/70">
              Purchase
            </span>
          </div>
        </Reveal>

        <div className="mx-auto max-w-2xl">
          <Reveal>
            <div className={glassCardClass}>
              {/* Wallet section */}
              {!isConnected && (
                <div className="mb-6 border-b border-white/[0.06] pb-6">
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <div>
                        <h4 className="font-display text-base font-light text-white/80">
                          Wallet
                        </h4>
                        <p className="mt-1 text-xs text-white/40">
                          Connect to start investing
                        </p>
                        <MagneticButton
                          onClick={openConnectModal}
                          variant="primary"
                          className="mt-4 w-full"
                        >
                          Connect Wallet
                        </MagneticButton>
                      </div>
                    )}
                  </ConnectButton.Custom>
                </div>
              )}

              {isConnected && (
                <div className="mb-6 border-b border-white/[0.06] pb-6">
                  <ConnectButton.Custom>
                    {({ account, chain }) => (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-display text-base font-light text-white/80">
                            Wallet
                          </h4>
                          <span className="flex items-center gap-1.5">
                            <motion.span
                              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <span className="text-xs text-white/50">Connected</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-stretch">
                          <div className="rounded-xl bg-white/[0.03] px-3 py-2.5 flex flex-col">
                            <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/30">
                              Address
                            </div>
                            <div className="mt-0.5 font-mono text-xs text-white/70 truncate whitespace-nowrap">
                              {account?.address
                                ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                                : address
                                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                                  : "—"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/[0.03] px-3 py-2.5 flex flex-col">
                            <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/30">
                              Network
                            </div>
                            <div className="mt-0.5 font-mono text-xs text-white/70 truncate whitespace-nowrap">
                              {chainId === DEFAULT_CHAIN_ID
                                ? "BNB Smart Chain Testnet"
                                : chain?.name ?? CHAIN_LABELS[chainId] ?? `Chain ${chainId}`}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/[0.03] px-3 py-2.5 flex flex-col">
                            <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/30">
                              Native
                            </div>
                            <div className="mt-0.5 font-mono text-xs text-white/70 truncate whitespace-nowrap">
                              {formattedNative}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/[0.03] px-3 py-2.5 flex flex-col">
                            <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/30">
                              USDT
                            </div>
                            <div className="mt-0.5 font-mono text-xs text-white/70 truncate whitespace-nowrap">
                              {formattedUSDT}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </ConnectButton.Custom>
                </div>
              )}

              {/* Network switch */}
              {isConnected && !isDefaultChain && (
                <div className="mb-6 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
                  <p className="text-xs text-warning/80">
                    Wrong network — switch to BNB Smart Chain to participate.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}
                    className="mt-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/20"
                  >
                    Switch Network
                  </button>
                </div>
              )}

              {/* Buy form */}
              {isConnected && isDefaultChain && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/40">
                      Payment Token
                    </label>
                    <div className="flex gap-2">
                      {tokens.map((t) => (
                        <button
                          key={t.symbol}
                          onClick={() => setSelectedTokenSymbol(t.symbol)}
                          aria-pressed={selectedToken?.symbol === t.symbol}
                          className={`rounded-lg border px-4 py-2 text-sm transition-all duration-300 ${
                            selectedToken?.symbol === t.symbol
                              ? "border-accent/50 bg-accent/10 text-accent"
                              : "border-white/[0.08] text-white/60 hover:border-white/20 hover:text-white/80"
                          }`}
                        >
                          {t.symbol}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tokenBal !== undefined && !active && (
                    <div className="flex gap-1.5">
                      {[25, 50, 75].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => {
                            const bal = formatUnits(tokenBal as bigint, selectedDecimals);
                            setAmount((parseFloat(bal) * pct / 100).toFixed(selectedDecimals <= 6 ? 2 : 4));
                          }}
                          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-[0.55rem] uppercase tracking-wider text-white/40 transition-colors hover:border-accent/30 hover:text-accent"
                        >
                          {pct}%
                        </button>
                      ))}
                      <button
                        onClick={() => setAmount(formatUnits(tokenBal as bigint, selectedDecimals))}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-[0.55rem] uppercase tracking-wider text-white/40 transition-colors hover:border-accent/30 hover:text-accent"
                      >
                        MAX
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/40">
                      Amount ({selectedToken?.symbol || "BNB"})
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={active}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-lg text-white/90 outline-none transition-all duration-300 placeholder:text-white/20 focus:border-accent/40 focus:bg-accent/[0.02] disabled:opacity-40"
                      />

                    </div>
                  </div>

                  {/* Purchase summary */}
                  {numericAmount > 0 && txStage === "idle" && (
                    <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/40">You receive</span>
                        <span className="font-display text-lg text-accent">
                          ≈{" "}
                          {estimatedTokens.toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          {SALE_META.tokenSymbol}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-white/25">Rate</span>
                        <span className="text-white/40">
                          1 {selectedToken?.symbol || "BNB"} ={" "}
                          {rate.toFixed(2)} {SALE_META.tokenSymbol}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {!showModal && pendingAction !== "approve" && pendingAction !== "buy" ? (
                      needsApproval ? (
                        <MagneticButton
                          onClick={handleApprove}
                          variant="primary"
                          className="flex-1"
                          disabled={numericAmount <= 0 || active}
                        >
                          {active ? TX_LABEL[txStage] || "Processing..." : `Approve ${selectedToken?.symbol}`}
                        </MagneticButton>
                      ) : (
                        <MagneticButton
                          onClick={handleBuyClick}
                          variant="primary"
                          className="flex-1"
                          disabled={numericAmount <= 0 || !presaleContract || active}
                        >
                          {active ? TX_LABEL[txStage] || "Processing..." : `Buy ${SALE_META.tokenSymbol}`}
                        </MagneticButton>
                      )
                    ) : null}

                    {(pendingAction === "approve" || pendingAction === "buy") && active && (
                      <div className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
                        <motion.span
                          className="h-2 w-2 rounded-full bg-accent"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className="text-sm text-white/70 font-light">
                          {pendingAction === "approve" ? "Approving..." : TX_LABEL[txStage]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
            transition={{ duration: 0.3, ease: EASE_LUX }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="relative w-full max-w-2xl mx-4 rounded-2xl border border-white/[0.08] bg-[#0c0c0e] shadow-2xl"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.4, ease: EASE_LUX }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-white/[0.06] bg-[#0c0c0e] px-6 py-4">
                <h3 className="font-display text-lg font-light text-white/90">
                  {txStage === "complete"
                    ? "Investment Complete"
                    : txStage === "failed"
                      ? "Transaction Failed"
                      : "Confirm Purchase"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
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
                        className="mt-5 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs text-white/50 transition-colors hover:text-accent"
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
                  <>
                    <div className="rounded-xl bg-white/[0.03] px-5 py-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/40">You pay</span>
                        <span className="font-display text-lg text-white/90">
                          {numericAmount.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
                          {selectedToken?.symbol || "BNB"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-white/40">You receive</span>
                        <span className="font-display text-lg text-accent">
                          ≈{" "}
                          {estimatedTokens.toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          {SALE_META.tokenSymbol}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-white/25">Rate</span>
                        <span className="text-white/40">
                          1 {selectedToken?.symbol || "BNB"} ={" "}
                          {rate.toFixed(2)} {SALE_META.tokenSymbol}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sticky footer */}
              <div className="sticky bottom-0 flex items-center justify-end gap-3 rounded-b-2xl border-t border-white/[0.06] bg-[#0c0c0e] px-6 py-4">
                {(txStage === "idle" || txStage === "complete" || txStage === "failed") && (
                  <>
                    {txStage === "idle" && (
                      <button
                        onClick={handleCloseModal}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
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
