# Relcko V3.0.0 Frontend Architecture

Status: Official frontend blueprint for Relcko V3.0.0. Architecture only. No code. No framework lock-in.

## 1. Purpose

This document defines the complete frontend architecture for Relcko across web and mobile applications. It assumes:

- Backend V2.15 Beta RC is complete.
- Architecture V1.9 is frozen.
- Existing domain packages remain the only source of business rules.
- Frontend applications render projections, collect intent, and orchestrate user experience.

The frontend must never duplicate financial logic, permission logic, KYC rules, treasury rules, governance rules, or AI policy rules already owned by backend/domain packages.

## 2. Frontend estate

Relcko consists of five user-facing application groups:

1. Public Website
2. Investor Portal
3. Agent Portal
4. Administration Portal
5. Mobile Application

Each application is a distinct experience layer over the same backend platform, shared identity layer, shared notification model, and shared design system.

## 3. Architectural principles

### 3.1 Thin-client principle

The frontend:

- displays read models
- sends user intent
- enforces presentation-level guidance
- reflects capability and state
- handles device concerns such as responsiveness, accessibility, offline behavior, and performance

The frontend does not:

- recalculate authoritative balances
- decide permissions
- settle investments
- compute treasury movements
- determine voting power as source of truth
- execute AI policies independently

### 3.2 Single platform, multiple shells

All applications share a common frontend platform with:

- one design system
- one identity/session model
- one navigation grammar
- one notification grammar
- one search interaction model
- one observability contract
- one content language system

Each application then applies a distinct shell:

- Public shell
- Investor shell
- Agent shell
- Administration shell
- Mobile shell

### 3.3 Domain package reuse

All experience areas map directly to existing Relcko packages and services. Frontend surfaces consume outputs from:

- `@relcko/identity`
- `@relcko/marketplace`
- `@relcko/investment-engine`
- `@relcko/nft-marketplace`
- `@relcko/network-engine`
- `@relcko/portfolio`
- `@relcko/governance`
- `@relcko/treasury`
- `@relcko/ai-platform`
- `@relcko/administration`
- `@relcko/operations`
- `@relcko/performance`
- `@relcko/permission`
- `@relcko/security`
- `@relcko/events`

### 3.4 Capability-driven rendering

Frontend navigation and actions are rendered according to:

- authentication state
- role
- scope
- feature flag exposure
- account health
- KYC state
- wallet state
- environment state

Capability rendering improves UX, but backend authorization remains authoritative.

### 3.5 Event-aware UX

Because Relcko is event-driven, the frontend treats many domain actions as asynchronous. UX must reflect:

- submitted
- accepted
- queued
- processing
- completed
- partially completed
- rejected
- requires review
- requires second approver

The frontend must avoid implying synchronous finality when backend flow is event-driven.

## 4. Shared frontend platform layers

### 4.1 Experience shell layer

Provides:

- app shell
- top navigation
- side navigation
- breadcrumb model
- workspace header
- global action rail
- contextual footer
- command palette
- search launcher
- notification center

### 4.2 Identity and session layer

Provides:

- public, authenticated, and elevated session states
- wallet connection state
- MFA challenge state
- delegated session context
- trusted device state
- session timeout and renewal UX

### 4.3 Content and route layer

Provides:

- route hierarchy
- deep linking
- canonical URLs
- public/private route partitioning
- entity route conventions
- back-stack behavior

### 4.4 Data interaction layer

Provides:

- read model hydration
- query lifecycle states
- optimistic UI only where backend semantics allow it
- stale/refresh indicators
- cache invalidation by domain event class

### 4.5 Feedback layer

Provides:

- toasts
- banners
- inline validation
- blocking dialogs
- review drawers
- audit acknowledgements
- system status indicators

### 4.6 Device adaptation layer

Provides:

- responsive layout
- touch-first patterns on mobile
- degraded media strategy
- offline queue strategy for safe interactions

### 4.7 State management layer

Provides:

- server state ownership and cache policy
- UI state ownership
- session state ownership
- wallet state ownership
- notification state ownership
- temporary form state ownership
- search state ownership
- real-time event ingestion state

