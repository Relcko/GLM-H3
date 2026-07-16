# V1.1.0 — Legacy Marketplace Architecture Audit

**Prepared by:** Principal Software Architect, Relcko
**Date:** 2026-07-14
**Scope:** `legacy-marketplace/well-known` — the source implementation for the future Relcko Marketplace.
**Mode:** ANALYSIS ONLY. No files modified. No code generated. Migration plan produced, not executed.

---

## 1. Executive Summary

The legacy marketplace is a **Laravel 12 (PHP) + Inertia.js v2 + React 19 + Vite 7** monolith, styled with **Tailwind v4 (CSS-first)**, wallet-connected via **Reown AppKit + wagmi v3 + viem v2**, and backed by **Hardhat Solidity contracts** (`RWAProperty` ERC1155, `MockUSDT` test token). It implements a tokenized real-estate marketplace: primary-market property investment, a secondary marketplace (listings/bids/trades), referral/agent commissions, KYC, and a (currently unverified) on-chain payment layer.

**Critical takeaways for Relcko integration:**

1. **Architecture mismatch is the #1 risk.** Relcko is **Next.js 16 (App Router) + Tailwind v3 + RainbowKit + wagmi v2 + Foundry**. The legacy app is a PHP/Inertia SSR monolith. There is **no shared runtime** — integration means *extracting domain logic* and *re-authoring the UI in Next.js*, not "copying files in."
2. **Blockchain layer is write-only and unverified.** The backend accepts client-supplied `tx_hash` as proof of payment with **zero on-chain verification**. The secondary marketplace is **entirely off-chain (DB-only)** — ERC1155 `safeTransferFrom` is never called. Critical security/modeling gap to fix *before* relying on chain state.
3. **Critical auth vulnerability.** `walletLogin` does **not** verify the signature (forgeable login by wallet address). Must be fixed before any reuse.
4. **Duplicated/dead code is extensive** — `formatCurrency` ×14, funding-progress math ×3, avg-cost-basis math ×3, orphan Dividend subsystem, dead deps (`spatie/laravel-permission`, `kornrunner/ethereum-offline-raw-tx`), and an unconfigured `rwa-folder/` nested git repo.
5. **Secrets hygiene is poor.** A live DB password is present in the working-tree `.env`; contract addresses are hardcoded in frontend TS with a **fake event-signature topic** used to parse `token_id`.

**Bottom line:** Treat the legacy codebase as a *specification* (domain model, business rules, UI flows) rather than a *codebase to fork*. Port the **domain logic and contracts** into Relcko's Next.js/Foundry stack; rebuild the UI on Relcko's existing design system and wallet stack.

---

## 2. Folder Map

| Folder | Purpose | Migration relevance |
|---|---|---|
| `app/` | Laravel PHP: `Models/` (23), `Http/Controllers/` (21), `Http/Middleware/`, `Services/` (`TradingService`, `CommissionService`), `Providers/`. | **High** — contains the real domain logic to extract. |
| `routes/` | `web.php` (UI/routes), `api.php` (property/holding reads + investment webhook), `console.php` (only `inspire`). | High — API surface to re-implement as Next route handlers. |
| `config/` | Standard Laravel config + `services.php`. No custom config. | Low. |
| `database/` | `migrations/` (20), `seeders/` (`DatabaseSeeder`, `DummyDataSeeder`), `factories/UserFactory`. | High — schema is the canonical data model. |
| `bootstrap/` | Laravel 12 bootstrap (`app.php`, `providers.php`, `cache/`). | Low. |
| `resources/` | Inertia React frontend: `js/Pages/`, `js/Components/`, `js/Layouts/`, `js/Lib/wagmi.ts`, `js/contexts/`, `css/app.css` (38 KB design system), `views/app.blade.php`. | **High** — UI to re-author in Next.js. |
| `public/` | `index.php`, `build/` (Vite output), `images/`, `storage/` symlink, `robots.txt`. | Low (assets reusable; `build/` excluded). |
| `contracts/` | **Separate Hardhat project**: `src/RWAProperty.sol`, `src/MockUSDT.sol`, `hardhat.config.js`, `scripts/deploy.js`, `deployments/sepolia.json`, `test/RWAProperty.test.js`. **Not wired to PHP.** | High — Solidity to port to Foundry. |
| `rwa-folder/` | Nested git repo skeleton (`.git` + `.claude/settings.local.json`), **no source**. | **Exclude** from migration (stray/duplicate VCS). |
| `storage/` | Framework dirs + stray `properties.zip`. | Low. |
| `tests/` | Default `ExampleTest` stubs only — **no real tests**. | N/A (coverage gap). |
| `vendor/`, `node_modules/`, `build/`, `__MACOSX__/` | Dependencies / build artifacts / OS cruft. | Exclude. |
| `app 2.zip`, `database.zip`, `resources.zip` | Archives of source (redundant with folders). | Exclude. |

