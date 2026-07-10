"use client";

import { type ReactNode, useState, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/blockchain/client";
import { relckoTheme } from "@/lib/relckoTheme";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 },
    },
  });
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const theme = useMemo(() => relckoTheme(), []);
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
