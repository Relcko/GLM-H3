# Identity Aggregate Dependency Diagram

Status: Final

## Boundary Rule

Identity aggregates do not mutate each other directly. Cross-aggregate coordination happens outside aggregate methods through application services, repositories, and domain events.

## Diagram

```mermaid
flowchart LR
  User[User Aggregate]
  Wallet[Wallet Aggregate]
  Passkey[Passkey Aggregate]
  Session[Session Aggregate]
  Attempt[AuthenticationAttempt Aggregate]

  User -. userId reference .-> Wallet
  User -. userId reference .-> Passkey
  User -. userId reference .-> Session
  User -. optional userId reference .-> Attempt

  Wallet -. emits wallet events .-> EventCatalog[Identity Event Catalog]
  Passkey -. emits passkey events .-> EventCatalog
  Session -. emits session events .-> EventCatalog
  Attempt -. emits authentication attempt events .-> EventCatalog
  User -. emits user events .-> EventCatalog
```

## Notes

- References are identifiers only, not aggregate object dependencies.
- No aggregate owns another aggregate.
- The diagram documents the existing Identity v2 model only.
