# Operations & Observability — Sprint 7

## Architecture

The operations layer provides production-grade observability and lifecycle management for the distribution engine. Six services work together:

```
┌──────────────────────────────────────────────────────────────┐
│                   DiagnosticService                           │
│  Aggregates all subsystem stats + recovery recommendations   │
└─────────┬─────────┬──────────┬──────────┬───────────────────┘
          │         │          │          │
     ┌────▼──┐ ┌───▼───┐ ┌───▼────┐ ┌───▼────────┐
     │Health │ │Metrics│ │Dead    │ │Lifecycle    │
     │Check  │ │Export │ │Letter  │ │Manager      │
     │Service│ │       │ │Queue   │ │(startup/    │
     │       │ │       │ │        │ │ shutdown)   │
     └───────┘ └───────┘ └────────┘ └─────────────┘
          │
     ┌────▼──┐
     │Op     │
     │Logger │
     └───────┘
```

## 1. OperationLogger (`operation-logger.ts`)

Structured JSON logger with context propagation and log-level filtering.

### Log Levels
`debug` < `info` < `warn` < `error` < `fatal`

### Context IDs
All propagates through `child()` and convenience methods:
- `withCorrelationId()` — distributed trace ID
- `withRequestId()` — HTTP/request-scoped ID
- `withDistributionId()` — distribution run ID
- `withSagaId()` — payment saga ID
- `withPaymentId()` — individual payment ID

### Sensitive Data Masking
Regex patterns for SSNs, emails, credit cards, base64 tokens, and secret keys (e.g., `stl_`, `sk-`, `pk-`, `secret`). Applied automatically to all string values in context.

### Usage
```ts
const logger = new OperationLogger({ source: "distribution" })
  .withCorrelationId("trace-123")
  .withDistributionId("dist-456");

logger.info("Distribution started", { recipientCount: 100 });
logger.error("Payment failed", new Error("timeout"), { paymentId: "pay-789" });
```

### Global Level
```ts
OperationLogger.setGlobalLevel("warn"); // suppresses debug + info
```

## 2. HealthCheckService (`health-check.service.ts`)

Composite health checker that runs registered component checks concurrently and aggregates results.

### Health States
| State     | Meaning                              |
|-----------|--------------------------------------|
| `Ready`   | All checks passed                    |
| `Degraded`| Some non-critical checks failed      |
| `Failed`  | One or more critical checks failed   |
| `Live`    | Not definitively failed              |

### Registered Checks
| Check Name             | Registration Method                          | What It Tests                          |
|------------------------|----------------------------------------------|----------------------------------------|
| `event_store`          | `registerEventStoreCheck()`                  | Can load a stream                      |
| `projection_store`     | `registerProjectionStoreCheck()`             | `count()` returns >= 0                 |
| `checkpoint_store`     | `registerCheckpointStoreCheck()`             | `load()` succeeds                      |
| `treasury_adapter`     | `registerTreasuryAdapterCheck()`             | `getBalance()` succeeds                |
| `payment_gateway`      | `registerPaymentGatewayCheck()`              | `getStatus()` succeeds                 |
| `authorization_service`| `registerAuthorizationServiceCheck()`        | `authorize()` returns denied (no role) |
| `replay_service`       | `registerReplayServiceCheck()`               | Reference is non-null                  |

Custom checks via `ComponentHealthCheck`:
```ts
service.registerCheck(
  new ComponentHealthCheck("my_component", async () => {
    // return true/false
  }, clock),
);
```

### Key Methods
- `checkAll()` — runs all checks, returns `HealthReport`
- `isReady()` — true if Ready or Degraded
- `isLive()` — true unless Failed
- `lastReport` — most recent `HealthReport`

## 3. MetricsExporter (`metrics-exporter.ts`)

In-memory metrics store with counter, gauge, and histogram types.

### Metric Types
| Type        | Methods                                   |
|-------------|-------------------------------------------|
| **Counter** | `incrementCounter(name, value?, labels?)` |
| **Gauge**   | `setGauge(name, value, labels?)`          |
| **Histogram**| `recordHistogram(name, value, labels?)`  |

### Query Methods
- `getCounterValue(name, labels?)`
- `getGaugeValue(name, labels?)`
- `getHistogramValues(name, labels?)`

### Convenience Tracking
```ts
metrics.trackThroughput("events", 1500, 50000); // sets events_throughput + events_total_ops gauges
metrics.trackLatency("process", { min: 5, max: 200, avg: 45, p50: 30, p90: 80, p99: 150 });
```

### Export Formats
| Format              | Method               | Description                                 |
|---------------------|----------------------|---------------------------------------------|
| **Snapshot**        | `exportSnapshot()`   | `MetricSnapshot` with raw `MetricValue[]`   |
| **Prometheus**      | `exportPrometheus()` | Prometheus text format with `# HELP`, `# TYPE`, `_bucket`, `_count` |
| **OpenTelemetry**   | `exportOpenTelemetry()` | Resource/Scope metrics format (proto-like JSON) |

## 4. DeadLetterQueue (`dead-letter-queue.ts`)

In-memory dead letter queue with poison event detection and replay support.

### Insert
Events are keyed by `projectionName::eventId`. Repeated inserts for the same key increment `retryCount`.

### Poison Detection
After 3 retry attempts (threshold via `POISON_THRESHOLD`), the entry is marked `poison: true`.

