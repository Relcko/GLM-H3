# Domain Model — Relcko Marketplace (V1.1.1)

**Prepared by:** Principal Software Architect, Relcko
**Date:** 2026-07-14
**Status:** Architecture only — framework-agnostic. No Laravel, Next.js, or React assumptions. No application code.
**Source of truth:** `legacy-marketplace/well-known` (treated as functional specification per the V1.1.0 audit).

This document defines the complete business domain for the future Relcko Marketplace. Each entity specifies **Purpose, Primary fields, Relationships, Lifecycle, Business rules, Validation rules**. Entities marked **[NEW]** are not present (or only partially present) in the legacy app and are recommended additions for the target domain.

---

## 1. Property

**Purpose:** A tokenized real-world asset (real estate) offered for fractional investment. The atomic investable asset.

**Primary fields:** id, slug, name, description, location, asset_type (residential/commercial/land), total_value (fiat/stable), token_price (per fraction), total_tokens, available_tokens, sold_tokens, expected_roi (%), rental_yield (%), appreciation_rate (%), min_investment, blockchain, contract_address, token_id (on-chain id), status, images[], created_at, updated_at.

**Relationships:** has many Investments; has many Ownerships (via fractions); has many MarketplaceListings; has many Documents; may have a Rewards schedule; belongs to an SPV (legal wrapper).

**Lifecycle:** `draft` -> `upcoming` -> `active` -> `sold_out` | `closed`.

**Business rules:**
- Funding progress = sold_tokens / total_tokens.
- New investments are rejected once `sold_tokens == total_tokens` (status `sold_out`).
- `min_investment` enforces the smallest ticket per investor.
- `token_price` and supplies drive all investment math.

**Validation rules:**
- total_tokens > 0; available_tokens <= total_tokens; sold_tokens <= total_tokens.
- token_price > 0; min_investment <= total_value.
- status within the enumerated set; status transitions are directional (no `closed` -> `active`).

---

## 2. PropertyFraction

**Purpose:** The security token representing one Property's fractional shares (ERC1155 id in the legacy contract). Separates the *legal/physical asset* (Property) from its *tokenized representation*.

**Primary fields:** id, property_id, token_id (on-chain), standard (e.g. ERC1155), total_supply, available_supply, price_per_token, payment_token (address + decimals), metadata_uri, is_active, paused.

**Relationships:** belongs to Property; is the basis for Ownership (token holdings), Investments, and MarketplaceListings/Sales; referenced by Payment (on-chain transfers).

**Lifecycle:** `created` (on-chain `createProperty`) -> `active` -> `paused` | `retired`.

**Business rules:**
- Each Property has exactly one Fraction (1:1); the fraction's `token_id` is the on-chain property id.
- `available_supply` must equal `total_supply - sum(Ownership.quantity)` at all times.
- `price_per_token` must reflect the payment token's decimals (USDT = 6, not 18 — a legacy bug to correct).

**Validation rules:**
- total_supply > 0; available_supply >= 0 and <= total_supply.
- payment_token decimals explicitly declared; price computed in payment-token minor units.
- metadata_uri present before `active`.

---

## 3. Investment

**Purpose:** A primary-market purchase of fractions directly from the platform (mint/new issuance), distinct from a secondary MarketplaceSale.

**Primary fields:** id, investor_id, property_id, fraction_id, tokens (quantity), amount (fiat/stable), currency, tx_hash, status, created_at.

**Relationships:** belongs to Investor; belongs to Property and Fraction; creates a Transaction; on confirmation updates Ownership (avg cost basis); may generate a Commission (agent).

**Lifecycle:** `pending` -> `processing` -> `confirmed` | `failed` -> `refunded` (on failure after processing).

**Business rules:**
- KYC must be approved before investment (if global KYC required).
- amount == tokens * fraction.price_per_token.
- tokens <= property.available_tokens.
- On `confirmed`: decrement Property/Fraction available supply, create/update Ownership, append Transaction.
- Commission generation must occur on BOTH the webhook and admin confirm paths (legacy bug: only admin path generates it).

