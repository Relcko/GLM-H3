# Investor Portal Architecture

Status: Official architecture for the Relcko Investor Portal. Architecture only.

## 1. Purpose

The Investor Portal is the primary ownership and capital-allocation workspace for investors. It unifies investment discovery, investment execution, portfolio intelligence, treasury-related history, governance participation, AI guidance, wallet continuity, and document access.

## 2. Primary users

- Retail investors
- Accredited investors
- Institutional investor delegates
- Returning investors managing existing positions

## 3. Experience goals

- Make ownership status legible at a glance
- Reduce friction between discovery and investment
- Keep trust high by exposing evidence, history, and document access
- Present governance and treasury as transparent participation layers, not hidden back-office systems
- Make AI useful but explicitly advisory

## 4. Navigation hierarchy

### 4.1 Primary navigation

- Dashboard
- Portfolio
- Marketplace
- Investments
- NFTs
- Governance
- Treasury History
- AI Advisor
- Documents
- Notifications
- Wallet
- Settings

### 4.2 Secondary navigation patterns

- entity tabs inside property, proposal, investment, and NFT detail views
- contextual side panels for activity, alerts, and AI recommendations
- command palette for jump navigation and quick actions

## 5. Route hierarchy

- `/investor`
- `/investor/dashboard`
- `/investor/portfolio`
- `/investor/portfolio/holdings`
- `/investor/portfolio/performance`
- `/investor/portfolio/income`
- `/investor/marketplace`
- `/investor/marketplace/property/:propertyId`
- `/investor/investments`
- `/investor/investments/:investmentId`
- `/investor/kyc`
- `/investor/kyc/identity`
- `/investor/kyc/address`
- `/investor/kyc/documents`
- `/investor/kyc/review`
- `/investor/kyc/status`
- `/investor/nfts`
- `/investor/nfts/:nftId`
- `/investor/governance`
- `/investor/governance/proposal/:proposalId`
- `/investor/treasury-history`
- `/investor/ai-advisor`
- `/investor/documents`
- `/investor/documents/:documentId`
- `/investor/notifications`
- `/investor/wallet`
- `/investor/settings`

## 6. Authentication flow

1. Investor arrives from public site or direct link.
2. If unauthenticated, show login or create-account flow.
3. Resolve identity path:
   - wallet-first
   - email-first
   - delegated institutional path if enabled
4. Apply MFA or step-up where required.
5. Resolve KYC state.
6. Land on:
   - dashboard for fully active users
   - KYC onboarding for blocked investment capability
   - wallet connection screen if wallet-required route was requested

### 6.1 KYC resume behavior

If a user has an in-progress KYC flow:

- redirect blocked investment attempts into the saved KYC route
- preserve the intended post-KYC destination
- restore completed steps and required next step
- prevent accidental restart if review is already pending

## 7. Authorization model

The investor portal is scoped to `OWN` access by default.

Frontend must:

- hide inaccessible objects
- label blocked actions clearly
- explain whether the blocker is KYC, wallet, session strength, or account state

Backend remains the source of truth for authorization.

## 8. Session behavior

- persistent authenticated session across dashboard-level browsing
- elevated session required for sensitive actions such as final investment confirmation, wallet changes, some governance actions, and document-sensitive flows
- explicit countdown and graceful renewal for expiring sessions
- trusted-device indicator for smoother repeat use
- clear recovery path for expired or revoked sessions

## 9. Wallet integration

Wallet is embedded into the investor experience, not isolated as a technical tool.

Wallet responsibilities in portal UX:

- sign-in continuity
- investment confirmation continuity
- governance signature readiness
- NFT ownership visibility
- network mismatch detection
- transaction progress visibility

Wallet UX must support:

- connect
- reconnect
- switch network
- sign message
- sign transaction intent
- recover from rejected signature

## 10. Notification model

Investor notifications are grouped as:

- investment lifecycle
- dividend and treasury-related history
- governance events
- NFT activity
- document and compliance events
- AI insights and reminders
- security and session alerts

Priority order:

- blocking security
- time-sensitive financial
- governance deadlines
- informational portfolio
- educational and promotional

## 11. Search behavior

Investor search emphasizes:

- properties
- investments
- documents
- proposals
- NFTs
- transaction and treasury history

Search interaction modes:

- global command palette
- marketplace search and filtering
- document search
- portfolio-local search

## 12. Dashboard layout

### 12.1 Desktop structure

- top summary rail
- primary insight grid
- portfolio value and income area
- active opportunities strip
- governance and treasury activity strip
- AI advisor panel
- notifications rail

