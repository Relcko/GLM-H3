# Relcko User Experience Guidelines

Status: Official UX guidance for Relcko V3. Architecture only.

## 1. Experience philosophy

Relcko is a trust-intensive platform. Users are making decisions about money, ownership, identity, compliance, governance, and operational authority. UX must therefore optimize for:

- confidence
- clarity
- evidence
- continuity
- safe progression

## 2. Investor journey

### 2.1 Acquisition

- discover Relcko through public trust surface
- understand value proposition
- browse live marketplace inventory

### 2.2 Conversion

- create account or connect wallet
- understand identity and KYC requirements
- save or shortlist opportunities

### 2.3 Activation

- complete KYC
- connect wallet if needed
- review property details and documents
- make first investment

### 2.4 Growth

- monitor portfolio
- receive dividend and treasury transparency
- participate in governance
- expand into NFT and AI-led discovery

## 3. Agent journey

### 3.1 Entry

- sign in and understand daily priorities
- view leads and pipeline

### 3.2 Activation

- create or update leads
- engage customers
- monitor conversion readiness

### 3.3 Growth

- expand referral network
- improve rank
- optimize commissions and rewards
- use AI assistant for sales guidance

## 4. Administrator journey

### 4.1 Entry

- land in platform health and risk view
- understand alerts and queue state

### 4.2 Operational work

- review users, properties, treasury, governance, and compliance work
- act within explicit authority boundaries

### 4.3 Control and escalation

- move from observation to review to approval to execution with evidence
- preserve audit visibility at each stage

## 5. Executive journey

### 5.1 Entry

- receive summarized platform state
- understand risk, performance, treasury, governance, and compliance posture

### 5.2 Decision support

- drill into enough detail to ask questions
- avoid broad mutation workflows in executive-only surfaces

## 6. First-time onboarding

### 6.1 Investor onboarding

- trust and legitimacy first
- explain why KYC and wallet steps exist
- stage complexity progressively
- land user in a useful dashboard after activation

### 6.2 Agent onboarding

- role and performance model first
- show pipeline, commissions, and network expectations
- give immediate action list

### 6.3 Administrator onboarding

- environment status
- area permissions
- audit expectations
- emergency and sensitive action model

## 7. Returning user experience

Returning users should see:

- recent activity
- pending required actions
- relevant changes since last visit
- one clear next action

The system should reduce rediscovery cost.

## 8. KYC flow

Goals:

- explain necessity clearly
- minimize intimidation
- maintain confidence during review delay

Flow shape:

1. Explain requirement
2. Capture identity basics
3. Collect documents
4. Confirm submission
5. Show review state
6. Resolve approved, needs more information, or rejected outcomes

KYC experience rules:

- preserve progress between sessions where policy allows
- show exact current status
- make resumption obvious
- separate pending review from rejected or remediation-needed states
- return the user to blocked destination flows after approval when safe

## 9. Investment flow

Goals:

- maintain trust
- make costs, ownership, and next steps explicit
- avoid implying instant finality if backend flow is asynchronous

Flow shape:

1. Discover property
2. Review evidence and economics
3. Check eligibility and KYC state
4. Connect wallet if needed
5. Enter amount
6. Review investment summary
7. Confirm submission
8. Track progress
9. Land in investment and portfolio state

## 10. NFT flow

Goals:

- keep NFT ownership clearly related to Relcko asset trust
- distinguish collectible, proof, and utility semantics

Flow shape:

1. Discover NFT
2. Verify collection and purpose
3. Review ownership and utility
4. Connect wallet
5. Complete mint, transfer, or purchase
6. Confirm ownership state

## 11. Governance flow

Goals:

- make proposals understandable
- reduce governance intimidation
- expose time sensitivity and weight clearly

Flow shape:

1. Discover proposal
2. Understand impact and timeline
3. Review voting power
4. Cast vote
5. Confirm recorded state
6. Track proposal lifecycle

## 12. AI interaction flow

Goals:

- advisory, not mystical
- contextual, not generic
- explainable, not opaque

Flow shape:

1. User asks or receives suggestion
2. AI response includes context and rationale
3. User reviews recommendation
4. User accepts, ignores, or explores further
5. Sensitive actions redirect to human-reviewed domain flow

## 13. Deep linking and continuity

Deep linking rules:

- preserve user intent across authentication boundaries
- preserve return target after wallet handoff where safe
- preserve notification-driven entry into the correct entity or workflow
- avoid dead-end links into blocked states without remediation guidance

## 14. Public website experience rules

- lead with trust and evidence
- let users explore without forcing sign-in too early
- keep marketplace browse fast
- turn credibility into conversion, not noise

## 15. Investor portal experience rules

- every screen should reinforce ownership clarity
- financial metrics must be understandable
- documents and evidence must be close to decisions
- AI should feel useful but bounded

## 16. Agent portal experience rules

- high signal-to-noise ratio
- clear daily priorities
- visible relationship between effort and commission outcome
- hierarchy views should be readable, not ornamental

## 17. Admin portal experience rules

- evidence first
- audit visibility always near action
- approval and execution clearly separated
- emergency actions unmistakable and deliberate

## 18. Notification consistency rules

- the same event type should use the same label and severity family across portals
- notification deep links should take users to the most actionable safe destination
- acknowledged state should be visually consistent across web and mobile

## 19. Impersonation and delegated context

If delegated or impersonation-style context is permitted:

- the acting context must always be visible
- exit path must be obvious
- restricted actions must remain clearly labeled
- audit awareness must be visible to the acting administrator

## 20. Tone and content guidelines

Relcko copy should be:

- credible
- direct
- calm
- precise

Avoid:

- hype language
- false urgency
- jargon without explanation
- vague state labels

## 21. Cross-application consistency rules

- same entity should have consistent name and status across all apps
- same action should have similar review pattern across apps
- same alert severity should feel the same everywhere
- same wallet and session states should use the same language

## 22. UX quality gates

Before release, each workflow should satisfy:

- user knows where they are
- user knows what the system is doing
- user knows what will happen next
- user knows whether an action is final or still processing
- user can recover from likely failure states
