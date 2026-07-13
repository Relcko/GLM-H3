"use client";

const STORAGE_KEY = "relcko_analytics_v1";
const MAX_EVENTS = 10000;

export interface AnalyticsEvent {
  type:
    | "wallet_connected"
    | "wallet_disconnected"
    | "purchase_success"
    | "purchase_failed"
    | "stake_success"
    | "stake_failed"
    | "claim_success"
    | "claim_failed"
    | "withdraw_success"
    | "withdraw_failed"
    | "network_switched"
    | "rpc_error";
  timestamp: number;
  chainId?: number;
  txHash?: `0x${string}`;
  amount?: string;
  error?: string;
}

interface AnalyticsStore {
  events: AnalyticsEvent[];
  uniqueWallets: string[];
}

function load(): AnalyticsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { events: [], uniqueWallets: [] };
}

function save(store: AnalyticsStore) {
  try {
    if (store.events.length > MAX_EVENTS) {
      store.events = store.events.slice(-MAX_EVENTS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* storage full — reset */ }
}

export function trackEvent(event: Omit<AnalyticsEvent, "timestamp">) {
  const store = load();
  store.events.push({ ...event, timestamp: Date.now() });
  save(store);
}

export function trackWallet(wallet: `0x${string}`) {
  const store = load();
  if (!store.uniqueWallets.includes(wallet.toLowerCase())) {
    store.uniqueWallets.push(wallet.toLowerCase());
    save(store);
  }
}

export function getAnalytics(): AnalyticsStore {
  return load();
}

export function getMetrics() {
  const store = load();
  const events = store.events;

  const totalInvestors = store.uniqueWallets.length;
  const totalPurchases = events.filter((e) => e.type === "purchase_success").length;
  const failedPurchases = events.filter((e) => e.type === "purchase_failed").length;
  const totalVolume = events
    .filter((e) => e.type === "purchase_success" && e.amount)
    .reduce((sum, e) => sum + BigInt(e.amount!), 0n);
  const totalStakes = events.filter((e) => e.type === "stake_success").length;
  const totalClaims = events.filter((e) => e.type === "claim_success").length;
  const totalWithdrawals = events.filter((e) => e.type === "withdraw_success").length;
  const totalFailed = events.filter((e) => e.type.endsWith("_failed")).length;
  const networkSwitches = events.filter((e) => e.type === "network_switched").length;
  const rpcErrors = events.filter((e) => e.type === "rpc_error").length;

  const stakeFailed = events.filter((e) => e.type === "stake_failed").length;
  const claimFailed = events.filter((e) => e.type === "claim_failed").length;

  return {
    totalInvestors,
    totalPurchases,
    failedPurchases,
    totalVolume,
    totalStakes,
    totalClaims,
    totalWithdrawals,
    totalFailed,
    stakeFailed,
    claimFailed,
    networkSwitches,
    rpcErrors,
    totalEvents: events.length,
  };
}

export function clearAnalytics() {
  localStorage.removeItem(STORAGE_KEY);
}
