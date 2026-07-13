"use client";

import { useEffect, useRef } from "react";
import { useBlockNumber } from "wagmi";
import { BETA_NETWORK } from "@/lib/beta";
import { trackEvent } from "@/lib/analytics";

export default function NetworkStatus() {
  const { data: blockNumber, isError, isLoading } = useBlockNumber({
    chainId: BETA_NETWORK.chainId,
    query: { refetchInterval: 12_000 },
  });

  const prevError = useRef(false);

  useEffect(() => {
    if (isError && !prevError.current) {
      trackEvent({ type: "rpc_error", chainId: BETA_NETWORK.chainId });
    }
    prevError.current = isError;
  }, [isError]);

  const status = isError ? "error" : isLoading ? "loading" : "operational";

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white/[0.03] px-3 py-3 transition-all duration-300 hover:bg-white/[0.05]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[0.5rem] uppercase tracking-[0.15em] text-white/30">
            {BETA_NETWORK.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full shadow-[0_0_6px_rgba(60,227,125,0.5)] ${
                status === "operational"
                  ? "bg-success status-dot"
                  : status === "error"
                    ? "bg-warning"
                    : "bg-white/30"
              }`}
            />
            <span
              className={`font-mono text-xs ${
                status === "operational"
                  ? "text-success/90"
                  : status === "error"
                    ? "text-warning/80"
                    : "text-white/40"
              }`}
            >
              {status === "operational"
                ? `Block #${Number(blockNumber).toLocaleString()}`
                : status === "error"
                  ? "RPC error"
                  : "Checking..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
