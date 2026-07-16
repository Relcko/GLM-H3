# Identity & Access Model — Relcko Enterprise Security (V1.8.0)

**Companion to:** `SECURITY_ARCHITECTURE.md`, `PERMISSION_MODEL.md`, `EVENT_ARCHITECTURE.md`. Defines identity methods + enterprise RBAC/ABAC authorization.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

Builds on the locked `PERMISSION_MODEL.md` (10 roles, scope rules, two-stage gating) and extends it for enterprise identity, adaptive authentication, and fine-grained authorization.

---

## 1. Identity model

An **Identity** is the verified person/entity behind one or more `Investor`/`Agent`/Manager records. Identity ↔ Wallet binding is 1:1 per KYC identity (`ANTI_FRAUD_MODEL.md` F3/F4). Identity is the root of all authorization.

### 1.1 Authentication methods

| Method | Support | Notes |
|--------|---------|-------|
| **Wallet Login** | ✅ | SIWE signature-verified (nonce/expiry/domain binding); no address-only trust (`DOMAIN_MODEL` §13/§17). |
| **Email Login** | ✅ | Password + verified email; optional where jurisdiction allows. |
| **MFA** | ✅ | TOTP / SMS / push; required for managers + sensitive actions. |
| **Passkeys** | ✅ | FIDO2/WebAuthn; primary phishing-resistant factor. |
| **Hardware Keys** | ✅ | FIDO2 security key; required for Treasury/Governance/Super admins. |
| **Social Login (future)** | 🔜 | Broker-mediated; mapped to a Relcko Identity; KYC still required for investing. |
| **Institutional Accounts** | ✅ | Legal-entity identity: multiple authorized signers, policy quorum. |
| **Corporate Accounts** | ✅ | Company identity with employee seats + role delegation. |
| **Delegated Access** | ✅ | Temporary/subordinate acting rights (see §4.7). |
| **Guardian Recovery** | ✅ | Social/guardian recovery for lost keys (see §3). |

### 1.2 Identity lifecycle
`unverified` → `kyc_pending` → `active` (can be `suspended`/`banned`). Institutional/corporate add an org-verification step (KYB) before seats activate.

---

## 2. Wallet security (companion to Identity)

- **SIWE verification mandatory** on link + login (prevents legacy forgeable login).
- **Address integrity:** checksum-valid; one verified wallet per identity.
- **Signing keys:** protected in HSM/vault (`SECURITY_ARCHITECTURE.md` §2.12); recovery keys split (Shamir) across custodians.
- **Key compromise:** wallet frozen → Guardian Recovery / re-issuance; `AlertRaised` + `AuditLog`.

---

## 3. Guardian recovery

- User registers N guardians (other verified identities or trusted devices).
- Recovery requires ≥ m-of-n guardian attestations + re-verification of identity (not a bypass of KYC).
- Compromised-device recovery revokes old sessions/keys (`Session Security`).
- All recovery actions append `AuditLog` + emit `IdentityVerified` (re-issued) / security event.

---

## 4. Authorization: RBAC + ABAC

### 4.1 RBAC (inherits `PERMISSION_MODEL.md §2`)
10 roles: Anonymous, Investor, Agent, Senior Agent, Compliance Officer, Property Manager, Treasury Manager, Governance Manager, Administrator, Super Administrator. Roles are additive; cross-cutting manager roles are functional specializations.

### 4.2 ABAC (additive, attribute-driven)
Authorization decision = `f(role, attributes, resource, action, context)` where:

| Dimension | Attributes |
|-----------|------------|
| **Subject** | role, identity verification, MFA level, device posture, risk score. |
| **Resource** | entity type, ownerId, propertyId, portfolioId, treasury account, jurisdiction. |
| **Action** | read/write/initiate/approve/execute. |
| **Context** | time, geo, IP reputation, session trust, velocity, anomaly. |

Decision points combine RBAC (role gate) with ABAC predicates (ownership/property/portfolio/agent/treasury/compliance/emergency scopes).

### 4.3 Policies
- Policies are declarative rules evaluated by the Authorization service.
- Examples: "Treasury withdrawal requires role=Treasury Manager AND mfa=hardware AND riskScore<threshold"; "Property delist requires second approver (Admin or Compliance)".
- Policy changes are themselves privileged → `AdminActionLogged` + `AuditLog` + `PermissionGranted`/`PermissionRevoked` events.

### 4.4 Dynamic permissions
- Permissions can be **elevated** mid-session when Risk Engine raises score (adaptive auth → step-up).
- Elevation is time-boxed and audited; reverts on expiry/risk drop.

### 4.5 Context-aware authorization
- Geo/IP/device/velocity feed the decision; high-risk context → step-up or deny even for valid role.
- Continuous verification: a session that develops anomalies can be challenged without waiting for next login.

### 4.6 Ownership / property / portfolio-based access
- `OWN`: investor/agent act on own entities (portfolio, referrals, votes, documents).
- `Property-based`: Property Manager scoped to properties they manage; investors only to properties they hold/are eligible for.
- `Portfolio-based`: reads bounded to the investor's aggregate; agents see referred-investor summaries only.

### 4.7 Agent / Treasury / Compliance / Emergency scope
- `Agent scope (TEAM)`: Senior Agent reads downline aggregates; writes own.
- `Treasury scope (DISCIPLINE)`: Treasury Manager limited to treasury domains; initiates but cannot unilaterally execute.
- `Compliance scope (DISCIPLINE)`: Compliance Officer limited to compliance; cannot move funds/publish/change roles (`PERMISSION_MODEL.md §7`).
- `Emergency scope`: Super Admin / Emergency multi-sig for `EmergencyLockdown`, pause, break-glass (cooldown + alert).

### 4.8 Temporary permissions
- Grant a role/scope for a bounded window (e.g., delegate review during leave).
- Auto-expire; explicit revoke; every grant/revoke → `PermissionGranted`/`PermissionRevoked` + `AuditLog`.
- Temporary permission can never grant two-stage-gated execution alone (separation of duties preserved).

---

## 5. Delegated access

- An identity may delegate a subset of its rights to another verified identity (e.g., corporate seat acts for entity; guardian; portfolio manager for an institution).
- Delegation = scoped, time-boxed policy entry; not a role change.
- Delegator retains accountability; delegate's actions log delegator + delegate ids.
- Revocation is immediate; mirrored to `AuditLog`.

---

## 6. Enforcement points (inherits `PERMISSION_MODEL.md §5`)

| Layer | Mechanism |
|-------|-----------|
| Edge / API | `authorize(actor, action, resource, context)` before handler. |
| Domain service | re-checked inside service (defense in depth). |
| Event handlers | projection writes verify `actorId` scope. |
| Session | continuous re-evaluation on risk/context change. |
| Chain | multi-sig / timelock enforce two-stage gate on-chain. |

---

## 7. Integration

- Consumes Risk Engine (`RiskScoreChanged`), Fraud Engine (anomaly), Compliance gate (KYC/AML).
- Emits `IdentityVerified`, `PermissionGranted`, `PermissionRevoked`, `ThreatDetected` (on abuse) via `SECURITY_EVENT_EXTENSION.md`.
- Honors Privacy model: identity attributes are PII-segregated; authorization never exposes raw identity to unrelated roles.