---

## 3. Architecture Diagram

```
+--------------------------------------------------------------------------+
|                      LEGACY MARKETPLACE (today)                           |
+--------------------------------------------------------------------------+
|  Browser (React 19 / Inertia SPA)                                        |
|  +- Pages (~60): Home, Properties, Marketplace, Dashboard, Kyc,          |
|  |             Referral, Admin/*, Auth/*                                 |
|  +- Wallet: Reown AppKit + wagmi v3 + viem v2                           |
|  +- On-chain WRITE: ERC20.approve -> RWAProperty.purchaseTokens          |
|  |   (addresses pulled from DB BlockchainConfig prop)                   |
|  +- Data: Inertia router.get/post  --->  Laravel backend                |
+----------------------------------+---------------------------------------+
                                   | HTTP (Inertia + sanctum)
                                   v
+--------------------------------------------------------------------------+
|  Laravel 12 (PHP)                                                         |
|  +- Controllers (21)  +- Services: TradingService, CommissionService     |
|  +- Models (23): Property, Investment, TokenHolding, PropertyListing,    |
|  |                  Bid, Trade, Transaction, Agent, Referral, Commission  |
|  +- Auth: walletLogin / linkWallet (secp256k1 sig recovery)             |
|  +- Storage: MySQL/SQLite  <---- SYSTEM OF RECORD (ownership, trades)    |
+----------------------------------+---------------------------------------+
                                   | stores client-supplied tx_hash (UNVERIFIED)
                                   v
+--------------------------------------------------------------------------+
|  Blockchain (Hardhat Solidity)  ---  WRITE-ONLY, UNVERIFIED              |
|  +- RWAProperty (ERC1155): createProperty, purchaseTokens (mints +      |
|  |   pulls stablecoin to treasury), adminMint, pause, emergencyWithdraw |
|  +- MockUSDT (test token, open faucet)  -- DO NOT MIGRATE               |
|  +- Deployed (Sepolia only): rwaProperty 0x3C77..D9f1, MockUSDT, treasury|
+--------------------------------------------------------------------------+

   KEY GAP:  Marketplace trades (list/bid/buy), ownership transfer, and
   investment confirmation NEVER call the chain. DB holdings can diverge
   from on-chain ERC1155 balances. tx_hash is trusted user input.
```

**Relcko target shape (post-integration):**

```
Next.js 16 (App Router)  --reuses-->  Relcko design system (Tailwind v3)
  +- app/ (routes)  +  lib/ (port TradingService / CommissionService logic)
  +- Wallet: RainbowKit + wagmi v2 + viem v2   (replace Reown AppKit)
  +- Contracts: Foundry RWAProperty (ported) with on-chain verification
  +- Data: Relcko DB (or kept Laravel headless API) + on-chain reads
```

---

## 4. Route Map

