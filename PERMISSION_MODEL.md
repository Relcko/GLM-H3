# Permission Model — Relcko Ecosystem

**Companion to:** `RELCKO_ECOSYSTEM_ARCHITECTURE.md`. Defines the complete role
hierarchy, scope rules, and enforcement points. No implementation code.

---

## 1. Principles

1. **Server-side enforcement only.** Permissions are evaluated on the backend/
   service layer, never trusted from the client.
2. **Least privilege + separation of duties.** No single role can both initiate
   and unilaterally execute a sensitive financial/governance action.
3. **Two-stage gating for value & control.** Treasury movement and Governance
   execution require multi-sig / second approver regardless of role.
4. **Ownership scoping.** Investors read/write only their own data unless explicitly
   granted (AccessGrant, team visibility).
5. **Full audit.** Every privileged action appends `AuditLog` (entity 19), and
   sensitive acts emit `AdminActionLogged` / `ComplianceFlagRaised` as needed.
6. **Role assignment is itself privileged.** Only Administrator / Super Administrator
   can change roles, and Super Admin is required for the highest tiers.

---

## 2. Role hierarchy (10 roles)

Roles are **additive** — each role inherits the capabilities of the roles above it
unless explicitly restricted.

| Level | Role | Inherits |
|-------|------|----------|
| 0 | **Anonymous** | — |
| 1 | **Investor** | Anonymous |
| 2 | **Agent** | Investor |
| 3 | **Senior Agent** | Agent |
| 4 | **Compliance Officer** | (cross-cutting, non-inheriting) |
| 5 | **Property Manager** | (cross-cutting, non-inheriting) |
| 6 | **Treasury Manager** | (cross-cutting, non-inheriting) |
| 7 | **Governance Manager** | (cross-cutting, non-inheriting) |
| 8 | **Administrator** | broad ops over Investor/Agent/Property/Content |
| 9 | **Super Administrator** | Administrator + role/scope/config/emergency |

> Cross-cutting roles (Compliance, Property, Treasury, Governance Managers) are
> **functional specializations**, not strictly "above" Investor in the investing
> sense — they do not automatically gain Investor trading rights, but may hold an
> Investor identity separately. They are granted per discipline.

---

## 3. Capability matrix

Legend: ✅ allowed · ➕ allowed with second-approver / multi-sig · 🔍 read-only ·
❌ denied.

| Capability | Anon | Investor | Agent | Sr.Agent | Compliance | Prop.Mgr | Treasury | Gov. | Admin | Super |
|-----------|------|----------|------|---------|-----------|----------|----------|------|-------|-------|
| Browse Marketplace / Map (public) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View public proposals / NFT listings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invest / list / sell (primary+secondary) | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Claim dividends / view own portfolio | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | 🔍 | 🔍 | 🔍 | 🔍 |
| Refer & earn commission | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage own referrals / team (Agent) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View team / downline aggregates | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Review / approve KYC | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 🔍 | 🔍 |
| Raise / resolve compliance flags | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ┍ | ❌ | 🔍 | 🔍 |
| Publish / delist properties + docs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Initiate treasury movement | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅(➕) | ❌ | ➕ | ➕ |
| Approve treasury movement (multi-sig) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅(➕) | ➕ | ➕ | ➕ |
| Create / execute governance proposals | ❌ | 🔍(vote) | 🔍 | 🔍 | 🔍 | ❌ | ➕ | ✅(➕) | ➕ | ➕ |
| Manage campaigns / rewards | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ➕ | ✅ | ✅ |
| User / role management (ops) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assign Admin / Super Admin role | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Emergency pause / system config | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔍 | ✅ |
| Full AuditLog read | ❌ | ❌ | ❌ | ❌ | ✅ | 🔍 | 🔍 | 🔍 | ✅ | ✅ |

---

## 4. Scope rules

- **Self-scope (`OWN`):** Investor/Agent act on own entities (portfolio, referrals,
  documents, votes).
- **Team-scope (`TEAM`):** Senior Agent reads downline aggregates; writes only own.
- **Discipline-scope (`DISCIPLINE`):** Compliance/Property/Treasury/Governance
  Managers limited to their domain.
- **Global-scope (`GLOBAL`):** Administrator / Super Administrator across domains,
  bounded by two-stage gating for value/control.
- **Grant-scope (`GRANT`):** Document Vault `AccessGrant` temporarily extends read
  to a grantee without changing role.

Permission check = `role ∈ requiredRoles` AND `scope ⊆ actorScope` AND
`not blocked by compliance flag` AND (if sensitive) `second approver present`.

---

## 5. Enforcement points

| Layer | Mechanism |
|-------|-----------|
| Route / API | `PermissionService.authorize(actor, action, resource)` before handler. |
| Domain service | re-checked inside the service (defense in depth). |
| Event handlers | projection writes verify `actorId` scope; reject out-of-scope applies. |
| UI | buttons rendered by capability (UX only — never the source of truth). |
| Chain | multi-sig / timelock enforce the two-stage gate on-chain. |

---

## 6. Sensitive-action policy (two-stage gating)

| Action | Initiator | Required approver | On-chain |
|--------|-----------|------------------|----------|
| Treasury withdrawal / rebalance | Treasury Manager | Governance (multi-sig ≥ m-of-n) | ✅ multi-sig |
| Governance execution of financial proposal | Governance Manager | Timelock + multi-sig | ✅ timelock |
| Property delist (active raises) | Property Manager / Admin | second Admin or Compliance sign-off | optional |
| Role change to Admin/Super Admin | Super Administrator | logs + alert; break-glass cooldown | — |
| Emergency pause | Super Administrator | emits `SystemPaused` + alert | optional guardian |

---

## 7. Compliance & separation of duties

- Compliance Officer **cannot** move funds, publish property, or change roles.
- Treasury Manager **cannot** unilaterally execute (needs second approver).
- Administrator **cannot** assign Super Admin (reserved).
- All four manager disciplines are mutually exclusive from the investing path
  where conflict-of-interest applies (e.g., a Compliance Officer should not also
  be the approver of their own KYC queue — enforced by flag reassignment).
- Every privileged action → `AuditLog` + (if sensitive) `AdminActionLogged`.

---

## 8. Identity & verification prerequisites

- **Investor actions** require `WalletVerified` (SIWE) + (if `kyc_required`)
  `KYCApproved`.
- **Agent** requires `AgentStatus=active` + unique referral code.
- **Managers / Admins** require verified identity + role grant via Permission
  Service; Super Admin additionally requires multi-sig keyholder coordination.
