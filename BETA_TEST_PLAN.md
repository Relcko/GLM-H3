# Beta Test Plan — Relcko V2.15.0-beta-rc1

**Target Audience:** Internal beta testers, closed beta group
**Environment:** BSC Testnet (chain 97)
**Duration:** 2-4 weeks

---

## 1. Test Scope

### 1.1 In Scope

All 28 `@relcko/*` packages and frontend application, excluding:
- Smart contracts (already deployed and verified on testnet)
- Legacy marketplace (read-only reference, no active development)

### 1.2 Out of Scope

- Mainnet deployment
- Production-scale load testing
- Third-party penetration testing
- Legal/compliance certification

---

## 2. Investor Onboarding

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| ONB-01 | New user lands on homepage | Navigate to `/` | Landing page loads with cinematic hero, navigation, and CTA | P0 |
| ONB-02 | User reads about platform | Navigate to `/about` | About page renders with platform information | P1 |
| ONB-03 | User views FAQ | Navigate to `/faq` | FAQ page renders with expandable questions | P1 |
| ONB-04 | User contacts support | Navigate to `/contact` | Contact form renders | P2 |
| ONB-05 | User reads tester welcome | Navigate to tester guide | `TESTER_WELCOME.md` content accessible | P2 |

---

## 3. Wallet Login

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| WAL-01 | Connect MetaMask wallet | Click "Connect Wallet" → Select MetaMask | RainbowKit modal opens, MetaMask prompt appears | P0 |
| WAL-02 | Connect WalletConnect wallet | Click "Connect Wallet" → Select WalletConnect | QR code appears for mobile wallet scan | P0 |
| WAL-03 | Connect Coinbase Wallet | Click "Connect Wallet" → Select Coinbase | Coinbase Wallet prompt appears | P1 |
| WAL-04 | Switch to BSC Testnet | Connect wallet on wrong network | Prompt to switch to BSC Testnet (chain 97) | P0 |
| WAL-05 | Disconnect wallet | Click "Disconnect" | Wallet disconnected, UI resets | P1 |
| WAL-06 | Session persistence | Connect wallet, refresh page | Wallet remains connected | P0 |
| WAL-07 | Multiple account switch | Connect wallet, switch account in wallet | UI updates to reflect new account | P1 |

---

## 4. KYC

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| KYC-01 | Access KYC page | Navigate to `/kyc` | KYC form renders with required fields | P0 |
| KYC-02 | Submit KYC application | Fill all required fields, submit | Application submitted, status = Pending | P0 |
| KYC-03 | KYC approval flow | Admin approves KYC application | Investor KYC status updated to Approved | P0 |
| KYC-04 | KYC rejection flow | Admin rejects KYC with reason | Investor notified, can resubmit | P1 |
| KYC-05 | KYC status display | Check KYC status on dashboard | Status displays: Pending/Approved/Rejected | P1 |
| KYC-06 | KYC required for investment | Attempt to invest without KYC | Blocked with "KYC required" message | P0 |

---

## 5. Marketplace

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| MAR-01 | Browse marketplace | Navigate to `/marketplace` | Property grid loads with all listings | P0 |
| MAR-02 | View property detail | Click on a property card | Property detail page loads with gallery, metrics, investment panel | P0 |
| MAR-03 | Filter properties | Use MarketplaceFilters component | Properties filtered by selected criteria | P0 |
| MAR-04 | Search properties | Enter search query | Results filtered by search | P0 |
| MAR-05 | Sort properties | Select sort option | Listings sorted accordingly | P1 |
| MAR-06 | Save property to collection | Click bookmark/favorite | Property saved, UI updates | P1 |
| MAR-07 | View collections | Navigate to collections | Saved properties displayed | P2 |
| MAR-08 | View property gallery | On property detail, browse gallery | Images load with navigation controls | P0 |
| MAR-09 | View property documents | On property detail, click Documents | Document list renders | P1 |
| MAR-10 | View property timeline | On property detail, scroll to timeline | Timeline events display chronologically | P1 |
| MAR-11 | Loading state | Navigate with slow network | LoadingSkeleton components display | P1 |
| MAR-12 | Empty state | Filter to show no results | EmptyState component displays | P1 |
| MAR-13 | Bookmark property | Click BookmarkButton | Bookmark toggled, persisted | P2 |