### Web routes (`routes/web.php`) -> Inertia pages
| URI | Page component | Auth |
|---|---|---|
| `/` `/about` `/contact` `/faq` | `Home`, `About`, `Contact`, `FAQ` | none |
| `/properties` | `Properties/Index` | none |
| `/properties/{slug}` | `Properties/Show` | none |
| `/marketplace` | `Marketplace/Index` | none |
| `/marketplace/create` | `Marketplace/Create` | auth |
| `/marketplace/{listing}` | `Marketplace/Show` | none |
| `/marketplace/trade/{trade}` | `Marketplace/Trade` | none |
| `/login` `/register` | `Auth/Login`, `Auth/Register` | guest |
| `/wallet-login` (POST) | — | guest |
| `/logout`, `/link-wallet` | — | auth |
| `/dashboard` `/portfolio` `/transactions` `/settings` | `Dashboard/*` | auth |
| `/kyc` (GET+POST) | `Kyc/Index` | auth |
| `/invest/{slug}` (GET+POST) | `Investment/Create` (+ `InvestmentController`) | auth |
| `/marketplace` (POST), `/marketplace/{listing}/bid|buy`, `/bids/{bid}/accept`, `/listing/cancel`, `/trade/{trade}` | `Marketplace/*` | auth |
| `/dashboard/listings|bids|trades` | `Dashboard/*` | auth |
| `/referral` `/apply` `/referrals` `/commissions` `/withdrawals` | `Referral/*` | auth |
| `/admin/*` (properties, users, investments, blockchain, kyc, settings, agents, commissions, trades) | `Admin/*` | auth+admin |

### API routes (`routes/api.php`)
| Method | URI | Purpose |
|---|---|---|
| GET | `/properties` | filtered property list (blockchain/status) |
| GET | `/properties/{property}` | public property fields |
| GET | `/blockchain-configs` | active chain configs |
| GET | `/user` | current user (`auth:sanctum`) |
| GET | `/user/holdings` | token holdings (`auth:sanctum`) |
| POST | `/investments/{investment}/webhook` | confirm/reject investment (calls `InvestmentController@confirm`) |

> **Note:** `/dashboard/transactions` exists in `web.php` but has **no frontend page** (`Dashboard/Transactions.tsx` missing) — Inertia 404 on direct visit.

---

## 5. Component Inventory

Only **3** reusable components exist under `resources/js/Components/` (no `components/ui` shadcn dir despite `components.json`):

| Component | Purpose |
|---|---|
| `PropertyCard.tsx` | Property grid card: image, status/blockchain badges, token price, expected ROI, **funding-progress bar**, min investment. |
| `ReturnCalculator.tsx` | 5-year ROI projection slider (rental yield + appreciation). Core investment math. |
| `DocumentsSection.tsx` | Document library: search, category filter, grid/list toggle, download/view. |

**Layouts:** `MainLayout.tsx` (public header/nav/footer, wallet connect, theme toggle, user menu), `AdminLayout.tsx` (admin sidebar).

**Reusable bits inlined (should be extracted during port):** status badges, transaction-type labels (`getStatusBadge()` duplicated in `Trade.tsx`, `Referral/Commissions.tsx`), pagination, **`formatCurrency` ×14** (see Risks). No modal/table/chart components exist (charts absent entirely).

**UI stack:** Tailwind v4 + Headless UI v2 + Heroicons v2 + lucide-react. `shadcn/ui` is configured (`components.json`) but **never used**. Reown AppKit provides wallet UI.

---

## 6. Business Logic Inventory

### 6.1 Domain entities (23 Eloquent models)
`User`, `Property`, `Investment`, `Transaction`, `TokenHolding` (ownership), `PropertyListing`, `Bid`, `Trade`, `Dividend`*, `DividendPayment`*, `KycVerification`, `PropertyDocument`, `Agent`, `Referral`, `Commission`, `CommissionWithdrawal`, `BlockchainConfig`, `Setting`. (* = orphan/unimplemented.)

