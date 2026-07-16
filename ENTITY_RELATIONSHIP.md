# Entity Relationship Model — V1.1.1 (Framework-Agnostic)

Derived from the legacy marketplace audit (LEGACY_MARKETPLACE_AUDIT.md) and the
domain extraction in DOMAIN_MODEL.md. This document is **architecture only** — no
code, no ORM models, no transport definitions. It describes how the 19 business
entities connect and the cardinality + optionality of each link.

---

## 1. Entity inventory (19)

| # | Entity | Nature | Legacy status |
|---|--------|--------|---------------|
| 1 | Property | core | exists |
| 2 | PropertyFraction | core | exists |
| 3 | Investment | core | exists (gaps) |
| 4 | Investor | core | exists (as User) |
| 5 | MarketplaceListing | core | exists |
| 6 | MarketplaceSale | core | partial (off-chain) |
| 7 | Ownership | derived | exists |
| 8 | Portfolio | read-model | computed |
| 9 | Transaction | ledger | partial (gaps) |
| 10 | Referral | affiliate | exists |
| 11 | Commission | affiliate | exists (gaps) |
| 12 | Agent | affiliate | exists |
| 13 | KYC | compliance | exists (broken status) |
| 14 | Documents | content | exists (open download) |
| 15 | SPV | compliance | **NEW** |
| 16 | Rewards | income | **NEW** (legacy orphan) |
| 17 | Wallet | identity | partial (no sig verify) |
| 18 | Payment | money | partial (scattered) |
| 19 | AuditLog | audit | **NEW** |

---

## 2. Relationship diagram (text)

```
                        +------------------+
                        |     Investor     |  (User)
                        +--------+---------+
         owns/list/sell  |   login/kyc/pay |  wallets
        +----------------+----------------+-----------------+
        |                |                |                 |
        v                v                v                 v
+----------------+ +-------------+  +-------------+   +--------------+
| Investment     | | KYC         |  | Wallet      |   | Referral     |
| (->Property)   | | (verifies)  |  | (SIWE ver.) |   | (agent link) |
+-------+--------+ +-------------+  +-------------+   +------+-------+
        |                  ^                 |                |
        |                  | approves        | pays           v
        +----------+       |                 |          +-----+-----+
                   |       |                 |          | Agent     |
                   v       |                 v          | (code)    |
           +-------+-------+---+      +------+------+  +-----+------+
           | MarketplaceSale    |      | Payment     |        |
           | (buyer/seller inv) |      | (settles)   |        | earns
           +--------+-----------+      +------+------+        |
                    |                      |                  |
            listing |              produces | Transaction     | generates
                    v                      v                  v
            +-------+--------+      +----------------+ +--------------+
            | Marketplace-   |      | Transaction    | | Commission   |
            | Listing        |      | (ledger, immut)| | (rate source)|
            +----------------+      +----------------+ +------+-------+
                                                          |
             Ownership (from Investment + completed Sale)  | paid via
                          |                               v
                          v                        +-------+--------+
                   +------+-------+                | Commission-    |
                   | Ownership    |                | Withdrawal     |
                   +------+-------+                +----------------+
                          |
                          | composes (read model)
                          v
                   +------+-------+
                   | Portfolio    |
                   +--------------+

 Property 1 ---< PropertyFraction >--- 1 SPV (legal wrapper)   [NEW]
 Property 1 ---< Documents          (legal/financial/KYC files)
 Property 1 ---< Rewards (schedule) ---< RewardsPayment >--- Investor [NEW]
 Property 1 ---< Investment / MarketplaceListing / MarketplaceSale

 Every mutation over ANY entity ---> AuditLog (append-only)   [NEW]
```

---

## 3. Relationship matrix

Legend: `1` one, `0..*` many, `0..1` optional, `1..*` at least one.
Direction reads left → right ("left **has** right").

