"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BETA_VERSION, BSC_TESTNET_FAUCETS, EXPLORER_URL, BETA_NETWORK } from "@/lib/beta";

const BANNER_HIDDEN_KEY = "relcko_banner_hidden";

export default function TestnetBanner() {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(BANNER_HIDDEN_KEY) === "true";
  });

  function dismiss() {
    setHidden(true);
    try { localStorage.setItem(BANNER_HIDDEN_KEY, "true"); } catch { /* ignore */ }
  }

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={false}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="relative border-b border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 via-yellow-500/10 to-yellow-500/5">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-10">
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-yellow-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(255,200,87,0.5)]" />
                  {BETA_NETWORK.name}
                  <span className="ml-1 text-yellow-500/50">v{BETA_VERSION}</span>
                </span>
                <span className="text-xs text-yellow-300/70">
                  Testnet mode — tokens have no real value.
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden gap-2 sm:flex">
                  {BSC_TESTNET_FAUCETS.map((f) => (
                    <a
                      key={f.name}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/50 transition-all hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white/80"
                    >
                      {f.name}
                    </a>
                  ))}
                  <a
                    href={EXPLORER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/50 transition-all hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white/80"
                  >
                    Explorer
                  </a>
                </div>
                <button
                  onClick={dismiss}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[10px] text-white/40 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white/70"
                  aria-label="Dismiss banner"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
