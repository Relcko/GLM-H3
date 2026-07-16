# F2.2 Implementation Report — Dev Auth Runtime Fix

## Problem
`lib/investor/dev-user.ts` imported `{ AccountStatus }` as a **value** from `@relcko/identity`, which triggered the full module tree to be bundled into the client. The dependency chain:

`dev-user.ts` → `@relcko/identity` (barrel, value import) → `export * from "./auth"` → `auth.ts` value-imports `hashPassword` from `password.ts` → `password.ts` uses `node:crypto` (`scrypt` + `promisify`) → **browser runtime error**: `"The 'original' argument must be of type Function"`

## Root Cause
- `@relcko/identity/src/index.ts` is a barrel file that re-exports everything, including `auth.ts` → `password.ts`
- `password.ts` is server-only Node.js code (uses `node:crypto`)
- A **value import** (`import { AccountStatus }`) forces the entire `@relcko/identity` dependency graph into the client bundle, even though only the enum value was needed
- `import type { AccountStatus }` would be erasable at compile time but `AccountStatus` is a **nominal enum type** (not a string union), so bare string literals like `"active"` are rejected by TypeScript under `isolatedModules: true`

## Solution Applied

**File modified**: `lib/investor/dev-user.ts`

| Before | After |
|---|---|
| `import { AccountStatus } from "@relcko/identity"` (value import — pulls server code) | Removed entirely |
| `import { VerificationStatus } from "@relcko/identity"` (value import, unused) | Removed entirely |
| `accountStatus: AccountStatus.Active` | `accountStatus: "active" as UserProfile["accountStatus"]` |
| `kycState: KYCState` → inferred as `string` | `kycState: "approved" as const` (literal type assignable to `KYCState`) |

**Key insight**: `UserProfile["accountStatus"]` accesses the `AccountStatus` type through `UserProfile` (type-only import from `@relcko/identity` via `lib/shared/types.ts`). TypeScript allows `"active" as AccountStatus` as a type assertion since the string literal matches the enum member value — but this is a compile-time-only operation that adds zero bytes to the client bundle.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Zero errors |
| `npx eslint lib/investor/dev-user.ts` | ✅ Clean |
| `npx vitest run` | ✅ 810 passed, 115 files, 0 failures |
| `next dev` — page load `/investor/dashboard` | ✅ 200, no runtime error |
| `next dev` — page load `/investor/portfolio` | ✅ 200, no runtime error |
| `next dev` — page load `/investor/settings` | ✅ 200, no runtime error |
| `next dev` — page load `/` | ✅ 200, no runtime error |

## Files Touched
1. `lib/investor/dev-user.ts` — Removed value imports from `@relcko/identity`, replaced enum references with typed string literals using `as UserProfile["accountStatus"]` assertion (type-only, erased at compile time)

## No Regressions
- All 810 existing tests pass
- All 4 portal pages load without error
- Server-side `password.ts` remains unmodified
- `@relcko/identity` package remains untouched
- Frontend Blueprint V3.0.1 architecture preserved