## 5. Frontend state strategy

### 5.1 State classes

The frontend state model is split into eight classes:

- Server State
- UI State
- Session State
- Wallet State
- Notification State
- Temporary Form State
- Search State
- Real-time Event State

### 5.2 Server State

Server State is any backend-owned, authoritative read model or entity view.

Examples:

- marketplace inventory
- property detail projections
- portfolio snapshots
- investment history
- governance proposals and vote state
- treasury history
- agent commission views
- administrative queues

Ownership boundary:

- backend packages remain authoritative
- frontend caches and renders only
- no client-side recalculation becomes the source of truth

Primary package relationship:

- `@relcko/marketplace`
- `@relcko/investment-engine`
- `@relcko/portfolio`
- `@relcko/governance`
- `@relcko/treasury`
- `@relcko/network-engine`
- `@relcko/administration`
- `@relcko/operations`

### 5.3 UI State

UI State is presentation-only state.

Examples:

- drawer open or closed
- active tab
- selected table rows
- chart display mode
- density preference
- modal sequencing

Ownership boundary:

- local to route, shell, or component subtree
- never persisted as business truth

### 5.4 Session State

Session State represents authenticated identity continuity.

Examples:

- authenticated or anonymous
- elevated session active
- MFA required
- trusted device recognized
- impersonation banner active
- session near expiry

Ownership boundary:

- sourced from `@relcko/identity` and `@relcko/security`
- shared across application shell
- cleared immediately on revocation or emergency invalidation

### 5.5 Wallet State

Wallet State is distinct from Session State.

Examples:

- wallet connected or disconnected
- verified account association
- active chain
- pending signature
- rejected signature
- pending transaction handoff

Ownership boundary:

- sourced from `@relcko/identity` and `@relcko/security`
- never treated as sufficient proof of app authorization
- reused across investor, agent, and mobile experiences

### 5.6 Notification State

Notification State includes:

- unread counts
- in-session banners
- notification inbox filters
- acknowledged versus unresolved priority alerts

Ownership boundary:

- event-derived from canonical backend events
- local read/acknowledged presentation state may be cached
- source events remain authoritative

### 5.7 Temporary Form State

Temporary Form State includes:

- incomplete KYC steps
- investment amount drafts
- support and contact drafts
- admin review notes
- agent lead note drafts

Ownership boundary:

- local to workflow
- persisted only where resumability is explicitly allowed
- invalidated when underlying authority state changes materially

### 5.8 Search State

Search State includes:

- current query
- applied filters
- sort mode
- saved view selection
- recent searches

Ownership boundary:

- shell-level for global search
- route-level for contextual search
- may persist per user preference where safe

### 5.9 Real-time Event State

Real-time Event State is the live frontend view of backend event progression.

Examples:

- investment submitted then processing
- governance proposal lifecycle advancing
- commission calculated then paid
- admin incident severity changing
- emergency mode entering or exiting

Ownership boundary:

- canonical events originate in backend systems
- frontend uses them to invalidate, refresh, or annotate Server State
- event stream never becomes a substitute for full authoritative refetch where required

### 5.10 Cache invalidation by canonical backend events

Invalidation must be event-aware and package-aware.

Examples:

- marketplace and investment views refresh on investment completion, sale completion, property publication, and ownership update events
- portfolio views refresh on ownership, dividend, NFT transfer, voting-power, and treasury-history affecting events
- governance views refresh on proposal, vote, execution, and voting-power events
- treasury views refresh on journal, movement, dividend, reserve, reconciliation, and reporting events
- network and agent views refresh on referral, commission, performance, and leaderboard events
- admin and operations views refresh on incident, alert, audit, feature flag, emergency, and compliance events

The frontend may choose between:

- direct cache invalidation
- stale marking plus background refresh
- visible real-time patch plus authoritative refetch

based on action sensitivity.

## 6. Shared route conventions

### 5.1 Public routes

- `/`
- `/marketplace`
- `/marketplace/property/:propertyId`
- `/presale`
- `/about`
- `/blog`
- `/support`
- `/contact`

