# NFT Types — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `NFT_DOMAIN_MODEL.md`,
`AGENT_RANK_SYSTEM.md`, `DOCUMENT_MANAGEMENT_ARCHITECTURE.md`. Architecture only.

Enumerates the **19 NFT categories**, each with its standard family (T/S/D/L),
soulbound flag, lifecycle, metadata, linkage to locked entities, minter, and
utility. This is the canonical type registry; `NFTCollection.category` references
these names.

Legend: **T** transferable · **S** soulbound · **D** divisible · **L** lockable/compliance.

---

## 1. Ownership & income

### 1.1 Property Ownership NFT — `L`
- Whole/legal ownership wrapper of a property (ties to `SPV` 15 / `Property` 1).
- Lifecycle: MINTED → (transfer gated by KYC/whitelist) → REDEEMED (legal title)
  → BURNED.
- Utility: legal title proof, Global Property Map layer, redemption rights.

### 1.2 Fractional Ownership NFT — `D`
- Represents a fraction of `Ownership` (7) / `PropertyFraction` (2).
- Splittable/mergable (`NFT_STATE_MACHINE.md` §5); each unit carries
  `entitlementBps`.
- Utility: pro-rata ownership, dividend/rental entitlement, tradeable on secondary.

### 1.3 Rental Income NFT — `D`/`T`
- Entitles holder to rental income stream of a property.
- Dynamic metadata reflects accrued/distributed rent.
- Utility: income entitlement → Dividend Center distribution.

### 1.4 Dividend NFT — `D`/`T`
- Entitles holder to dividend distributions.
- Utility: Dividend Center payout routing; tradeable income rights.

---

## 2. Membership

### 2.1 Membership NFT — `T` (Silver/Gold/Platinum/Diamond/Elite)
- Tiered membership; benefits defined in `NFT_MARKETPLACE_ARCHITECTURE` + roadmap.
- Benefits: fee discounts, early access, priority investments, voting multipliers,
  marketplace privileges, treasury rewards.
- Lifecycle: MINTED → ACTIVE → (UPGRADE to higher tier) | REVOKED.
- Transferable, but benefits re-evaluated on transfer (new owner inherits tier).

---

## 3. Reputation & achievement

### 3.1 Rank NFT — `S`
- Agent rank badge (`AGENT_RANK_SYSTEM.md`); minted on `RankAchieved`.
- Soulbound to Agent (12); feeds Network NFT score.
- Permanent; utility multiplier active while agent ACTIVE.

### 3.2 Achievement NFT — `S`
- Permanent badges for: sales, investment, governance, referral, agent, community,
  platform milestones.
- Soulbound; immutable record of accomplishment.

### 3.3 Agent License NFT — `S`
- Operating license for an Agent (12); gated by KYC + compliance.
- Soulbound; suspendable/revocable by Compliance (freeze path).

---

## 4. Governance

### 4.1 Governance NFT — `S`
- Governance participation credential (soulbound); proves eligibility to propose/
  participate in DAO.
- Utility: proposal creation rights, DAO participation.

### 4.2 Voting Power NFT — `L`/`T`
- Delegatable/transferable representation of voting weight, derived from
  `Ownership` + Rank multiplier.
- Utility: delegates voting power; drives `VotingPowerUpdated`.

---

## 5. Access & allocation

### 5.1 Property Access NFT — `T`/`L`
- Grants physical/digital access to a property.
- Utility: Global Property Map access layer; compliance-gated.

### 5.2 Exclusive Allocation NFT — `L`
- Grants pre-allocation / early access to selected offerings.
- Utility: Marketplace priority investment; rank-gated.

---

## 6. Identity & compliance (all `S`)

### 6.1 Identity NFT — `S`
- Wallet↔verified-identity binding (privacy-preserving). Soulbound.

### 6.2 KYC NFT — `S`
- KYC attestation (`KYC` 13). Soulbound; expires per KYC validity.

### 6.3 Accredited Investor NFT — `S`
- Accreditation credential; gates regulated offerings. Soulbound.

### 6.4 Document Verification NFT — `S`
- Attestation that `Documents` (14) verified (`DOCUMENT_MANAGEMENT_ARCHITECTURE.md`).
- Soulbound; per-document.

---

## 7. Events & partnerships

### 7.1 Event NFT — `S`
- Proof-of-attendance / participation at platform events. Soulbound.

### 7.2 Partner NFT — `T`/`S`
- Partner organization credential or co-branded collectible.

### 7.3 Developer NFT — `S`
- Builder/developer credential; grants API/ecosystem access tiers. Soulbound.

---

## 8. Type → standard matrix

| Type | Family | Soulbound | Minters |
|------|--------|-----------|---------|
| Property Ownership | L | no | Platform/SPV |
| Fractional Ownership | D | no | Platform (on invest) |
| Rental Income | D/T | no | Platform |
| Dividend | D/T | no | Dividend Center |
| Membership | T | no | Platform |
| Rank | S | yes | Network Engine |
| Achievement | S | yes | Platform/Network |
| Agent License | S | yes | Compliance |
| Governance | S | yes | Governance |
| Voting Power | L/T | no | Governance |
| Property Access | T/L | no | Platform |
| Exclusive Allocation | L | no | Platform |
| Identity | S | yes | Identity/Compliance |
| KYC | S | yes | Compliance |
| Accredited Investor | S | yes | Compliance |
| Document Verification | S | yes | Document Vault |
| Event | S | yes | Platform |
| Partner | T/S | mixed | Partner/Platform |
| Developer | S | yes | Platform |

---

## 9. Lifecycle & utility consistency

- All types share `NFT_STATE_MACHINE.md` states.
- Soulbound (S) types enforce `transferable=false` in `NFTCompliance` — transfer
  validation rejects any move (`NFT_TRANSFER_MODEL.md`).
- Utility is **derived** by consuming domains via events, never hardcoded into the
  NFT domain.
