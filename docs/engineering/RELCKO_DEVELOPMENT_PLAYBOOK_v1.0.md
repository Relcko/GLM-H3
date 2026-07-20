# RELCKO Development Playbook v1.0

**Engineering Director - Operational Handbook**
**Status:** Engineering Authority - Binding
**Classification:** Internal - All Engineering Teams and AI Systems
**Date:** July 2026
**Supersedes:** Informal team conventions
**Applies to:** Every human developer, code reviewer, QA engineer, DevOps engineer, and AI coding system contributing to the RELCKO platform.

---

## 1. Purpose

This playbook governs *how* RELCKO is built. It sits between architecture (the *why*) and implementation (the *what*). It defines the engineering culture, processes, standards, and quality gates that every contributor must follow.

The architecture canon is frozen. This playbook ensures that every line of code, every pull request, every deployment, and every AI-generated contribution conforms to the same operational standards.

This document is binding. Non-compliance is a blocking review finding.

---

## 2. Engineering Principles

### 2.1 Architecture-First

No code is written before its architectural context is understood. Every implementation must reference the governing architecture document:

| Architecture Document | Governs |
|-----------------------|---------|
| RELCKO Ecosystem Architecture v1.2.1 | Module boundaries and responsibilities |
| RNE Architecture v1.1 | Network Engine domain logic |
| Domain Event Catalog v1.0 | Event schemas and ownership |
| Implementation Blueprint v1.0 | Aggregate design and implementation sequence |
| Event Constitution v1.0 | Event governance and lifecycle |
| Commission Constitution v1.0 | Commission business rules |
| Technical Specification v1.0 | Engineering contracts |

A contributor who cannot cite the relevant architecture section for their change must pause and consult the canon before proceeding.

### 2.2 Domain-Driven Design

Every line of code belongs to exactly one bounded context (S1-S30). Cross-context communication occurs exclusively through the event bus. No module calls another module's services directly - this is a constitutional requirement, not a style preference.

Rules:
- Each bounded context owns its aggregates, events, and services
- No aggregate spans multiple bounded contexts
- No event is produced by more than one bounded context
- Dependencies between contexts are declared explicitly (Blueprint Section 3)

### 2.3 Event-First Thinking

Before implementing a command, identify the events it produces and consumes. Events are the backbone of the system. State is derived - events are authoritative.

Rules:
- Every state change produces at least one event
- No direct database mutation without a corresponding event
- Events are immutable, append-only, and schema-versioned
- Event consumers are idempotent by construction

### 2.4 Financial Correctness Over Performance

RELCKO moves real money. A slow correct system is acceptable. A fast incorrect system is catastrophic.

Rules:
- All monetary calculations use integer (cents) representation - no floating point
- No caching of financial state without explicit invalidation events
- Financial operations must pass through the event store before any projection is updated
- Hard limits on retry attempts for financial operations (max 3, then manual escalation)

### 2.5 Security by Default

Every service, every endpoint, every event handler starts locked down. Permissions are granted explicitly, never implicitly.

Rules:
- Authentication required on every API endpoint (no public endpoints)
- Authorization checked on every operation (no default-allow)
- Secrets never logged, never in code, never in configuration files
- Every privileged action requires an audit trail entry

### 2.6 Deterministic Behavior

Given identical input state, every computation must produce identical output across any number of runs, any time zone, any deployment.

Rules:
- No dependence on wall-clock time for business logic - use event timestamps
- No randomness in computation paths
- No dependence on external service state during replay
- All event handlers are pure functions of (state, event) -> new state

### 2.7 Replay-Safe Development

Every event handler must produce the same result when replaying events from storage as it did during the original run.

Rules:
- Never assume a handler runs exactly once - at-least-once delivery is the contract
- Side effects (email, notifications, blockchain transactions) must be guarded by idempotency keys
- Replay must not trigger real external side effects - use a replay mode flag
- All projections are rebuildable from the event stream

---

## 3. Git Workflow

### 3.1 Branch Strategy

```
main              Production-ready, protected
  release/*       Release candidates, protected
    develop       Integration branch, protected
      feature/*   New features
      fix/*       Bug fixes
      hotfix/*    Emergency fixes (from main)
```

### 3.2 Protected Branches

