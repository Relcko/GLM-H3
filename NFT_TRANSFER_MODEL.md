# NFT Transfer Model — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `NFT_TYPES.md`,
`NFT_OWNERSHIP_MODEL.md`, `NFT_STATE_MACHINE.md`. Architecture only.

Defines transfer kinds, the transfer-validation predicate (compliance gating),
royalty enforcement at transfer, blacklist/freeze handling, and recovery. No code.

---

## 1. Transfer kinds

| Kind | Description | Standard families |
|------|-------------|-------------------|
| **Primary mint** | issuance to first owner (not a transfer). | all |
| **Secondary transfer** | owner → buyer via sale. | T / D / L |
| **Gift / send** | owner → recipient, no payment. | T / D / L |
| **Delegation** | voting power delegated without ownership move (Voting Power NFT). | L/T |
| **Split / Merge** | internal unit reallocation (D family). | D |
| **Upgrade / Fusion / Evolution** | state change, may move/merge ownership. | all |

Soulbound (S) families **reject all transfer kinds** except those initiated by the
issuer/compliance (revoke, expire).

---

## 2. Transfer-validation predicate

Evaluated **at transfer time** (pure function; no tree mutation, mirroring
Network Engine compression):

```
validateTransfer(asset, from, to):
  if asset.frozen:                         REJECT (Frozen)
  if not asset.transferable (S):           REJECT (Soulbound)
  if to in blacklist:                      REJECT (Blacklisted)
  if requiresKYC and not to.kycVerified:   REJECT (KYC)
  if requiresAccredited and not to.accredited: REJECT (Accredited)
  if whitelist and to not in whitelist:    REJECT (Whitelist)
  if geoRestrict and to.geo blocked:       REJECT (Geo)
  if holdingCapExceeded(asset, to):        REJECT (Cap)
  if not onchainReconciled(asset):         REJECT (Unreconciled)
  return ACCEPT
```

- On REJECT → `TransferRejected` + `AuditLog` (19); sale/offer rolled back.
- Predicate inputs: `NFTCompliance` (NFT-9), `KYC` (13), `Investor` (4),
  `Wallet` (17), blacklist store, geo rules.

---

## 3. Royalty & fee enforcement at transfer

On an accepted transfer that is a **sale**:
- Compute `royaltyDue = price × RoyaltyConfig.creatorRoyaltyBps`.
- Compute `agentReward = price × RoyaltyConfig.agentRewardBps` (Network Engine
  NFT bonus, routed to seller's agent if referred).
- Compute `marketplaceFee = price × RoyaltyConfig.marketplaceFeeBps`.
- Compute `treasuryBps` allocation.
- All settled via `Payment` (18) + Treasury (`NFT_ROYALTY_ENGINE.md`).
- `RoyaltiesPaid` emitted; `Commission` (11) recorded for agent.

Gift/split/merge/upgrade transfers are **not** sales → no royalty/fee (by config).

---

## 4. Blacklist & freeze

- **Blacklist:** addresses/accounts barred from receiving (sanctions, fraud,
  `ComplianceFlagRaised`). Evaluated in predicate.
- **Freeze:** `NFTCompliance.freeze = true` disables transfer for an asset (or all
  assets of a collection/owner under emergency). Set by Compliance/Emergency only.
  Emits `NFTFrozen`; cleared by `NFTUnfrozen`.

---

## 5. Recovery

- **Lost-key recovery:** verified owner (via Identity/KYC NFT + Document Vault)
  requests re-assignment to a new wallet. Dual-control (Compliance + Admin),
  append-only in `AuditLog` (19). The old wallet's NFTs are frozen during recovery.
- **Erroneous transfer:** reversal only via admin dual-control + offsetting entry
  (never edits history).
- Recovery never bypasses compliance for the new owner.

---

## 6. Emergency controls

- **Global pause:** halts all transfers (circuit breaker) — set by Super Admin /
  Treasury multi-sig. Emits `SystemPaused` (canonical) + `NFTFrozen` per affected.
- **Collection pause:** freezes one collection.
- All emergency actions mirrored to `AuditLog` (19) and observable in Admin Portal.

---

## 7. Integration

| Domain | Transfer touchpoint |
|--------|---------------------|
| Treasury | royalty/fee settlement. |
| Network Engine | agent NFT bonus (Commission 11). |
| Compliance | blacklist/freeze/KYC gating. |
| Document Vault | recovery identity proof. |
| Marketplace Engine | sale-driven transfers. |
| Governance | delegation of Voting Power NFT. |
| AI Copilot | read-only transfer explainability. |

---

## 8. Scalability

- Predicate is O(1) lookups; evaluated per transfer only.
- Blacklist/whitelist stored as indexed sets; geo rules cached.
- At scale, freeze/pause are broadcast flags consumed by all transfer validators;
  audit trail append-only.
