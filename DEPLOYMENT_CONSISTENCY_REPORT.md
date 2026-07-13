# Relcko Deployment Framework — Consistency Report

**RC1 Final — July 2026**

---

## Script Dependency Graph

```
DeployAll (orchestrator)
  ├── DeployRLKO          (no deps — standalone)
  ├── [MockUSDT]          (optional, testnet only)
  ├── DeployPaymentManager (needs RLKO + USDT)
  ├── ConfigureStage1       (needs PaymentManager)
  └── VerifyContracts       (needs complete artifact)

Standalone (manual) flow:
  DeployRLKO → DeployPaymentManager → ConfigureStage1 → VerifyContracts
```

---

## Deployment Order

| Step | Script | Fresh deploy | Re-run |
|------|--------|-------------|--------|
| 1 | `DeployRLKO` | Deploys new MockERC20 | Deploys again, overwrites artifact |
| 2 | `DeployPaymentManager` | Deploys new PaymentManager | Deploys again, overwrites artifact |
| 3 | `ConfigureStage1` | Adds + activates Stage 1 | Appends another stage (non-idempotent) |
| 4 | `VerifyContracts` | Read-only checks | Read-only checks (idempotent) |
| — | `DeployAll` | Steps 1–4 in one tx sequence | Same, but uses artifact as defaults |

---

## Environment Variables

Every variable used by at least one script, resolved via `BaseDeployScript`:

| Variable | Used by | Default | Resolution |
|---|---|---|---|
| `DEPLOYER_PK` | All scripts | — | `_broadcaster()` — if DEPLOYER not set |
| `DEPLOYER` | All scripts | — | `_broadcaster()` — explicit address |
| `TREASURY` | All scripts | `address(0)` | `_treasury()` |
| `RLKO_NAME` | DeployRLKO, DeployAll | `"Relcko Token"` | `vm.envOr` |
| `RLKO_SYMBOL` | DeployRLKO, DeployAll | `"RLKO"` | `vm.envOr` |
| `RLKO_DECIMALS` | DeployRLKO, DeployAll | `18` | `vm.envOr` |
| `RLKO_SUPPLY` | DeployRLKO, DeployAll | `1_000_000_000e18` | `vm.envOr` |
| `PRESALE_SUPPLY` | DeployAll | `STAGE1_SUPPLY` | `vm.envOr` |
| `STAGE1_PRICE` | DeployAll, ConfigureStage1 | artifact | `vm.envOr` |
| `STAGE1_SUPPLY` | DeployAll, ConfigureStage1 | artifact | `vm.envOr` |
| `STAGE1_MIN_PER_USER` | DeployAll, ConfigureStage1 | artifact | `vm.envOr` |
| `STAGE1_MAX_PER_USER` | DeployAll, ConfigureStage1 | artifact | `vm.envOr` |
| `SALE_TOKEN` | DeployPaymentManager | artifact RLKO | `vm.envOr` |
| `PAYMENT_MANAGER` | ConfigureStage1 | artifact | `vm.envOr` |
| `MOCK_USDT` | DeployAll | `chainId == 97` | `vm.envOr` |
| `USDT_TOKEN` | DeployPaymentManager, DeployAll | env chain-specific | `_resolveUsdt(d)` |
| `USDT_TOKEN_MAINNET` | DeployPaymentManager, DeployAll | — | `_resolveUsdt(d)` |
| `USDT_TOKEN_TESTNET` | DeployPaymentManager, DeployAll | — | `_resolveUsdt(d)` |
| `BNB_USD_FEED` | DeployPaymentManager, DeployAll | env chain-specific | `_resolveFeed()` |
| `BNB_USD_FEED_MAINNET` | DeployPaymentManager, DeployAll | — | `_resolveFeed()` |
| `BNB_USD_FEED_TESTNET` | DeployPaymentManager, DeployAll | — | `_resolveFeed()` |

**All scripts use identical env var names.** No hardcoded addresses.

---

## Artifact Flow

```
                    ┌──────────────────────┐
                    │  _loadDeployment()    │
                    │  reads JSON from      │
                    │  deployments/*.json   │
                    └────────┬─────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       DeployRLKO    DeployPayment   ConfigureStage1
              │              │              │
              └──────┬───────┘              │
                     │                      │
                     ▼                      │
              DeployAll (if used)           │
                     │                      │
                     └──────────┬───────────┘
                                ▼
                       _saveDeployment()
                       writes JSON to
                       deployments/*.json
```

- Artifact path: `_artifactFile()` → `./deployments/mainnet.json` (chain 56), `./deployments/testnet.json` (chain 97)
- Merge-safe: `_loadDeployment()` uses try/catch per field — missing fields stay at default values
- Every script calls `_loadDeployment()` first and `_saveDeployment()` at the end