**Validation rules:**
- tokens integer > 0; amount > 0; currency within allowed set (USDT / native).
- tx_hash format valid (0x…64) and, in target, **on-chain verified** (legacy trusted it blindly).
- investor eligible (not suspended/banned, KYC approved).

---

## 4. Investor

**Purpose:** An end user who funds investments and holds fractions. The central actor.

**Primary fields:** id, name, email, wallet_address, status, is_admin, kyc_status (derived), created_at.

**Relationships:** has many Investments, Ownerships, Portfolio (aggregate), Transactions, Referrals (as referred), Wallet, Payments, AuditLogs; may be an Agent.

**Lifecycle:** `registered` -> `kyc_pending` -> `active`; can be `suspended` | `banned`.

**Business rules:**
- Unique email; wallet optional until linked.
- Investing requires `active` status + approved KYC.
- `is_admin` gates admin surfaces (legacy used an ad-hoc boolean + middleware — target should use a proper role/permission model).
- Fiat `balance` concept in legacy is confusing and largely unused — exclude from target unless a real fiat wallet is required.

**Validation rules:**
- email unique and well-formed; status within enumerated set.
- wallet_address unique if present and correctly checksummed.
- Suspended/banned investors cannot start new investments or listings.

---

## 5. MarketplaceListing

**Purpose:** A secondary-market offer to sell fractions already owned by an investor (fixed-price or auction).

**Primary fields:** id, seller_id, property_id, fraction_id, token_holding_id, listing_type (fixed | auction), price (fixed) or min_bid/quantity (auction), current_price, quantity, status, expires_at.

**Relationships:** belongs to Seller (Investor), Property, Fraction, source Ownership (TokenHolding); has many Bids (auction); results in a MarketplaceSale (Trade).

**Lifecycle:** `active` -> `sold` | `cancelled` | `expired`.

**Business rules:**
- Seller must own >= quantity of the fraction (locked in the holding).
- Auction: each new bid must exceed `min_next_bid` (typically prior bid + increment).
- `expires_at` auto-expire must be driven by a scheduler (legacy `expireListings()` was never called).
- Fixed-price sale executes immediately on buyer accept (`buyFixedPrice`).

**Validation rules:**
- quantity > 0 and <= holding.quantity.
- price > 0; for auction, min_bid > 0 and increment enforced.
- Only one active listing per holding slice; no double-spend of the same fractions.

---

## 6. MarketplaceSale

**Purpose:** A settled secondary trade (the executed transaction behind a listing/bid). Legacy called this `Trade`.

**Primary fields:** id, listing_id, bid_id (auction only), seller_id, buyer_id, property_id, fraction_id, quantity, total_amount, platform_fee, seller_receives, tx_hash, status.

**Relationships:** belongs to Listing, optional Bid, Seller, Buyer, Property, Fraction; creates a Transaction; triggers Commission (buyer + seller); moves Ownership.

**Lifecycle:** `pending` -> `processing` -> `completed` | `failed` -> `refunded` (on failure).

**Business rules:**
- `platform_fee = total_amount * platform_trading_fee%` (default 1%, configurable in Settings).
- `seller_receives = total_amount - platform_fee`.
- On `completed`: decrement seller Ownership, increment buyer Ownership (recompute avg cost), append Transaction, generate Commissions.
- **Target must settle on-chain** (`safeTransferFrom`) so DB ownership cannot diverge from the token contract (legacy never called the chain).

**Validation rules:**
- total_amount > 0; fee within configured bounds; seller_receives == total_amount - fee.
- buyer != seller; both eligible (KYC/status).
- tx_hash present and on-chain verified in target.

---

## 7. Ownership

**Purpose:** The record of an investor's fractional holding in a Property/Fraction (the unit of ownership). Legacy model: `TokenHolding`.

**Primary fields:** id, investor_id, property_id, fraction_id, quantity, avg_cost_basis, current_value, profit_loss, ownership_percentage.