| Branch | Protection Rules |
|--------|-----------------|
| main | No direct pushes. Requires PR + 2 approvals + passing CI + signed commits |
| release/* | No direct pushes. Requires PR + 2 approvals + passing CI |
| develop | No direct pushes. Requires PR + 1 approval + passing CI |

### 3.3 Branch Naming

```
feature/{context}-{description}
  Example: feature/s3-commission-rate-cache
fix/{context}-{description}
  Example: fix/s1-agent-status-transition
hotfix/{description}
  Example: hotfix/payment-amount-overflow
release/v{major}.{minor}.{patch}
  Example: release/v1.2.0
```

The context segment should reference the bounded context (S1, S3, etc.) or the module name.

### 3.4 Feature Branches

- Branch from develop
- Merge back to develop via squash-merge
- Delete branch after merge
- Keep feature branches short-lived (< 3 days). Longer branches require daily rebase

### 3.5 Release Branches

- Branch from develop when sprint is complete
- Merge to main and back to develop via merge commit
- Tag with semantic version on main
- Only bug fixes land on release branches - no new features

### 3.6 Hotfix Branches

- Branch from main
- Merge to main and develop via merge commit
- Emergency only - requires director approval
- Hotfix PR bypasses normal review queue but still requires at least 1 approval

### 3.7 Commit Strategy

- Prefer squash-merge for feature branches to keep history clean
- Use merge commits for release and hotfix branches to preserve the branch boundary
- Never rebase commits that have been pushed to a shared branch

---

## 4. Commit Convention

### 4.1 Format

```
<type>(<scope>): <imperative description>

[optional body: explains why, not what]

[optional footer: BREAKING CHANGE, Closes #123, references ADR-xxx]
```

### 4.2 Types

| Type | Usage | Example |
|------|-------|---------|
| feat | New feature or capability | feat(s3): add held commission release flow |
| fix | Bug fix | fix(s1): correct agent status transition guard |
| refactor | Code restructuring, no behavior change | refactor(s9): extract payment validation |
| docs | Documentation only | docs: update ADR-014 with implementation notes |
| test | Test addition or correction | test(s4): add cooling-period edge cases |
| perf | Performance improvement | perf(s2): cache team graph traversal |
| build | Build or dependency changes | build: upgrade turbo to v2 |
| chore | Maintenance tasks | chore: update license headers |
| ci | CI/CD changes | ci: add replay-determinism gate to pipeline |

### 4.3 Scope

Use the bounded context identifier (s1, s3, s4) for domain changes. Use infra, ci, docs, or meta for non-domain changes.

### 4.4 Rules

- Imperative mood: "add" not "added" or "adds"
- No period at end of subject line
- Subject line <= 72 characters
- Body wraps at 80 characters
- Reference architecture documents when the change is driven by canon compliance

---

## 5. Pull Request Rules

### 5.1 Required Checklist

Every PR must include the following checklist in its description:

Checklist:
- [ ] Architecture referenced (document + section)
- [ ] Domain Event Catalog updated (if new/modified event)
- [ ] Tests cover happy path, error paths, and edge cases
- [ ] Replay determinism verified
- [ ] Idempotency handled for all consumers
- [ ] Audit trail requirements met
- [ ] Security: authentication, authorization, input validation
- [ ] No secrets committed
- [ ] Documentation updated (if user-facing or architectural)
- [ ] Performance impact assessed (N+1 queries, memory, latency)

### 5.2 Required Reviewers

| Change Type | Minimum Reviewers |
|-------------|------------------|
| Bounded context implementation | 2 (1 domain expert + 1 peer) |
| Financial calculation logic | 3 (2 domain + 1 QA) |
| Event schema change | 2 + Architect |
| Infrastructure / CI/CD | 1 DevOps |
| Documentation | 1 (any engineer) |
| AI-generated code (see Sec 7) | 2 (1 domain + 1 AI-safety reviewer) |

### 5.3 Approval Process

1. Author opens PR against target branch
2. CI runs: lint -> typecheck -> unit tests -> integration tests -> contract tests -> replay tests
3. Reviewers assigned automatically based on changed files (CODEOWNERS)
4. All reviewers must approve; no self-approval
5. PR can merge when: all approvals obtained + CI green + checklist complete
6. Merge by squash-merge (feature/fix) or merge commit (release/hotfix)

### 5.4 PR Size Limits

- Max 400 lines changed per PR (excluding tests and generated files)
- Larger changes must be decomposed into sequential PRs
- Exceptions require architect approval

---

## 6. Definition of Done

Nothing is "done" until it satisfies the criteria for its type.

### 6.1 Aggregate

- [ ] All invariants from the Implementation Blueprint Sec 4 are enforced
- [ ] State machine implemented and tested for every state transition
- [ ] All owned events (from Domain Event Catalog) are produced on correct triggers
- [ ] All consumed events are processed idempotently
- [ ] Repository contract implemented (save, load, delete)
- [ ] Unit tests cover: valid transitions, invalid transitions, idempotency, concurrency guards
- [ ] Aggregate state is fully rebuildable from its event stream

### 6.2 Worker

- [ ] Trigger condition documented and tested (scheduled or event-driven)
- [ ] Idempotency key strategy implemented (eventId, runId, or correlationId)
- [ ] Error handling: retry with backoff, dead-letter queue, alert on exhaustion
- [ ] At-least-once delivery tolerance verified
- [ ] Replay mode: worker skips real side effects when replay flag is set
- [ ] Observability: metrics exported (processed, failed, latency), structured logging
- [ ] Unit + integration tests

### 6.3 Projection

- [ ] Rebuild strategy defined (full replay, incremental, or snapshot-based)
- [ ] Rebuild is verifiable: given same event stream, produces identical state
- [ ] Projection catches up to live after rebuild without data loss
- [ ] Consistency expectation documented (e.g., < 5s lag, eventual)
- [ ] Test: rebuild from known event sequence -> verify state matches expected

### 6.4 Integration

- [ ] Adapter contract defined and versioned
- [ ] Timeout and circuit-breaker configured
- [ ] Authentication method documented
- [ ] Failure mode handled: degraded response, cached fallback, or hard failure
- [ ] Integration tests pass against sandbox/staging environment
- [ ] No external dependency called during replay (mock or skip)

### 6.5 UI

- [ ] Follows design system tokens (color, spacing, typography)
- [ ] Accessibility: keyboard navigation, screen reader labels, contrast ratios
- [ ] Loading, empty, error, and edge-case states rendered
- [ ] Mobile-responsive (breakpoints per design system)
- [ ] All user-facing text externalized (i18n-ready)
- [ ] No business logic in UI - UI is a thin projection of domain data

### 6.6 Infrastructure

- [ ] Declarative configuration (Terraform, Pulumi, or Helm)
- [ ] No hardcoded environment values (secrets in vault, config in ConfigMap)
- [ ] Resource limits set (CPU, memory, storage)
- [ ] Health check endpoint implemented
- [ ] Monitoring: metrics exported, alerts configured, dashboard created
- [ ] Disaster recovery: backup strategy, restore tested

---

## 7. AI Development Rules

### 7.1 How AI Assistants Must Work

1. Read the architecture first. Before generating any code, the AI must read the relevant architecture documents and cite them in its response.
2. Reference the Domain Event Catalog. Every event referenced in generated code must exist in the Domain Event Catalog. The AI must never invent event names.
3. Follow the Implementation Blueprint. Aggregate responsibilities, invariants, and lifecycle states are defined in the Blueprint. The AI must not deviate.
4. Generate one component at a time. The AI must not generate an entire bounded context in a single response. Each aggregate, service, projection, and worker is a separate unit.
5. Include tests. Every code generation must include corresponding tests.

### 7.2 Forbidden Behavior

| Forbidden | Why |
|-----------|-----|
| Generating event names not in the Domain Event Catalog | Violates event constitution |
| Calling cross-module services directly | Violates constitutional event-driven requirement |
| Using floating-point for monetary amounts | Causes rounding errors in financial calculations |
| Hardcoding secrets, API keys, or addresses | Security violation |
| Generating SQL that bypasses the event store | Violates event-sourcing principle |
| Adding business logic to the UI layer | Violates domain separation |
| Generating code without corresponding tests | Quality violation |
| Modifying architecture documents | Architecture is frozen |
| Assuming libraries without checking package.json | May introduce dependencies not in the project |

### 7.3 Required Verification

Before presenting generated code, the AI must verify:

1. Architecture compliance: Does this code conform to the relevant architecture document?
2. Event compliance: Are all events from the Domain Event Catalog? Are consumer/producer roles correct?
3. Idempotency: Is every event consumer idempotent? Is there an idempotency key?
4. Replay safety: Would this code behave correctly during replay?
5. Security: Is there authentication? Authorization? Input validation?
6. Financial correctness: Are monetary amounts in cents? No floating point?
7. Naming convention: Does the code follow the naming standards in Sec 8?

### 7.4 Required Tests

For every generated component, the AI must generate:

- Unit tests for every public method
- Idempotency tests (calling the same method twice produces the same result)
- Replay tests (replaying events produces the same state)
- Error path tests (invalid inputs, missing preconditions, concurrent access)
- Edge case tests (empty states, boundary values, null references)

### 7.5 Architecture Compliance Gate

Any AI-generated code that introduces a concept, relationship, or flow not present in the architecture canon must be rejected by the reviewer. The AI must cite the specific architecture document section that authorizes the pattern it is implementing.

---

## 8. Coding Standards

### 8.1 Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Aggregates | PascalCase | Commission, QualifyingSale |
| Value objects | PascalCase | Money, CommissionRate |
| Domain services | PascalCase + Service suffix | CommissionCalculationService |
| Event handlers | PascalCase + Handler suffix | CommissionCalculatedHandler |
| Query services | PascalCase + Query suffix | GetPortfolioQuery |
| Events | PascalCase, past-tense verb | CommissionPaid, PropertyCreated |
| Commands | PascalCase, imperative verb | ApproveCommission, CreateProperty |
| Repositories | I prefix + PascalCase + Repository suffix | ICommissionRepository |
| Repository impls | PascalCase + Repository suffix | PostgresCommissionRepository |
| Workers | PascalCase + Worker suffix | CommissionCalculationWorker |
| Projections | PascalCase + Projection suffix | PropertyListProjection |
| Adapters | PascalCase + Adapter suffix | BNBAdapter, KYCAdapter |
| Read models | PascalCase, no suffix | PortfolioHolding, AgentDashboard |
| Variables | camelCase | agentId, commissionAmount |
| Constants | UPPER_SNAKE_CASE | MAX_RETRY_COUNT |
| Files | kebab-case | commission-calculation-service.ts |
| Folders | kebab-case | domain/, application/ |

### 8.2 Folder Structure (per bounded context)

```
packages/bc-{name}/
  src/
    domain/
      aggregates/
      events/
      invariants/
      value-objects/
    application/
      commands/
      queries/
      use-cases/
    infrastructure/
      persistence/
      event-publishing/
      projections/
    interfaces/
      controllers/
      event-subscribers/
      graphql/
    index.ts
  __tests__/
    unit/
    integration/
    contract/
  package.json
  tsconfig.json
```

### 8.3 Imports

- Group imports: external libraries -> internal packages -> relative imports
- Use barrel exports (index.ts) for public API of each bounded context
- No circular dependencies between bounded contexts
- Prefer named exports over default exports

Example:
```
import { z } from 'zod';
import { EventBus } from '@relcko/event-bus';
import { CommissionCalculated } from '../events/commission-calculated-event';
```

### 8.4 Error Handling

- Domain errors extend a base DomainError class with code, message, and context
- Never swallow errors - always log and rethrow or convert
- Validation errors use a standard ValidationError type
- Infrastructure errors (DB, network) are caught at the boundary and converted to domain errors
- Event handler failures publish a failure event rather than throwing

### 8.5 Logging

- Use structured logging (JSON) with consistent fields: timestamp, level, service, message, correlationId
- Log levels: ERROR (failure requiring human attention), WARN (recoverable issue), INFO (state change), DEBUG (detail for diagnosis)
- Every event handler logs: start, success, failure with eventId and aggregateId
- No secrets, PII, or financial amounts in log messages (log IDs, not values)

### 8.6 Configuration

- Environment variables for environment-specific values (secrets in vault)
- Config objects are validated at startup with schema validation
- No hardcoded URLs, ports, or addresses
- Feature flags are toggleable without deployment

### 8.7 Comments

- Prefer self-documenting code over comments
- Comments explain why, not what - the code says what it does
- Architecture decisions get an ADR reference in comments
- No commented-out code - delete it, git has history

### 8.8 Documentation

- Every public API has JSDoc/TSDoc: purpose, parameters, return value, exceptions
- Every aggregate has a doc comment describing its invariants and lifecycle
- README per bounded context: purpose, dependencies, events produced/consumed, how to run tests

---

## 9. Testing Standards

### 9.1 Test Pyramid

```
        /\
       /  \
      / E2E\        < 10% of tests
     /------\
    /Integr. \      ~20% of tests
   /----------\
  / Unit Tests \    ~70% of tests
 /--------------\
```

### 9.2 Unit Tests

- Test one class or function in isolation
- Dependencies mocked at the interface boundary
- Cover: happy path, validation errors, edge cases, concurrency
- Naming: {method}_should_{expected}_when_{condition}

### 9.3 Integration Tests

- Test one aggregate or service with real infrastructure (in-memory DB or test containers)
- Cover: event persistence, event replay, state reconstruction from events
- Cover: repository save/load cycle
- Cross-context tests use the event bus (real or in-memory) - never direct service calls

### 9.4 Contract Tests

- Test that event schemas match the Domain Event Catalog
- Test that event producers publish the expected schema
- Test that event consumers accept the expected schema
- Run as part of CI for every bounded context

### 9.5 Replay Tests

- Record a sequence of events -> rebuild state -> verify state matches known snapshot
- Test with empty event stream (initial state)
- Test with full event stream (production-scale replay)
- Verify that replay produces identical results across multiple runs
- Verify that replay with replay-mode flag does not trigger real side effects

### 9.6 Performance Tests

- Identify baseline for critical paths (commission calculation, payment settlement)
- Test with production-scale data volumes
- Test concurrent access patterns
- Set explicit thresholds (p95 latency, throughput, memory) - failure blocks deployment

### 9.7 Security Tests

- Authentication bypass attempts
- Authorization escalation attempts
- Input injection (NoSQL, SQL, command)
- Rate limit enforcement
- Secret exposure in logs/errors

### 9.8 Coverage Requirements

| Layer | Line Coverage | Branch Coverage |
|-------|--------------|-----------------|
| Domain (aggregates, value objects) | 95% | 90% |
| Application (commands, queries) | 85% | 80% |
| Infrastructure (repositories, projections) | 80% | 75% |
| Interfaces (controllers, subscribers) | 75% | 70% |

Coverage is measured per bounded context, not globally. Undercovered contexts block PRs.

---

## 10. Documentation Rules

### 10.1 When Documentation Must Be Updated

- New aggregate: Add to Implementation Blueprint Sec 4.1 (aggregate inventory)
- New event: Add to Domain Event Catalog with all required fields
- New command: Add to RTS command inventory
- Changed contract: Update relevant ADR or technical specification
- Changed dependency: Update architecture document dependency tables
- Public API change: Update README and any consuming documentation
- Architecture decision: Create an ADR (see Sec 16)

### 10.2 ADR Requirements

- Every significant architecture decision requires an ADR
- ADRs are immutable once approved - superseding decisions create new ADRs
- ADRs are stored in docs/adr/ numbered sequentially
- Each ADR follows the template in Sec 16

### 10.3 Versioning

- Architecture documents are versioned with semantic versioning
- Breaking changes increment the major version
- New content (non-breaking) increments the minor version
- Corrections (no content change) increment the patch version
- Documents state their version and the date of last update

---

## 11. Security Requirements

### 11.1 Secrets

- Never commit secrets to version control
- Use a vault (HashiCorp Vault, AWS Secrets Manager) for secrets at rest
- Secrets are injected as environment variables at deployment, never as files
- Rotate secrets on a schedule (90 days for service keys, 365 days for TLS certs)
- Leaked secrets trigger immediate rotation and incident response

### 11.2 Authentication

- External APIs: JWT with short expiry (15 min access, 7 day refresh)
- Internal services: mTLS or HMAC-signed tokens
- Blockchain operations: multi-sig wallet signatures
- Admin actions: JWT + MFA

### 11.3 Authorization

| Principle | Implementation |
|-----------|---------------|
| Least privilege | Every operation checks role + resource ownership |
| Default deny | No access unless explicitly granted |
| Separation of duties | Sensitive operations require 2-person approval |
| Audit | Every authorization decision is logged |

### 11.4 Audit Logging

- Every state change records: actor, action, resource, previous state, new state, timestamp, reason
- Audit logs are immutable (append-only) and tamper-evident (hash chain)
- Audit logs are retained per regulatory requirements (7-10 years)
- Audit queries are scoped - no bulk export of audit data

### 11.5 PII Handling

- PII is encrypted at rest (AES-256) and in transit (TLS 1.3)
- PII fields are identified in the data model with a PII tag
- PII is never logged, even in error messages
- PII access is logged and restricted to authorized services
- PII export requires explicit user consent and compliance approval

### 11.6 Key Management

- Private keys for blockchain operations are stored in a hardware security module (HSM) or equivalent
- API keys are hashed at rest (bcrypt or SHA-256 with salt)
- Encryption keys are managed by a key management service (KMS)
- Key rotation is automated and tested quarterly

---

## 12. Performance Requirements

### 12.1 Latency

| Operation | Target (p95) | Degradation Threshold |
|-----------|-------------|----------------------|
| API read (cached) | < 50ms | > 200ms |
| API read (from DB) | < 200ms | > 500ms |
| API write (event published) | < 500ms | > 2s |
| Commission calculation (batch) | < 5s for 10k lines | > 30s |
| Event replay (per 100k events) | < 10s | > 60s |
| Page load (server-rendered) | < 2s | > 5s |
| Page load (client navigation) | < 500ms | > 2s |

### 12.2 Memory

- No unbounded data structures in request handling paths
- Event handlers must not load entire aggregate streams into memory - use pagination or snapshot
- Worker memory limits: explicit per-worker configuration with headroom for spikes
- Memory leaks trigger automatic worker restart after threshold

### 12.3 Concurrency

- Aggregate writes are serialized per aggregate ID (no concurrent writes to the same aggregate)
- Event handlers can run in parallel for different aggregate IDs
- Commission calculation can be partitioned by agent subtree
- Optimistic concurrency control with version stamps on aggregates

### 12.4 Scalability

- Horizontal scaling by event partition (agent ID hash)
- Read models scale independently from write models (CQRS)
- Stateless services scale freely - state lives in the event store
- Event store is the single source of truth - no shared mutable state between service instances

---

## 13. Release Process

### 13.1 Sprint Completion

1. All sprint items meet Definition of Done (Sec 6)
2. Feature flags are verified for correctness
3. Performance tests pass at baseline
4. Security scan (SAST + dependency scan) passes
5. Architect reviews sprint against architecture canon

### 13.2 Release Candidate

1. Release branch created from develop
2. CI runs full test suite (unit + integration + contract + replay + security)
3. Staging deployment with production-like data
4. QA performs regression testing
5. Release notes drafted (changelog generated from commit history)

### 13.3 Staging

- Staging mirrors production infrastructure (scaled down but same architecture)
- Staging runs against synthetic data that exercises all event types
- Replay tests run on staging: deploy -> replay events -> verify state matches
- Integration tests against sandbox external services

### 13.4 Production

1. Release manager approves the deployment window
2. Canary deployment: 5% of traffic -> 25% -> 50% -> 100%
3. Monitoring: error rate, latency, throughput - each canary step watches for 10 minutes
4. Observe financial reconciliation: expected vs actual commission/payment totals
5. If any metric exceeds threshold, halt and rollback

### 13.5 Rollback

- Rollback by redeploying the previous version (not by reverting commits)
- Rollback restores the previous event store snapshot
- Commission run in progress? Let it complete before rollback - never abort a running commission
- After rollback: incident response process (Sec 14), postmortem within 48 hours

---

## 14. Incident Response

### 14.1 Severity Levels

| Level | Label | Definition | Response Time |
|-------|-------|------------|---------------|
| SEV-1 | Critical | Financial loss, data loss, system unavailable | Immediate, 24/7 |
| SEV-2 | High | Feature broken, degraded performance for many users | < 1 hour |
| SEV-3 | Medium | Feature broken for subset of users, no financial impact | < 4 hours |
| SEV-4 | Low | Cosmetic, documentation, non-user-facing bug | < 1 sprint |

### 14.2 Escalation

```
Engineer on call -> Senior Engineer -> Engineering Director -> CTO (SEV-1 only)
```

- On-call engineer acknowledges within response time
- If not resolved in 2x response time, escalate
- SEV-1 incidents page the entire engineering leadership team

### 14.3 Recovery

1. Stop the bleed: Rollback, feature-flag off, or rate-limit the affected path
2. Verify integrity: Check financial reconciliation, event store consistency, database state
3. Fix forward: Deploy the corrected code through the normal release process
4. Reconcile: If financial data was affected, run reconciliation to identify and correct discrepancies
5. Monitor: Watch the fix in production for 2x the original detection window

### 14.4 Postmortem

Every SEV-1 and SEV-2 incident requires a written postmortem within 48 hours:

| Section | Content |
|---------|---------|
| Summary | One-paragraph description of what happened |
| Timeline | Event-by-event sequence from detection to resolution |
| Root cause | Technical and process causes |
| Impact | Users affected, financial impact, data loss |
| Detection | How was it found? Could it have been found faster? |
| Response | What went well? What could have been better? |
| Action items | Concrete changes to prevent recurrence, with owners and deadlines |
| Blameless | No individual blame - systemic causes only |

---

## 15. Code Review Checklist

### 15.1 Architecture

- [ ] Does the code conform to the relevant architecture document?
- [ ] Is the aggregate in the correct bounded context?
- [ ] Are cross-context communications via events only?
- [ ] Does the change violate any constitutional principle?
- [ ] Is the event ownership correct (producer/consumer per Domain Event Catalog)?

### 15.2 Security

- [ ] Authentication required and implemented?
- [ ] Authorization checked for every operation?
- [ ] Input validation for all untrusted data?
- [ ] No secrets in code or logs?
- [ ] PII handled correctly (encrypted, not logged)?
- [ ] Rate limiting applied to external-facing endpoints?

### 15.3 Performance

- [ ] N+1 query patterns? (especially in projections)
- [ ] Unbounded data structures?
- [ ] Caching strategy appropriate for the data type?
- [ ] Event handlers idempotent and replay-safe?
- [ ] Database queries indexed?

### 15.4 Correctness

- [ ] Financial calculations use integer (cents) arithmetic?
- [ ] State transitions match the aggregate state machine?
- [ ] All invariants from the Implementation Blueprint enforced?
- [ ] Idempotency keys present where needed?
- [ ] Error paths handle partial failure gracefully?
- [ ] Commutative operations don't depend on ordering?

### 15.5 Testing

- [ ] Unit tests for all public methods?
- [ ] Coverage thresholds met?
- [ ] Replay determinism tested?
- [ ] Idempotency tested (duplicate event processing)?
- [ ] Error and edge case tests present?
- [ ] Tests independent and non-flaky?

### 15.6 Documentation

- [ ] Public API documented (JSDoc/TSDoc)?
- [ ] ADR created if architecture decision?
- [ ] README updated if module-level change?
- [ ] Domain Event Catalog updated if event change?
- [ ] Architecture document updated if reference change?

---

## 16. ADR Process

### 16.1 When an ADR Is Required

- New bounded context or module
- New infrastructure technology or major version upgrade
- Change to event schema or event flow
- Change to aggregate responsibility or lifecycle
- Change to cross-context dependency
- Change to security model or authentication method
- Any decision with team-level impact

### 16.2 Approval Flow

1. Author drafts ADR using template
2. Technical review by senior engineer
3. Architecture review by system architect
4. If financial impact: review by financial engineering lead
5. ADR numbered and committed to docs/adr/
6. ADR announced to engineering team

### 16.3 Template

```
ADR-{NNN}: {Title}

Status: Proposed | Accepted | Superseded | Deprecated
Date: YYYY-MM-DD
Author: Name

Context
What is the problem or decision that needs to be made?

Decision
What was decided and why?

Consequences
What are the trade-offs, risks, and benefits?

Alternatives Considered
What other options were explored and why were they rejected?

References
- Architecture document sections
- Related ADRs
- External references
```

---

## 17. Quality Gates

### 17.1 Before Merge

| Gate | Tool / Process | Fails If |
|------|---------------|----------|
| Lint | ESLint + Prettier | Any lint error |
| Typecheck | TypeScript | Any type error |
| Unit tests | Jest / Vitest | Any test failure or coverage below threshold |
| Build | Turbo build | Build failure |
| Security scan | SAST scanner | Any critical or high finding |
| Dependency scan | npm audit / Snyk | Any critical vulnerability |
| Architecture check | Custom script | Event name not in Catalog, wrong producer |
| Replay check | Custom test | Replay produces different state |
| Size check | Custom script | Lines changed > 400 |

### 17.2 Before Release

| Gate | Tool / Process | Fails If |
|------|---------------|----------|
| Integration tests | Integration test suite | Any test failure |
| Contract tests | Contract test suite | Schema mismatch |
| Performance tests | k6 / Artillery | Latency or throughput below threshold |
| Full replay | Full replay from staging event store | Mismatch between original and replay |
| Security scan | Full SAST + DAST | Any high or critical finding |
| Manual QA | Human QA team | Any regression |

### 17.3 Before Production

| Gate | Tool / Process | Fails If |
|------|---------------|----------|
| Staging verification | Automated + manual | Any integration failure |
| Canary health check | Observability metrics | Error rate > 0.1%, latency > threshold |
| Financial reconciliation | Automated script | Expected != actual totals |
| Release manager approval | Human | Non-compliance |

---

## 18. Engineering Metrics

### 18.1 Lead Time

- Time from first commit to merge: target < 3 days
- Tracked per developer, per context, per sprint
- Blockers identified and removed at daily standup

### 18.2 Deployment Frequency

- Target: 1 release per sprint (2 weeks)
- Hotfix deployments: as needed, max 1 per week without postmortem
- Tracked: releases per month, hotfixes per month

### 18.3 Defect Rate

- Production defects per release: target < 2
- SEV-1 defects per quarter: target 0
- Defect escape rate: % of bugs found in production vs found in development
- Tracked per bounded context

### 18.4 Coverage

- Overall line coverage: target > 85%
- Financial domain coverage: target > 95%
- Coverage trend: must not decrease sprint-over-sprint
- Replay test coverage: every event handler must have at least one replay test

### 18.5 Performance

- p95 latency tracked per service per sprint
- Performance budget defined for each bounded context
- Any sprint where latency increases > 20% requires a performance improvement ticket

---

## 19. Team Responsibilities

### 19.1 Architect

- Owns the architecture canon
- Reviews all ADRs
- Signs off on event schema changes
- Ensures implementation conforms to architecture
- Conducts architecture reviews at sprint boundaries

### 19.2 Backend Engineer

- Implements aggregates, services, projections, and workers
- Writes unit, integration, and contract tests
- Ensures event handlers are idempotent and replay-safe
- Follows the Implementation Blueprint and Domain Event Catalog
- Documents public APIs

### 19.3 Frontend Engineer

- Implements UI components following the design system
- No business logic in the UI layer
- Follows accessibility standards
- All user-facing text is externalized
- Tests: component tests, accessibility tests, E2E tests

### 19.4 Blockchain Engineer

- Implements adapter contracts for on-chain operations
- Follows security requirements for key management
- Tests: on-chain testnet deployment, integration with event bus
- Documents transaction flows and failure modes

### 19.5 DevOps Engineer

- Manages CI/CD pipeline
- Implements infrastructure as code
- Configures monitoring, alerting, and dashboards
- Manages secrets and key rotation
- Conducts disaster recovery drills

### 19.6 QA Engineer

- Validates Definition of Done for every component
- Runs integration, performance, and security tests
- Tracks defect rate and regression
- Verifies replay determinism
- Signs off on releases

### 19.7 AI Assistant

- Follows AI Development Rules (Sec 7) strictly
- Cites architecture documents in every response
- Never invents events, aggregates, or relationships
- Generates tests alongside every implementation
- Verifies architecture compliance before presenting code

---

## 20. Final Engineering Charter

### Our Commitment

We build financial infrastructure. Every line of code we write moves real money, manages real ownership, and affects real people's investments. This is not a social media platform. This is not a game. Errors have financial consequences.

### Our Culture

- **Architecture-first.** We understand the architecture before we write code. We reference the canon. We do not invent.
- **Correctness over speed.** A system that never loses a penny is better than a system that is fast but wrong. We optimize for auditability, determinism, and correctness.
- **Events are truth.** State is derived. The event log is the source of truth. Every state change is an event. Every event handler is idempotent.
- **Security is not optional.** We authenticate, authorize, audit, and encrypt. We do not hardcode secrets. We do not log PII. We do not bypass gates.
- **Blameless postmortems.** When things break, we fix the process, not blame the person. Every incident is a learning opportunity.
- **AI is a tool, not a replacement.** AI assistants follow the same rules as human engineers. They read the architecture first. They cite their sources. They generate tests. They do not invent.
- **Documentation is code.** Outdated documentation is a bug. If you change the code, update the docs. If you make an architecture decision, write an ADR.
- **Quality is everyone's job.** Every engineer writes tests. Every PR is reviewed. Every release is verified. Every metric is measured.

### The Rules

1. Read the architecture before writing code.
2. One bounded context per package. Events only for cross-context communication.
3. Every event must be in the Domain Event Catalog. No exceptions.
4. Every event handler must be idempotent and replay-safe.
5. All monetary calculations in integer cents. No floating point.
6. No secrets in code. No PII in logs. No authentication bypass.
7. Every PR requires review, passing CI, and a completed checklist.
8. Every ADR requires architect approval.
9. Every release requires staging verification, canary deployment, and financial reconciliation.
10. Every incident requires a blameless postmortem with action items.

### The Consequence

These rules are not suggestions. They are binding. Non-compliance is a blocking finding at every quality gate - before merge, before release, and before production. The architecture canon is frozen. The playbook is binding. Every contributor - human or AI - is accountable.

**This is how RELCKO is built.**