---

## Shared Resolution Functions (BaseDeployScript)

| Function | Used by | Returns |
|---|---|---|
| `_resolveUsdt(Deployment memory d)` | DeployPaymentManager, DeployAll | Artifact USDT → `USDT_TOKEN` → `USDT_TOKEN_MAINNET/TESTNET` → `address(0)` |
| `_resolveFeed()` | DeployPaymentManager, DeployAll, VerifyContracts | `BNB_USD_FEED` → `BNB_USD_FEED_MAINNET/TESTNET` → revert if unset |
| `_treasury()` | All scripts | `TREASURY` env or `address(0)` |
| `_broadcaster()` | All scripts | `DEPLOYER` → `DEPLOYER_PK` → `msg.sender` |
| `_expectedOwner()` | All scripts (conceptual) | treasury ? treasury : broadcaster |
| `_verifyFeed()` | DeployPaymentManager, DeployAll, VerifyContracts | decimals + price + round + staleness |
| `_verifyTokenDecimals()` | DeployPaymentManager, DeployAll, VerifyContracts | code + decimals match |

---

## Re-run Behavior (Idempotency)

| Script | Idempotent? | Behavior on re-run |
|---|---|---|
| `DeployRLKO` | ❌ No | Deploys new RLKO; artifact overwritten |
| `DeployPaymentManager` | ❌ No | Deploys new PM; artifact overwritten |
| `ConfigureStage1` | ❌ No | `addStage` appends another stage (stages array grows) |
| `VerifyContracts` | ✅ Yes | Read-only; always safe |
| `DeployAll` | ❌ No | Deploys new everything; skips MockUSDT if `d.usdt` already set |

**Warning:** Re-running `DeployAll` or any deployment script deploys **new** contract instances. Previous instances in the artifact are overwritten. For production deployments, re-run only `VerifyContracts`.

---

## Changes Made in This Review

### 1. `DeployPaymentManager.s.sol` — USDT resolution fixed

**Before:** `address usdt = _resolveUsdt();` (env-only, no artifact check)

**After:** `address usdt = _resolveUsdt(d);` (artifact → env)

Priority chain:
1. `d.usdt` — from `_loadDeployment()` (MockUSDT from DeployAll, or previous run)
2. `USDT_TOKEN` env var
3. `USDT_TOKEN_MAINNET` / `USDT_TOKEN_TESTNET` env var (network-aware)
4. `address(0)` — never reverts on missing env

### 2. `BaseDeployScript.sol` — `_resolveUsdt()` unified

- Renamed internal behavior from `vm.envOr` chaining to `_tryEnvAddress` (catch-safe)
- Added `Deployment memory d` parameter so every caller delegates to a single function
- Added `_tryEnvAddress(string memory key)` helper for safe env reads

### 3. `DeployAll.s.sol` — Inline resolution replaced

**Before:** `usdt = d.usdt != address(0) ? d.usdt : _resolveUsdt();`

**After:** `usdt = _resolveUsdt(d);` — delegates to shared function

### 4. `DeployRLKO.s.sol` — Confirmed unchanged

No changes required. The script:
- Has no dependency on USDT/feed/stage
- Validates name, symbol, decimals, supply
- Verifies owner (deployer balance == supply) and decimals
- Uses standard `_broadcaster()` / `_treasury()` for owner info

---

## Remaining Observations (non-blocking)

| Issue | Script | Detail |
|---|---|---|
| `_resolveFeed()` reverts on missing env | Base | Uses `vm.envOr` with eagerly-evaluated `vm.envAddress` default. If `BNB_USD_FEED` and chain-specific feed are both absent, call reverts. This is acceptable — feeds must always be configured. |
| `_treasury()` returns `address(0)` | All | If `TREASURY` not in env, returns zero address which means "no treasury transfer". Downstream scripts handle `address(0)` correctly by skipping transfer. |
| No duplicate env keys | All | Every variable name is unique across all scripts. No collisions. |
| `MockUSDT` only deployed by DeployAll | DeployAll | Standalone scripts resolve MockUSDT from artifact; they cannot deploy it themselves. This is by design — the mock is an orchestrator concern. |

---

## Summary

**Status:** ✅ All 5 scripts internally consistent.

| Check | Result |
|---|---|
| Identical env variable names | ✅ |
| Identical deployment artifact paths | ✅ |
| Identical network detection | ✅ |
| Identical owner resolution | ✅ |
| Identical Chainlink feed resolution | ✅ |
| Identical treasury resolution | ✅ |
| USDT resolution single entry point | ✅ |
| No duplicated resolution logic | ✅ |
| Contracts/ABI/business logic unchanged | ✅ |
| forge build | ✅ |
| 59/59 tests pass | ✅ |
