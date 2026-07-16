# AI Memory Model — Relcko AI Intelligence Platform (V1.7.0)

**Companion to:** `AI_PLATFORM_ARCHITECTURE.md`, `AI_KNOWLEDGE_MODEL.md`. Defines conversation + contextual memory and its privacy controls.
**Status:** Architecture only. Framework-agnostic. No implementation, no database schema.

Memory is the **per-actor, per-context state** that makes AI interactions coherent across sessions. It is distinct from Knowledge (`AI_KNOWLEDGE_MODEL.md`), which is shared ecosystem truth. Memory is *personal and scoped*; Knowledge is *global and derived*.

---

## 1. Memory classes

| Class | Scope | Contents | Lifetime |
|-------|-------|----------|----------|
| **Conversation memory** | per session | turns, intents, clarifications within one dialogue | session → folded into session memory |
| **Investor context** | `OWN` | goals, risk tolerance, preferences, watchlists, stated intent | long-term |
| **Agent context** | `OWN`/`TEAM` | pipeline state, coaching progress, reactivation lists | long-term |
| **Property context** | `DISCIPLINE`/`PUBLIC` | per-property signals consumed, Q&A history | long-term |
| **Portfolio context** | `OWN` | allocations, scenarios explored, rebalancing intent | long-term |
| **Treasury context** | `DISCIPLINE` | scenarios explored, forecast assumptions reviewed | long-term |
| **Governance context** | `OWN`/`DISCIPLINE` | proposals viewed, delegation stance, sentiment | long-term |
| **Session memory** | per session | lightweight cross-turn state not worth persisting | session |
| **Long-term memory** | per actor/entity | durable preferences, feedback, accepted/rejected patterns | persistent |
| **Privacy controls** | cross-cutting | redaction rules, retention, consent, scope tags | policy |

Memory never stores raw PII it is not entitled to; it references knowledge facts by `factId` instead of copying values.

---

## 2. Memory architecture

```
┌──────────────────────────────────────────────────────────┐
│                       MEMORY STORE                         │
│                                                            │
│  Session layer   → conversation + session memory (volatile)│
│  Context layer   → investor/agent/property/portfolio/      │
│                    treasury/governance context (persistent) │
│  Long-term layer → preferences, feedback, override history │
│                                                            │
│  Privacy controls wrap every read/write (redaction,        │
│  retention, scope, consent).                               │
└──────────────────────────────────────────────────────────┘
        ▲ writes emit MemoryUpdated; reads gated by Scope Gate
```

- Memory is updated only as a result of interactions or explicit feedback (accept/reject/modify — `AI_GOVERNANCE_MODEL.md`).
- Every memory mutation emits `MemoryUpdated` (`AI_EVENT_EXTENSION.md`) and mirrors to `AuditLog`.

---

## 3. Memory lifecycle

1. **Capture:** during a session, relevant facts/intents are staged in conversation + session memory.
2. **Consolidate:** durable, consented facts promote to context/long-term layers (e.g., "investor prefers commercial, low-risk" → Investor context).
3. **Retrieve:** on next interaction, the Scope Gate loads only in-scope memory for the actor.
4. **Decay:** unused/stale memory ages per retention policy; low-value session memory is purged.
5. **Forget:** on user request or compliance order, memory is redacted/deleted (right-to-erasure), emitting `MemoryUpdated`.

---

## 4. Privacy controls

### 4.1 Scope enforcement
Memory reads/writes honor `PERMISSION_MODEL.md` scopes:
- `OWN`: investor/agent see only their own context.
- `TEAM`: Senior Agent sees downline aggregates, not cross-team PII.
- `DISCIPLINE`: Compliance/Treasury/Property/Governance Managers limited to domain context.
- `GLOBAL`: Admin/Super see operational memory only, not another user's private preferences unless granted.

### 4.2 Redaction
- PII is never persisted in memory plaintext where avoidable; memory stores references + consented attributes.
- Redaction rules (inherited from AI Copilot `CopilotPolicy`) strip out-of-scope fields before memory is returned to an engine or surfaced.

### 4.3 Consent & transparency
- Users are informed what the AI remembers and may review/delete it (human override includes memory control).
- Sensitive inferences (e.g., risk tolerance derived from behavior) are flagged and correctable by the user.

### 4.4 Retention & erasure
- Retention periods per memory class; expired memory purged automatically.
- Erasure is a first-class operation: delete by actor/entity, propagate to all layers, emit `MemoryUpdated`, mirror to `AuditLog`.

### 4.5 Segregation
- Compliance/PII memory is stored in a segregated partition with stricter access than conversational memory.
- Executive AI consumes only anonymized/aggregated memory; it never reads individual private context.

---

## 5. Memory ↔ Knowledge ↔ Explainability

- **Memory vs Knowledge:** Knowledge = shared truth (everyone sees the same fact). Memory = personal state (only the owner + authorized roles).
- **Memory in explainability:** when a recommendation is influenced by memory (e.g., "based on your stated low-risk preference"), that is cited in the explainability "reasoning summary" + "data sources" (`AI_EXPLAINABILITY_MODEL.md`).
- **Memory in events:** `MemoryUpdated` lets other systems know context changed (e.g., Support AI hands off to human with context intact).

---

## 6. Scalability

- Memory is keyed by `(actorId | entityId, class)`; horizontally partitionable for millions of actors.
- Hot session memory is ephemeral/volatile; durable context is compact and cheap to load.
- Reads are scoped + cached per session; writes are append-only with idempotent keys.
- At-least-once delivery of `MemoryUpdated` tolerated via idempotent apply.