### 6.2 Investment / primary purchase
- KYC gate: `InvestmentController.php:23,42`; `Setting::isKycRequired` (`Setting.php:36`).
- Validation + min/max investment: `InvestmentController.php:56-65`.
- Record creation in DB transaction: `InvestmentController.php:67-96`.
- Confirmation / holding update (avg cost basis): `InvestmentController.php:105-165` **and duplicated** `Admin/InvestmentController.php:54-118`.
- Frontend recomputes `totalCost = tokens * token_price` (`Investment/Create.tsx:79`) — duplicates backend.

### 6.3 Property / listing
- Funding progress / remaining: `Property.php:114-130` (accessors). Frontend **triplicates** the `sold/total*100` calc (`PropertyCard`, `Properties/Show`, `Properties/Index`).
- Admin CRUD + image/doc handling: `Admin/PropertyController.php:45-250`.
- `registerOnBlockchain` only stamps `token_id`/`contract_address` from **client-sent** values (`Admin/PropertyController.php:252-281`).

### 6.4 Marketplace / search / filtering
- Property search (type, location, price, blockchain, status, sort): `PropertyController.php:11-56`.
- Marketplace filters: `MarketplaceController.php:27-57`.
- Bid min-increment / current price: `PropertyListing.php:120-142`.

### 6.5 Pricing / fees / commissions
- **Platform trading fee (default 1%)** in `TradingService::createTrade`: `TradingService.php:176-178` (`Setting::get('platform_trading_fee','1')`); `seller_receives = total - fee`.
- Commission = `agent.commission_rate`; `Commission::calculateCommission = amount*rate/100` (`CommissionService.php:129`).
- **Many settings are writable but never read:** `commission_auto_approve`, `default_commission_rate`, `referral_commission_rate`, `agent_commission_rate`, `min/max_investment_global`, `default_rental_yield`, `default_appreciation_rate`, `calculator_projection_years`. Only `platform_trading_fee` + `kyc_required` are actually used.

### 6.6 Ownership transfer (secondary)
- State machine: listing `active->sold/cancelled/expired`; bid `pending->accepted/outbid/cancelled/expired`; trade `pending->processing->completed/failed`.
- `acceptBid`/`buyFixedPrice` create Trade; **token movement** (decrement seller, increment buyer, recompute avg price) in `TradingService::completeTrade` (`:199-256`).
- **Avg-cost-basis math duplicated 3x** (`InvestmentController`, `Admin/InvestmentController`, `TradingService`).
- `TradingService::expireListings()` (`:285`) **never called** — no scheduler exists.

### 6.7 Transactions / escrow
- `Transaction` ledger rows on primary purchase: `InvestmentController.php:83-94`.
- Trade acts as escrow; funds move only on `completeTrade`. **`tx_hash` is user-/admin-supplied and trusted** — no receipt validation.
- Investment webhook (`api.php`) calls `InvestmentController::confirm` but **does NOT generate primary-purchase commissions** (only the admin confirm path does) -> commissions silently lost on webhook flow.

### 6.8 On-chain business logic
- `RWAProperty.purchaseTokens(propertyId, amount)` — `safeTransferFrom(msg.sender, treasury, totalCost)` then `_mint` (`:118-141`). Core primary flow.
- `createProperty`, `adminMint`, `updateProperty`, `setTreasury`, `setPaymentToken`, `pause/unpause`, `emergencyWithdraw` — all `onlyOwner`.
- **Marketplace (list/bid/buy) has NO contract function** — fully DB-driven.

---

## 7. API / Services Inventory

### 7.1 Backend services (PHP)
| Service | Responsibility |
|---|---|
| `TradingService` | Marketplace engine: `createListing`, `placeBid`, `acceptBid`, `buyFixedPrice`, `createTrade` (fee math), `completeTrade` (ownership transfer), `cancelListing`, `expireListings` (dead). |
| `CommissionService` | `processPrimaryPurchaseCommission`, `processTradeCommission`, `registerReferral`, `getAgentStats`. |

