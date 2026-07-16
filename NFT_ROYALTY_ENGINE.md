# NFT Royalty Engine — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `NFT_DOMAIN_MODEL.md`
(`RoyaltyConfig` NFT-8), `NFT_TRANSFER_MODEL.md`, `NFT_STATE_MACHINE.md`.
Architecture only.

Defines royalty architecture, marketplace fees, treasury allocation, creator/agent
rewards, and the burn/upgrade/fusion/evolution mechanics plus dynamic metadata.
No code.

---

## 1. Royalty architecture

Every collection declares a single `RoyaltyConfig` (NFT-8) — the authoritative
rate source (mirrors `ENTITY_RELATIONSHIP.md` rule 4 for commissions; no competing
config):

| Component | Basis | Default cap |
|-----------|-------|-------------|
| `creatorRoyaltyBps` | % of sale price to creator/platform | configurable (e.g., 500 = 5%) |
| `agentRewardBps` | % to seller's network agent (NFT bonus) | configurable |
| `marketplaceFeeBps` | % platform fee | configurable |
| `treasuryBps` | % routed to Treasury Reserve | balancing remainder |

Sum of bps is validated ≤ 100% (enforced at config write).

---

## 2. Distribution flow on sale

```
NFTSold (price P)
   ├─ creatorRoyalty = P × creatorRoyaltyBps      → creator/platform
   ├─ agentReward    = P × agentRewardBps         → seller's agent (Commission 11)
   ├─ marketplaceFee = P × marketplaceFeeBps      → platform
   └─ treasuryAlloc  = P × treasuryBps            → Treasury Reserve
        └─ remainder (if any) → seller proceeds
   All via Payment(18) + Treasury multi-sig.
   RoyaltiesPaid emitted; AuditLog(19) appended.
```

- Agent reward requires the seller to be referred (Network Engine attribution);
  if no agent, that bps rolls to treasury (no leakage).
- Primary mint (no prior owner) still applies creator royalty + treasury, but no
  agent reward (no secondary referral).

---

## 3. Creator & agent rewards

- **Creator rewards:** recurring royalty on every secondary sale; incentivizes
  collection quality.
- **Agent rewards (NFT bonus):** the Network Engine "NFT bonus" — paid from
  `agentRewardBps` to the seller's sponsoring agent, fed into the agent's
  commission ledger and NFT score (`AGENT_RANK_SYSTEM.md`, `COMMISSION_ENGINE.md`).

---

## 4. Treasury allocation

- `treasuryBps` funds the Treasury Reserve, used for: leadership pools, liquidity,
  ecosystem grants, and (per Network Engine) override fallback. Governed by
  Treasury/Governance.

---

## 5. Burn / Upgrade / Fusion / Evolution

### Burn
- Owner-initiated destruction; terminal. No economic value returned unless part of
  a redemption/merge recipe. Emits `NFTBurned`.

### Upgrade
- A base NFT meets criteria (e.g., Membership Silver → Gold via tenure/volume) →
  `NFTUpgraded` to higher tier. Tier benefits (`NFT_TYPES.md` §2.1) apply
  immediately. Conserves the same owner; may consume a fee paid to Treasury.

### Fusion
- N NFTs + a recipe → 1 composite NFT (e.g., achievement set → master badge).
  Inputs burned; output minted. `NFTFused` emitted.

### Evolution
- Time/event-gated **state/metadata** change on the same tokenId (e.g., dynamic
  rank progression). `NFTEvolved` emitted; metadata hash re-anchored (§6).

All four are terminal-state transitions in `NFT_STATE_MACHINE.md` §6 and require
compliance/eligibility checks; none mutate ownership of underlying property unless
explicitly a redemption.

---

## 6. Dynamic metadata

- `NFTMetadata` (NFT-3) supports mutable `dynamicFields` (e.g., accrued rental,
  dividend accrual, rank, level) while keeping `contentHash` anchored per version.
- On any dynamic change → new metadata version + `NFTMetadataUpdated` + re-anchor
  hash. History append-only.
- Off-chain storage (content-addressed) with on-chain hash; consumers read latest
  version via the metadata resolver.

---

## 7. Integration

| Domain | Touchpoint |
|--------|------------|
| Treasury | royalty/fee/treasury settlement. |
| Network Engine | agent reward → commission + NFT score. |
| Governance | treasury allocation governed. |
| Dividend Center | dynamic dividend accrual metadata. |
| Portfolio | NFT value/utility reflects tier. |
| AI Copilot | read-only royalty explainability. |

---

## 8. Scalability & integrity

- `RoyaltyConfig` computed once per sale (O(1)); settlement batched.
- Burn/upgrade/fusion/evolution produce offsetting ledger entries (no edits).
- Metadata versions partitioned by asset; hash anchored for tamper-evidence.
- At scale, royalty settlement is per-trade; config changes are low-frequency and
  governance-gated.
