# AI Platform — Implementation Report (v2.10.0)

## Architecture Overview

The AI Platform is a **pure advisory orchestration layer** integrated into the existing Relcko monorepo. It never executes financial actions, never bypasses Governance/Treasury/Permission/Security — every recommendation includes confidence, evidence, reasoning, alternatives, affected entities, risk, sources, and human review requirement.

### Integration with Existing Packages

| Package | Role |
|---------|------|
| `@relcko/types` | EntityId, Money, Currency, Timestamp brands, Json, Metadata |
| `@relcko/utils` | generateId |
| `@relcko/error` | RelckoError base class, error category constants |
| `@relcko/events` | EventBus interface, createEnvelope, RelckoEventEnvelope |
| `@relcko/logging` | Logger interface |
| `@relcko/validation` | (Zod schemas available for future schema validation) |
| `@relcko/security` | Available for future encryption/signing needs |
| `@relcko/permission` | Available for future policy enforcement integration |
| `@relcko/identity` | Identity types (accounts, organizations) referenced by orchestrator |

### Architecture decisions (V1.9 frozen — no changes to existing packages)

1. **Model Router** is provider-abstracted with adapter interfaces only — no vendor-specific code.
2. **Event integration** reuses existing `@relcko/events` bus, envelope, retry, and DLQ.
3. **Repository layer** is in-memory via `InMemoryAiRepository` (pluggable to Postgres/Redis later).
4. All 11 advisory domains each have a dedicated advisor class.

## Files Created

### Core (`src/`)

| File | Lines | Purpose |
|------|-------|---------|
| `errors.ts` | 69 | AiPlatformError + 9 subclasses |
| `types.ts` | 196 | All type definitions |
| `events.ts` | 53 | Canonical AI event types + `publishAiEvent` helper |
| `repository.ts` | 186 | Repository interfaces + `InMemoryAiRepository` |
| `model-router.ts` | 100 | Provider-abstracted model routing |
| `policy-engine.ts` | 75 | Policy evaluation engine |
| `event-adapter.ts` | 53 | Domain event subscription adapter |
| `orchestrator.ts` | 100 | Top-level orchestrator |
| `index.ts` | 76 | Public API exports |

### Services (`src/knowledge/`, `src/memory/`, `src/context/`, `src/prompt/`, `src/explainability/`, `src/recommendation/`, `src/analytics/`)

| File | Lines | Purpose |
|------|-------|---------|
| `knowledge/knowledge-service.ts` | 95 | Knowledge ingestion, search, invalidation |
| `memory/memory-service.ts` | 114 | Memory store, search, expiration, erasure |
| `context/context-builder.ts` | 95 | Context assembly from knowledge + memory + external sources |
| `prompt/prompt-builder.ts` | 101 | Prompt template management and construction |
| `explainability/explainability-engine.ts` | 158 | Confidence, risk, evidence, alternatives extraction |
| `recommendation/recommendation-service.ts` | 105 | CRUD + lifecycle for recommendations |
| `analytics/analytics-engine.ts` | 76 | Period-based analytics computation |

### Advisors (`src/advisors/`)

| File | Domain |
|------|--------|
| `base-advisor.ts` | Base class with shared `advise()` orchestration |
| `investor-advisor.ts` | investor |
| `agent-advisor.ts` | agent |
| `marketplace-advisor.ts` | marketplace |
| `portfolio-advisor.ts` | portfolio |
| `treasury-advisor.ts` | treasury |
| `governance-advisor.ts` | governance |
| `compliance-advisor.ts` | compliance |
| `property-advisor.ts` | property |
| `developer-advisor.ts` | developer |
| `executive-advisor.ts` | executive |
| `support-advisor.ts` | support |

### Tests (`src/__tests__/`)

| File | Tests | Lines |
|------|-------|-------|
| `ai-platform.test.ts` | 27 test cases across all modules | 390+ |

### Configuration

| File | Change |
|------|--------|
| `vitest.config.ts` | Added `@relcko/ai-platform` alias |

## Test Coverage

27 test cases covering:
- **Error hierarchy**: All 10 error classes, inheritance
- **Events**: Canonical constants, publishing to bus
- **Model Router**: Registration, invocation, invokeBest, unregister, error handling
- **Knowledge Service**: Ingest, retrieve, version increment, search with filters, confidence validation, invalidation
- **Memory Service**: Store, retrieve, expiration, erase, prune expired, scope erase
- **Context Builder**: Knowledge+memory inclusion, external sources, maxEntries
- **Prompt Builder**: Default prompts, template registration, unknown template error
- **Explainability Engine**: Confidence parsing, high-risk review requirement, low-risk exemption
- **Recommendation Service**: Create, accept, dismiss, reject non-pending, search filters, expiry
- **Policy Engine**: Matching rules, non-matching rules
- **Analytics Engine**: Period computation
- **Event Adapter**: Start/stop subscriptions
- **Orchestrator**: All 11 advisors registered, end-to-end request processing, policy blocking
- **InMemory Repository**: Policy CRUD

## Design invariants

1. Every recommendation includes `ExplainabilityResult` with confidence, evidence, reasoning, alternatives, affected entities, risk, sources, requiresHumanReview
2. Model Router is provider-agnostic — no vendor-specific code, no API keys, no hardcoded endpoints
3. Policy Engine can block, flag, or require review on any advisory action
4. All business events published through canonical `@relcko/events` bus with `ai.*` event types
5. No circular dependencies — ai-platform imports from existing packages only (never vice-versa)
6. No duplicated business logic — all existing packages (Security, Permission, Identity, Treasury, etc.) reused exactly as-is

## Integration Points

- **Event Bus**: Advisors publish events via `publishAiEvent()` → consumed by downstream services via `EventAdapter`
- **Security**: Available for future recommendation signing or content verification
- **Permission**: Available for future fine-grained access control on advisor queries
- **Identity**: Actor IDs flow through all operations for auditability
- **All 24 existing packages**: Reusable as context sources via `ContextBuilder.registerSource()`
