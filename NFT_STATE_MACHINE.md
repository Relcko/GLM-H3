# NFT State Machine — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `NFT_DOMAIN_MODEL.md`.
Architecture only.

Defines the lifecycle states for an NFT asset, a collection, a listing/offer, and
an auction. States are explicit; every transition is event-sourced and audited.

---

## 1. Asset lifecycle

```
                 MINTED
                   │
        ┌──────────┼───────────────┐
        │          │               │
     (listed)   (frozen)        (redeemed, ownership NFT only)
        │          │               │
     LISTED     FROZEN          REDEEMED
        │          │               │
   ┌────┴────┐     │               │
   │         │     │               ▼
 OFFER/   INSTANT  │            BURNED (legal title transferred)
 AUCTION    BUY     │
   │         │      │
   └────┬────┘      │
        ▼           │
      SOLD ────────► TRANSFERRED ─────► OWNED
        │                                  │
        └──────── (relist) ────────────────┘
                   │
              DELISTED ──► LISTED
                   │
              FROZEN ──► UNFROZEN ──► (prior state)
                   │
              BURNED (terminal, except redeem path)
```

| State | Meaning |
|-------|---------|
| **MINTED** | freshly issued, owner = minter. |
| **LISTED** | active primary/secondary ask. |
| **SOLD** | a sale executed; pre-transfer. |
| **TRANSFERRED** | ownership moved to buyer. |
| **OWNED** | resting in a wallet, not listed. |
| **DELISTED** | removed from market, still owned. |
| **FROZEN** | transfer disabled by compliance/emergency. |
| **REDEEMED** | ownership NFT surrendered for legal title (property only). |
| **BURNED** | destroyed (terminal). |

---

## 2. Collection lifecycle

```
PROPOSED → VERIFIED → FEATURED|NORMAL → ARCHIVED
                         │
                    TRENDING (derived score, non-state)
```
- `VERIFIED` requires `Document Verification` + creator KYC (compliance).
- `FEATURED` set by platform curation (admin).
- `ARCHIVED` hides from discovery but preserves ownership.

---

## 3. Listing / Offer lifecycle

```
LISTING:  CREATED → ACTIVE → (FILLED → NFTSale) | EXPIRED | CANCELLED
OFFER:    CREATED → ACTIVE → (ACCEPTED → NFTSale) | EXPIRED | DECLINED
```

---

## 4. Auction lifecycle

```
CREATED → OPEN (bids accepted) → ENDING (reserve met?) →
   ├─ SETTLED (reserve met → NFTSale) 
   └─ CANCELLED (reserve not met / emergency)
```

---

## 5. Fractional split / merge (D family)

```
ONE FRACTIONAL NFT (N units)
   SPLIT ──▶ N child NFTs (each entitlementBps = 100/N)
   MERGE ──▶ N child NFTs ──▶ ONE parent NFT (sum entitlementBps = 100)
```
- Split/merge preserve total `entitlementBps = 100` (conservation invariant).
- Children inherit `sourceRef` (Property/SPV) and compliance from parent.

---

## 6. Upgrade / Fusion / Evolution (economics)

```
UPGRADE:  base NFT + criteria met ──▶ higher-tier NFT (e.g., Membership Silver→Gold)
FUSION:   N NFTs + recipe ──▶ 1 composite NFT
EVOLUTION: time/event-gated metadata/state change (dynamic), same tokenId
```
- All three are terminal-state transitions that emit `NFTUpgraded` /
  `NFTFused` / `NFTEvolved` and re-anchor metadata hash.

---

## 7. Transition guards

| Transition | Guard |
|------------|-------|
| MINTED → LISTED | asset not frozen; listing allowed for standard family. |
| LISTED → SOLD | valid payment + royalty computed. |
| SOLD → TRANSFERRED | transfer-validation predicate passes (`NFT_TRANSFER_MODEL.md`). |
| → FROZEN | compliance/emergency only. |
| → BURNED | owner action or redeem (ownership) or admin (illegal). |
| → REDEEMED | only Property Ownership NFT; legal title confirmed. |

---

## 8. Event mapping (extension)

Each transition emits an event defined in `NFT_EVENT_EXTENSION.md`
(`NFTMinted`, `NFTListed`, `NFTSold`, `NFTTransferred`, `NFTBurned`,
`NFTRedeemed`, `NFTUpgraded`, `NFTFused`, `NFTEvolved`, `NFTFrozen`, …). All mirror
to `AuditLog` (19).
