# Relcko V3.0.0 Frontend Implementation Strategy

Status: Implementation strategy blueprint. Architecture only. No framework-specific code.

## 1. Purpose

This document defines how the Relcko frontend should be delivered without changing frozen backend architecture or duplicating business logic.

## 2. Delivery model

Frontend delivery should proceed as a platform program with:

- shared shell and design system first
- identity and session integration second
- public website and investor portal core third
- agent and administration specialization fourth
- mobile experiences fifth

## 3. Frontend platform layers

### 3.1 Shared foundation

- design tokens
- typography system
- shell primitives
- form, table, chart, dialog, and notification patterns
- route conventions
- error and loading patterns

### 3.2 Shared application services

- identity session adapter
- capability adapter
- wallet adapter
- notification adapter
- search adapter
- observability adapter
- feature-flag adapter
- real-time event adapter
- i18n formatting adapter

### 3.3 Experience shells

- public shell
- investor shell
- agent shell
- admin shell
- mobile shell

## 4. Build sequence

### Phase 1

- design system specification
- public shell
- authenticated shell foundation
- identity/session/wallet framework-agnostic adapters

### Phase 2

- public website
- investor dashboard
- marketplace
- property details
- KYC entry flow

### Phase 3

- investments
- portfolio
- documents
- wallet center

### Phase 4

- governance
- treasury history
- NFTs
- AI advisor

### Phase 5

- agent dashboard
- leads and customers
- commissions
- referral network
- AI sales assistant

### Phase 6

- administration portal
- operations and monitoring
- audit logs
- emergency controls

### Phase 7

- investor mobile
- agent mobile
- executive mobile

## 5. Code splitting strategy

Split by:

- application shell
- route family
- major domain area
- secondary tools such as AI, monitoring, charts, or heavy visualization

Always keep:

- public landing shell
- auth shell
- core navigation
- lightweight notification and command launchers

outside the heaviest deferred bundles.

## 6. Lazy loading strategy

Lazy load:

- admin-only tools
- governance workbench
- treasury workbench
- audit-heavy tables
- AI surfaces
- charting-heavy analytics
- 3D or high-media public experiences
- network hierarchy visualizations

## 7. Prefetch strategy

Prefetch should be intent-based, not blanket-based.

High-value prefetch candidates:

- marketplace property details from list hover or focus
- investment detail after investment completion
- dashboard-linked next steps
- top notifications
- likely next route in onboarding

Avoid aggressive prefetch for:

- admin-only heavy views
- large audit datasets
- low-probability deep links

## 8. Caching strategy

### 8.1 Cache classes

- static brand and content cache
- session-aware read model cache
- short-lived activity cache
- entity detail cache
- local draft cache

### 8.2 Invalidation model

Invalidate or refresh based on:

- authentication change
- wallet state change
- KYC state change
- role or capability change
- relevant domain event classes

## 9. Frontend testing strategy

### 9.1 Unit testing

Unit testing covers:

- formatting and token logic
- state reducers or equivalent local state helpers
- route guards and intent preservation logic
- optimistic UI decision helpers
- cache invalidation decision helpers

### 9.2 Component testing

Component-level testing covers:

- forms
- tables
- dialogs
- banners
- skeleton and loading transitions
- accessibility semantics of design-system primitives

### 9.3 Integration testing

Integration testing covers:

- auth plus route resolution
- wallet plus investment flow continuity
- KYC resume and approval-state transitions
- governance action lifecycle rendering
- emergency banner propagation
- agent referral-network drilldowns

### 9.4 Accessibility testing

Accessibility testing covers:

- keyboard navigation
- screen-reader semantics
- color contrast
- reduced-motion behavior
- chart alternatives

### 9.5 Visual regression

Visual regression covers:

- public marketing surfaces
- core portal shells
- dashboard compositions
- emergency states
- light and dark theme parity

### 9.6 End-to-end testing

End-to-end testing covers:

- public to investor conversion
- KYC onboarding
- investment flow
- NFT flow
- governance flow
- agent lead to commission flow
- administration emergency workflow

### 9.7 Performance testing

Performance testing covers:

- shell load budget
- route transition budget
- dashboard rendering under dense data
- live update stability
- mobile cold start and reconnect behavior

### 9.8 Acceptance criteria

Each major workflow is accepted only when:

- package mapping remains intact
- no duplicated business logic is introduced
- accessibility criteria are met
- event-driven state transitions remain clear
- performance budget remains within target

## 10. Image strategy

- progressive loading for property imagery
- responsive image variants by viewport
- priority loading for above-the-fold trust visuals
- deferred loading for galleries and secondary media
- consistent placeholders to prevent layout shift

## 11. 3D asset strategy

3D and immersive assets are optional, not foundational.

Rules:

- never block core content
- only load on demand
- provide static fallback
- limit to public property storytelling or premium showcase contexts

## 12. Animation budget

Animation budget rules:

- shell transitions subtle
- no heavy continuous animations on data-dense pages
- charts transition only when useful
- mobile animations battery-conscious
- emergency and operational surfaces nearly static

## 13. Lighthouse and performance targets

### Public website

- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

### Investor and agent portals

- Performance: 85+
- Accessibility: 95+
- Best Practices: 95+

### Administration portal

- Performance: 80+
- Accessibility: 95+
- Best Practices: 95+

## 14. Internationalisation delivery strategy

- English-first launch
- all strings externalised from the start
- locale-aware currency and date formatting
- translation-ready route and content architecture
- no hard-coded financial or temporal formatting in screen-specific logic

## 15. Security strategy, frontend responsibilities only

- do not store sensitive secrets in insecure client surfaces
- minimize retained PII locally
- require re-auth flows for sensitive operations
- render capability-aware UI but never trust it as authorization truth
- clearly expose wallet-signature and review steps
- prevent accidental destructive actions with deliberate confirmation patterns

## 16. Observability strategy

Frontend observability should capture:

- route performance
- shell load timing
- transaction step abandonment
- KYC flow abandonment
- investment funnel conversion
- agent workflow completion
- admin control-flow completion

No raw sensitive document content or secrets should be logged.

## 17. Accessibility strategy

- WCAG-oriented baseline across all applications
- keyboard complete on desktop web
- screen-reader safe semantics
- reduced-motion support
- tabular and textual alternatives for all critical charts

## 18. Release strategy

Release by capability slices, not isolated page silos.

Recommended slices:

1. shell plus auth
2. discovery plus marketplace
3. invest plus portfolio
4. governance plus treasury history plus NFT
5. agent operating suite
6. administration control suite
7. mobile suite

## 19. Non-goals

- no duplicated domain logic
- no alternate permission engine
- no separate mobile business rules
- no admin-only shadow workflows that bypass official packages
