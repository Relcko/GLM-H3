import type { Address, TxHash } from "@relcko/types";
import type { ChainConfig, TransactionReceipt } from "../types";
import { BlockchainError, RpcError, ChainNotSupportedError } from "../errors";
import { getChainConfig, isChainSupported } from "./chains";

export interface BlockchainAdapter {
  getChainConfig(chainId: number): ChainConfig;
  getBalance(address: Address, chainId: number): Promise<bigint>;
  getTokenBalance(address: Address, tokenAddress: Address, chainId: number): Promise<bigint>;
  getTransactionReceipt(txHash: TxHash, chainId: number): Promise<TransactionReceipt>;
  getTransactionConfirmations(txHash: TxHash, chainId: number): Promise<number>;
  getBlockNumber(chainId: number): Promise<number>;
  isTransactionConfirmed(txHash: TxHash, chainId: number): Promise<boolean>;
  waitForConfirmation(txHash: TxHash, chainId: number, timeoutMs: number): Promise<TransactionReceipt>;
  estimateGas(from: Address, to: Address, amount: bigint, chainId: number, tokenAddress?: Address): Promise<bigint>;
}

export class ViemBlockchainAdapter implements BlockchainAdapter {
  getChainConfig(chainId: number): ChainConfig {
    const config = getChainConfig(chainId);
    if (!config) throw new ChainNotSupportedError(chainId);
    return config;
  }

  async getBalance(address: Address, chainId: number): Promise<bigint> {
    this.ensureSupported(chainId);
    return 0n;
  }

  async getTokenBalance(address: Address, tokenAddress: Address, chainId: number): Promise<bigint> {
    this.ensureSupported(chainId);
    return 0n;
  }

  async getTransactionReceipt(txHash: TxHash, chainId: number): Promise<TransactionReceipt> {
    this.ensureSupported(chainId);
    return {
      txHash,
      blockNumber: 0,
      confirmations: 0,
      gasUsed: 0n,
      gasPrice: 0n,
      status: "success",
      logs: [],
    };
  }

  async getTransactionConfirmations(txHash: TxHash, chainId: number): Promise<number> {
    this.ensureSupported(chainId);
    return 0;
  }

  async getBlockNumber(chainId: number): Promise<number> {
    this.ensureSupported(chainId);
    return 0;
  }

  async isTransactionConfirmed(txHash: TxHash, chainId: number): Promise<boolean> {
    this.ensureSupported(chainId);
    return false;
  }

  async waitForConfirmation(txHash: TxHash, chainId: number, timeoutMs: number): Promise<TransactionReceipt> {
    this.ensureSupported(chainId);
    return {
      txHash,
      blockNumber: 0,
      confirmations: 0,
      gasUsed: 0n,
      gasPrice: 0n,
      status: "success",
      logs: [],
    };
  }

  async estimateGas(from: Address, to: Address, amount: bigint, chainId: number, tokenAddress?: Address): Promise<bigint> {
    this.ensureSupported(chainId);
    return 21000n;
  }

  private ensureSupported(chainId: number): void {
    if (!isChainSupported(chainId)) throw new ChainNotSupportedError(chainId);
  }
}
