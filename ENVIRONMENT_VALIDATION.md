# Environment Validation — Relcko V2.15.0-beta-rc1

---

## 1. Environment Architecture

| Environment | Purpose | Chain | Status | URL |
|-------------|---------|-------|--------|-----|
| **Development** | Local development | Local Anvil (31337) | ✅ Active | `http://localhost:3000` |
| **Testnet** | Integration testing | BSC Testnet (97) | ✅ Active | `https://testnet.relcko.app` |
| **Staging** | Pre-release validation | BSC Testnet (97) | ⬜ Not deployed | — |
| **Beta** | Closed beta release | BSC Testnet (97) | ⬜ Pending | — |
| **Production** | Mainnet launch | BSC Mainnet (56) | ⏳ Future | — |

---

## 2. Development Environment

### Variables

| Variable | Value | Source |
|----------|-------|--------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Set in frontend config | `app/providers.tsx` |
| `NEXT_PUBLIC_BSC_RPC` | Optional override | `.env.local` |
| Local chain | Anvil (31337) | `foundry.toml` |

### Validation

```bash
# Start dev server
npm run dev

# Verify local chain
cast chain-id
# Expected: 31337

# Run tests
npm run test
# Expected: 698 passing
```

---

## 3. Testnet Environment

### Smart Contracts

| Contract | Address | Status |
|----------|---------|--------|
| RLKO Token | `0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674` | ✅ Deployed & verified |
| PaymentManager | `0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106` | ✅ Deployed & verified |
| Staking | `0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3` | ✅ Deployed & verified |
| MockUSDT | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` | ✅ Active |
| BNB/USD Feed | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` | ✅ Active |
| Treasury | `0x0000...` | ⚠️ Not set (deployer is owner) |

### Variables

| Variable | Value | Status |
|----------|-------|--------|
| `BSC_TESTNET_RPC` | `data-seed-prebsc-1-s1.binance.org:8545` | ✅ |
| `DEPLOYER` | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` | ✅ |
| `DEPLOYER_PK` | Configured per environment | 🔒 |
| `MOCK_USDT` | `true` | ✅ |
| `TREASURY` | `0x0000000000000000000000000000000000000000` | ⚠️ Not transferred |
| Stage 1 Price | 1.15 USDT | ✅ |
| Stage 1 Supply | 10,000 RLKO | ✅ |
| Stage 1 Min/Max | 10 USDT / 100,000 USDT | ✅ |

### Validation

```bash
# Verify chain connectivity
cast chain-id --rpc-url $BSC_TESTNET_RPC

# Verify contracts are verified on BSCScan
# RLKO: https://testnet.bscscan.com/address/0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674
# PaymentManager: https://testnet.bscscan.com/address/0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106
# Staking: https://testnet.bscscan.com/address/0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3

# Verify PaymentManager paused status
cast call 0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106 "paused()(bool)" \
  --rpc-url $BSC_TESTNET_RPC

# Verify oracle returns fresh data
cast call 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526 "latestRoundData()(uint80,int256,uint256,uint256,uint80)" \
  --rpc-url $BSC_TESTNET_RPC
