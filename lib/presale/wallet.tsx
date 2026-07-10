"use client";

import { DEFAULT_CHAIN_ID } from "./config";

export {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContracts,
} from "wagmi";

export { DEFAULT_CHAIN_ID };