**Relationships:** belongs to Investor, Property, Fraction; aggregated into Portfolio; source for MarketplaceListing quantity.

**Lifecycle:** `created` (on investment confirm) -> `increased` (secondary buy) / `decreased` (secondary sell) -> `zeroed` (fully sold).

**Business rules:**
- `ownership_percentage = quantity / fraction.total_supply`.
- `avg_cost_basis` recomputed on every acquisition (weighting by amount) — must be a single shared implementation (legacy duplicated this 3x).
- `current_value` derived from current fraction price; `profit_loss = current_value - cost_basis`.

**Validation rules:**
- quantity >= 0; never negative.
- No ownership mutation outside an Investment confirm or MarketplaceSale completion.
- Decrement never exceeds current quantity (prevent oversell).

---

## 8. Portfolio

**Purpose:** An investor's aggregate view of all holdings, value, and performance. A **read model** composed from Ownership, Investment, Transaction, and Rewards.

**Primary fields:** investor_id, total_invested, total_current_value, total_profit_loss, profit_loss_pct, holdings[] (property_id, quantity, value, pnl), diversification_metrics.

**Relationships:** composes Investor's Ownerships, Investments, Transactions, Rewards, Payments.

**Lifecycle:** evolves continuously as events occur (investment confirmed, sale completed, reward distributed). Not independently stored; recomputed or projected.

**Business rules:**
- `total_current_value = sum(Ownership.current_value)`.
- `total_profit_loss = total_current_value - total_invested`.
- `profit_loss_pct = total_profit_loss / total_invested * 100`.
- Must reconcile exactly with the Transaction ledger and Ownership sums (no silent divergence).

**Validation rules:**
- Derived values must be internally consistent (holdings sum == totals).
- Recompute triggered on every ownership/transaction mutation.

---

## 9. Transaction

**Purpose:** The immutable ledger of all money/value movements (purchase, sale, dividend, withdrawal, refund). The system of record for audit.

**Primary fields:** id, investor_id, property_id (opt), investment_id (opt), sale_id (opt), type, amount, currency, tx_hash, status, timestamp.

**Relationships:** belongs to Investor; optionally references Property, Investment, or MarketplaceSale; never references mutable aggregates.

**Lifecycle:** `pending` -> `confirmed` | `failed` (append-only; no edits/deletes).

**Business rules:**
- Every Investment confirm, MarketplaceSale completion, Reward payout, and refund appends a Transaction.
- `tx_hash` is **on-chain verified** in target (legacy trusted client-supplied hashes).
- Fiat balance changes (if any) MUST append a Transaction — legacy `User.addBalance` omitted this (gap).

**Validation rules:**
- type within enumerated set; amount > 0; currency allowed.
- Once `confirmed`, immutable (corrections via offsetting entries, not edits).
- All state-changing actions also write an AuditLog entry.

---

## 10. Referral

**Purpose:** The linkage between an Agent and a referred Investor, enabling commission attribution.

**Primary fields:** id, agent_id, referred_user_id, code, status, created_at.

**Relationships:** belongs to Agent; belongs to referred Investor.

**Lifecycle:** `pending` -> `active` | `expired`.

**Business rules:**
- Generated when an Investor registers with an agent's referral code.
- Only one active Referral per referred Investor.
- Drives Commission generation on the referred Investor's investments/sales.

**Validation rules:**
- code matches an active Agent code; referred_user unique per agent.
- status transitions directional; `expired` is terminal.

---

## 11. Commission

**Purpose:** A fee owed to an Agent for referring business (primary purchase and/or secondary trades). Legacy model: `Commission`.

**Primary fields:** id, agent_id, referral_id, user_id (the transacting investor), commissionable_type, commissionable_id (polymorphic: Investment or MarketplaceSale), transaction_type (primary_purchase | secondary_buy | secondary_sell), amount, rate, status.

**Relationships:** belongs to Agent; belongs to Referral; polymorphic link to Investment or MarketplaceSale.