### 5.2 Authenticated web routes

- `/investor/*`
- `/agent/*`
- `/admin/*`

### 5.3 Mobile route families

- `/m/investor/*`
- `/m/agent/*`
- `/m/executive/*`

### 5.4 Entity route grammar

Use stable entity segments:

- `/property/:propertyId`
- `/investment/:investmentId`
- `/proposal/:proposalId`
- `/nft/:nftId`
- `/document/:documentId`
- `/account/:accountId`
- `/agent/:agentId`
- `/user/:userId`

## 7. Authentication architecture

### 6.1 Authentication entry points

- anonymous browsing for public website
- investor login
- agent login
- administrator login
- wallet-based sign-in
- email/password or enterprise identity where enabled
- MFA step-up for sensitive actions

### 6.2 Authentication progression

1. Discover
2. Authenticate
3. Verify identity strength
4. Resolve role and scope
5. Resolve KYC and wallet status
6. Land user in the correct shell

### 6.3 Session states

- anonymous
- authenticated
- authenticated plus wallet connected
- authenticated plus KYC in progress
- authenticated plus KYC approved
- elevated session for sensitive actions
- delegated/impersonation session for administration, if permitted
- expired
- locked

## 8. Authorization architecture

Frontend authorization responsibilities:

- hide irrelevant navigation
- explain why actions are unavailable
- route users to the correct onboarding or approval step
- display scope boundaries
- distinguish read access from write access

Backend authorization responsibilities remain authoritative.

## 9. Wallet integration architecture

Wallet UX is shared but context-aware:

- public website uses wallet connection as a conversion path
- investor portal uses wallet for investment, ownership, NFT, and governance continuity
- agent portal uses wallet primarily for identity continuity, payout visibility, and future commission rails
- admin portal never treats wallet alone as sufficient for sensitive control-plane authority
- mobile supports reconnect, trusted wallet state, and chain mismatch guidance

Wallet UX states:

- not connected
- connected
- wrong network
- signature required
- verification pending
- verified
- connection lost

## 10. Notification architecture

Notifications are grouped into:

- transactional
- portfolio and asset
- treasury and dividend
- governance
- referral and commission
- compliance and document
- AI advisory
- administrative and system

Notification delivery surfaces:

- global notification center
- inline page banners
- entity timelines
- mobile push equivalents
- priority interrupt banners for emergency or sensitive states

## 11. Search architecture

Search operates in three modes:

- global search
- contextual search
- command palette search

Search domains:

- properties
- investments
- NFTs
- proposals
- documents
- users
- agents
- treasury records
- audit and operational records

Search must be permission-scoped and result-grouped by domain.

## 12. Error and loading architecture

### 11.1 Error taxonomy

- user input errors
- capability errors
- session errors
- dependency errors
- domain rejection errors
- asynchronous processing delays
- system degradation
- emergency mode restrictions

### 11.2 Loading taxonomy

- page shell loading
- section loading
- table loading
- chart loading
- timeline loading
- transactional pending
- background refresh

## 13. Offline architecture

Offline support is intentional and limited by domain sensitivity.

Allowed offline behaviors:

- cached read access to recent public content
- cached investor and agent dashboard snapshots
- local draft capture for notes, contact forms, filters, and support workflows
- queued non-sensitive preference changes where safe

Disallowed offline behaviors:

- investment execution
- treasury actions
- governance voting final submission
- KYC final submission without integrity confirmation
- permission-sensitive mutations

## 14. Accessibility architecture

Accessibility is a first-class system requirement:

- keyboard complete
- screen-reader predictable
- contrast-safe
- reduced-motion aware
- form guidance explicit
- state changes announced
- focus order consistent across shells

## 15. Performance architecture

Global expectations:

- instant shell response for primary navigation
- sub-second route transitions for already-loaded areas
- controlled media budgets on public and property-heavy pages
- deferred secondary content below the fold
- route-level splitting by portal and by major feature
- low-jank chart and animation behavior

Targets are defined in `FRONTEND_IMPLEMENTATION_STRATEGY.md`.

## 16. Real-time architecture

### 16.1 Transport responsibilities

