"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { EASE_LUX } from "@/lib/motion";
import { getChainName } from "@/lib/blockchain/chains";
import { shortenAddress } from "@/lib/blockchain/format";

export default function InvestorPortalScreen({
  onDone,
  children,
}: {
  onDone: () => void;
  children: React.ReactNode;
}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const prefersReduced = useReducedMotion();

  const [phase, setPhase] = useState<"portal" | "exiting" | "done">("portal");
  const [connectionType, setConnectionType] = useState<"idle" | "welcome" | "authenticating">("idle");
  const [userClicked, setUserClicked] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // Reduced motion: skip portal entirely
  useEffect(() => {
    if (prefersReduced) {
      if (exitTimer.current) clearTimeout(exitTimer.current);
      const t = setTimeout(() => {
        onDoneRef.current();
        setPhase("done");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [prefersReduced]);

  // Detect wallet state and decide flow
  useEffect(() => {
    if (phase !== "portal") return;
    if (!isConnected || !address) return;
    if (exitTimer.current) return;

    const isNewConnection = userClicked;
    const delay = isNewConnection ? 600 : 200;

    setConnectionType(isNewConnection ? "authenticating" : "welcome");

    exitTimer.current = setTimeout(() => {
      setPhase("exiting");
      onDoneRef.current();
      setTimeout(() => setPhase("done"), 700);
    }, delay);

    return () => {
      if (exitTimer.current) {
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
    };
  }, [phase, isConnected, address, userClicked]);

  if (phase === "done") return children;

  const networkName = chainId ? getChainName(chainId) : "";

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0E0F13]"
        initial={{ opacity: 1, scale: 1, y: 0 }}
        animate={
          phase === "exiting"
            ? { opacity: 0, scale: 0.85, y: -24 }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={{ duration: 0.7, ease: EASE_LUX }}
      >
        <div className="flex flex-col items-center gap-10 px-6 text-center">
          <Image
            src="/relcko-logo.png"
            alt="Relcko"
            width={140}
            height={42}
            priority
            className="opacity-90"
          />

          <h1 className="font-display text-4xl font-light tracking-[0.3em] text-white/85 sm:text-5xl">
            RELCKO
          </h1>

          <p className="-mt-6 text-xs font-light tracking-[0.2em] text-white/40 uppercase">
            Investor Portal
          </p>

          <p className="max-w-xs text-sm leading-relaxed text-white/40">
            Access your private investment dashboard.
          </p>

          {connectionType === "authenticating" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-emerald-400/90">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7l3.5 3.5L12 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm">Wallet Connected</span>
              </div>
              <span className="font-mono text-xs text-white/50">
                {shortenAddress(address ?? "")}
              </span>
              {networkName && (
                <span className="text-xs text-white/35">{networkName}</span>
              )}
              <span className="mt-1 text-xs text-white/25">Authenticating...</span>
            </div>
          ) : connectionType === "welcome" ? (
            <div className="text-sm font-light tracking-wide text-white/60">
              Welcome Back
            </div>
          ) : (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={() => {
                    setUserClicked(true);
                    openConnectModal();
                  }}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-10 py-3.5 text-sm tracking-wider text-white/65 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/85"
                >
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
          )}
        </div>
      </motion.div>

      {children}
    </>
  );
}
