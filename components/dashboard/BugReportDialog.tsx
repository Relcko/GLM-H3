"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useChainId } from "wagmi";
import { EASE_LUX } from "@/lib/motion";
import { BETA_VERSION, BETA_CONTRACT_ADDRESSES } from "@/lib/beta";

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Other";
}

function detectWallet(): string {
  if (typeof window === "undefined" || !window.ethereum) return "None detected";
  if (window.ethereum.isMetaMask) return "MetaMask";
  if (window.ethereum.isCoinbaseWallet) return "Coinbase Wallet";
  if (window.ethereum.isOKXWallet) return "OKX Wallet";
  return "Unknown (injected)";
}

export default function BugReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [description, setDescription] = useState("");
  const [txHash, setTxHash] = useState("");
  const [includeConsole, setIncludeConsole] = useState(false);
  const [consoleLog, setConsoleLog] = useState("");

  useEffect(() => {
    if (includeConsole && typeof window !== "undefined") {
      const logs: string[] = [];
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      const capture = (fn: (...args: unknown[]) => void, prefix: string) => (...args: unknown[]) => {
        logs.push(`[${prefix}] ${args.map(String).join(" ")}`);
        fn(...args);
      };
      console.log = capture(originalLog, "LOG");
      console.warn = capture(originalWarn, "WARN");
      console.error = capture(originalError, "ERROR");
      return () => {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        setConsoleLog(logs.slice(-50).join("\n"));
      };
    }
  }, [includeConsole]);

  function generateMarkdown(): string {
    const lines = [
      "---",
      `**Version:** v${BETA_VERSION}`,
      `**Date:** ${new Date().toISOString()}`,
      `**Browser:** ${detectBrowser()}`,
      `**Wallet:** ${detectWallet()}`,
      `**Chain ID:** ${chainId}`,
      `**Wallet Address:** ${address ?? "Not connected"}`,
      `**PaymentManager:** ${BETA_CONTRACT_ADDRESSES.paymentManager}`,
      "",
      "### Description",
      description || "(not provided)",
    ];

    if (txHash) {
      lines.push("", "### Transaction", txHash);
    }

    if (consoleLog) {
      lines.push("", "### Console Log", "```", consoleLog, "```");
    }

    return lines.join("\n");
  }

  function copyReport() {
    const report = generateMarkdown();
    navigator.clipboard.writeText(report).catch(() => {});
  }

  function submitReport() {
    const report = generateMarkdown();
    const encoded = encodeURIComponent(report);
    window.open(`https://github.com/anomalyco/relcko/issues/new?body=${encoded}`, "_blank");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_LUX }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ scale: 0.96, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 20, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_LUX }}
            className="fixed left-1/2 top-1/2 z-[201] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.08] bg-bg-base/95 p-6 shadow-2xl backdrop-blur-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Bug Report"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="dashboard-accent-line" />
                  <span className="dashboard-label">Bug Report</span>
                </div>
                <h2 className="mt-1 font-display text-lg font-light text-white/90">
                  Report an issue
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/40 transition-all hover:border-white/[0.15] hover:text-white/70"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="dashboard-label mb-1.5 block text-xs">
                  What happened?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue you encountered..."
                  rows={3}
                  className="dashboard-input w-full resize-none rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="dashboard-label mb-1.5 block text-xs">
                  Transaction hash (optional)
                </label>
                <input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  className="dashboard-input w-full rounded-xl px-3 py-2.5 font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="include-console"
                  type="checkbox"
                  checked={includeConsole}
                  onChange={(e) => setIncludeConsole(e.target.checked)}
                  className="h-4 w-4 rounded border-white/[0.08] bg-white/[0.03] text-accent"
                />
                <label htmlFor="include-console" className="text-xs text-white/60">
                  Include console log (last 50 entries)
                </label>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 font-mono text-[10px] leading-relaxed text-white/40">
                <div>Browser: {detectBrowser()}</div>
                <div>Wallet: {detectWallet()}</div>
                <div>Chain: {chainId}</div>
                <div>Address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}</div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-white/50 transition-all hover:bg-white/[0.04] hover:text-white/70"
              >
                Cancel
              </button>
              <button
                onClick={copyReport}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-white/70 transition-all hover:bg-white/[0.08]"
              >
                Copy
              </button>
              <button
                onClick={submitReport}
                className="dashboard-btn-primary rounded-xl px-4 py-2 text-xs"
              >
                Submit
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] text-white/25">
              Opens a GitHub issue with a pre-filled markdown report.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