Relcko uses a mixed transport strategy:

- WebSocket for bidirectional, session-bound, high-value live interaction channels
- Server-Sent Events for ordered server-to-client event feeds where the browser session only needs push updates
- polling for low-frequency or fallback refresh paths

### 16.2 WebSocket responsibilities

Use WebSocket-class transport for:

- authenticated notification channels
- interactive AI streaming sessions
- administration incident workspaces that benefit from bidirectional continuity
- live multi-step action monitoring where acknowledgement and presence matter

### 16.3 Server-Sent Events responsibilities

Use SSE-class transport for:

- dashboard live updates
- portfolio and marketplace freshness markers
- governance lifecycle updates
- commission and leaderboard updates
- emergency-state broadcast
- operations and monitoring stream updates

### 16.4 Polling responsibilities

Use polling for:

- public website freshness where live push is unnecessary
- low-frequency archival views
- degraded-mode fallback when persistent transports are unavailable
- mobile background refresh windows

### 16.5 Reconnect behavior

Reconnect behavior must:

- back off progressively
- preserve visible connection state
- avoid duplicate action confirmation
- request authoritative resynchronization after long disconnects

### 16.6 Offline handling

When offline:

- live channels pause visibly
- stale markers appear on affected data
- safe drafts remain local
- authoritative actions remain blocked until connection and session integrity are restored

### 16.7 Event ordering

Frontend assumes backend events are canonical but still guards presentation against drift.

Rules:

- order-sensitive flows use server timestamps or sequence metadata where available
- late-arriving events may annotate state but should trigger authoritative refresh for financial, governance, treasury, and emergency workflows
- event patches must never overrule a newer authoritative refetch result

### 16.8 Cache invalidation

Real-time messages may:

- patch low-risk visible state
- increment counters
- mark sections stale
- trigger refetch

High-risk actions always conclude with authoritative refresh.

## 17. Optimistic UI policy

### 17.1 Policy classes

- Safe optimistic actions
- Deferred actions
- Authoritative actions
- Financial actions
- Governance actions
- Wallet actions
- AI actions
- Treasury actions

### 17.2 Safe optimistic actions

Safe optimistic actions may update the UI immediately and reconcile later.

Examples:

- opening, saving, or removing a local watchlist view
- marking a low-risk notification as read
- saving dashboard layout preference
- reordering table columns
- saving local filter presets

### 17.3 Deferred actions

Deferred actions should show immediate submission feedback but not final success.

Examples:

- lead update submitted and awaiting server acceptance
- support request submitted
- document metadata note submitted
- AI prompt submitted and awaiting streamed response

### 17.4 Authoritative actions

Authoritative actions must wait for backend confirmation before the UI treats them as complete.

Examples:

- changing account security settings
- finalizing KYC submission status
- switching delegated account context
- accepting or rejecting compliance work items

### 17.5 Financial actions

Financial actions are never fully optimistic.

Examples:

- investment submission
- sale completion
- dividend claim
- commission payout visibility changes

Policy:

- allow immediate pending-state transition
- never show completed balance or ownership change until backend confirms

### 17.6 Governance actions

Governance actions are authoritative and event-aware.

Examples:

- casting a vote
- delegating voting rights
- queuing proposal execution

Policy:

- show submission accepted or signature captured
- wait for backend-authoritative state before showing vote or execution as final

### 17.7 Wallet actions

Wallet actions are not optimistic.

Examples:

- wallet connect
- network switch
- signature request
- transaction signature

Policy:

- reflect pending intent only
- final UI state changes after confirmed wallet or backend acknowledgment

### 17.8 AI actions

AI actions are partially optimistic only at the conversational layer.

Examples:

- show user prompt immediately
- show thinking or response streaming state
- never show advisory output as binding state mutation

### 17.9 Treasury actions

Treasury actions are strictly authoritative.

Examples:

- movement initiation
- approval
- rejection
- reserve changes
- emergency treasury restrictions

Policy:

- no optimistic completion
- require backend-confirmed and audit-visible state

### 17.10 Official decision rule

If an action affects:

