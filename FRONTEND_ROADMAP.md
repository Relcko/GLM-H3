# Relcko V3.0.0 Frontend Roadmap

Status: Official roadmap for frontend architecture realization. Architecture only.

## 1. Roadmap objective

Turn the V3 frontend blueprint into a production-ready multi-application frontend program while preserving the frozen backend architecture and existing package ownership.

## 2. Guiding roadmap rules

- foundation before feature sprawl
- investor value before peripheral expansion
- operational trust before decorative refinement
- mobile after shared interaction model is stable

## 3. Milestone sequence

### Milestone F1: Foundation Platform

Deliver:

- design system baseline
- shell architecture
- route and navigation conventions
- identity, session, wallet, notification, and search adapters
- error and loading system
- state ownership model
- optimistic UI policy
- real-time transport contract
- token architecture

Outcome:

- one reusable frontend platform for all Relcko apps

### Milestone F2: Public Trust and Discovery

Deliver:

- landing
- public marketplace
- property details
- presale
- support and contact

Outcome:

- acquisition-ready public surface

### Milestone F3: Investor Core

Deliver:

- investor dashboard
- marketplace-authenticated flow
- KYC entry
- KYC persistence and resume behavior
- investments
- portfolio
- wallet center
- documents

Outcome:

- complete investor activation and ownership loop

### Milestone F4: Investor Expansion

Deliver:

- governance
- treasury history
- NFTs
- AI advisor
- advanced notifications and search

Outcome:

- complete investor experience

### Milestone F5: Agent Operating System

Deliver:

- dashboard
- leads
- customers
- referral network
- commissions
- performance
- rewards
- leaderboard
- referral network visualization
- AI sales assistant

Outcome:

- complete agent operating environment

### Milestone F6: Administration Control Plane

Deliver:

- executive dashboard
- users and properties
- treasury and governance oversight
- compliance and KYC/AML workbench
- operations and monitoring
- AI control center
- audit logs
- feature flags
- emergency controls
- emergency session broadcast and recovery UX
- system configuration

Outcome:

- complete administration portal

### Milestone F7: Mobile Expansion

Deliver:

- investor mobile
- agent mobile
- executive limited mobile
- React Native plus Expo operationalization
- biometric, wallet handoff, push, secure storage, and camera-enabled KYC continuity

Outcome:

- mobile continuity for high-frequency workflows

## 4. Sequencing rationale

- public website and investor core come first because they generate trust and revenue
- agent portal follows once marketplace and investment workflows are stable
- admin portal follows after enough domain breadth exists to justify a control-plane workbench
- mobile follows shared model maturity to avoid duplicating unstable assumptions

## 5. Dependency notes

- mobile depends on the shared token, session, notification, and deep-link contracts being stable
- KYC hardening depends on identity and document experience consistency
- referral network visualization depends on network-engine read models being presentation-ready
- emergency controls depend on administration, security, permission, and operations event alignment

## 6. Readiness gates per milestone

Each milestone must pass:

- design review
- package mapping review
- accessibility review
- security responsibility review
- performance budget review
- copy and UX consistency review

## 7. Program risks to watch

- frontend teams duplicating domain rules for convenience
- portal-specific component divergence
- overbuilding admin before investor value
- treating mobile as a direct copy of desktop
- allowing AI surfaces to bypass review and explainability rules

## 8. Success criteria

- all major user roles have coherent, role-appropriate frontends
- every screen maps cleanly to existing packages
- frontend remains thin and architecture-aligned
- shared design system prevents fragmentation
- performance and accessibility stay first-class throughout delivery