**No `app/Helpers` / `app/Utilities` / `app/Support` directories.** No external HTTP/payment/KYC/storage API clients in PHP. Storage = `Storage::disk('public')`.

### 7.2 External integrations (legacy)
- **None wired.** No Stripe, no KYC vendor, no RPC client. Wallet signature recovery is the only crypto logic (`simplito/elliptic-php` + `kornrunner/keccak`).

### 7.3 Frontend services / libs
- `Lib/wagmi.ts` — Reown AppKit + wagmi adapter; `supportedChains` = `[sepolia, mainnet, bsc, bscTestnet]` (`:47-52`).
- React Query provider mounted but **unused**. Axios listed but **unused** (all HTTP via Inertia `router`).
- On-chain writes: `Investment/Create.tsx` (ERC20 approve + `purchaseTokens`), `Admin/Properties/Index.tsx` (`createProperty`).

### 7.4 Blockchain contracts
| Contract | Standard | Purpose | Migrate? |
|---|---|---|---|
| `RWAProperty.sol` | ERC1155 + Burnable + Supply + Ownable + Pausable + ReentrancyGuard | Fractional property token; `purchaseTokens` mints + pulls stablecoin. | **Yes (port to Foundry)** |
| `MockUSDT.sol` | ERC20 + Ownable + open faucet | Test token. | **No — exclude** |

Deployed (Sepolia only): `rwaProperty 0x3C771c8D3CA51b1BE00702b45841Ea48B7dbD9f1`, `paymentToken 0xfb4f..044a`, `treasury 0x9CB0..D00`.

---

## 8. Type Inventory

### Frontend (`resources/js/Types/index.ts`)
- `User`, `Property` (full RWA model: `total_value`, `token_price`, `total_tokens`, `available/sold_tokens`, `expected_roi`, `rental_yield`, `appreciation_rate?`, `min_investment`, `blockchain`, `contract_address?`, `token_id?`, `documents`, `status`), `PropertyDocument`, `Investment`, `Transaction`, `DashboardStats`, `PageProps`.
- **Gap:** no global `Marketplace`/`Trade`/`Commission`/`Agent`/`Holding`/`Kyc` types — re-declared per page (drift risk).

### Backend (PHP)
- **No interfaces, DTOs, or enums.** Statuses are raw strings in migrations + unchecked strings in code. Only Eloquent `casts()` / `$casts` arrays. `Commission` uses a `MorphTo` `commissionable` relation.

### Contracts (Solidity)
- `struct Property { id, uri, totalSupply, availableSupply, pricePerToken, isActive, exists }` (`RWAProperty.sol:28-36`); `IERC20 paymentToken`, `address treasury`, `uint256 propertyCount`.

---

## 9. Dependency Comparison

### 9.1 Frontend (legacy `package.json` vs Relcko `package.json`)
| Package | Legacy | Relcko | Note |
|---|---|---|---|
| react / react-dom | 19.2.3 | 19.0.0 | both v19 |
| @tanstack/react-query | ^5.90 | ^5.101 | both v5 (legacy unused) |
| viem | ^2.43 | ^2.55 | both v2 |
| wagmi | **^3.1** | **^2.19** | **major divergence** (breaking hook API) |
| tailwindcss | **^4.1** | **^3.4** | **major divergence** (CSS-first vs config) |
| typescript / postcss / autoprefixer | ^5.9 / ^8.5 / ^10.4 | ^5.7 / ^8.5 / ^10.4 | close |
| @reown/appkit (+adapter) | ^1.8 | — (RainbowKit instead) | **stack divergence** |
| @headlessui/react, @heroicons/react, lucide-react | present | lucide only | UI primitive diff |
| class-variance-authority, clsx, tailwind-merge | present | es-toolkit + cva/clsx | util diff |
| axios | ^1.13 (**unused**) | — | dead in legacy |
| framer-motion / gsap / lenis | **absent** | present (motion system) | Relcko richer |
| @rainbow-me/rainbowkit | — | ^2.2 | Relcko wallet UX |
| charts / maps / pdf / date libs | **none** | none | capability gap in both |

