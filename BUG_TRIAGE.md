# Bug Triage Guide

**Version:** v1.0.0-beta.1 (RC10)

---

## Priority Classification

### P0 — Critical

Users cannot use the protocol. Contract funds at risk.

**Examples:**
- Users cannot purchase RLKO tokens
- Staking or claiming transactions consistently revert
- Contract funds can be drained or frozen
- Frontend fails to load or crashes on entry
- Wallet connection is broken for all users
- Analytics data loss that cannot be recovered

**Response:** Immediate
**Fix timeline:** Within hours, may require hotfix
**Action:** Pause contracts if funds at risk. Notify all testers. Deploy fix ASAP.

### P1 — High

Core functionality is degraded. A significant subset of users is affected.

**Examples:**
- Purchase flow fails for specific tokens (USDT or BNB)
- Emergency withdrawal fails or returns wrong amounts
- Portfolio shows incorrect balances
- Wrong network detection is broken
- Bug report dialog fails to submit
- RPC endpoint is down (degraded, not complete outage)

**Response:** 1 hour
**Fix timeline:** Same day
**Action:** Triage immediately. Fix in next RC. Notify affected testers.

### P2 — Medium

Non-critical functionality is broken. Workaround exists.

**Examples:**
- UI displays incorrect data (e.g., wrong price, wrong stage number)
- Animation or visual glitch that doesn't block usage
- Link is broken or points to wrong URL
- Console warning or non-blocking error
- Missing loading state on a component
- Transaction history missing entries

**Response:** 24 hours
**Fix timeline:** Within 3 days
**Action:** Schedule fix in next RC. No need to notify testers.

### P3 — Low

Cosmetic issue, enhancement request, or documentation improvement.

**Examples:**
- Typo or formatting issue in documentation
- Styling inconsistency on specific viewport
- Feature request or UX improvement suggestion
- Missing tooltip or hover state
- Accessibility improvement (e.g., missing aria labels)
- Test coverage gap

**Response:** Next release
**Fix timeline:** Before mainnet
**Action:** Log for future release. No immediate action needed.

---

## Response Targets

| Priority | Initial Response | Fix Deadline | Notify Testers |
|---|---|---|---|
| P0 | Immediate | Hours | Yes |
| P1 | 1 hour | Same day | Yes |
| P2 | 24 hours | 3 days | No |
| P3 | Next release | Before mainnet | No |

---

## Release Policy

| Change Type | Release | Process |
|---|---|---|
| P0 fix | Hotfix | Emergency branch → merge → deploy → verify |
| P1 fix | Next RC | Branch → PR → review → merge → deploy → verify |
| P2 fix | Next RC | Branch → PR → review → merge → deploy → verify |
| P3 fix | Future release | Logged, scheduled later |
| Documentation | Any time | Direct commit or PR |

### Hotfix Process (P0 Only)

1. Create branch from `main`: `hotfix/<description>`
2. Fix the issue
3. Create PR with `[HOTFIX]` prefix
4. At least one reviewer must approve
5. Merge and deploy immediately
6. Post-mortem within 24 hours

### Standard Release Process (P1, P2)

1. Create branch from `main`: `fix/<description>` or `rc/<version>`
2. Implement fix
3. Create PR with issue reference
4. Standard review process
5. Merge when approved
6. Deploy to testnet
7. Verify fix

---

## Bug Report Lifecycle

```
New Issue (GitHub)
  → Untriaged
    → Triage (within 24h)
      → P0 → Hotfix process
      → P1 → Standard release
      → P2 → Standard release
      → P3 → Backlog
```

### Issue Labels

| Label | Meaning |
|---|---|
| `bug` | Confirmed bug |
| `P0` | Critical priority |
| `P1` | High priority |
| `P2` | Medium priority |
| `P3` | Low priority |
| `area:frontend` | Frontend issue |
| `area:contracts` | Smart contract issue |
| `area:staking` | Staking-specific |
| `area:dashboard` | Dashboard-specific |
| `area:docs` | Documentation |
| `needs-reproduction` | Needs reproduction steps |
| `confirmed` | Reproduced and confirmed |
| `wontfix` | Will not be fixed (explain why) |
| `duplicate` | Linked to existing issue |

---

## Bug Report Quality Guidelines

### Good Bug Report

```
Browser: Chrome 125
Wallet: MetaMask 12.1.0
Chain ID: 97

Description: Clicking "Claim Rewards" on a matured stake
does nothing. No transaction prompt appears.

Expected: MetaMask should open with a claim transaction.

Actual: Button is disabled after click, no prompt appears.
Console shows: "Error: transaction failed"

Steps:
1. Stake 100 RLKO on 30-day plan
2. Wait for maturity
3. Click "Claim Rewards"
4. Nothing happens
```

### Poor Bug Report

```
Doesn't work. Fix it.
```

---

## Escalation Matrix

| Situation | Escalate To | Method |
|---|---|---|
| P0 bug confirmed | All team members | Immediate call / DM |
| P1 bug, unclear fix | Lead developer | GitHub @mention |
| Contract vulnerability | Security team | Private channel |
| RPC outage | Infrastructure | Telegram group |
| Tester dispute | Project lead | Email |