```

---

## 4. Staging Environment

**Status:** ⬜ Not deployed

### Requirements

| Requirement | Specification | Status |
|-------------|--------------|--------|
| Environment | BSC Testnet (chain 97) | ✅ Available |
| Smart contracts | Same as testnet | ✅ Ready |
| Frontend build | Staging-specific config | ⬜ Pending |
| Monitoring | Operational monitoring enabled | ⬜ Pending |
| CI/CD pipeline | Automated deployment | ⬜ Pending |

### Setup Steps

1. Configure `.env.staging` with testnet values
2. Deploy frontend build to staging URL
3. Enable monitoring via `@relcko/operations`
4. Configure alert thresholds
5. Run full smoke test suite
6. Verify health endpoints

---

## 5. Beta Environment

**Status:** ⬜ Pending (this milestone)

### Requirements

| Requirement | Specification | Status |
|-------------|--------------|--------|
| Environment | BSC Testnet (chain 97) | ✅ Available |
| Smart contracts | Testnet deployment | ✅ Deployed |
| WalletConnect | Project ID configured | ✅ Ready |
| KYC integration | `@relcko/identity` KYC service | ✅ Implemented |
| Rate limiting | Enabled | ✅ Implemented |
| Monitoring | Operational | 📋 Pending configuration |
| Feature flags | Beta-appropriate defaults | ✅ Configurable |

### Beta Configuration

```typescript
// Recommended feature flag settings for beta
const BETA_FLAGS = {
  'observability.enabled': true,
  'audit.mirror': true,
  'security.twoStageGating': false,  // Disable for beta UX
  'compliance.kycRequired': true,
};
```

---

## 6. Production Environment (Future)

**Status:** ⏳ Future milestone

### Requirements

| Requirement | Specification | Status |
|-------------|--------------|--------|
| Environment | BSC Mainnet (chain 56) | ✅ Available |
| RLKO Token | Mainnet address | ⬜ To deploy |
| PaymentManager | Mainnet address | ⬜ To deploy |
| Staking | Mainnet address | ⬜ To deploy |
| USDT | Production USDT (`0x55d398...`) | ⬜ To configure |
| BNB/USD Feed | Mainnet feed (`0x0567F2...`) | ⬜ To verify |
| Treasury | Multisig wallet | ⬜ To configure |
| CI/CD | Production pipeline | ⬜ To build |
| Monitoring | Production-grade | ⬜ To configure |
| Load testing | Performance validation | ⬜ To conduct |

---

## 7. Environment Variables

### Required Variables (All Environments)

| Variable | Dev | Testnet | Staging | Beta | Production |
|----------|-----|---------|---------|------|------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `BSC_RPC` | Optional | ✅ | ✅ | ✅ | ✅ |
| `DEPLOYER_PK` | ⚠️ Local only | 🔒 | 🔒 | 🔒 | 🔒 |
| `TREASURY` | `0x0` | ⚠️ Not set | ⚠️ | ⚠️ | 🔒 Required |

### Application Variables

| Variable | Purpose | Status |
|----------|---------|--------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect v2 project | ✅ Set in `app/providers.tsx` |
| `NEXT_PUBLIC_BSC_RPC` | Custom BSC RPC endpoint | Optional override |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment label | For UI display |

---

## 8. Secrets Management

| Secret | Storage | Access Control | Rotation |
|--------|---------|----------------|----------|
| Deployer private key | Environment variable | Restricted | Per deployment |
| Treasury multisig keys | Hardware wallet / MPC | Multi-signature | Per governance |
| WalletConnect project ID | Environment variable | Read-only for frontend | Manual |
| RPC API keys | Environment variable | Service account | Per provider policy |

Secrets are managed via environment variables. No secrets are committed to the repository.

---

## 9. Wallet Configuration

### Supported Wallets (via RainbowKit)

| Wallet | Status |
|--------|--------|
| MetaMask | ✅ Supported |
| WalletConnect | ✅ Supported |
| Coinbase Wallet | ✅ Supported |
| Ledger Live | ✅ Supported |
| Trust Wallet | ✅ Supported (via WalletConnect) |

### WalletConnect Configuration

```typescript
// From app/providers.tsx
const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc],
  connectors: [
    metaMask(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID! }),
    coinbaseWallet(),
  ],
});
```

---

## 10. Treasury Configuration

| Parameter | Testnet Value | Production Target | Status |
|-----------|--------------|-------------------|--------|
| Treasury address | `0x0000...` (deployer) | Multisig | ⚠️ Not configured |
| RLKO token | `0xdE27aC...` | Mainnet address | ✅ Testnet deployed |
| PaymentManager | `0x7226E9...` | Mainnet address | ✅ Testnet deployed |
| Staking contract | `0x4C6b9E...` | Mainnet address | ✅ Testnet deployed |
| USDT token | MockUSDT | Production USDT | ✅ Testnet ready |

---

## 11. Monitoring Configuration

| Service | Package | Health Check | Status |
|---------|---------|-------------|--------|
| Metrics | `@relcko/observability` | `Metrics` interface | ✅ Implemented |
| Tracing | `@relcko/observability` | `Tracer` interface | ✅ Implemented |
| Health | `@relcko/observability` | `HealthRegistry` | ✅ Implemented |
| Audit | `@relcko/audit-contracts` | `AuditStore` | ✅ Implemented |
| Alerts | `@relcko/operations` | `AlertEngine` | ✅ Implemented |
| Incidents | `@relcko/operations` | `IncidentTimeline` | ✅ Implemented |
| Dashboards | `@relcko/operations` | `OperationsDashboardAdapter` | ✅ Implemented |

---

## 12. Logging Configuration

| Parameter | Development | Testnet/Staging/Beta | Production |
|-----------|-------------|---------------------|------------|
| Log level | `DEBUG` | `INFO` | `WARN` |
| Log format | Pretty-print | JSON | JSON |
| Log output | Console | Console + file | Console + aggregator |
| Correlation IDs | Enabled | Enabled | Enabled |
| Trace IDs | Enabled | Enabled | Enabled |

---

## 13. Feature Flags

| Flag | Default | Dev | Testnet | Staging | Beta | Production |
|------|---------|-----|---------|---------|------|------------|
| `observability.enabled` | `true` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `audit.mirror` | `true` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `security.twoStageGating` | `false` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `compliance.kycRequired` | `true` | ❌ | ✅ | ✅ | ✅ | ✅ |

Flags are defined in `@relcko/feature-flags` via `DEFAULT_FLAGS` and `createDefaultFlagProvider()`.