---

## 6. Investment

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| INV-01 | View investment panel | On property detail page | InvestmentPanel displays with amount input | P0 |
| INV-02 | Enter investment amount | Type valid amount | Amount accepted, price calculated | P0 |
| INV-03 | Submit investment | Click "Invest" button | InvestmentRequest created, eligibility check passes | P0 |
| INV-04 | Confirm transaction in wallet | MetaMask prompt appears | User can confirm or reject | P0 |
| INV-05 | Investment pending state | After submission | Investment status = Processing | P0 |
| INV-06 | Investment confirmed | Transaction confirmed on chain | Investment status = Confirmed | P0 |
| INV-07 | Investment failed | Transaction fails or rejected | Investment status = Failed, refund process | P1 |
| INV-08 | Investment refunded | Admin initiates refund | Investment status = Refunded | P1 |
| INV-09 | View investment history | Navigate to dashboard investments | All investments listed with statuses | P1 |
| INV-10 | Investment approval (admin) | Admin approves pending investment | Investment transitions through state machine | P2 |

---

## 7. NFT

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| NFT-01 | Browse NFT marketplace | Navigate to NFT section | NFT grid loads with listings | P1 |
| NFT-02 | View NFT detail | Click on an NFT | Detail page with metadata, media, activity | P1 |
| NFT-03 | Create NFT listing | List an owned NFT | Listing created with specified price | P2 |
| NFT-04 | Make offer on NFT | Submit offer on listed NFT | Offer created, pending acceptance | P2 |
| NFT-05 | Accept offer (owner) | Accept pending offer | NFT transferred, payment processed | P2 |
| NFT-06 | Cancel listing | Cancel active listing | Listing removed, NFT returns to owner | P2 |
| NFT-07 | View NFT collection | Navigate to collection | All NFTs in collection displayed | P1 |
| NFT-08 | NFT transfer | Transfer NFT to another address | Ownership transferred, event emitted | P2 |
| NFT-09 | Verify NFT | Check verification status | Verified/Unverified badge displayed | P2 |

---

## 8. Portfolio

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| POR-01 | View portfolio dashboard | Navigate to dashboard | Portfolio summary with holdings, value, performance | P0 |
| POR-02 | View investment holdings | Portfolio → Investments | All property investments listed with details | P0 |
| POR-03 | View NFT holdings | Portfolio → NFTs | All owned NFTs listed | P1 |
| POR-04 | View portfolio performance | Portfolio → Performance | Performance chart with ROI, returns | P1 |
| POR-05 | View portfolio allocation | Portfolio → Allocation | Asset allocation breakdown (pie/bar chart) | P1 |
| POR-06 | View portfolio health | Portfolio → Health | Health score with warnings if any | P2 |
| POR-07 | Export portfolio | Click export | Portfolio data exported in selected format | P2 |
| POR-08 | View portfolio timeline | Portfolio → Timeline | Chronological activity feed | P2 |
| POR-09 | Search portfolio holdings | Enter search query | Holdings filtered by search | P2 |

---

## 9. Governance

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| GOV-01 | View governance dashboard | Navigate to governance | Active/completed proposals displayed | P1 |
| GOV-02 | View proposal detail | Click on a proposal | Full proposal with description, votes, status | P1 |
| GOV-03 | Create proposal | Submit new proposal | Proposal created with specified category | P1 |
| GOV-04 | Vote on proposal | Cast vote (For/Against/Abstain) | Vote recorded, voting power calculated | P1 |
| GOV-05 | Delegate voting power | Delegate to another address | Delegation recorded, power transferred | P2 |
| GOV-06 | View delegation status | Check delegation | Current delegations displayed | P2 |
| GOV-07 | Proposal lifecycle | Track through all stages | Proposal transitions: Draft → Active → Succeeded/Defeated → Executed | P1 |
| GOV-08 | Quorum check | Proposal reaches threshold | Quorum attained, proposal proceeds | P2 |
| GOV-09 | View governance analytics | Navigate to analytics | Participation stats, proposal trends | P2 |
| GOV-10 | Search proposals | Enter search query | Proposals filtered by search | P2 |

