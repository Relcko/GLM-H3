#!/usr/bin/env node
/**
 * Relcko — BNB Testnet one-shot deploy orchestrator.
 *
 * 1. Loads .env (canonical variable names).
 * 2. Pre-flight checks (RPC, chain ID, balance, pending nonces).
 * 3. Runs `forge script script/DeployAll.s.sol` with EXPLICIT gas price.
 * 4. Waits for ALL on-chain confirmations.
 * 5. On success, runs tools/update-testnet-env.mjs to sync config files.
 *
 * Cross-platform (Windows/macOS/Linux). No shell variable-expansion assumptions.
 *
 * Usage:  node tools/deploy-testnet.mjs   (or: npm run deploy:testnet)
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(ROOT, ".env");

function fail(msg) {
  console.error(`\x1b[31m[deploy-testnet] ERROR: ${msg}\x1b[0m`);
  process.exit(1);
}

function info(label, val) {
  console.log(`  \x1b[36m${label}:\x1b[0m ${val}`);
}

// ── Parse .env ────────────────────────────────────────────────────────────────
if (!existsSync(ENV_FILE)) fail(".env not found. See TESTNET_ENVIRONMENT.md.");
const env = {};
for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m) continue;
  env[m[1]] = m[2].replace(/\s+#.*$/, "").trim();
}

const rpc = env.BSC_TESTNET_RPC;
const pk = env.DEPLOYER_PRIVATE_KEY;

if (!rpc) fail("BSC_TESTNET_RPC is empty in .env");
if (!pk) fail("DEPLOYER_PRIVATE_KEY is empty in .env — set it before deploying.");
const pkNormalized = pk.startsWith("0x") ? pk : `0x${pk}`;
if (!/^0x[0-9a-fA-F]{64}$/.test(pkNormalized)) fail("DEPLOYER_PRIVATE_KEY is not a valid 32-byte hex key.");
if (!env.TREASURY) {
  console.warn("\x1b[33m[deploy-testnet] TREASURY is empty — ownership stays with the deployer.\x1b[0m");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PRE-FLIGHT CHECKS
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n\x1b[1m=== PRE-FLIGHT CHECKS ===\x1b[0m");

import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";

let client;
try {
  client = createPublicClient({ chain: bscTestnet, transport: http(rpc) });
  const block = await client.getBlockNumber();
  info("RPC", rpc);
  info("Current block", block.toString());
} catch (e) {
  fail(`RPC unavailable: ${e.message}`);
}

// Derive deployer address from private key
let deployer;
try {
  const { privateKeyToAccount } = await import("viem/accounts");
  deployer = privateKeyToAccount(pkNormalized).address;
} catch (e) {
  fail(`Cannot derive deployer address: ${e.message}`);
}

// Chain ID check
const chainId = await client.getChainId();
info("Chain ID", chainId.toString());
if (Number(chainId) !== 97) fail(`Expected chain 97 (BSC Testnet), got ${chainId}`);

// Balance check
const balance = await client.getBalance({ address: deployer });
const balEth = Number(balance) / 1e18;
info("Deployer", deployer);
info("Balance", `${balEth.toFixed(6)} tBNB`);

const MIN_BALANCE = 0.01; // tBNB
if (balEth < MIN_BALANCE) {
  fail(`Insufficient balance: ${balEth.toFixed(6)} tBNB (min ${MIN_BALANCE} tBNB). Fund from faucet: https://testnet.bnbchain.org/faucet-smart`);
}

// Nonce / pending txn check
const confirmedNonce = await client.getTransactionCount({ address: deployer, blockTag: "latest" });
const pendingNonce = await client.getTransactionCount({ address: deployer, blockTag: "pending" });
const stuckCount = Number(pendingNonce) - Number(confirmedNonce);
info("Confirmed nonce", confirmedNonce.toString());
info("Pending nonce", pendingNonce.toString());

if (stuckCount > 0) {
  console.error(`\x1b[31m[deploy-testnet] WARNING: ${stuckCount} pending transaction(s) detected!\x1b[0m`);
  console.error(`  Nonces ${Number(confirmedNonce)}–${Number(pendingNonce) - 1} are occupied.`);
  console.error(`  Cancel them first by sending 0-value replacement txs with higher gas price.`);
  console.error(`  Example: cast send --rpc-url ${rpc} --private-key <pk> --nonce <N> --gas-price 2000000000 ${deployer} --value 0`);
  fail("Please clear pending nonces before deploying.");
}

// Gas price (use RPC suggestion, enforce minimum)
let baseFee, priorityFee;
try {
  const gasPrice = await client.request({ method: "eth_gasPrice", params: [] });
  baseFee = BigInt(gasPrice);
  try {
    const maxPriority = await client.request({ method: "eth_maxPriorityFeePerGas", params: [] });
    priorityFee = BigInt(maxPriority);
  } catch {
    priorityFee = baseFee > 0n ? baseFee / 2n : 1_000_000_000n;
  }
} catch {
  baseFee = 1_000_000_000n; // fallback 1 gwei
  priorityFee = 100_000_000n; // fallback 0.1 gwei
}

const MIN_FEE = 1_000_000_000n; // 1 gwei minimum
const MIN_PRIORITY = 100_000_000n; // 0.1 gwei minimum

const useGasPrice = baseFee > MIN_FEE ? baseFee : MIN_FEE;
const usePriorityFee = priorityFee > MIN_PRIORITY ? priorityFee : MIN_PRIORITY;
const gwei = (v) => (Number(v) / 1e9).toFixed(2);

info("RPC base fee", `${gwei(baseFee)} gwei`);
info("RPC priority fee", `${gwei(priorityFee)} gwei`);
info("Using gas price", `${gwei(useGasPrice)} gwei`);
info("Using priority fee", `${gwei(usePriorityFee)} gwei`);

// Check if deployments/testnet.json exists and warn if it has been manually edited
const ARTIFACT_FILE = join(ROOT, "deployments", "testnet.json");
if (existsSync(ARTIFACT_FILE)) {
  const artifactRaw = readFileSync(ARTIFACT_FILE, "utf8");
  try {
    const artifact = JSON.parse(artifactRaw);
    info("Existing artifact", `${artifact.paymentManager || "(empty)"}`);
    console.warn("\x1b[33m  Deployment will OVERWRITE this file after on-chain confirmation.\x1b[0m");
  } catch {
    // invalid JSON, will be overwritten
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIRM
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n\x1b[33mProceed with deployment? (Ctrl+C to abort, Enter to continue)\x1b[0m");
await new Promise((resolve) => {
  process.stdin.once("data", () => resolve());
});

// ═══════════════════════════════════════════════════════════════════════════════
//  RUN DEPLOYALL WITH EXPLICIT GAS PRICE
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n\x1b[1m=== DEPLOYING ===\x1b[0m");
console.log(`  RPC: ${rpc}`);

const forgeEnv = { ...process.env, ...env, DEPLOYER_PRIVATE_KEY: pkNormalized };
const forgeArgs = [
  "script",
  "script/DeployAll.s.sol",
  "--rpc-url", rpc,
  "--private-key", pkNormalized,
  "--broadcast",
  "--with-gas-price", useGasPrice.toString(),
  "--priority-gas-price", usePriorityFee.toString(),
  "--gas-estimate-multiplier", "150",
  "-vvvv",
];

console.log(`  Forge command: forge script ... --with-gas-price ${useGasPrice} --priority-gas-price ${usePriorityFee} --gas-estimate-multiplier 150`);

const forge = spawnSync("forge", forgeArgs, { cwd: ROOT, env: forgeEnv, stdio: "inherit", shell: process.platform === "win32" });
if (forge.error) fail(`could not run forge: ${forge.error.message} (is Foundry installed and on PATH?)`);
if (forge.status !== 0) fail(`DeployAll failed (exit ${forge.status}). Environment NOT modified.`);

// ═══════════════════════════════════════════════════════════════════════════════
//  POST-DEPLOYMENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n\x1b[1m=== POST-DEPLOYMENT VERIFICATION ===\x1b[0m");

// Read the broadcast file for the deployed addresses
const broadcastDir = join(ROOT, "broadcast", "DeployAll.s.sol", "97");
let broadcastFiles;
try {
  const { readdirSync } = await import("node:fs");
  broadcastFiles = readdirSync(broadcastDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();
} catch {
  fail("Cannot find broadcast directory");
}

const latestBroadcast = join(broadcastDir, broadcastFiles[0]);
const broadcast = JSON.parse(readFileSync(latestBroadcast, "utf8"));

if (!broadcast.receipts || broadcast.receipts.length === 0) {
  fail("No receipts in broadcast log. Deployment may not have confirmed.");
}

if (broadcast.receipts.length !== broadcast.transactions.length) {
  console.warn(`\x1b[33m  WARNING: ${broadcast.receipts.length}/${broadcast.transactions.length} transactions confirmed.\x1b[0m`);
}

// Extract deployed contract addresses from transactions
const deployed = {};
for (const tx of broadcast.transactions) {
  if (tx.transactionType === "CREATE") {
    deployed[tx.contractName] = tx.contractAddress;
  }
}

console.log("\n  Deployed contracts:");
for (const [name, addr] of Object.entries(deployed)) {
  // Verify bytecode exists
  let hasCode = false;
  try {
    const code = await client.getCode({ address: addr });
    hasCode = code && code.length > 2;
  } catch {}
  const status = hasCode ? "✅ BYTECODE CONFIRMED" : "❌ NO CODE";
  console.log(`    ${name}: ${addr} — ${status}`);
}

// Verify PaymentManager specifically
const pmAddr = deployed.PaymentManager;
if (!pmAddr) fail("PaymentManager not found in deployment artifacts.");

try {
  const pmCode = await client.getCode({ address: pmAddr });
  if (!pmCode || pmCode.length <= 2) fail(`PaymentManager at ${pmAddr} has no code — deployment failed.`);
  info("PaymentManager confirmed at", pmAddr);
} catch (e) {
  fail(`Cannot verify PaymentManager bytecode: ${e.message}`);
}

console.log("\n\x1b[32m=== DEPLOYMENT VERIFIED ===\x1b[0m");

// ═══════════════════════════════════════════════════════════════════════════════
//  SYNC CONFIG FILES (only after successful on-chain verification)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n\x1b[1m=== SYNCING CONFIG FILES ===\x1b[0m");
console.log("  deployments/testnet.json was written by forge during broadcast.");
console.log("  Running postdeploy:testnet to update frontend configs...");

const updater = spawnSync(process.execPath, [join(ROOT, "tools", "update-testnet-env.mjs")], {
  cwd: ROOT,
  stdio: "inherit",
});
if (updater.status !== 0) fail("post-deploy updater failed.");

console.log("\n\x1b[32m\x1b[1m=== DEPLOYMENT COMPLETE ===\x1b[0m");
console.log(`  PaymentManager: ${pmAddr}`);
