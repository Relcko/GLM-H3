# Administration Portal Architecture

Status: Official architecture for the Relcko Administration Portal. Architecture only.

## 1. Purpose

The Administration Portal is the control-plane and oversight environment for Relcko. It is not a second business system. It orchestrates platform actions using existing administration, operations, treasury, governance, identity, and security packages.

## 2. Primary users

- Administrators
- Super administrators
- Compliance officers
- Treasury managers
- Governance managers
- Executive oversight users
- Operations and reliability staff

## 3. Experience goals

- make risk and platform state immediately visible
- distinguish observation from authority
- separate review, approval, and execution concerns
- keep sensitive actions slow enough to be safe
- make auditability visible in the UI itself

## 4. Navigation hierarchy

### 4.1 Primary navigation

- Executive Dashboard
- Users
- Properties
- Marketplace
- Treasury
- Governance
- Compliance
- KYC / AML
- Operations
- Monitoring
- AI Control Center
- Audit Logs
- Feature Flags
- Emergency Controls
- System Configuration

### 4.2 Secondary navigation

- review queues
- entity workbenches
- approval drawers
- incident detail panels
- audit drilldowns
- system status overlays

## 5. Route hierarchy

- `/admin`
- `/admin/executive-dashboard`
- `/admin/users`
- `/admin/users/:userId`
- `/admin/properties`
- `/admin/properties/:propertyId`
- `/admin/marketplace`
- `/admin/marketplace/property/:propertyId`
- `/admin/treasury`
- `/admin/treasury/movement/:movementId`
- `/admin/governance`
- `/admin/governance/proposal/:proposalId`
- `/admin/compliance`
- `/admin/kyc-aml`
- `/admin/operations`
- `/admin/monitoring`
- `/admin/ai-control-center`
- `/admin/audit-logs`
- `/admin/feature-flags`
- `/admin/emergency-controls`
- `/admin/system-configuration`

## 6. Authentication flow

1. Administrator authenticates.
2. Elevated assurance is required by default.
3. Role, scope, and environment checks resolve administration areas.
4. Sensitive sections may require step-up MFA or second-approver workflow before actions are unlocked.
5. Emergency mode changes shell state and interaction permissions immediately.

## 7. Authorization model

Admin UX is area-based and capability-driven.

Frontend must clearly reflect:

- read-only visibility
- initiate authority
- approval authority
- emergency authority
- compliance-only visibility
- executive summary visibility without mutation capability

Critical rule:

The portal must never visually imply that mere page access grants execution authority.

## 8. Session behavior

- short-lived elevated confidence for sensitive areas
- automatic re-authentication for treasury, governance execution, emergency controls, role changes, and configuration changes
- clear impersonation or delegated context banners where allowed
- forced session interruption when emergency controls or security policy require it

## 9. Wallet integration

Wallet support is secondary to administrative identity assurance.

Wallet may be used for:

- cryptographic continuity
- governance execution context
- treasury or multi-sig awareness

Wallet must not replace high-assurance administrative identity controls.

## 10. Notification model

Administration notifications include:

- compliance review events
- treasury approvals
- governance deadlines and executions
- alert threshold breaches
- incident states
- audit-sensitive events
- feature flag changes
- emergency control changes
- AI policy violations

## 11. Search behavior

Admin search is domain-spanning and permission-scoped.

Search domains:

- users
- agents
- properties
- investments
- treasury records
- governance proposals
- compliance entities
- documents
- incidents
- audit logs
- configuration keys

## 12. Dashboard layout

### 12.1 Executive Dashboard

- enterprise KPI header
- risk and incident strip
- treasury and governance strip
- compliance backlog strip
- revenue and activity strip
- AI and system policy strip

### 12.2 Operations-focused layouts

- left navigation
- workspace header with environment state
- main workbench
- right-side evidence or audit panel

## 13. Global actions

- Search
- Jump to incident
- Open audit context
- Trigger review workflow
- Start approved orchestration action
- Open command palette
- View active alerts
- Enter emergency mode screen

## 14. Error handling

Admin errors must optimize for safe recovery:

- explicit reasoned denials
- clear separation of validation failure, policy failure, and system failure
- evidence-first messages for blocked actions
- no destructive ambiguity
- asynchronous orchestration state visible in timelines

## 15. Loading states

- dashboard skeletons
- table and queue skeletons
- audit-stream progressive loading
- long-running orchestration state steppers
- incident panel refresh indicators