### 9.2 Backend (legacy `composer.json` vs Relcko)
- Legacy: **Laravel 12 + Inertia** stack; Relcko has **no PHP backend**.
- Legacy crypto PHP deps (`kornrunner/ethereum-offline-raw-tx` **unused**, `simplito/elliptic-php` only for `linkWallet`) -> likely **dead** once signing moves client-side (wagmi/viem).
- `spatie/laravel-permission` **declared but unused** (ad-hoc `is_admin` instead).

### 9.3 Contracts toolchain
- Legacy: **Hardhat ^2.19 + hardhat-toolbox ^4**, OZ `^5.0.0`.
- Relcko: **Foundry** (`foundry.toml`, forge), OZ `^5.6.1`.
- -> Consolidate on Foundry (remove duplicate Solidity pipeline).

### 9.4 Already available in Relcko to reuse
Animation (`framer-motion`/`gsap`/`lenis`), `es-toolkit`, RainbowKit wallet UX, `@openzeppelin/contracts`, Foundry tooling, centralized chain config in `.env`.

### 9.5 Unique to legacy (needs adding/porting)
Reown AppKit stack, Headless UI/Heroicons, the entire Laravel/Inertia backend, and — if needed — charting/maps/PDF libs (gap in both apps).

---

## 10. Migration Risks

### CRITICAL (fix before any reuse)
1. **`walletLogin` does not verify signature** — `AuthController.php:78-140`. Forgeable by wallet address alone. Account takeover.
2. **Unverified `tx_hash`** — backend trusts client-supplied hashes as payment proof (`InvestmentController.php:48,71-94`; `MarketplaceController.php:190-200`; `TradingService.php:137-256`; `Admin/PropertyController.php:254-280`). Forgeable investments/trades.
3. **Marketplace not on-chain** — `property_listings`/`bids`/`trades` and `TokenHolding` transfers are DB-only; ERC1155 `safeTransferFrom` never called by app -> on-chain/off-chain ownership divergence.
4. **Committed DB password** in `well-known/.env` (`DB_PASSWORD="cruA.bQnb)#5"`, `DB_DATABASE=relcko_property`). Rotate immediately.

### HIGH
5. **Mock/test contracts** (`MockUSDT` open faucet, Sepolia deployment) must not be migrated.
6. **Hardcoded Sepolia contract address + fake event-signature topic** in `Admin/Properties/Index.tsx:34,89` — mis-records `token_id`; breaks non-Sepolia chains.
7. **USDT decimals mismatch** — contract treats `pricePerToken` as raw integer; real USDT is 6-decimal on mainnet/BSC while UI assumes 18 (`Investment/Create.tsx:134` uses `payment_token_decimals` correctly, but `Admin/Properties/Index.tsx:164` hardcodes `18`).
8. **SIWE replay** — signed message has no nonce/expiry/domain binding (`AuthController.php:88-96,194-253`).
9. **Centralization (no multisig)** — `RWAProperty` is plain `Ownable`; `treasury` = deployer EOA; `emergencyWithdraw` drains to owner. No Safe/`AccessControl`.

### MEDIUM
10. **Orphan Dividend subsystem** — `Dividend`/`DividendPayment` models + migrations + read paths exist, but no code ever creates them. Migrating schema implies a feature that does not work.
11. **Duplicated logic (drift hazard):** `formatCurrency` ×14; funding-progress ×3; avg-cost-basis ×3; `KycVerification::isPending()` checks `'pending'` but records are `'submitted'` (dead/wrong method).
12. **Dead dependencies:** `spatie/laravel-permission`, `kornrunner/ethereum-offline-raw-tx`. React Query provider + axios listed but unused.
13. **Tailwind v4 <-> v3 break:** all legacy styling lives in `resources/css/app.css` (`@theme`); Relcko uses `tailwind.config.ts`. Shared component reuse requires a theme-port pass.
14. **`rwa-folder/` nested git repo** — stray/duplicate VCS; exclude from migration.
15. **No tests** for trading/commission/ownership logic (highest-risk code); `tests/` only has default stubs.

