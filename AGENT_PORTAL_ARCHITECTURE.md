# Agent Portal Architecture

Status: Official architecture for the Relcko Agent Portal. Architecture only.

## 1. Purpose

The Agent Portal is the revenue, network, and customer-orchestration workspace for Relcko agents. It turns referrals, leads, team performance, campaign participation, commissions, and sales assistance into a coherent operating environment.

## 2. Primary users

- Individual agents
- Senior agents
- Team leaders
- Network managers operating with delegated visibility

## 3. Experience goals

- convert interest into qualified leads
- make pipeline and performance legible daily
- connect commissions to real activity and outcomes
- expose referral hierarchy without overwhelming the user
- use AI as a coaching and conversion assistant, not a replacement for agent judgment

## 4. Navigation hierarchy

### 4.1 Primary navigation

- Dashboard
- Customers
- Leads
- Referral Network
- Commissions
- Performance
- Rewards
- Leaderboard
- AI Sales Assistant
- Documents
- Settings

### 4.2 Secondary navigation

- individual customer and lead records
- team-level drilldowns
- compensation detail drawers
- campaign and leaderboard filters

## 5. Route hierarchy

- `/agent`
- `/agent/dashboard`
- `/agent/customers`
- `/agent/customers/:customerId`
- `/agent/leads`
- `/agent/leads/:leadId`
- `/agent/referral-network`
- `/agent/referral-network/agent/:agentId`
- `/agent/commissions`
- `/agent/commissions/:commissionId`
- `/agent/performance`
- `/agent/rewards`
- `/agent/leaderboard`
- `/agent/ai-sales-assistant`
- `/agent/documents`
- `/agent/settings`

## 6. Authentication flow

1. Agent signs in through standard identity flow.
2. System resolves agent role and hierarchy level.
3. If required, step-up authentication is applied for payout-sensitive areas.
4. User lands on dashboard with team scope or own scope depending on role.

## 7. Authorization model

Frontend must reflect:

- own-scope data for standard agents
- team-scope summaries for senior agents
- management extensions only where explicitly granted

The portal must visually distinguish:

- my leads
- my customers
- my team
- platform-wide competitive metrics where allowed

## 8. Session behavior

- long-running daily work session optimized for productivity
- soft renewal during active use
- explicit lock state after inactivity on compensation or customer-sensitive views
- device trust indicator
- recovery after session expiry without losing drafted notes or filters

## 9. Wallet integration

Wallet is not the center of the agent portal, but it supports:

- identity continuity
- future payout continuity
- commission and reward trust
- signed acknowledgements where needed

Wallet should remain accessible but lightweight in the shell.

## 10. Notification model

Agent notifications include:

- new lead assigned
- lead converted
- customer document required
- commission calculated
- commission approved
- commission paid
- rank progress
- campaign reward issued
- leaderboard movement
- AI assistant suggestions

## 11. Search behavior

Primary search targets:

- customers
- leads
- agents in network
- commissions
- campaigns
- documents

Search should support:

- quick jump
- segmented filtering
- saved views for repeat operational workflows

## 12. Dashboard layout

### 12.1 Desktop structure

- KPI strip
- pipeline and conversion area
- team activity area
- compensation area
- performance and rewards area
- AI coaching panel
- alert panel

### 12.2 Core dashboard modules

- active leads
- conversion rate
- monthly volume
- pending commissions
- paid commissions
- rank trajectory
- top customers needing action
- team momentum
- campaign participation

## 13. Referral Network experience

### 13.1 Visualization model

The referral network is presented as a progressive disclosure hierarchy, not a permanently expanded graph.

Views:

- summary metrics view
- hierarchy tree view
- relationship detail view
- performance overlay view

### 13.2 Desktop layout

- left-side filter and summary rail
- central expandable hierarchy canvas or structured tree
- right-side detail panel for selected agent or relationship

### 13.3 Tablet layout

- stacked summary and hierarchy
- detail panel becomes an overlay or lower pane

### 13.4 Mobile layout

- summary first
- drilldown list or accordion tree instead of persistent wide graph
- one selected node context at a time

### 13.5 Expansion and collapse behavior

Rules:

- collapsed by default beyond the first practical depth
- expand on explicit user action
- preserve expansion state per active session when useful
- allow reset to top-level hierarchy quickly

### 13.6 Accessibility

- hierarchy must have a list-based accessible representation
- keyboard traversal cannot depend on pointer graph interaction
- node depth and relationship labels must be spoken clearly to assistive technology

### 13.7 Performance

- large hierarchies load progressively
- off-screen branches defer loading
- performance overlays load after structure

## 14. Global actions

## 13. Global actions

- Search
- Add lead
- Add customer note
- Open AI Sales Assistant
- View commission details
- Open leaderboard
- Upload or request documents

## 15. Error handling

Agent UX should be operational and fast:

- inline errors for data entry
- no silent data loss for notes or lead updates
- clear distinction between permission denial and missing data
- explain when data is delayed because commission or conversion processing is asynchronous

## 16. Loading states

- KPI card skeletons
- pipeline table skeletons
- network graph placeholder
- leaderboard skeleton
- compensation detail loading states
- AI prompt/response pending state

## 17. Offline behavior

Allowed:

- cached dashboard summary
- cached customer and lead lists
- local drafts for notes and follow-up reminders

Disallowed:

- final commission-sensitive actions
- identity-sensitive customer mutations without sync confirmation
- payout or reward confirmations

## 18. Accessibility considerations

- dense information must remain keyboard navigable
- tables need strong header and sort semantics
- leaderboard and performance graphics need textual alternatives
- hierarchy views require clear screen-reader labeling

## 19. Performance expectations

- dashboard usable within 2 seconds on standard office broadband
- lead and commission list interactions feel immediate
- network visualizations lazy loaded
- leaderboard and analytics secondary to pipeline-critical content

## 20. Package mapping

| Area | Primary package | Supporting packages |
|------|-----------------|---------------------|
| Dashboard | `@relcko/network-engine` | `@relcko/treasury`, `@relcko/ai-platform`, `@relcko/performance` |
| Customers | `@relcko/network-engine` | `@relcko/identity` |
| Leads | `@relcko/network-engine` | `@relcko/identity` |
| Referral Network | `@relcko/network-engine` | `@relcko/permission` |
| Commissions | `@relcko/network-engine` | `@relcko/treasury` |
| Performance | `@relcko/network-engine` | `@relcko/performance` |
| Rewards | `@relcko/network-engine` | `@relcko/treasury` |
| Leaderboard | `@relcko/network-engine` | `@relcko/performance` |
| AI Sales Assistant | `@relcko/ai-platform` | `@relcko/network-engine` |
| Settings | `@relcko/identity` | `@relcko/security`, `@relcko/permission` |

## 21. Agent portal UX posture

The portal should feel:

- energetic but disciplined
- goal-oriented
- competitive without becoming noisy
- coaching-oriented
- trustworthy around compensation and attribution