**Lifecycle:** `pending` -> `approved` -> `paid` | `cancelled`.

**Business rules:**
- `amount = base_amount * agent.commission_rate / 100` (single source: `agent.commission_rate`; legacy had many unused competing settings).
- Generated for BOTH webhook and admin confirm paths (fix legacy gap where webhook path omitted primary-purchase commission).
- Paid out via Agent withdrawal; reduces `withdrawn_earnings`.

**Validation rules:**
- rate within configured bounds; amount == base * rate/100 (recompute server-side, do not trust client).
- status transitions require proper actor (admin approves/pays).

---

## 12. Agent

**Purpose:** A referral/affiliate partner who earns commissions. Legacy model: `Agent`.

**Primary fields:** id, user_id, code (unique), status, commission_rate, total_earnings, withdrawn_earnings, created_at.

**Relationships:** belongs to User; has many Referrals, Commissions, CommissionWithdrawals.

**Lifecycle:** `pending` -> `active` -> `suspended` | `terminated`.

**Business rules:**
- Unique referral `code`; `commission_rate` is the authoritative rate for all derived Commissions.
- Earnings accrue from Commission; `withdrawn_earnings` tracks payouts.
- Terminated agents stop earning on new transactions.

**Validation rules:**
- code unique and well-formed; rate within [0, max_rate].
- status transitions require admin authority.

---

## 13. KYC

**Purpose:** Identity/eligibility verification required before investing (when enabled). Legacy model: `KycVerification`.

**Primary fields:** id, investor_id, document_refs[], status, submitted_at, reviewed_at, verifier_id.

**Relationships:** belongs to Investor; reviewed by Verifier (admin).

**Lifecycle:** `submitted` -> `pending`/`in_review` -> `approved` | `rejected`. (Fix legacy `isPending()` which checked `'pending'` while records were created as `'submitted'` — method was dead/wrong.)

**Business rules:**
- If global KYC required (`Setting.kyc_required`), Investment is blocked until `approved`.
- Re-submission allowed after rejection.

**Validation rules:**
- status within enumerated set; documents present before `submitted`.
- Only `approved` unblocks investing; reviewer cannot be the subject.

---

## 14. Documents

**Purpose:** Legal/financial/operational files attached to a Property (or KYC). Legacy model: `PropertyDocument`.

**Primary fields:** id, property_id (or investor_id for KYC), uploader_id, category, filename, url, size, is_public, uploaded_at.

**Relationships:** belongs to Property (or Investor for KYC); uploaded by Uploader.

**Lifecycle:** `uploaded` -> `public` | `private` (access-controlled).

**Business rules:**
- Categories: legal, financial, title, inspection, KYC, etc.
- `is_public` controls anonymous vs auth-gated access.
- Download/view served through an authorized endpoint (legacy had open `/documents/{id}/download`).

**Validation rules:**
- category within set; file type/size within policy.
- Public docs must not contain PII/KYC data.

---

## 15. SPV  **[NEW]**

**Purpose:** Special Purpose Vehicle — the legal entity that holds the real-world property so that fraction tokens represent a compliant claim on a defined asset. **Not present in legacy; required for real-estate tokenization compliance.**

**Primary fields:** id, property_id, legal_name, jurisdiction, registration_number, governing_document_url, bank_account_ref, status, formed_at, dissolved_at.

**Relationships:** owns/holds the Property (Property belongs to SPV); supplies the legal backing referenced by Documents and KYC.

**Lifecycle:** `formed` -> `active` -> `dissolved` (on asset exit/liquidation).

**Business rules:**
- Every Property offered to retail investors should be wrapped by an SPV for liability isolation and regulatory clarity.
- SPV legal name/registration must match Documents and on-chain metadata.

**Validation rules:**
- legal_name + jurisdiction + registration_number unique and verified.
- status transitions require legal/compliance sign-off.

---

## 16. Rewards  **[NEW — legacy Dividend was orphaned]**

