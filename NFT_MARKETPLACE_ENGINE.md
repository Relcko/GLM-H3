# NFT Marketplace Engine — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `NFT_DOMAIN_MODEL.md`,
`NFT_STATE_MACHINE.md`, `NFT_TRANSFER_MODEL.md`, `DOMAIN_MODEL.md` (5
MarketplaceListing, 6 MarketplaceSale). Architecture only.

Defines the **trading engine**: primary market, secondary market, auction, offer
system, instant buy, collections, discovery (search/filter/sort), and
watchlist/favorites. Reuses the locked listing/sale semantics where applicable and
adds NFT-scoped entities (NFT-4…NFT-7).

---

## 1. Primary market (mint-on-buy)

- Creator/platform publishes a collection drop (`NFTCollection` + `RoyaltyConfig`).
- Buyer mints directly: `NFTMinted` → owner = buyer; payment settles via `Payment`
  (18) → Treasury. No prior owner.
- Used for Membership, Access, Allocation, Achievement (campaign), and initial
  Property/Fractional offerings.

---

## 2. Secondary market

- Seller creates `NFTListing` (NFT-4) from an owned asset (`LISTED`).
- Two fulfillments:
  - **Instant Buy:** buyer accepts `price` → `NFTSold` → `NFTTransferred`.
  - **Offer:** buyer places `NFTOffer` (NFT-6); seller accepts → sale.
- Settlement: atomic `NFTTransferred` + `Payment` settled + royalty/fee/agent
  reward (`NFT_TRANSFER_MODEL.md` §3, `NFT_ROYALTY_ENGINE.md`).
- Reuses `MarketplaceSale` (6) semantics for the trade record + `Commission` (11)
  for agent NFT bonus.

---

## 3. Auction

- `NFTAuction` (NFT-7): timed, reserve price, incremental bids.
- Bids are `NFTOffer` with `bid` flag; highest valid bid at `endTime` wins.
- Reserve not met → `CANCELLED` (no sale). Met → `SETTLED` → `NFTSale`.
- Anti-sniping: optional extension window on late bids.

---

## 4. Offer system

- Offers can be made on listed assets, unlisted owned assets (collection offer),
  or entire collections.
- Offer lifecycle: `CREATED → ACTIVE → ACCEPTED|EXPIRED|DECLINED`
  (`NFT_STATE_MACHINE.md` §3).
- Counter-offers supported (negotiation thread).

---

## 5. Collections

| Type | Definition |
|------|------------|
| **Collection** | group of NFTAssets sharing `collectionId` (one per `NFT_TYPES` category instance). |
| **Verified collection** | `VERIFIED` state (Document Verification + creator KYC). Badge shown. |
| **Featured collection** | curated by platform (admin). |
| **Trending collection** | derived `trendingScore` from recent volume/activity (non-state, read-model). |

---

## 6. Discovery: search / filters / sorting

- **Search:** by name, collection, tokenId, owner, trait/metadata field.
- **Filters:** category (19 types), standard family, price range, status
  (listed/owned), verified only, soulbound/transferable, compliance tags.
- **Sorting:** price, recent, trending, rarity, volume, ending-soon (auctions).
- All discovery is a **read-model** over indexed NFT metadata + marketplace state;
  no source mutation.

---

## 7. Watchlist & favorites

- Per-investor lists: `Watchlist` (assets/collections to monitor) and `Favorites`
  (saved). Stored as user preferences linked to `Investor` (4).
- Emit notifications on price/status change (event-driven, consumer = Notification).

---

## 8. Order lifecycle & settlement

```
BUYER            ENGINE              SELLER/ASSET         TREASURY
  │  list/offer    │                     │                   │
  │───────────────▶│  validate (TRANSFER)│                   │
  │                │────────────────────▶│  compliance pass?  │
  │                │                     │──────────────────▶│ settle payment
  │                │  NFTSold                                    │ royalty/fee
  │                │  NFTTransferred ◀───│                   │
  │  owned ◀───────│                     │                   │
```
- All transitions emit events (`NFT_EVENT_EXTENSION.md`); mirror to `AuditLog` (19).

---

## 9. Integration

| Domain | Touchpoint |
|--------|------------|
| Treasury | payment + royalty + fee settlement. |
| Network Engine | agent NFT bonus (Commission 11) + NFT score. |
| Portfolio | recompute on `NFTTransferred`. |
| Governance | Voting Power NFT trades update power. |
| AI Copilot | read-only marketplace explainability. |
| Campaign Engine | achievement/event NFT rewards listed. |
| Document Vault | verified-collection badge proof. |

---

## 10. Scalability

- Listings/offers/auctions indexed by asset + collection + price.
- Trending/featured are batched read-model recomputations.
- At 100K assets, discovery queries hit pre-built indexes; settlement is
  per-trade and append-only audited.
