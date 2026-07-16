"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import type { WalletContextValue, WalletState } from "@/lib/shared/types";

interface WalletContextType extends WalletContextValue {
  disconnect: () => void;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const walletState: WalletState = (() => {
    if (!isConnected && status === "disconnected") return "disconnected";
    if (status === "connecting") return "connecting";
    if (isConnected) return "connected";
    return "disconnected";
  })();

  return (
    <WalletContext.Provider
      value={{
        state: walletState,
        address: address ?? null,
        chainId: chainId ?? null,
        isCorrectChain: true,
        disconnect: wagmiDisconnect,
        isConnected,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