### 12.2 Core dashboard modules

- portfolio value
- invested capital
- unrealized and realized return
- expected income
- active investments
- pending actions
- governance deadlines
- dividend activity
- AI recommended next steps

## 13. Global actions

- Search
- Connect or manage wallet
- Start investment
- Continue KYC
- Ask AI Advisor
- Open notifications
- Download documents
- Switch account context if institutional delegation exists

## 14. Error handling

Investor errors should prioritize reassurance and clarity.

Patterns:

- inline guidance for input issues
- non-blocking banners for temporary service degradation
- timeline-based transaction state for long-running flows
- explicit distinction between:
  - rejected by you
  - blocked by compliance
  - delayed by network
  - failed system-side

## 15. Loading states

- dashboard shell skeleton
- chart placeholders
- table skeletons
- property media progressive loading
- transaction state steppers for investment and governance actions
- background refresh indicators for prices, portfolio snapshots, and proposal state

## 16. KYC user experience

### 16.1 KYC route hierarchy

- `/investor/kyc`
- `/investor/kyc/identity`
- `/investor/kyc/address`
- `/investor/kyc/documents`
- `/investor/kyc/review`
- `/investor/kyc/status`

### 16.2 Step persistence

KYC must persist:

- completed steps
- partial safe form drafts
- uploaded document references that the backend has accepted
- intended return route after approval

### 16.3 Resume behavior

Resume behavior must:

- return the user to the last incomplete step
- preserve already accepted data
- clearly show what remains
- prevent duplicate submission if review is already pending

### 16.4 Document upload UX

Document upload must provide:

- accepted document list
- upload progress
- per-document error guidance
- replace and retry flow
- mobile-friendly capture continuity where supported

### 16.5 Review state

Review state must show:

- submitted status
- expected next stage
- whether user action is required
- what can still be edited and what is locked

### 16.6 Approval state

After approval:

- blocked investment and wallet-gated routes become available on next authority refresh
- dashboard pending-action surfaces are cleared or replaced with next-step guidance
- investor returns to the preserved target route when appropriate

### 16.7 Rejection or remediation state

Rejection state must distinguish:

- additional information required
- document issue
- identity mismatch
- compliance rejection

Portal response after rejection:

- preserve safe previously entered data where policy allows
- route user directly into the corrective step
- explain what changed in portal capability

## 17. Offline behavior

Allowed:

- view cached dashboard summary
- browse cached portfolio and documents metadata
- draft filters and notes
- queue low-risk preference updates

Not allowed:

- final investment submission
- governance vote submission
- wallet-signature-required actions
- document-sensitive upload flows

## 18. Accessibility considerations

- keyboard-safe route and modal model
- large readable finance and performance typography
- chart alternatives with tabular summaries
- explicit labels for token, currency, wallet, and voting terms
- motion reduction for data-heavy dashboards
- no color-only indication of gain/loss or risk

## 19. Performance expectations

- initial authenticated shell under 2 seconds on broadband
- major route transitions under 1 second once shell is loaded
- property detail media loads progressively
- charts hydrate after core KPIs
- governance and treasury detail views lazy loaded

## 20. Package mapping

| Area | Primary package | Supporting packages |
|------|-----------------|---------------------|
| Dashboard | `@relcko/portfolio` | `@relcko/marketplace`, `@relcko/governance`, `@relcko/treasury`, `@relcko/ai-platform` |
| Portfolio | `@relcko/portfolio` | `@relcko/treasury`, `@relcko/nft-marketplace` |
| Marketplace | `@relcko/marketplace` | `@relcko/investment-engine`, `@relcko/identity` |
| Investments | `@relcko/investment-engine` | `@relcko/portfolio`, `@relcko/marketplace` |
| NFTs | `@relcko/nft-marketplace` | `@relcko/portfolio` |
| Governance | `@relcko/governance` | `@relcko/identity`, `@relcko/portfolio` |
| Treasury History | `@relcko/treasury` | `@relcko/portfolio` |
| AI Advisor | `@relcko/ai-platform` | `@relcko/portfolio`, `@relcko/marketplace`, `@relcko/governance` |
| Wallet | `@relcko/identity` | `@relcko/security` |
| Settings | `@relcko/identity` | `@relcko/security`, `@relcko/permission` |

## 21. Investor portal UX posture

The portal should feel:

- financially trustworthy
- operationally transparent
- data-rich but calm
- premium without being decorative
- persuasive toward informed action, not hype-driven action
