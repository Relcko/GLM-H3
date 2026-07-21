# ADR-002: Canonical CQRS API Surface

Status: Accepted (v1.1.0-app-foundation)

## Context

Two packages define overlapping message/handler/bus types: `@relcko/application` (v0.1.0) and `@relcko/cqrs` (v0.1.0). `@relcko/application` provides lightweight in-memory buses for the application layer, while `@relcko/cqrs` adds a rich pipeline of behaviours (validation, logging, metrics, retry) around message dispatch. Developers were forced to choose between two incompatible APIs.

Additionally, the event bus (`@relcko/event-bus`) had a check-then-act race condition in its idempotency enforcement, domain errors thrown by handlers were swallowed by generic wrappers, aggregate event schema versions conflated with aggregate versions, and `loadFromHistory` lacked invariant validation.

## Decisions

### 1. `@relcko/application` is the canonical surface

`@relcko/application` defines the core `Command`, `Query`, `MessageMetadata`, `CommandHandler`, `QueryHandler`, `CommandBus`, and `QueryBus` types. `@relcko/cqrs` re-exports these types and adds pipeline behaviours on top.

- Message routing field: `.type` (not `.commandType` or `.queryType` — matches existing `@relcko/application` convention).
- Handler routing field: `.commandType` / `.queryType` (declarative; unchanged).
- Metadata includes `messageId`, `correlationId`, `causationId?`, `timestamp` (Playbook 8.5 correlation).

### 2. Domain errors pass through unmodified

Buses no longer wrap `DomainError` instances in `HandlerExecutionFailedError`. Non-`DomainError` failures are still wrapped and their original error is preserved via `Error.cause`.

### 3. Idempotency is atomic

`InMemoryEventBus.dispatch()` uses `IdempotencyStore.claim()` instead of the non-atomic `hasBeenProcessed()` + `markProcessed()` sequence.

### 4. Schema version and aggregate version are separate

`DomainEvent.schemaVersion` (default 1) maps to `EventMetadata.eventVersion`. `EventMetadata.aggregateVersion` is a new field holding the aggregate's version at the time of the event.

### 5. Replay is invariant-checked

`AggregateRoot.loadFromHistory()` validates aggregate-id match, strictly increasing gapless versions, and rejects corrupt event streams with `InvariantViolationError`.

## Consequences

- Application code must provide `metadata` when constructing `Command`/`Query` objects. The `createCommand`/`createQuery` factory functions handle this automatically.
- `@relcko/cqrs` gains a dependency on `@relcko/application`.
- Existing `@relcko/cqrs` users migrating from `.commandType`/`.queryType` to `.type` on message objects must update dispatch and test code.
- Event replay is now defensive: corrupt streams fail fast during `loadFromHistory`.
- Idempotent consumers no longer risk duplicate processing from concurrent publishes.
