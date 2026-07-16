import { Role } from "@relcko/types";
import type { UserProfile } from "@/lib/shared/types";

export const DEV_USER = {
  id: "dev-user-1",
  email: "dev@relcko.com",
  displayName: "Dev Investor",
  roles: [Role.Investor],
  accountStatus: "active" as UserProfile["accountStatus"],
  kycState: "approved" as const,
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  verified: true,
};

export const DEV_WALLET_STATE = {
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  chainId: 97,
  isConnected: true,
};

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}
