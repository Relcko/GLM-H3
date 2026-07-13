import { http } from "wagmi";
import { bsc, bscTestnet, polygon } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";

const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const BSC_RPC = process.env.NEXT_PUBLIC_BSC_RPC || "https://bsc-dataseed.binance.org/";
const POLYGON_RPC =
  process.env.NEXT_PUBLIC_POLYGON_RPC || "https://polygon-bor.publicnode.com";

const COINBASE_ENABLED =
  process.env.NEXT_PUBLIC_COINBASE_WALLET_ENABLED === "true" ||
  Boolean(WC_PROJECT_ID);

const wallets = [
  metaMaskWallet,
  ...(WC_PROJECT_ID ? [walletConnectWallet] : []),
  ...(COINBASE_ENABLED ? [coinbaseWallet] : []),
];

export const wagmiConfig = getDefaultConfig({
  appName: "Relcko",
  projectId: WC_PROJECT_ID,
  chains: [bscTestnet, bsc, polygon],
  wallets: [
    {
      groupName: "Wallets",
      wallets,
    },
  ],
  transports: {
    [bsc.id]: http(BSC_RPC),
    [bscTestnet.id]: http(),
    [polygon.id]: http(POLYGON_RPC),
  },
  ssr: true,
  multiInjectedProviderDiscovery: false,
});
