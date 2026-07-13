/**
 * Chain Configuration Audit
 *
 * Calls getBalance on BSC Mainnet and BSC Testnet using the EXACT same
 * RPC endpoints as the wagmi config, then prints raw wei side by side.
 *
 * Usage:  node scripts/chain-audit.mjs
 * Env:    DEBUG_ADDRESS=0x...  (defaults to the address below)
 */

import { createPublicClient, http, getAddress } from "viem";
import { bsc, bscTestnet } from "wagmi/chains";

// ── Config (verbatim from lib/blockchain/client.ts) ──────────────────────
const BSC_MAINNET_RPC = "https://bsc-dataseed.binance.org/";
const BSC_TESTNET_RPC = bscTestnet.rpcUrls.default.http[0]; // chain's default
const POLYGON_RPC = "https://polygon-bor.publicnode.com";

const ADDRESS = getAddress(process.env.DEBUG_ADDRESS || "0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d");

// ── Helpers ──────────────────────────────────────────────────────────────
function fmtWei(n) {
  const s = n.toString();
  return s.padStart(22) + " wei  (" + (Number(s) / 1e18).toFixed(6) + " native)";
}

// ── Public clients ───────────────────────────────────────────────────────
const clients = {
  "BSC Mainnet (56)": createPublicClient({ chain: bsc, transport: http(BSC_MAINNET_RPC) }),
  "BSC Testnet (97)": createPublicClient({ chain: bscTestnet, transport: http(BSC_TESTNET_RPC) }),
  "BSC Mainnet — thirdweb (56)": createPublicClient({ chain: bsc, transport: http(bsc.rpcUrls.default.http[0]) }),
  "BSC Testnet — publicnode (97)": createPublicClient({ chain: bscTestnet, transport: http("https://bsc-testnet-rpc.publicnode.com") }),
};

// ── Print header ─────────────────────────────────────────────────────────
console.log("=".repeat(72));
console.log("CHAUDIT — Chain & RPC Audit");
console.log("=".repeat(72));
console.log(`\nTarget address: ${ADDRESS}\n`);

console.log("── wagmi config (lib/blockchain/client.ts) ──────────────────────");
console.log(`  chains:        [bsc(id=${bsc.id}), bscTestnet(id=${bscTestnet.id}), polygon(id=137)]`);
console.log(`  DEFAULT_CHAIN_ID (chains.ts): 56 (BSC Mainnet)`);
console.log(`  BSC_RPC (mainnet):             ${BSC_MAINNET_RPC}`);
console.log(`  BSC Testnet transport:         http() → ${BSC_TESTNET_RPC}`);
console.log(`  Polygon transport:             ${POLYGON_RPC}`);
console.log(`  NEXT_PUBLIC_BSC_RPC env:       ${process.env.NEXT_PUBLIC_BSC_RPC || "(not set)"}`);
console.log(`  NEXT_PUBLIC_POLYGON_RPC env:   ${process.env.NEXT_PUBLIC_POLYGON_RPC || "(not set)"}`);
console.log(`  WalletConnect Project ID:      ${process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? "(set)" : "(not set)"}`);

console.log(`\n── Chain definitions (wagmi/chains) ────────────────────────────`);
console.log(`  BSC Mainnet:`);
console.log(`    id:              ${bsc.id}`);
console.log(`    name:            ${bsc.name}`);
console.log(`    nativeCurrency:  ${JSON.stringify(bsc.nativeCurrency)}`);
console.log(`    rpcUrls.default: ${JSON.stringify(bsc.rpcUrls.default.http)}`);
console.log(`  BSC Testnet:`);
console.log(`    id:              ${bscTestnet.id}`);
console.log(`    name:            ${bscTestnet.name}`);
console.log(`    nativeCurrency:  ${JSON.stringify(bscTestnet.nativeCurrency)}`);
console.log(`    rpcUrls.default: ${JSON.stringify(bscTestnet.rpcUrls.default.http)}`);

console.log(`\n── wagmi useBalance() query key ────────────────────────────────`);
console.log(`  ['balance', { address, chainId }]`);
console.log(`  With chainId=56  → fetches from BSC Mainnet transport`);
console.log(`  With chainId=97  → fetches from BSC Testnet transport`);

// ── Fetch balances ───────────────────────────────────────────────────────
console.log(`\n── Calling getBalance() — ${ADDRESS} ────────────────────────\n`);

const results = [];

for (const [label, client] of Object.entries(clients)) {
  const chainName = label.match(/\((.*?)\)/)?.[1] ?? "??";
  try {
    const balance = await client.getBalance({ address: ADDRESS });
    results.push({ label, chainName, balance, ok: true });
    console.log(`  ✓ ${label}`);
    console.log(`    ${fmtWei(balance)}`);
  } catch (err) {
    results.push({ label, chainName, balance: 0n, ok: false });
    console.log(`  ✗ ${label} — ERROR: ${err.message?.slice(0, 100)}`);
  }
}

// ── Summary ──────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(72));
console.log("SUMMARY");
console.log("=".repeat(72));

for (const r of results) {
  const status = r.ok ? "OK" : "ERR";
  console.log(`  [${status}] ${r.label}`);
  if (r.ok) console.log(`         ${fmtWei(r.balance)}`);
}

// ── Comparison ───────────────────────────────────────────────────────────
const mainnetResult = results.find((r) => r.label.startsWith("BSC Mainnet (56)"));
const testnetResult = results.find((r) => r.label.startsWith("BSC Testnet (97)"));

console.log("\n── Which chain is 0.0020 BNB? ──────────────────────────────────");
if (mainnetResult?.ok) {
  const mainnetBnb = Number(mainnetResult.balance) / 1e18;
  console.log(`  BSC Mainnet:     ${mainnetBnb.toFixed(6)} BNB`);
  console.log(`  Difference from 0.0020: ${Math.abs(mainnetBnb - 0.002).toFixed(6)}`);
}
if (testnetResult?.ok) {
  const testnetBnb = Number(testnetResult.balance) / 1e18;
  console.log(`  BSC Testnet:     ${testnetBnb.toFixed(6)} tBNB`);
  console.log(`  Difference from 0.0020: ${Math.abs(testnetBnb - 0.002).toFixed(6)}`);
}

console.log("\n── MetaMask comparison ──────────────────────────────────────────");
console.log(`  MetaMask shows:  ~0.302 BNB`);
if (mainnetResult?.ok) {
  const mm = 0.302;
  const actual = Number(mainnetResult.balance) / 1e18;
  console.log(`  BSC Mainnet RPC: ${actual.toFixed(6)} BNB`);
  console.log(`  Match:           ${Math.abs(actual - mm) < 0.001 ? "YES ✓" : "NO — differs by " + Math.abs(actual - mm).toFixed(6)}`);
}
if (testnetResult?.ok) {
  const actual = Number(testnetResult.balance) / 1e18;
  console.log(`  BSC Testnet RPC: ${actual.toFixed(6)} tBNB`);
  console.log(`  Matches 0.0020?  ${Math.abs(actual - 0.002) < 0.0001 ? "YES ✓ (the dashboard value matches testnet)" : "NO"}`);
}

console.log("\nDone.");