**Purpose:** Periodic income distributions (rent/dividend yield) paid to fraction holders. Legacy had `Dividend`/`DividendPayment` models and read paths but **never created them** — define as a first-class target entity.

**Primary fields (schedule):** id, property_id, period, total_amount, per_token_amount, currency, status.
**Primary fields (payment):** id, reward_id, investor_id, amount, status.

**Relationships:** belongs to Property; pays Investors proportional to Ownership; appends Transactions.

**Lifecycle:** `scheduled` -> `processing` -> `completed` | `cancelled`.

**Business rules:**
- `per_token_amount * holding.quantity = investor payout` (prorated by Ownership at snapshot).
- Snapshot Ownership at schedule time to avoid mid-distribution drift.
- Payouts append a Transaction and reduce distributable yield.

**Validation rules:**
- total_amount == sum(payments); per_token_amount > 0.
- Only `completed` rewards post Transactions.

---

## 17. Wallet

**Purpose:** An investor's linked blockchain wallet used for login (SIWE) and on-chain payments. Legacy: `wallet_address` on User + `linkWallet`.

**Primary fields:** id, investor_id, address, chain_id, verified (signature-verified), linked_at.

**Relationships:** belongs to Investor; used by WalletLogin, Payments, and on-chain writes.

**Lifecycle:** `linked` -> `verified` | `unverified`.

**Business rules:**
- Address must be unique across investors.
- **Signature must be verified** on link AND login — legacy `walletLogin` did NOT verify the signature (critical vuln; forgeable by address). Add nonce/expiry/domain binding (SIWE) to prevent replay.
- Multiple chains allowed; primary chain drives default payment token.

**Validation rules:**
- address checksum-valid; chain_id known.
- Login rejected if signature invalid or replayed (missing nonce/expiry in legacy).

---

## 18. Payment

**Purpose:** A fiat or stablecoin payment backing an Investment or MarketplaceSale (and commissions/withdrawals). Legacy: scattered across Investment.amount/currency, Transaction, CommissionWithdrawal.

**Primary fields:** id, payer_id, payee_id, amount, currency, method (onchain_stablecoin | fiat | native), tx_hash, status, related_investment_id (opt), related_sale_id (opt), related_withdrawal_id (opt).

**Relationships:** belongs to payer Investor (and payee: platform treasury / seller / agent); references Investment or MarketplaceSale; produces a Transaction.

**Lifecycle:** `initiated` -> `pending` -> `settled` | `failed` -> `refunded`.

**Business rules:**
- On-chain payments require **verified** `tx_hash` (target must validate on chain).
- Fiat payments integrate a processor (Stripe/etc. — absent in legacy) and webhook settlement.
- amount/currency must match the referenced Investment/Sale exactly.

**Validation rules:**
- amount > 0; currency within allowed set; method within set.
- settled only after on-chain/fiat confirmation; idempotent per reference.

---

## 19. AuditLog  **[NEW]**

**Purpose:** Immutable compliance/audit trail of every state-changing action. **Absent in legacy** (e.g. `User.addBalance` ignored descriptions and recorded no Transaction) — required for a financial marketplace.

**Primary fields:** id, actor_id, action, entity_type, entity_id, before (snapshot), after (snapshot), ip, user_agent, timestamp.

**Relationships:** polymorphic over all entities (Investment, MarketplaceSale, Ownership, KYC, Commission, Agent, Payment, Wallet, etc.).

**Lifecycle:** `appended` only (never updated/deleted).

**Business rules:**
- Every mutation (invest, list, bid, sell, confirm, approve KYC, pay commission, change balance) writes an AuditLog + Transaction where value moves.
- Retained for regulatory/compliance duration.

**Validation rules:**
- actor, action, entity refs mandatory; before/after captured atomically with the mutation.
- No edit/delete paths.

---

*All 19 entities above are framework-agnostic. Field names are logical, not column names. Map them to your persistence layer (SQL/NoSQL/prisma) and transport (Next route handlers / GraphQL) during implementation — no code is generated here.*