---

## 10. Treasury

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| TRE-01 | View treasury dashboard | Navigate to treasury | Account balances, allocations, reserves displayed | P1 |
| TRE-02 | View ledger entries | Navigate to ledger | All journal entries listed chronologically | P1 |
| TRE-03 | View allocations | Navigate to allocations | Current allocation rules and utilization | P2 |
| TRE-04 | View reserves | Navigate to reserves | Reserve balances and ratios | P2 |
| TRE-05 | View treasury health | Navigate to health | Health status with any warnings | P2 |
| TRE-06 | View treasury reports | Navigate to reports | Financial reports, statements | P2 |
| TRE-07 | View cashflow projection | Navigate to cashflow | Projected inflows/outflows | P2 |
| TRE-08 | View reconciliation status | Navigate to reconciliation | On-chain vs ledger comparison | P2 |
| TRE-09 | Search treasury entries | Enter search query | Entries filtered by search | P2 |

---

## 11. AI Platform

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| AI-01 | Access AI advisor | Navigate to AI section | Advisor selection interface loads | P2 |
| AI-02 | Investor advisor query | Ask investment question | Advisor responds with recommendation | P2 |
| AI-03 | Marketplace advisor query | Ask marketplace question | Advisor responds with marketplace insight | P2 |
| AI-04 | Portfolio advisor query | Ask portfolio question | Advisor analyzes portfolio and responds | P2 |
| AI-05 | Treasury advisor query | Ask treasury question | Advisor responds with treasury analysis | P2 |
| AI-06 | Governance advisor query | Ask governance question | Advisor responds with governance insight | P2 |
| AI-07 | Advisors respect policy | Ask restricted question | Policy engine blocks or restricts response | P2 |
| AI-08 | Explainability | Request explanation for recommendation | Explanation with evidence items provided | P2 |

---

## 12. Administration

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| ADM-01 | Admin dashboard | Login as admin → Navigate to `/admin` | Dashboard with system overview | P1 |
| ADM-02 | Manage users | Admin → Users | User list with management actions | P1 |
| ADM-03 | Manage properties | Admin → Properties | Property CRUD operations | P1 |
| ADM-04 | Manage investments | Admin → Investments | Investment list with status management | P1 |
| ADM-05 | Approve KYC | Admin → KYC | KYC applications with approve/reject | P1 |
| ADM-06 | View audit log | Admin → Audit | Audit trail with filters | P1 |
| ADM-07 | Manage commissions | Admin → Commissions | Commission configuration and list | P2 |
| ADM-08 | Manage blockchain | Admin → Blockchain | Blockchain monitoring and configuration | P2 |
| ADM-09 | System settings | Admin → Settings | Platform configuration | P2 |
| ADM-10 | Manage agents | Admin → Agents | Agent list with rank, performance, commissions | P2 |

---

## 13. Performance

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| PER-01 | Marketplace grid load | Load marketplace page | Grid loads within p95 < 300ms | P1 |
| PER-02 | Property detail load | Load property detail | Detail loads within p95 < 500ms | P1 |
| PER-03 | Investment submission | Submit investment | End-to-end < 2s (off-chain) | P1 |
| PER-04 | Portfolio load | Load portfolio page | Portfolio loads within p95 < 500ms | P1 |
| PER-05 | Search performance | Execute property search | Results within p95 < 100ms | P1 |
| PER-06 | Concurrent property views | 10 simultaneous users | No degradation > 20% | P2 |

---

## 14. Operations

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| OPS-01 | System health check | Query health endpoint | All services report healthy | P0 |
| OPS-02 | Alert triggers | Trigger alert condition | Alert created with correct severity | P1 |
| OPS-03 | Incident tracking | Create incident | Incident created, timeline started | P1 |
| OPS-04 | Metrics recording | Trigger metered operation | Metrics recorded correctly | P1 |
| OPS-05 | Audit log query | Query audit for specific action | Audit log returns correct entries | P1 |

---

