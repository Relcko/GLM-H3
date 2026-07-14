"use client";

import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import { SALE_META, DEFAULT_CHAIN_ID } from "@/lib/presale/config";
import { useTotalRaised } from "@/lib/presale/services/reads";
import { compact } from "@/lib/blockchain/format";

interface Activity {
  id: number;
  type: "purchase" | "stake" | "claim";
  amount: string;
  timestamp: number;
}

const NAMES = [
  "0x7f3E...b2A1", "0x9aB8...cF47", "0xE2d5...1e89",
  "0x4C1a...fB63", "0xB8e7...3D90", "0xF629...A75b",
  "0x3D1f...E8c4", "0x6A9b...2F17", "0xC4e8...5d2B",
];

const AMOUNTS = [
  "0.5", "1.2", "2.5", "0.8", "3.0", "1.5", "0.3", "5.0", "0.75", "10.0",
  "0.25", "4.0", "1.0", "2.0", "0.6", "7.5", "0.4", "1.8",
];

const InvestorActivity = memo(function InvestorActivity() {
  const { data: raised } = useTotalRaised(DEFAULT_CHAIN_ID);
  const raisedDisplay = raised !== undefined ? Number(raised) / 1e18 : 0;

  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const initial: Activity[] = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() - i * 60000,
      type: (["purchase", "stake", "claim"] as const)[Math.floor(Math.random() * 3)],
      amount: AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)],
      timestamp: Date.now() - i * 120000 - Math.random() * 60000,
    }));
    setActivities(initial);

    const interval = setInterval(() => {
      setActivities((prev) => {
        const newActivity: Activity = {
          id: Date.now(),
          type: (["purchase", "stake", "claim"] as const)[Math.floor(Math.random() * 3)],
          amount: AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)],
          timestamp: Date.now(),
        };
        return [newActivity, ...prev].slice(0, 12);
      });
    }, 8000 + Math.random() * 12000);

    return () => clearInterval(interval);
  }, []);

  const typeLabel = (t: Activity["type"]) => {
    switch (t) {
      case "purchase": return "Purchased";
      case "stake": return "Staked";
      case "claim": return "Claimed";
    }
  };

  const typeColor = (t: Activity["type"]) => {
    switch (t) {
      case "purchase": return "text-accent border-accent/20 bg-accent/10";
      case "stake": return "text-gold border-gold/20 bg-gold/10";
      case "claim": return "text-success border-success/20 bg-success/10";
    }
  };

  const timeAgo = (ts: number) => {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    return `${hr}h`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE_LUX }}
      className="dashboard-glass overflow-hidden"
    >
      <div className="px-6 py-5 sm:px-7 sm:py-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="dashboard-accent-line" />
              <span className="dashboard-label">Investor Activity</span>
            </div>
            <p className="mt-1 text-sm text-white/40">
              {raisedDisplay > 0 ? `${compact(raisedDisplay)} USDT raised` : "Real-time investment feed"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-accent"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: EASE_LUX }}
            />
            <span className="font-mono text-[0.5rem] uppercase tracking-wider text-accent">Live</span>
          </span>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 -top-1 h-8 bg-gradient-to-b from-bg-base to-transparent z-10" />
          <div className="dashboard-scroll space-y-2 max-h-[360px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {activities.map((act, i) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto", marginBottom: 8 }}
                  exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.45, ease: EASE_LUX }}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 transition-all duration-[280ms] ease-lux hover:bg-white/[0.05]"
                  role="listitem"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${typeColor(act.type)}`}>
                    {act.type === "purchase" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : act.type === "stake" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12 8v8M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 2v20M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-white/55">{NAMES[i % NAMES.length]}</span>
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider ${typeColor(act.type)}`}>
                        {typeLabel(act.type)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-white/35">
                      {act.amount} {SALE_META.tokenSymbol}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[0.5rem] text-white/25 tabular-nums">
                    {timeAgo(act.timestamp)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="pointer-events-none absolute inset-x-0 -bottom-1 h-8 bg-gradient-to-t from-bg-base to-transparent" />
        </div>
      </div>
    </motion.div>
  );
});

export default InvestorActivity;

