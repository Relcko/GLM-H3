# NFT Ownership Model — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `OWNERSHIP_MODEL.md`,
`NFT_TYPES.md`, `DOMAIN_MODEL.md` (1 Property, 2 PropertyFraction, 7 Ownership,
15 SPV). Architecture only.

Defines how NFTs represent **real-world and fractional property ownership**, how
on-chain token state reconciles with the locked `Ownership` (7) / `PropertyFraction`
(2) / `SPV` (15) records, and the redemption/burn semantics.

---

## 1. Ownership representation

| Real asset | Token | Locked linkage |
|------------|-------|----------------|
| Whole property (legal) | **Property Ownership NFT** (L) | `SPV` (15) is the legal wrapper; NFT is the digital title. 1 property = 1 SPV = 1 NFT (or N NFTs for syndicated SPV). |
| Fraction of property | **Fractional Ownership NFT** (D) | `Ownership` (7) + `PropertyFraction` (2). 1 fraction unit = 1 NFT unit with `entitlementBps`. |
| Income rights | **Rental Income / Dividend NFT** (D/T) | entitlement to `Rewards` (16) distributions. |

Principle: the NFT is the **digital ownership layer**; the locked `Ownership`
record is the ledger-of-record that the NFT must reconcile to.

---

## 2. Primary mint ↔ ownership allocation

```
Marketplace InvestmentConfirmed
   → Ownership Allocation (OWNERSHIP_MODEL)
   → Fractional Ownership NFT minted (D)  [NFTMinted]
   → NFTFractionUnit per token holding (entitlementBps)
```
- Mint is **atomic** with `OwnershipMinted` (`MARKETPLACE_EVENT_EXTENSION.md`):
  no NFT without ownership, no ownership without NFT.
- `NFTAsset.sourceRef → Ownership` (7) and `PropertyFraction` (2).

---

## 3. Secondary trading ↔ ownership transfer

```
NFTSaleCompleted (secondary)
   → NFTTransferred (buyer receives Fractional Ownership NFT)
   → Ownership delta updated (OWNERSHIP_MODEL § secondary)
   → Commission (11) for agent NFT bonus
   → Portfolio & Governance recompute
```
- On-chain transfer is the source of truth; off-chain `Ownership` must match
  (fixes legacy DB↔chain divergence — `DOMAIN_MODEL.md` rule on
  `MarketplaceSale` settling on-chain).

---

## 4. Fraction splitting & merging

- **Split:** one D-NFT (100 units) → N child D-NFTs, each `entitlementBps = 100/N`.
  Total entitlement conserved. Used for gifting/partial sale.
- **Merge:** N child D-NFTs (same `sourceRef`, sum 100) → one parent D-NFT.
- Both preserve `entitlementBps` sum = 100 and the `sourceRef` to `Property` (1)/
  `SPV` (15).
- Merge/split recomputes `Ownership` (7) unit holdings consistently.

---

## 5. Rental distribution & dividend rights

- Rental Income NFT / Dividend NFT carry `entitlementBps` over the property's
  income stream.
- On each `Rewards` (16) distribution, the Dividend Center routes payout to the
  current NFT holder (read from `NFTFractionUnit.ownerId`).
- Transfer of the income NFT transfers future entitlement (no clawback of past
  distributions).

---

## 6. Transfer restrictions & compliance

Per `NFTCompliance` (NFT-9):
- Property Ownership / Exclusive Allocation / Voting Power are **L** (lockable):
  transfer requires KYC (13) + accreditation (if regulated) + whitelist + geo check.
- Fractional Ownership (D) transfer is open to verified investors but may carry
  holding caps (per property).
- All restrictions evaluated by `NFT_TRANSFER_MODEL.md` transfer-validation.

---

## 7. Ownership verification

- Verification = on-chain `NFTAsset.ownerId` matches `Wallet` (17) AND reconciles
  to `Ownership` (7) `token_holdings`.
- Mismatch → `ComplianceFlagRaised`; frozen until reconciled (`NFT_SECURITY_MODEL.md`).
- Property Ownership NFT verification additionally checks `SPV` (15) legal status.

---

## 8. Redemption & burn

- **Redemption (Property Ownership NFT only):** holder surrenders the NFT to claim
  legal title via `SPV` (15). On confirmation → state REDEEMED → BURNED. Legal
  title transferred off-platform; token destroyed.
- **Burn (general):** owner-initiated destruction (e.g., merged, expired, revoked
  license). Terminal; recorded in `AuditLog` (19).
- Burn never silently changes `Ownership` (7) — redemption is the only path that
  alters legal ownership, and it is gated by compliance + SPV confirmation.

---

## 9. Integration

| Domain | Use |
|--------|-----|
| Marketplace | mint on invest; secondary trade. |
| Portfolio | NFT ownership composes investor view. |
| Governance | Voting Power NFT from Ownership. |
| Dividend Center | income entitlement routing. |
| Global Property Map | ownership/access layer. |
| Network Engine | NFT bonus on sales; NFT score. |
| Treasury | settlement + royalty on trade. |