## 15. Security

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| SEC-01 | Unauthorized marketplace access | View without wallet | Authorized content hidden, public content shown | P0 |
| SEC-02 | Unauthorized investment | Attempt invest without wallet | Blocked with authentication required | P0 |
| SEC-03 | Unauthorized admin access | Access /admin without admin role | Blocked with 403 | P0 |
| SEC-04 | Rate limiting abuse | Rapid repeated requests | Rate limited after threshold | P1 |
| SEC-05 | Permission enforcement | Attempt disallowed action | Permission denied with proper error | P0 |
| SEC-06 | Session expiry | Idle beyond session timeout | Session expired, re-login required | P1 |
| SEC-07 | Cross-domain authorization | Escalate permissions across domains | Blocked by permission resolver | P1 |

---

## 16. Failure Scenarios

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| FAL-01 | Network disconnection | Lose internet during investment | Graceful error, user notified | P0 |
| FAL-02 | Transaction rejection | Reject MetaMask transaction | Investment cancelled, state cleaned up | P0 |
| FAL-03 | Invalid investment amount | Enter 0 or negative amount | Validation error displayed | P0 |
| FAL-04 | Exceeds max investment | Enter amount > max per user | Validation error displayed | P0 |
| FAL-05 | Below min investment | Enter amount < min per user | Validation error displayed | P0 |
| FAL-06 | Invalid wallet address | Connect unsupported wallet | Warning about unsupported network | P1 |
| FAL-07 | API failure | Backend service down | Graceful error with retry message | P1 |
| FAL-08 | KYC document upload fail | Upload invalid file format | Validation error, supported formats listed | P1 |
| FAL-09 | Concurrent investment race | Submit two investments quickly | Second submission blocked or queued | P2 |

---

## 17. Recovery Scenarios

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| REC-01 | Resume interrupted investment | Kill browser during investment, reopen | Investment status accurate, can retry | P1 |
| REC-02 | Transaction timeout | Investment pending > 5 min | Transaction monitored, recovery triggered | P1 |
| REC-03 | Event replay after crash | Simulate event processing failure | Events replayed from DLQ, state consistent | P2 |
| REC-04 | Session recovery | Session expires, reconnect wallet | New session established, state preserved | P1 |
| REC-05 | Network reconnection | Disconnect then reconnect wallet | Wallet state restored | P0 |

---

## 18. Load Testing

| TC ID | Scenario | Target | Acceptable | Priority |
|-------|----------|--------|------------|----------|
| LOD-01 | Concurrent marketplace browsing | 50 concurrent users | p95 < 500ms | P2 |
| LOD-02 | Concurrent property detail views | 50 concurrent users | p95 < 1s | P2 |
| LOD-03 | Concurrent investment submissions | 10 concurrent users | p95 < 3s | P2 |
| LOD-04 | Search under load | 50 concurrent searches | p95 < 200ms | P2 |
| LOD-05 | Portfolio load under load | 25 concurrent users | p95 < 1s | P2 |

---

## 19. Concurrency Testing

| TC ID | Scenario | Steps | Expected Result | Priority |
|-------|----------|-------|-----------------|----------|
| CON-01 | Same user, two tabs, same property | Invest same property from two tabs | One succeeds, second is handled gracefully | P1 |
| CON-02 | Same user, two tabs, different properties | Invest different properties | Both succeed independently | P1 |
| CON-03 | Reserve contention | Two users reserve same property fraction | One reservation succeeds, other fails gracefully | P2 |
| CON-04 | Event ordering | Rapid sequential events | Events processed in order, no race conditions | P2 |

---

## 20. Exit Criteria

| Criterion | Target | Method |
|-----------|--------|--------|
| All P0 tests pass | 100% | Automated + manual |
| All P1 tests pass | ≥ 95% | Automated + manual |
| P2 tests | As time permits | Manual exploratory |
| No critical or high bugs open | 0 | Bug tracking |
| Performance within targets | All SLOs met | Load testing |
| Security testing complete | No critical findings | Security review |

---

## 21. Test Artifacts

- Test results log
- Bug reports
- Performance test reports
- Security review findings
- Beta tester feedback
- Known limitations document
