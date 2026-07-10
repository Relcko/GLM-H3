"use client";

import { useState, useEffect } from "react";
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
} from "@/lib/presale/services/reads";
import { estimateTokensForQuote, estimateRate } from "@/lib/presale/math";

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
  [CHAIN_IDS.ethereum]: "Ethereum",
  [CHAIN_IDS.bsc]: "BNB Smart Chain",
  [CHAIN_IDS.bscTestnet]: "BSC Testnet",
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
  const isBSC = chainId === CHAIN_IDS.bsc;

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string | null>(
    tokens.length > 0 ? tokens[0].symbol : null
  );
  const selectedToken = tokens.find((t) => t.symbol === selectedTokenSymbol) ?? tokens[0] ?? null;
  const [amount, setAmount] = useState("");

  const [intentNonce, setIntentNonce] = useState(0);

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

  useEffect(() => {
    if (txStage === "complete" || txStage === "failed") {
      const t = setTimeout(() => setIntentNonce(0), txStage === "complete" ? 4000 : 5000);
      return () => clearTimeout(t);
    }
  }, [txStage]);

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

  const numericAmount = parseFloat(amount) || 0;
  const selectedDecimals = selectedToken?.decimals ?? 18;
  const rawAmount = toRawAmount(amount || "0", selectedDecimals);

  const needsApproval =
    selectedToken?.address &&
    allowance !== undefined &&
    rawAmount > (allowance as bigint);

  const active = intentNonce !== 0 && txStage !== "idle" && txStage !== "complete" && txStage !== "failed";

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

  const rate = estimateRate();
  const estimatedTokens =
    numericAmount > 0 ? estimateTokensForQuote(numericAmount) : 0;

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
              <div className="mb-6 border-b border-white/[0.06] pb-6">
                <ConnectButton.Custom>
                  {({ openConnectModal, account, chain, mounted }) => {
                    const ready = mounted;
                    const connected = ready && isConnected;

                    if (!connected) {
                      return (
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
                      );
                    }

                    return (
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
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                            <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/30">
                              Address
                            </div>
                            <div className="mt-0.5 font-mono text-xs text-white/70">
                              {account?.address
                                ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                                : address
                                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                                  : "—"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                            <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/30">
                              Network
                            </div>
                            <div className="mt-0.5 font-mono text-xs text-white/70">
                              {chain?.name ?? CHAIN_LABELS[chainId] ?? `Chain ${chainId}`}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                            <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/30">
                              Native
                            </div>
                            <div className="mt-0.5 font-mono text-xs text-white/70">
                              {formattedNative}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                            <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/30">
                              USDT
                            </div>
                            <div className="mt-0.5 font-mono text-xs text-white/70">
                              {formattedUSDT}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>

              {/* Network switch */}
              {isConnected && !isBSC && (
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
              {isConnected && isBSC && (
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
                      {tokenBal !== undefined && !active && (
                        <button
                          onClick={() =>
                            setAmount(
                              Number(
                                formatUnits(tokenBal as bigint, selectedDecimals)
                              ).toString()
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/[0.06] px-2 py-1 font-mono text-[0.55rem] uppercase tracking-wider text-accent/70 transition-colors hover:text-accent"
                        >
                          Max
                        </button>
                      )}
                    </div>
                  </div>

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

                  <AnimatePresence mode="wait">
                    {active && (
                      <motion.div
                        key="tx-stage"
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        transition={{ duration: 0.4, ease: EASE_LUX }}
                        className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3"
                      >
                        <motion.span
                          className="h-2 w-2 rounded-full bg-accent"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className="text-sm text-white/70 font-light">
                          {TX_LABEL[txStage]}
                        </span>
                      </motion.div>
                    )}

                    {friendlyError && (
                      <motion.div
                        key="tx-error"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE_LUX }}
                        className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning/90"
                      >
                        {friendlyError}
                      </motion.div>
                    )}

                    {txStage === "complete" && (
                      <motion.div
                        key="tx-complete"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: EASE_LUX }}
                        className="flex items-center gap-3 rounded-xl bg-success/10 px-4 py-3 text-sm text-success"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
                          <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Investment Complete</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3">
                    {needsApproval && txStage === "idle" ? (
                      <MagneticButton
                        onClick={handleApprove}
                        variant="primary"
                        className="flex-1"
                      >
                        Approve {selectedToken?.symbol}
                      </MagneticButton>
                    ) : (
                      <MagneticButton
                        onClick={handleBuy}
                        variant="primary"
                        className="flex-1"
                        disabled={numericAmount <= 0 || !presaleContract || active}
                      >
                        {active ? TX_LABEL[txStage] || "Processing..." : `Buy ${SALE_META.tokenSymbol}`}
                      </MagneticButton>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
