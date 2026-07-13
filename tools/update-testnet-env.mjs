#!/usr/bin/env node
/**
 * Relcko — BNB Testnet post-deployment updater.
 *
 * Runs AFTER DeployAll.s.sol (and optionally after Staking deploy).
 * Reads the authoritative deployment artifact (deployments/testnet.json)
 * and propagates the resolved addresses to every place the rest of the
 * stack reads them from — with NO manual copying:
 *
 *   1. .env                     -> USDT, RLKO_ADDRESS, PAYMENT_MANAGER,
 *                                  CHAINLINK_FEED, STAKING_CONTRACT,
 *                                  STAKING_RLKO
 *   2. deployments/testnet.json -> already written by DeployAll (validated)
 *   3. lib/presale/config.ts    -> PRESALE_CONTRACTS[bscTestnet] (PaymentManager)
 *                                  PAYMENT_TOKENS[bscTestnet] USDT addr + decimals
 *   4. lib/staking/config.ts    -> STAKING_CONTRACT[bscTestnet]
 *                                  RLKO_TOKEN[bscTestnet]
 *
 * Safe to re-run (idempotent). Never touches contracts, ABIs, or business logic.
 *
 * Usage:  node tools/update-testnet-env.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT = join(ROOT, "deployments", "testnet.json");
const ENV_FILE = join(ROOT, ".env");
const FRONTEND_CONFIG = join(ROOT, "lib", "presale", "config.ts");
const STAKING_CONFIG = join(ROOT, "lib", "staking", "config.ts");

const ZERO = "0x0000000000000000000000000000000000000000";
const MOCK_USDT_DECIMALS = 18;

const isAddr = (v) => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
const isReal = (v) => isAddr(v) && v.toLowerCase() !== ZERO;

function fail(msg) {
  console.error(`\x1b[31m[update-testnet-env] ERROR: ${msg}\x1b[0m`);
  process.exit(1);
}
function ok(msg) {
  console.log(`\x1b[32m  \u2713\x1b[0m ${msg}`);
}

// ── 1. Load + validate the deployment artifact ────────────────────────────────
if (!existsSync(ARTIFACT)) fail(`artifact not found: ${ARTIFACT} (run DeployAll first)`);

let d;
try {
  d = JSON.parse(readFileSync(ARTIFACT, "utf8"));
} catch (e) {
  fail(`could not parse ${ARTIFACT}: ${e.message}`);
}

const rlko = d.rlko;
const paymentManager = d.paymentManager;
const usdt = d.usdt;
const feed = d.bnbUsdFeed;
const staking = d.staking;
const stakingToken = d.stakingToken;

if (Number(d.chainId) !== 97) fail(`artifact chainId is ${d.chainId}, expected 97 (BNB Testnet)`);
if (!isReal(rlko)) fail(`rlko address is missing/zero in artifact`);
if (!isReal(paymentManager)) fail(`paymentManager address is missing/zero in artifact`);
if (!isReal(usdt)) fail(`usdt address is missing/zero in artifact`);

console.log("Relcko testnet post-deploy sync");
console.log("\u2500".repeat(60));
console.log(`  RLKO            : ${rlko}`);
console.log(`  MockUSDT        : ${usdt}`);
console.log(`  PaymentManager  : ${paymentManager}`);
console.log(`  Chainlink feed  : ${feed}`);
console.log(`  Staking         : ${staking || "(not deployed)"}`);
console.log(`  Staking token   : ${stakingToken || "(not deployed)"}`);
console.log(`  Stage 1 id      : ${d.stageId}`);
console.log("\u2500".repeat(60));

// ── 2. Update .env ────────────────────────────────────────────────────────────
if (!existsSync(ENV_FILE)) fail(`.env not found: ${ENV_FILE}`);
let env = readFileSync(ENV_FILE, "utf8");

function setEnv(src, key, value) {
  const re = new RegExp(`^(${key}=)[^\\r\\n#]*`, "m");
  if (re.test(src)) return src.replace(re, `$1${value}`);
  return src.replace(/\s*$/, `\n${key}=${value}\n`);
}

env = setEnv(env, "USDT", usdt);
env = setEnv(env, "RLKO_ADDRESS", rlko);
env = setEnv(env, "PAYMENT_MANAGER", paymentManager);
env = setEnv(env, "CHAINLINK_FEED", feed);
if (isReal(staking)) {
  env = setEnv(env, "STAKING_CONTRACT", staking);
  env = setEnv(env, "STAKING_RLKO", stakingToken || rlko);
}
writeFileSync(ENV_FILE, env);
ok(".env updated");

// ── 3. deployments/testnet.json (already written; validated above) ────────────
ok("deployments/testnet.json validated");

// ── 4. Update frontend config (lib/presale/config.ts) ─────────────────────────
if (!existsSync(FRONTEND_CONFIG)) fail(`frontend config not found: ${FRONTEND_CONFIG}`);
let cfg = readFileSync(FRONTEND_CONFIG, "utf8");

// 4a. PRESALE_CONTRACTS[bscTestnet]
const presaleRe = /(\[CHAIN_IDS\.bscTestnet\]:\s*)"0x[0-9a-fA-F]{40}"/;
if (!presaleRe.test(cfg)) fail("could not locate PRESALE_CONTRACTS[bscTestnet] entry");
cfg = cfg.replace(presaleRe, `$1"${paymentManager}"`);

// 4b. PAYMENT_TOKENS[bscTestnet] USDT address + decimals
const marker = "[CHAIN_IDS.bscTestnet]: [";
const start = cfg.indexOf(marker);
if (start === -1) fail("could not locate PAYMENT_TOKENS[bscTestnet] block");
const end = cfg.indexOf("],", start);
if (end === -1) fail("malformed PAYMENT_TOKENS[bscTestnet] block");

let block = cfg.slice(start, end);
const usdtAddrRe = /(symbol:\s*"USDT",\s*address:\s*)"0x[0-9a-fA-F]{40}"/;
const usdtDecRe = /(symbol:\s*"USDT",\s*address:\s*"0x[0-9a-fA-F]{40}",\s*decimals:\s*)\d+/;
if (!usdtAddrRe.test(block)) fail("could not locate testnet USDT payment token entry");
block = block.replace(usdtAddrRe, `$1"${usdt}"`);
block = block.replace(usdtDecRe, `$1${MOCK_USDT_DECIMALS}`);
cfg = cfg.slice(0, start) + block + cfg.slice(end);

writeFileSync(FRONTEND_CONFIG, cfg);
ok("lib/presale/config.ts updated");

// ── 5. Update staking config (lib/staking/config.ts) ─────────────────────────
if (isReal(staking) && existsSync(STAKING_CONFIG)) {
  let stg = readFileSync(STAKING_CONFIG, "utf8");

  const stakingRe = /(\[CHAIN_IDS\.bscTestnet\]:\s*)"0x[0-9a-fA-F]{40}"/;
  if (stakingRe.test(stg)) {
    stg = stg.replace(stakingRe, `$1"${staking}"`);
  } else {
    stg = stg.replace(
      /(STAKING_CONTRACT: Record<number, `0x\$\{string\}`> = \{)/,
      `$1\n  [CHAIN_IDS.bscTestnet]: "${staking}",`
    );
  }

  // Only update RLKO_TOKEN[bscTestnet] if it uses a literal hex address
  // (skip if it's a variable reference like BETA_CONTRACT_ADDRESSES.rlko)
  const tokenRe = /(RLKO_TOKEN: Record<number, `0x\$\{string\}`> = \{[\s\S]*?)(\};)/;
  const rlkoTokenBlock = stg.match(/RLKO_TOKEN: Record<number, `0x\$\{string\}`> = \{[\s\S]*?\};/);
  if (rlkoTokenBlock) {
    const tokenBlock = rlkoTokenBlock[0];
    const literalAddrRe = /(\[CHAIN_IDS\.bscTestnet\]:\s*)"0x[0-9a-fA-F]{40}"/;
    if (literalAddrRe.test(tokenBlock)) {
      const tokenAddr = stakingToken || rlko;
      stg = stg.replace(
        /(RLKO_TOKEN: Record<number, `0x\$\{string\}`> = \{[\s\S]*?)(\[CHAIN_IDS\.bscTestnet\]:\s*)"0x[0-9a-fA-F]{40}"/,
        `$1$2"${tokenAddr}"`
      );
    }
  }

  writeFileSync(STAKING_CONFIG, stg);
  ok("lib/staking/config.ts updated (staking contract + RLKO token)");
} else if (!isReal(staking)) {
  console.log("  \u26a0 Staking contract not deployed yet — skipping staking config update");
}

console.log("\u2500".repeat(60));
console.log("\x1b[32mTestnet environment is fully synced. No manual copying required.\x1b[0m");
