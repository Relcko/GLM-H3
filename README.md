# RELCKO — Real Estate Commission Kernel

Domain-driven monorepo for the RELCKO platform. Built with TypeScript, Turbo, and pnpm.

## Architecture

RELCKO follows **Domain-Driven Design** with an **Event-Driven Architecture**. The system is decomposed into bounded contexts that communicate exclusively through domain events.

- **Agnostic Tier** — Shared kernel, infrastructure providers, framework-agnostic domain models
- **Domain Tier** — Bounded contexts implementing core commission logic and agent management
- **Application Tier** — Orchestration, sagas, and application services
- **Interface Tier** — API gateways, event ingress, and external adapters

## Repository Structure

```
├── packages/
│   ├── types/       — @relcko/types: branded IDs, primitives, enums, Result type
│   ├── errors/      — @relcko/errors: domain error hierarchy
│   ├── shared/      — @relcko/shared: utilities, DI container, health checks
│   ├── events/      — @relcko/events: event envelope, bus interface
│   ├── logger/      — @relcko/logger: structured logging
│   └── config/      — @relcko/config: env-based typed config
├── apps/            — Application entry points (future)
├── tools/           — Build tooling and generators (future)
└── docker/          — Development environment
```

## Prerequisites

- Node.js 20+
- pnpm 9+

## Getting Started

```bash
pnpm install
pnpm build:packages
pnpm test:run
```

## Available Scripts

| Command             | Description                |
| ------------------- | -------------------------- |
| `pnpm build`        | Build all packages/apps    |
| `pnpm dev`          | Watch mode development     |
| `pnpm lint`         | ESLint across all packages |
| `pnpm typecheck`    | TypeScript type checking   |
| `pnpm test:run`     | Run all tests              |
| `pnpm test`         | Run tests with watch mode  |

See [`docs/engineering/RELCKO_DEVELOPMENT_PLAYBOOK_v1.0.md`](docs/engineering/RELCKO_DEVELOPMENT_PLAYBOOK_v1.0.md) for the full development handbook.
