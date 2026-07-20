# NFT Event Extension — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `EVENT_ARCHITECTURE.md`
(canonical catalog), `MARKETPLACE_EVENT_EXTENSION.md`. Architecture only.

This document **extends** the canonical `EVENT_ARCHITECTURE.md` with NFT-specific
events only. It does not replace the locked catalog; the rules there (transport,
idempotency, ordering, audit mirroring) all apply. The locked file already declares
`NFTMinted`, `NFTListed`, `NFTSold`, `NFTTransferred`, `RoyaltiesPaid` — these are
reaffirmed here and expanded with their full producer/consumer mapping, plus the
additional NFT events.

---

## 1. Mandated NFT events (this milestone)

Each event lists `producer`, `consumers`, and core `payload`.

### NFTCreated
- **Producer:** Platform/Collection manager. **Consumers:** Marketplace Engine,
  Discovery. **Payload:** `collectionId, category, standardFamily, creatorId, verified`.

### NFTMinted
- **Producer:** Primary market / system (rank, achievement, KYC, etc.).
- **Consumers:** Portfolio, Network Engine (NFT score), Governance, Dividend
  Center, Global Map, AuditLog.
- **Payload:** `assetId, collectionId, ownerId, type, tokenId, sourceRef`.

### NFTListed
- **Producer:** Marketplace Engine. **Consumers:** Discovery, Watchlist,
  Notification. **Payload:** `listingId, assetId, price, currency, kind`.

### NFTDelisted
- **Producer:** Marketplace Engine. **Consumers:** Discovery, Watchlist.
- **Payload:** `listingId, assetId, reason`.

### NFTOfferCreated / NFTOfferAccepted
- **Producer:** Marketplace Engine. **Consumers:** Seller, Notification,
  Discovery. **Payload:** `offerId, assetId, offererId, price, expiresAt`.

### NFTAuctionStarted / NFTAuctionBid / NFTAuctionEnded
- **Producer:** Marketplace Engine. **Consumers:** Discovery, Notification,
  Treasury (on settle). **Payload:** `auctionId, assetId, reservePrice, bidId?, winnerId?`.

### NFTSold
- **Producer:** Marketplace Engine (on fill). **Consumers:** Transfer model,
  Royalty engine, Treasury, Commission (agent), Portfolio.
- **Payload:** `saleId, listingId, assetId, buyerId, sellerId, price, currency`.

### NFTTransferred
- **Producer:** Transfer model (on accepted transfer). **Consumers:** Portfolio,
  Governance (VotingPowerUpdated if voting), Network Engine (NFT score), Dividend
  Center (entitlement), Global Map, AuditLog.
- **Payload:** `assetId, fromId, toId, transferKind`.

### RoyaltiesPaid
- **Producer:** Royalty engine / Treasury. **Consumers:** Treasury, Network Engine
  (agent reward → Commission), Creator, AuditLog.
- **Payload:** `saleId, creatorAmt, agentAmt, feeAmt, treasuryAmt`.

### NFTFrozen / NFTUnfrozen
- **Producer:** Security/Compliance. **Consumers:** Transfer model, Marketplace
  (hide), Admin, AuditLog. **Payload:** `assetId|collectionId|ownerId, reason`.

### NFTBurned
- **Producer:** Transfer model / owner / redeem. **Consumers:** Portfolio,
  AuditLog. **Payload:** `assetId, reason`.

### NFTRedeemed
- **Producer:** Ownership model (property title claim). **Consumers:** SPV/Legal,
  AuditLog. **Payload:** `assetId, propertyId, spvId`.

### NFTUpgraded / NFTFused / NFTEvolved
- **Producer:** Royalty engine / system. **Consumers:** Portfolio, Network Engine
  (if rank/membership), AuditLog. **Payload:** `assetId, fromTier?, recipe?, newState`.

### NFTAccessGranted
- **Producer:** System (membership/access/allocation). **Consumers:** Marketplace
  (privileges), Governance (multiplier), Global Map, Treasury (rewards).
- **Payload:** `assetId, benefitType, targetRef`.

### NFTMetadataUpdated
- **Producer:** Royalty engine (dynamic). **Consumers:** Discovery, Portfolio,
  Dividend Center. **Payload:** `assetId, version, contentHash`.

### NFTBlacklisted
- **Producer:** Security/Compliance. **Consumers:** Transfer model, Admin,
  AuditLog. **Payload:** `address|assetId, reason`.

---

## 2. Cross-module routing (NFT events)

| Module | NFT events consumed |
|--------|---------------------|
| Portfolio | NFTMinted, NFTTransferred, NFTBurned, NFTUpgraded |
| Treasury | NFTSold, RoyaltiesPaid, NFTAuctionEnded, NFTFrozen |
| Network Engine | NFTMinted (score), RoyaltiesPaid (agent reward), NFTUpgraded (rank/membership) |
| Governance | NFTMinted/Transferred (VotingPowerNFT), NFTAccessGranted |
| Dividend Center | NFTMinted/Transferred (entitlement), NFTMetadataUpdated |
| Global Property Map | NFTMinted/Transferred (ownership/access), NFTRedeemed |
| Document Vault | NFTMinted (KYC/Doc-Verification), NFTAccessGranted |
| Marketplace Engine | NFTListed/Delisted, Offers, Auctions, NFTFrozen |
| AI Copilot | (read-only, no consume) |
| Admin Portal | ALL (mirror to AuditLog; observability) |

---

## 3. Event-flow integration with canonical catalog

Primary mint:
```
NFTCreated → NFTMinted → (Portfolio, Network NFT score, Governance, Dividend, Map)
```

Secondary sale:
```
NFTListed → NFTOfferAccepted | InstantBuy
   → NFTSold → NFTTransferred → RoyaltiesPaid
        ├─ Treasury (settle)
        ├─ Network Engine (agent reward → Commission)
        ├─ Portfolio (recompute)
        └─ Governance/Dividend (entitlement update)
```

Rank/achievement (Network Engine):
```
RankAchieved → NFTMinted (Rank/Achievement NFT) → Network NFT score
```

Freeze/emergency:
```
Compliance/Emergency → NFTFrozen → Transfer model (block) + Marketplace (hide)
   → (clear) NFTUnfrozen
```

---

## 4. Consistency & governance

- All NFT events are **additive** to the canonical catalog; consumers ignore
  unknown payload fields (evolution-safe).
- Every NFT event mirrors to `AuditLog` (19).
- Idempotency key = `eventId` (+ `assetId`/`saleId` for downstream projections).
- New NFT events require a registry entry (interface seam) but no code in this
  milestone.
- Versioning: `version` field; breaking changes → new `type`, old retired after a
  dual-write window (per `EVENT_ARCHITECTURE.md` §6 evolution rules).