## 16. Emergency controls experience

### 16.1 Emergency mode

Emergency mode is a platform-wide administrative state, not a page-local flag.

The portal must:

- visually shift into emergency state immediately
- reduce non-essential distractions
- elevate incident, alert, and recovery visibility
- restrict actions according to backend emergency policy

### 16.2 Global emergency banner

The administration shell must display a persistent global emergency banner showing:

- emergency active state
- severity
- initiating authority context where allowed
- current restrictions
- path to emergency detail workspace

### 16.3 Session broadcast

When emergency mode changes:

- active admin sessions receive a real-time state update
- relevant investor and agent sessions receive role-appropriate banners or restrictions
- stale sessions are forced to re-evaluate permissions

### 16.4 Hardware MFA

Emergency actions require hardware-grade MFA where backend policy demands it.

The UX must:

- explain why stronger assurance is required
- clearly separate session possession from action authorization

### 16.5 Second approver flow

Where required, emergency actions must present:

- initiator identity
- pending approval state
- second approver acknowledgment step
- action blocked until both stages are satisfied

### 16.6 Confirmation workflow

Emergency confirmation must be multi-stage and evidence-aware.

Stages:

1. Review current state
2. Review impact
3. Re-authenticate if required
4. Confirm initiating intent
5. Await second approver where required
6. Show authoritative accepted state

### 16.7 Recovery workflow

Recovery workflow must provide:

- incident summary
- current restricted systems
- safe order of restoration
- confirmation before lifting restrictions

### 16.8 Exit emergency mode

Exit from emergency mode must:

- require the same or stronger assurance as entry
- summarize active consequences before release
- confirm authoritative backend acceptance before normal UI state returns

### 16.9 Audit acknowledgement

Every emergency action flow must visibly acknowledge:

- audit logging
- actor identity
- action timestamp
- review status

### 16.10 Accessibility

Emergency controls must remain:

- keyboard operable
- screen-reader explicit
- non-color-dependent
- resilient under reduced-motion settings

## 17. Offline behavior

Offline support is intentionally narrow.

Allowed:

- limited cached read-only executive snapshots where policy permits

Disallowed:

- treasury actions
- governance execution
- compliance decisions
- emergency controls
- configuration changes
- any sensitive approval workflow

## 18. Accessibility considerations

- dense data views require strong keyboard support
- audit and incident timelines require semantic structure
- risk and severity cannot depend on color alone
- modals and drawers for sensitive actions must be fully accessible

## 19. Performance expectations

- dashboard shell responsive under heavy data conditions
- operational views prioritize tables and alerts over decorative visuals
- audit logs stream in segments
- monitoring and analytics panels load progressively
- emergency controls always fast, simple, and unambiguous

## 20. Package mapping

| Area | Primary package | Supporting packages |
|------|-----------------|---------------------|
| Executive Dashboard | `@relcko/administration` | `@relcko/operations`, `@relcko/performance`, `@relcko/treasury`, `@relcko/portfolio` |
| Users | `@relcko/administration` | `@relcko/identity`, `@relcko/permission`, `@relcko/security` |
| Properties | `@relcko/administration` | `@relcko/marketplace` |
| Marketplace | `@relcko/administration` | `@relcko/marketplace`, `@relcko/investment-engine` |
| Treasury | `@relcko/administration` | `@relcko/treasury`, `@relcko/security` |
| Governance | `@relcko/administration` | `@relcko/governance`, `@relcko/permission` |
| Compliance / KYC / AML | `@relcko/administration` | `@relcko/identity`, `@relcko/security` |
| Operations / Monitoring | `@relcko/operations` | `@relcko/performance`, `@relcko/events` |
| AI Control Center | `@relcko/administration` | `@relcko/ai-platform`, `@relcko/security` |
| Audit Logs | `@relcko/administration` | `@relcko/events`, `@relcko/security` |
| Feature Flags | `@relcko/administration` | `@relcko/feature-flags` |
| Emergency Controls | `@relcko/administration` | `@relcko/security`, `@relcko/operations`, `@relcko/permission` |
| System Configuration | `@relcko/administration` | `@relcko/security`, `@relcko/feature-flags` |

## 21. Administration portal UX posture

The portal should feel:

- authoritative
- deliberate
- evidence-driven
- low-ornament
- deeply trustworthy

It is an operational cockpit, not a marketing surface.
