# Contributing to RELCKO

## Git Workflow

- **Main** — Production-ready code. Protected.
- **Develop** — Integration branch. Protected.
- **Feature branches** — `feat/<package>/<description>`

## Commit Convention

Uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`, `build`.

Examples:
- `feat(types): add Money value object`
- `fix(events): correct envelope versioning`

## Pull Request Rules

- Every PR must pass **all CI checks** (lint, typecheck, test, build)
- PRs require at least one review before merging
- Squash merge into `develop`

## Definition of Done

- Code compiles and passes type checking
- All tests pass (new and existing)
- Linter produces no warnings
- Documentation updated (if applicable)
- PR description explains the change

## Development

1. Branch from `develop`
2. Implement changes
3. Ensure `pnpm build:packages && pnpm lint && pnpm typecheck && pnpm test:run` passes
4. Open PR against `develop`

## Code Standards

- TypeScript strict mode
- No `any` types (use `unknown` with type narrowing)
- Pure functions where possible
- Domain logic must be framework-agnostic
- Full test coverage for domain logic
