# Taste (Continuously Learned by [CommandCode][cmd])

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
