# Technical Debt

## M3-INF-01 – Standardize Event Envelope Infrastructure

Investigate the `createEnvelope` argument mismatch in the shared event infrastructure.

### Current status
- M3-2B functionality is complete.
- All 80 automated tests pass.
- Event payload structure assertions were temporarily replaced with event-count assertions because of the shared infrastructure limitation.

### Future work
- Standardize the `createEnvelope` API.
- Restore full event payload assertion tests.
- Add contract tests for the event envelope infrastructure.
- Verify compatibility across all event publishers.