```ts
const dlq = new DeadLetterQueue(clock);
dlq.insert({ eventType: "FundsTransferred", eventId: "evt-1", aggregateId: "acc-1",
             payload: {}, failureReason: "timeout", projectionName: "ProjectionA" });

// After 3 retries:
dlq.detectPoisonEvents(); // returns poison entries
```

### Key Methods
| Method                          | Description                                    |
|---------------------------------|------------------------------------------------|
| `insert(request)`               | Add/re-try an entry                            |
| `getEntry(id)`                  | Lookup by `projectionName::eventId`            |
| `getAllEntries()`               | All entries sorted by `failedAt`               |
| `getEntriesByProjection(name)`  | Filter by projection name                      |
| `getEntriesByEventType(type)`   | Filter by event type                           |
| `getPoisonEntries()`            | Only poison entries                            |
| `detectPoisonEvents()`          | Scan and mark newly eligible poison entries    |
| `markForReplay(entryId)`        | Reset `retryCount` to 0 for retry              |
| `removeEntry(entryId)`          | Delete from queue                              |
| `replayHistory`                 | History of replay attempts                     |

## 5. LifecycleManager (`lifecycle-manager.ts`)

Manages application startup, warmup, and graceful shutdown.

### Lifecycle Phases
```
Initializing → Starting → Running → Draining → Flushing → Stopped
                              ↘                    ↗
                              Failed
```

### Phase Transitions

**Startup:**
```ts
const lifecycle = new LifecycleManager(healthService, metrics, dlq, logger, clock);
const report = await lifecycle.startup(); // Runs health checks, transitions to Running or Failed
```

**Warmup:**
```ts
await lifecycle.warmup(); // Only in Running phase; sets metrics gauges
```

**Shutdown (graceful, ordered):**
1. `Draining` — drain all registered `Drainable` workers
2. `Flushing` — flush checkpoints, projections, metrics
3. `Stopped` — final phase

```ts
const report = await lifecycle.shutdown();
```

### Registration
```ts
lifecycle.registerFlushable({ name: "checkpoint_store", flush: async () => { /* persist */ } });
lifecycle.registerDrainable({ name: "worker-1", remaining: 0, drain: async () => { /* stop */ } });
```

## 6. DiagnosticService (`diagnostic.service.ts`)

Generates a unified diagnostic report aggregating data from all operations services.

### Report Fields
| Field            | Source              |
|------------------|---------------------|
| `system`         | LifecycleManager    |
| `health`         | HealthCheckService  |
| `projections`    | HealthReport checks |
| `replays`        | (extendable)        |
| `checkpoints`    | HealthReport checks |
| `queues`         | DeadLetterQueue     |
| `batches`        | MetricsExporter     |
| `payments`       | MetricsExporter     |
| `security`       | MetricsExporter     |
| `deadLetter`     | DeadLetterQueue     |
| `lifecycle`      | LifecycleManager    |
| `recommendations`| Generated from all of the above |

### Recovery Recommendations

Auto-generated recommendations with severity levels:

| Severity  | Trigger                       | Example Action                      |
|-----------|-------------------------------|--------------------------------------|
| critical  | Health check failed           | "Investigate and restart event_store"|
| high      | Dead letter queue has poison  | "Review and replay or remove"        |
| high      | 10+ failed payments           | "Review payment gateway health"      |
| medium    | High retry rate (>50% of success)| "Review retry policy"             |
| medium    | High auth denial rate (>30%)  | "Review permission assignments"      |
| low       | Projections with dead letters | "Consider replaying affected projections" |

## Test Coverage

52 tests across 6 sub-sprints:

- **7.1 OperationLogger** (11 tests) — context propagation, masking, level filtering, JSON output, child loggers
- **7.2 HealthCheckService** (9 tests) — Ready/Degraded/Failed states, isReady/isLive, latency, exception handling
- **7.3 MetricsExporter** (7 tests) — counter/gauge/histogram, Prometheus/OpenTelemetry export, reset, throughput/latency
- **7.4 DeadLetterQueue** (9 tests) — insert, poison detection, filtering, replay marking, removal, poison count
- **7.5 LifecycleManager** (9 tests) — phase transitions, startup validation, warmup, shutdown, drain/flush, uptime
- **7.6 DiagnosticService** (5 tests) — full report, recommendations, payment rate, system phase/uptime

## Integration Points

| Operations Service | Integration Target            |
|--------------------|-------------------------------|
| HealthCheckService | EventStore, ProjectionStore, CheckpointStore, TreasuryAdapter, PaymentGateway, AuthorizationService, ReplayService |
| MetricsExporter    | Prometheus, OpenTelemetry     |
| LifecycleManager   | HealthCheckService, MetricsExporter, DeadLetterQueue, OperationLogger |
| DiagnosticService  | All operations services       |

## File Map

```
packages/treasury/src/distribution/operations/
├── index.ts                    — Public exports
├── operation-logger.ts         — Structured logging
├── health-check.service.ts     — Health checks
├── metrics-exporter.ts         — Metrics (counter/gauge/histogram)
├── dead-letter-queue.ts        — Dead letter queue
├── lifecycle-manager.ts        — Startup/shutdown lifecycle
├── diagnostic.service.ts       — Diagnostic reports
└── __tests__/
    └── operations.test.ts      — 52 tests
```
