"use client";

export interface TxEntry {
  hash: string;
  type: string;
  amount: string;
  timestamp: number;
  status: "complete" | "pending" | "failed";
  network: number;
}

const STORAGE_KEY = "rlko_recent_txs";
const MAX_ENTRIES = 20;

export function saveTxEntry(entry: TxEntry): void {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const txs: TxEntry[] = stored ? JSON.parse(stored) : [];
    if (!txs.some((tx) => tx.hash === entry.hash)) {
      txs.unshift(entry);
      if (txs.length > MAX_ENTRIES) txs.length = MAX_ENTRIES;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
    }
  } catch {}
}

export function getTxHistory(): TxEntry[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const txs: TxEntry[] = stored ? JSON.parse(stored) : [];
    const seen = new Set<string>();
    const deduped = txs.filter((tx) => {
      if (seen.has(tx.hash)) return false;
      seen.add(tx.hash);
      return true;
    });
    if (deduped.length < txs.length) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
    }
    return deduped;
  } catch {
    return [];
  }
}

export const CHAIN_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  56: "https://bscscan.com",
  97: "https://testnet.bscscan.com",
  137: "https://polygonscan.com",
};
