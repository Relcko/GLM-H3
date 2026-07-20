# NFT Domain Model — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `DOMAIN_MODEL.md` (entities
1–19). Architecture only.

Defines the **NFT-domain entities** and their relationships to the locked
`DOMAIN_MODEL.md` entities (1 Property … 19 AuditLog). NFT entities are numbered
**NFT-1 … NFT-N** to avoid colliding with the locked 1–19 inventory; they are new
domain constructs, not replacements.

---

## 1. Entity inventory (NFT domain)

| ID | Entity | Family | Notes |
|----|--------|--------|-------|
| NFT-1 | **NFTCollection** | — | a category collection (one per NFT type). |
| NFT-2 | **NFTAsset** | T/S/D/L | a token instance. |
| NFT-3 | **NFTMetadata** | — | hash-anchored metadata document. |
| NFT-4 | **NFTListing** | — | primary/secondary ask. |
| NFT-5 | **NFTSale** | — | completed trade. |
| NFT-6 | **NFTOffer** | — | bid/offer on a listing. |
| NFT-7 | **NFTAuction** | — | timed auction. |
| NFT-8 | **RoyaltyConfig** | — | per-collection royalty + treasury split. |
| NFT-9 | **NFTCompliance** | — | transfer restrictions + gating rules per asset. |
| NFT-10 | **NFTAccessGrant** | — | linkage of a utility NFT to a benefit. |
| NFT-11 | **NFTFractionUnit** | D | a divisible unit of a fractional/rental/dividend NFT. |

---

## 2. Entities & locked linkages

### NFT-1 NFTCollection
`{ id, name, category (one of 19 types), standardFamily (T/S/D/L), creatorId,
verified, featured, trendingScore, royaltyConfigId, createdAt }`
- `creatorId` → `Agent` (12) for agent-licensed collections, or platform for
  system collections.
- `category` maps 1:1 to an `NFT_TYPES.md` category.
- Links to `RoyaltyConfig` (NFT-8).

### NFT-2 NFTAsset
`{ id, collectionId, tokenId, type, standardFamily, ownerId (Investor/Wallet 17),
status, metadataRef, mintedAt, sourceRef }`
- `ownerId` → `Wallet` (17) / `Investor` (4).
- `sourceRef` polymorphic: `Property` (1) for ownership NFTs, `SPV` (15),
  `Agent` (12) for rank/license, `KYC` (13) for KYC NFT, `Documents` (14) for
  verification, `Ownership` (7) for fractional.
- `status` from `NFT_STATE_MACHINE.md`.

### NFT-3 NFTMetadata
`{ id, assetId, schemaVersion, contentHash, storageRef, dynamicFields,
updatedAt }`
- Content-addressed; `contentHash` anchored on-chain. Supports **dynamic metadata**
  (`NFT_ROYALTY_ENGINE.md` §5).

### NFT-4 NFTListing
`{ id, assetId, sellerId, price, currency, kind (PRIMARY|SECONDARY), status,
expiresAt, createdAt }`
- Reuses semantics of `MarketplaceListing` (5) but NFT-scoped; primary listings
  mint-on-buy.

### NFT-5 NFTSale
`{ id, listingId, assetId, buyerId, sellerId, price, currency, royaltyDue,
feeDue, paymentId, settledAt }`
- Mirrors `MarketplaceSale` (6); triggers `Commission` (11) for agent NFT bonus and
  `RoyaltiesPaid`.

### NFT-6 NFTOffer
`{ id, assetId|collectionId, offererId, price, currency, expiresAt, status }`
- Counter-offer model (cf. `OfferCreated`/`OfferAccepted` in
  `MARKETPLACE_EVENT_EXTENSION.md`).

### NFT-7 NFTAuction
`{ id, assetId, sellerId, reservePrice, startTime, endTime, highestBidId,
status }`

### NFT-8 RoyaltyConfig
`{ id, collectionId, creatorRoyaltyBps, treasuryBps, agentRewardBps,
marketplaceFeeBps }`
- Drives `NFT_ROYALTY_ENGINE.md`.

### NFT-9 NFTCompliance
`{ assetId, transferable, requiresKYC, requiresAccredited, whitelist,
geoRestrict, freeze, frozenBy, frozenAt }`
- Evaluated by `NFT_TRANSFER_MODEL.md` transfer-validation predicate.

### NFT-10 NFTAccessGrant
`{ id, assetId, benefitType, targetRef, grantedAt, expiresAt? }`
- Links a Membership/Access/Allocation NFT to a concrete benefit (fee discount,
  early access, voting multiplier).

### NFT-11 NFTFractionUnit
`{ id, assetId, unitIndex, ownerId, entitlementBps }`
- For divisible (D) assets: each unit carries rental/dividend entitlement.

---

## 3. Relationship diagram (text)

```
NFTCollection 1 ──< NFTAsset (many)
NFTAsset 1 ──< NFTMetadata (versions)
NFTAsset 1 ──1 NFTCompliance
NFTCollection 1 ──1 RoyaltyConfig
NFTAsset 1 ──< NFTListing >── NFTSale >── NFTOffer / NFTAuction
NFTAsset 1 ──< NFTAccessGrant
NFTAsset (D) 1 ──< NFTFractionUnit

NFTAsset.sourceRef ──▶ Property(1)/SPV(15)/Ownership(7)/Agent(12)/KYC(13)/
                         Documents(14)/Investor(4)/Wallet(17)
NFTSale.paymentId ──▶ Payment(18)
All mutations ──▶ AuditLog(19)
```

---

## 4. Key integrity rules (cross-entity)

1. An `NFTAsset` has exactly one `collectionId` and one `standardFamily`.
2. Soulbound (S) assets: `NFTCompliance.transferable = false`; any transfer is
   rejected by the validation predicate.
3. `RoyaltyConfig` is the single source of royalty/fee rates per collection (no
   competing config — mirrors `ENTITY_RELATIONSHIP.md` rule 4 for commissions).
4. `NFTSale` must reconcile to `Payment` (18) exactly (amount/currency), and to
   on-chain transfer (no DB↔chain divergence, fixes legacy).
5. `NFTMetadata.contentHash` is immutable per version; updates create a new
   version (append-only).
6. Every NFT mutation appends `AuditLog` (19).

---

## 5. Aggregation & derivation

- **Portfolio NFT view** = projection over `NFTAsset` where `ownerId = investor`.
- **Network NFT score** = aggregate of agent's Rank/Achievement/Agent-License NFTs.
- **Governance power** = `VotingPowerNFT` entitlement + Rank multiplier.
- **Dividend/Rental entitlement** = sum of `NFTFractionUnit.entitlementBps` for
  Dividend/Rental Income NFTs.

---

## 6. Integration

Consumed by Portfolio, Governance, Treasury, Network Engine, Dividend Center,
Global Property Map, Document Vault, AI Copilot, Campaign Engine (see
`NFT_MARKETPLACE_ARCHITECTURE.md` §5).
