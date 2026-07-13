"use client";

import { useEffect, useRef } from "react";
import { useAccount, useChainId } from "wagmi";
import { trackEvent, trackWallet } from "@/lib/analytics";

export default function AnalyticsTracker() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const prevChainId = useRef(chainId);
  const prevConnected = useRef(false);
  const prevAddress = useRef(address);

  useEffect(() => {
    if (isConnected && address) {
      trackWallet(address);
      if (!prevConnected.current) {
        trackEvent({ type: "wallet_connected", chainId });
      } else if (prevChainId.current !== chainId) {
        trackEvent({ type: "network_switched", chainId });
      }
    }
    if (prevConnected.current && !isConnected) {
      trackEvent({ type: "wallet_disconnected" });
    }
    prevChainId.current = chainId;
    prevConnected.current = isConnected;
    prevAddress.current = address;
  }, [isConnected, address, chainId]);

  return null;
}