| Left | Relationship | Right | Cardinality | Optionality | Notes |
|------|--------------|-------|-------------|-------------|-------|
| Property | is tokenized by | PropertyFraction | 1 → 1..* | required | frac defines tokenomics |
| SPV | holds | Property | 1 → 1..* | required (target) | legal wrapper, NEW |
| Property | has | Documents | 1 → 0..* | optional | legal/financial/KYC |
| Property | receives | Investment | 1 → 0..* | optional | buyers |
| Property | listed on | MarketplaceListing | 1 → 0..* | optional | seller offers |
| Property | traded via | MarketplaceSale | 1 → 0..* | optional | completed trades |
| Property | distributes | Rewards | 1 → 0..* | optional | NEW |
| Investor | makes | Investment | 1 → 0..* | optional | buyer |
| Investor | owns via | Ownership | 1 → 0..* | optional | derived |
| Investor | authenticated by | Wallet | 1 → 0..* | required (target) | SIWE verify |
| Investor | verified by | KYC | 1 → 0..1 | optional/required | if kyc_required |
| Investor | referred by | Referral | 0..1 → 1 | optional | one active |
| Investor | earns via | Commission | 1 → 0..* | optional | as transacting user |
| Agent | identified by | Referral | 1 → 0..* | optional | recruits |
| Agent | earns | Commission | 1 → 0..* | optional | rate source |
| Agent | paid via | CommissionWithdrawal | 1 → 0..* | optional | payout |
| Referral | generates | Commission | 1 → 0..* | optional | attribution |
| Investment | settles via | Payment | 1 → 1 | required | money |
| MarketplaceSale | settles via | Payment | 1 → 1 | required | money |
| Payment | records as | Transaction | 1 → 1 | required | ledger |
| Investment | completes as | MarketplaceSale | 0..* → 0..1 | optional | primary→secondary |
| MarketplaceSale | transfers | Ownership | 1 → 1..* | required | token move |
| Ownership | composes | Portfolio | 0..* → 1 | derived | read model |
| Transaction | moves value for | Investor | 1 → 1 | required | ledger owner |
| Rewards | pays | RewardsPayment | 1 → 0..* | required (target) | NEW |
| RewardsPayment | pays | Investor | 0..* → 1 | required | proportional |
| ANY entity | audited by | AuditLog | 0..* → 0..* | required (target) | append-only, NEW |

---

## 4. Key integrity rules (cross-entity)

1. **Money conservation:** `Investor` balance + every `Payment` + every `Transaction`
   must reconcile. Legacy `User.addBalance` mutated balance with NO Transaction and
   NO AuditLog — this invariant was broken; target must enforce it.
2. **Ownership supply invariant:** `sum(Ownership.quantity per Property) ==
   PropertyFraction.total_fractions` at all times (no oversell / no phantom mint).
3. **Listing price safety:** `MarketplaceListing.price <=
   Ownership.current_value` (legacy allowed listing above fair value).
4. **Commission rate single source:** `Commission.amount == base *
   Agent.commission_rate / 100`. No competing settings (legacy had dead config).
5. **Wallet trust:** a `Wallet` may grant login/ownership ops ONLY after signature
   verification. Legacy `walletLogin` trusted the address with no signature — forgeable.
6. **On-chain truth:** any `Payment`/`Transaction.tx_hash` with an on-chain method
   must be verified on-chain. Legacy trusted client-supplied `tx_hash`.
7. **Audit completeness:** every state mutation writes `AuditLog` (and `Transaction`
   when value moves). No silent mutations.

---

## 5. Aggregation & derivation map

- **Ownership** = aggregate of confirmed `Investment` + completed `MarketplaceSale`
  (delta transfers). Not independently authoritative.
- **Portfolio** = projection over `Ownership` + `Transaction` + `Rewards` for one
  `Investor`. Recomputed on every mutation; must reconcile with ledger.
- **RewardsPayment** = snapshot of `Ownership` at reward schedule time, prorated by
  `per_token_amount`.
- **Transaction** + **AuditLog** = append-only systems of record; all other writes
  reference them.

---

*Framework-agnostic. Map relationships to foreign keys / edges / references in your
chosen persistence layer. No transport, schema, or application code is specified here.*