- money
- ownership
- voting power
- treasury control
- compliance state
- emergency state
- security posture

the frontend may show progress immediately, but not success as final until authoritative backend state is received.

## 18. Security responsibilities

Frontend security responsibilities:

- protect session tokens and local session surface
- avoid logging PII and secrets
- enforce safe clipboard and download behavior
- clearly show signed-action requirements
- never infer permissions client-side as truth
- reflect MFA and step-up requirements before submission
- prevent unsafe UI shortcuts around review and approval

The frontend does not reimplement backend validation or domain security rules.

## 19. Internationalisation architecture

Relcko is English-first at V3 launch.

Rules:

- all user-facing strings must be externalised
- currency formatting must respect asset currency and locale display rules
- date and time formatting must respect locale and timezone presentation
- numeric formatting must preserve financial clarity
- future language expansion must not require route redesign or component rewrites

English-first means:

- English is the only launch language
- locale-aware formatting is still required from day one
- content architecture must be translation-ready even before multilingual rollout

## 20. Application overview

- Public Website: acquisition, education, trust, exploration, lead conversion
- Investor Portal: ownership, investment, treasury visibility, governance, AI guidance
- Agent Portal: lead conversion, network performance, commissions, coaching, rewards
- Administration Portal: orchestration, oversight, compliance, operational control
- Mobile: high-frequency investor and agent actions, lightweight executive oversight

## 21. Application architecture summaries

### 17.1 Public Website

Purpose:

- trust building
- audience education
- property discovery
- presale conversion
- lead and account creation entry

Primary users:

- anonymous visitors
- prospective investors
- prospective agents
- partners and media

Navigation hierarchy:

- Landing
- Marketplace
- Presale
- About
- Blog
- Support
- Contact

Route hierarchy:

- `/`
- `/marketplace`
- `/marketplace/property/:propertyId`
- `/presale`
- `/about`
- `/blog`
- `/support`
- `/contact`

Authentication flow:

- default anonymous browsing
- contextual sign-in or create-account prompts from investment-intent surfaces
- wallet connection offered as a conversion accelerant, not an entry requirement

Authorization model:

- public by default
- authenticated affordances appear only when useful
- no sensitive actions complete without authenticated investor or agent context

Session behavior:

- anonymous continuity for browse
- gentle escalation into authenticated state
- preserve referrer and shortlisted context through login

Wallet integration:

- connect from property and presale conversion moments
- expose supported network and signing expectations before escalation into investing

Notification model:

- limited to subscription, newsletter, support-response, and conversion follow-up patterns

Search behavior:

- property-first
- content-second
- filters optimized for discovery rather than operations

Dashboard layout:

- not applicable as an authenticated workbench
- landing uses hero, trust proof, marketplace preview, and conversion sections

Global actions:

- Search
- Connect wallet
- Sign in
- View marketplace
- Contact support

Error handling:

- soft guidance for contact and subscribe errors
- trust-preserving fallback for unavailable property data

Loading states:

- media placeholders
- property card skeletons
- route shell persistence

Offline behavior:

- cached public pages and recent marketplace browse where possible
- no transactional progression offline

Accessibility considerations:

- strong contrast
- keyboard browse support
- readable editorial hierarchy

Performance expectations:

- strongest performance target in platform
- public website optimized for fast first render and high SEO quality

### 17.2 Investor Portal

Full architecture is defined in `INVESTOR_PORTAL_ARCHITECTURE.md`.

### 17.3 Agent Portal

Full architecture is defined in `AGENT_PORTAL_ARCHITECTURE.md`.

### 17.4 Administration Portal

Full architecture is defined in `ADMIN_PORTAL_ARCHITECTURE.md`.

### 17.5 Mobile Application

Full architecture is defined in `MOBILE_APPLICATION_ARCHITECTURE.md`.

## 22. Governance of the frontend blueprint

This blueprint is the official frontend architecture baseline for Relcko V3.

Changes to:

- navigation grammar
- experience shell model
- package ownership boundaries
- security responsibilities
- route conventions
- cross-application behavior

must be treated as architectural changes, not ad hoc implementation decisions.
