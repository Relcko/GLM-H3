"use client";

import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/blockchain/client";
import { relckoTheme } from "@/lib/relckoTheme";
import { QueryProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { SessionProvider } from "./SessionProvider";
import { WalletProvider } from "./WalletProvider";
import { PermissionProvider } from "./PermissionProvider";
import { NotificationProvider } from "./NotificationProvider";
import { ToastProvider } from "@/components/shared/notifications/Toast";
import { DEV_USER } from "@/lib/investor/dev-user";

export function AppProviders({
  children,
  defaultTheme = "dark",
}: {
  children: ReactNode;
  defaultTheme?: "light" | "dark";
}) {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={true}>
      <QueryProvider>
        <RainbowKitProvider theme={relckoTheme()}>
          <ThemeProvider defaultTheme={defaultTheme}>
            <SessionProvider defaultUser={process.env.NODE_ENV === "development" ? DEV_USER : undefined}>
              <WalletProvider>
                <PermissionProvider>
                  <NotificationProvider>
                    <ToastProvider>
                      {children}
                    </ToastProvider>
                  </NotificationProvider>
                </PermissionProvider>
              </WalletProvider>
            </SessionProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}