### LOW
16. **Broken favicon** — `app.blade.php` links `/favicon.svg` but only `favicon.ico` exists.
17. **APP_DEBUG=true** + `SESSION_DOMAIN=property.relcko.com` in live `.env` — config hygiene before merge.
18. **Mega-files** — `Properties/Index.tsx` (40 KB), `MainLayout.tsx` (35 KB), `app.css` (38 KB): low componentization raises porting cost.

---

## 11. Recommended Integration Order

Treat this as a **specification extraction**, not a fork. Recommended phasing:

**Phase 0 — Security & hygiene (do first, in legacy or a throwaway branch)**
- Rotate the leaked DB password in `well-known/.env`; purge secrets from any history.
- Remove `MockUSDT` and all Sepolia-only deployment artifacts from the migration scope.
- Centralize contract addresses/RPC into env (remove hardcoded `Admin/Properties/Index.tsx:34` + fake event topic `:89`).

**Phase 1 — Domain model extraction (framework-agnostic)**
- Port the 23 Eloquent models -> TypeScript domain types + Zod schemas (reuse `resources/js/Types/index.ts` as a base; add the missing `Marketplace`/`Trade`/`Commission`/`Agent`/`Holding`/`Kyc` types).
- Extract `TradingService` + `CommissionService` business rules into pure TS modules (single source of truth — kills the 3x duplication).

**Phase 2 — Backend strategy (pick one)**
- **Option A (recommended for single-stack):** Re-implement marketplace logic as **Next.js route handlers** + a Relcko DB (e.g. Prisma/Postgres). Removes the PHP/Laravel dependency entirely.
- **Option B (fastest):** Strip Inertia from Laravel, keep it as a **headless API**, and have Relcko Next.js call it. Retains PHP ops burden.

**Phase 3 — Frontend port (Next.js App Router)**
- Convert the ~60 Inertia pages into Next routes; rebuild on **Relcko's Tailwind v3 design system** (do NOT import legacy `app.css` v4 tokens).
- Unify the wallet stack to **RainbowKit + wagmi v2** (drop Reown AppKit; resolve the wagmi v3->v2 hook gap).
- Extract shared components: `PropertyCard`, `ReturnCalculator`, status badges, **single `formatCurrency` util**.

**Phase 4 — Blockchain hardening**
- Port `RWAProperty` to **Foundry** (consolidate toolchain); add **multisig/Safe** ownership + non-EOA treasury.
- Fix **USDT 6-decimal** pricing; remove the fake event-signature parsing.
- Add **on-chain verification** of `tx_hash` (RPC/explorer or indexed events) before marking investments/trades confirmed.
- Implement **marketplace settlement on-chain** (`safeTransferFrom`) so DB holdings cannot diverge from ERC1155 balances.
- Add **SIWE nonce/expiry/domain** binding.

**Phase 5 — Quality & de-risk**
- Delete orphan Dividend subsystem (or implement it properly).
- Add tests for trading/commission/ownership state machines (none exist today).
- Wire `expireListings` to a scheduler/command.
- CI: lint, typecheck, contract tests (Foundry), e2e.

**Migration order summary:** Security -> Domain types -> Backend (A/B) -> Frontend port -> Blockchain hardening -> Tests/CI. Do NOT lift-and-shift files; the value is the domain model and contract logic, rebuilt on Relcko's stack.

---

*Generated from static analysis only. No files in `legacy-marketplace/` were modified. No code was generated.*
