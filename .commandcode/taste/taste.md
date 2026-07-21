# Taste (Continuously Learned by [CommandCode][cmd])

<<<<<<< Updated upstream
[cmd]: https://commandcode.ai/


# Migration
- Keep package-lock.json during pnpm migration validation; remove only in final cleanup milestone (M6), not during Workspace Foundation (M1). Confidence: 0.70

# Workflow
See [workflow/taste.md](workflow/taste.md)
# Architecture
- Preserve existing HTTP API contracts during domain-layer refactoring. Make architectural improvements inside the domain layer rather than introducing new route hierarchies unless there is a functional requirement to change them. Confidence: 0.70
- Emit domain events only after successful state persistence, not before. Events should reflect committed state changes. Confidence: 0.65

# Git
- Do not unstage or reset staged changes without explaining why first. Show `git status` before any reset/destructive git operation and get user acknowledgment. Confidence: 0.85
=======
[cmd]: https://commandcode.ai/

# Migration
- Keep package-lock.json during pnpm migration validation; remove only in final cleanup milestone (M6), not during Workspace Foundation (M1). Confidence: 0.70

# Workflow
- Do not bypass pnpm lifecycle script failures with --ignore-scripts. Run normal pnpm install first; if a script fails, stop, report the failed script, classify as pre-existing or current-milestone issue, and get approval before bypassing. Confidence: 0.85
- When a lifecycle script fails, report: exact script from package.json, dependency version, full error output, whether the binary exists in node_modules/.bin, and root cause classification (package manifest vs. package manager vs. environment). Confidence: 0.75
- Do not validate against stale node_modules after a failed install. Fix the environment issue first, then perform a clean install before running validation (build, lint, typecheck). Confidence: 0.70
- Do not persist pnpm configuration changes. Fix environment issues session-scoped (e.g., inline env vars) rather than using `pnpm config set`. Confidence: 0.75

# Git
- Do not unstage or reset staged changes without explaining why first. Show `git status` before any reset/destructive git operation and get user acknowledgment. Confidence: 0.80
>>>>>>> Stashed changes
