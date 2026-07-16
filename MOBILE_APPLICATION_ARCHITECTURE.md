# Mobile Application Architecture

Status: Official architecture for the Relcko Mobile Application. Architecture only. Official mobile technology baseline: React Native plus Expo.

## 1. Purpose

The Relcko mobile application extends the platform to high-frequency, on-the-go workflows. It is not a compressed copy of the full web platform. It prioritizes essential investor and agent actions plus limited executive visibility.

## 2. Mobile application variants

- Investor mobile experience
- Agent mobile experience
- Executive mobile experience, limited

## 3. Product philosophy

Mobile should be:

- focused
- fast
- reassuring
- interruption-friendly
- connection-aware

It should avoid complex, high-risk back-office workflows that demand large-screen review contexts.

## 4. Official technology decision

Relcko mobile is officially defined as:

- React Native plus Expo

This decision is part of blueprint hardening, not a change in product architecture.

### 4.1 Why this is the official mobile baseline

- supports native wallet handoff behavior well
- supports mobile deep linking cleanly
- supports biometric re-entry and secure storage integration
- supports push notifications
- supports camera-driven KYC capture
- supports offline-aware mobile packaging
- supports shared TypeScript-domain package reuse without duplicating business logic

### 4.2 Relationship to web portals

The mobile application is not a separate product architecture. It is a role-limited mobile shell over the same backend platform and package boundaries as the web portals.

Rules:

- web and mobile share domain ownership
- web and mobile share identity, wallet, event, and permission concepts
- mobile may simplify workflows, but may not redefine them
- mobile may omit high-risk administration flows, but may not invent alternate business rules

## 5. Information architecture

### 4.1 Shared mobile navigation

- Home
- Activity
- Search
- Notifications
- Account

Role-specific tabs and quick actions sit inside this shared frame.

### 4.2 Investor mobile navigation

- Home
- Portfolio
- Marketplace
- Investments
- Governance
- Wallet

### 4.3 Agent mobile navigation

- Home
- Leads
- Network
- Commissions
- AI Assistant
- Account

### 4.4 Executive mobile navigation

- Snapshot
- Alerts
- Operations
- Account

## 6. Route hierarchy

- `/m`
- `/m/investor`
- `/m/investor/home`
- `/m/investor/portfolio`
- `/m/investor/marketplace`
- `/m/investor/property/:propertyId`
- `/m/investor/investments`
- `/m/investor/kyc`
- `/m/investor/kyc/identity`
- `/m/investor/kyc/documents`
- `/m/investor/kyc/review`
- `/m/investor/kyc/status`
- `/m/investor/governance`
- `/m/investor/wallet`
- `/m/agent`
- `/m/agent/home`
- `/m/agent/leads`
- `/m/agent/lead/:leadId`
- `/m/agent/network`
- `/m/agent/commissions`
- `/m/agent/ai-assistant`
- `/m/executive`
- `/m/executive/snapshot`
- `/m/executive/alerts`
- `/m/executive/operations`

## 7. Authentication flow

- biometric or device-assisted re-entry where policy permits
- full login fallback always available
- wallet reconnect flow optimized for mobile wallets
- step-up authentication for sensitive investor actions

## 8. Authorization model

Mobile follows the same backend authorization model as web, but with stronger UX constraints:

- only actions that can be safely completed on mobile are surfaced
- limited executive access is read-heavy
- no broad administrative mutation surface

## 9. Session behavior

- short interaction cycles
- strong suspend/resume handling
- biometric unlock for quick re-entry where allowed
- rapid session invalidation for high-risk states
- safe restoration after app interruption

## 10. Native wallet integration

Mobile wallet experience is native-handoff oriented.

Requirements:

- deep-link or equivalent handoff into wallet applications
- return-path recovery to the originating Relcko workflow
- explicit unsupported-wallet guidance
- chain mismatch guidance before transaction intent
- pending signature state that survives app switching
- post-signature reconciliation when the app regains focus

Native wallet support responsibilities:

- investor mobile: core for investing, governance, and NFT continuity
- agent mobile: optional but available for identity continuity and future payout awareness
- executive mobile: informational only unless future governance or signature workflows are explicitly enabled

## 11. Deep linking

Mobile deep linking must support:

- direct links into public property details
- investor routes such as investment detail, governance proposal, or KYC status
- agent routes such as lead detail or commission detail
- executive routes such as alerts and operations snapshots
- wallet return paths after signature or connection handoff
- notification-driven deep links

Rules:

- unauthenticated deep links preserve destination intent through login
- expired sessions return the user to the intended route after re-authentication when safe

## 12. Biometrics and secure storage

Biometric authentication is allowed for:

- quick re-entry
- device-local unlock of active session context

Biometrics are not a substitute for:

- backend authorization
- MFA for elevated operations where policy requires stronger assurance

Secure storage is used for:

- session continuity material permitted for device storage
- trusted-device indicators
- local drafts that do not contain prohibited secret material

Secrets, raw sensitive documents, and privileged backend rules are never treated as client-owned assets.

## 13. Push notifications

Push notifications are an official mobile responsibility.

Priority mobile push classes:

- investment lifecycle
- governance reminders
- dividend-related events
- security events
- lead and commission updates
- executive critical alerts

Push behavior must respect:

- role
- notification preferences
- device permission state
- quiet-hour and priority rules where policy permits

## 14. Camera and KYC support

Camera support is an official mobile requirement for KYC and document workflows.

Camera responsibilities:

- guided document capture
- retake flow
- glare and framing guidance
- multi-page document sequencing
- clear upload completion and review state

Camera capture supports KYC but does not redefine KYC policy or document verification logic.

## 15. Offline capability

Mobile offline support is stronger than public web browsing but still bounded by domain safety.

Allowed:

- cached dashboard summaries
- local KYC draft continuation before final submission
- local search and filter memory
- draft lead notes

Disallowed:

- final investment submission
- final governance submission
- final treasury or executive control actions

## 16. Shared package strategy

Mobile reuses the same domain package boundaries as web.

Shared package strategy:

- business logic remains in existing backend/domain packages
- shared type and event vocabulary remains consistent across web and mobile
- presentation shell, touch patterns, offline behavior, secure storage, push, and camera integration are mobile-specific concerns

No mobile-specific shadow rules are allowed for:

- ownership
- money movement
- permissions
- KYC outcome
- governance finality

## 17. Wallet integration

Mobile wallet experience must support:

- deep-link or equivalent handoff to wallet apps
- connection continuity
- signature-return recovery
- chain mismatch guidance
- transaction pending and confirmation state

## 18. Notification model

Mobile is the highest-priority notification surface for:

- investment milestones
- governance reminders
- dividend distribution
- security events
- lead and commission updates
- incident alerts for executives

## 19. Search behavior

Mobile search focuses on fast retrieval:

- properties
- investments
- leads
- agents
- commissions
- proposals

It should avoid desktop-style heavy faceted workflows unless context demands it.

## 20. Dashboard layouts

### 12.1 Investor home

- account greeting
- portfolio summary
- active positions
- pending actions
- opportunity cards
- AI suggestion strip

### 12.2 Agent home

- daily KPI stack
- lead tasks
- team signal strip
- commissions summary
- AI action suggestions

### 12.3 Executive snapshot

- critical alerts
- platform health
- treasury headline metrics
- governance headline metrics
- compliance and incident summary

## 21. Global actions

- Search
- Open notifications
- Continue last action
- Connect or manage wallet
- Ask AI

## 22. Error handling

Mobile errors must be terse and recovery-oriented:

- preserve context after wallet handoff failures
- clearly distinguish no network from backend rejection
- keep unfinished flows resumable where safe

## 23. Loading states

- skeleton cards
- shimmer lists
- lightweight route placeholders
- transaction-progress sheets
- reconnect overlays

## 24. Offline behavior

Allowed:

- cached summaries
- saved watchlists and filters
- draft notes or reminders

Disallowed:

- high-risk financial completion
- governance vote submission without verified sync
- executive control actions

## 25. Accessibility considerations

- touch target consistency
- one-hand interaction support
- voice-over friendly navigation
- dynamic type support
- reduced-motion behavior
- readable finance layouts in narrow widths

## 26. Performance expectations

- fast cold launch
- minimal above-the-fold data on first render
- aggressive route-level deferral
- compressed media and chart strategy
- battery-respectful animations

## 27. Package mapping

| Mobile area | Primary package | Supporting packages |
|-------------|-----------------|---------------------|
| Investor Home | `@relcko/portfolio` | `@relcko/marketplace`, `@relcko/treasury`, `@relcko/ai-platform` |
| Investor Marketplace | `@relcko/marketplace` | `@relcko/investment-engine` |
| Investor Investments | `@relcko/investment-engine` | `@relcko/portfolio` |
| Investor Governance | `@relcko/governance` | `@relcko/identity` |
| Investor Wallet | `@relcko/identity` | `@relcko/security` |
| Agent Home | `@relcko/network-engine` | `@relcko/treasury`, `@relcko/ai-platform` |
| Agent Leads | `@relcko/network-engine` | `@relcko/identity` |
| Agent Commissions | `@relcko/network-engine` | `@relcko/treasury` |
| Agent AI Assistant | `@relcko/ai-platform` | `@relcko/network-engine` |
| Executive Snapshot | `@relcko/administration` | `@relcko/operations`, `@relcko/performance`, `@relcko/treasury` |

## 28. Mobile posture

Mobile is a first-class surface for frequent action, not a second-class companion. Its scope is intentionally narrower so it remains safe, performant, and trustworthy.
