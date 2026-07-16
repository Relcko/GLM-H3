# Relcko Design System Specification

Status: Official design system specification for Relcko V3. Architecture only.

## 1. Design system purpose

The Relcko Design System provides one visual and interaction language for:

- public trust-building experiences
- investor ownership workflows
- agent productivity workflows
- administrative operational workflows
- mobile-first continuity

It must feel premium, financial, precise, and modern without becoming fragile, flashy, or trend-driven.

## 2. Design principles

- Trust before spectacle
- Information density with calm hierarchy
- Motion must explain, not decorate
- Strong contrast and legibility under financial pressure
- Shared primitives, role-specific shells
- Brand consistency across public, investor, agent, admin, and mobile

## 3. Typography

### 3.1 Type philosophy

Use a refined editorial-plus-application pairing:

- a high-credibility serif or serif-adjacent display family for brand, trust, and large headings
- a highly legible sans family for application UI, tabular data, and dense workflows

### 3.2 Typographic roles

- Display: hero, major campaign statements, executive highlights
- Heading: page titles, section titles
- Body: descriptive and explanatory copy
- Label: controls, filters, metadata
- Mono or tabular numeric style: money, percentages, timestamps, hashes, IDs

### 3.3 Numeric treatment

Financial and operational figures use tabular numeric behavior by default.

## 4. Spacing scale

Use a consistent modular spacing scale:

- 4
- 8
- 12
- 16
- 24
- 32
- 48
- 64
- 96

Rules:

- compact density in agent and admin tables
- medium density in investor workflows
- more generous spacing on public pages and marketing surfaces

## 5. Design token architecture

### 5.1 Token structure

The design system uses a layered token model:

- foundation tokens
- semantic tokens
- component tokens
- state tokens
- motion tokens

### 5.2 Foundation tokens

Foundation tokens include:

- color primitives
- typography primitives
- spacing primitives
- radius primitives
- elevation primitives
- motion duration and easing primitives

### 5.3 Semantic tokens

Semantic tokens map foundation tokens into experience meaning:

- surface tokens
- text tokens
- border tokens
- financial positive, caution, and negative tokens
- operational severity tokens
- focus and interaction tokens

### 5.4 Component tokens

Component tokens adapt semantics to system primitives such as:

- button
- card
- table
- dialog
- form field
- banner
- chart

### 5.5 State tokens

State tokens define:

- hover
- active
- selected
- disabled
- loading
- error
- success
- warning

### 5.6 Token portability

The same token model must map cleanly to:

- web runtime tokens
- mobile runtime tokens
- design tooling references

No portal-specific token families are allowed.

## 6. Grid system

### 5.1 Desktop

- 12-column application grid
- fixed rhythm for shell, content, and side panel alignment

### 5.2 Tablet

- 8-column adaptive grid

### 5.3 Mobile

- 4-column touch-first grid

### 5.4 Shell zones

- navigation zone
- content zone
- utility zone
- optional evidence or context zone

## 7. Responsive breakpoints

- Small mobile
- Large mobile
- Tablet portrait
- Tablet landscape
- Laptop
- Desktop
- Wide desktop

The system is breakpoint-aware, but component behavior is primarily content-responsive rather than rigidly device-class driven.

## 8. Color philosophy

### 7.1 Brand direction

Relcko should avoid generic fintech neon or purple-default aesthetics.

Primary emotional cues:

- trust
- precision
- maturity
- optimism without hype

### 7.2 Semantic color layers

- brand base
- surface base
- content emphasis
- financial positive
- financial caution
- financial negative
- operational info
- system critical

### 8.1 Color token families

Official color token families:

- brand
- surface
- text
- border
- focus
- positive
- caution
- negative
- info
- severity
- chart categorical
- chart sequential

### 8.2 Dark and light switching

Theme switching happens through semantic token remapping, not component duplication.

Rules:

- component contracts remain stable across themes
- semantic meanings do not change when the theme changes
- emergency and severity tokens remain legible in both themes

### 7.3 Usage rules

- gain/loss must never rely on color alone
- emergency actions use strong but controlled contrast
- admin severity uses semantic layering, not visual noise

## 9. Typography token families

Typography tokens include:

- font family tokens
- display size tokens
- heading size tokens
- body size tokens
- label size tokens
- line height tokens
- weight tokens
- tracking tokens
- numeric style tokens

## 10. Spacing and sizing tokens

Spacing tokens include:

- inset spacing
- stack spacing
- inline spacing
- layout gutter spacing
- section spacing

## 11. Elevation tokens

Elevation tokens include:

- base
- raised
- floating
- overlay
- modal
- emergency priority

## 12. Motion tokens

Motion tokens include:

- duration short
- duration medium
- duration long
- ease standard
- ease emphasized
- ease exit
- reduced-motion fallback rules

## 13. Token runtime strategy

### 13.1 Web token strategy

Web surfaces use semantic token exposure through CSS custom property style runtime mapping.

### 13.2 Mobile token strategy

Mobile surfaces use the same token names mapped into native runtime theme dictionaries.

### 13.3 Theme switching

Theme switching must swap semantic token values without changing component contracts.

## 14. Motion philosophy

Motion should:

- orient the user
- show hierarchy changes
- confirm action submission
- reveal state progression

Motion should not:

- compete with data
- delay serious workflows
- create uncertainty in critical actions

### 8.1 Motion categories

- shell transition
- content reveal
- list and table loading transition
- transactional progress stepper
- chart state transition
- modal and drawer transition

### 8.2 Reduced motion

All non-essential motion must degrade gracefully under reduced-motion preference.

## 15. Iconography

Icon style:

- clean geometric stroke system
- strong readability at small sizes
- consistent metaphor set for finance, identity, documents, governance, treasury, alerts, and AI

Rules:

- never rely on icon-only meaning for critical actions
- use paired labels in sensitive workflows

## 16. Elevation

Relcko uses restrained elevation:

- flat base surfaces for large work areas
- subtle lift for cards and overlays
- stronger elevation only for dialogs, command palette, urgent alerts, and emergency surfaces

## 17. Cards

Card roles:

- summary cards
- asset cards
- property cards
- KPI cards
- warning cards
- action cards

Card behavior:

- clear title and status hierarchy
- optional footer actions
- stable loading placeholders
- avoid excessive nesting

## 18. Tables

Table system must support:

- dense operational data
- sorting
- filtering
- bulk selection where permitted
- expandable rows
- sticky headers
- row-level severity and status tagging

Tables are primary in agent and admin experiences.

## 19. Forms

Form architecture must support:

- progressive disclosure
- strong inline guidance
- explicit required and optional markers
- long-form compliance flows
- transaction confirmation steps

Validation responsibilities:

- frontend gives format and completeness guidance
- backend remains authoritative

## 20. Charts

Chart system must support:

- portfolio performance
- diversification
- commission trends
- treasury health
- platform operations

Chart rules:

- every chart needs a textual summary
- tooltips must not be the only place where meaning exists
- preserve legibility under dense finance data
- color is never the sole carrier of trend or severity
- focus order must allow direct access to data summaries and comparative context

## 21. Dialogs

Dialog classes:

- informational
- confirmation
- destructive confirmation
- review and approval
- blocking risk or policy notice

Sensitive flows prefer review dialogs or staged drawers over single-click action.

## 22. Notifications

Notification types:

- toast
- banner
- inbox item
- interrupt alert
- persistent risk notice

Priority ladder:

- critical
- high
- medium
- low
- informational

## 23. Command palette

The command palette is a cross-application accelerator for:

- global search
- route jumps
- quick actions
- recent entities
- role-aware suggestions

It must be permission-aware and keyboard-first.

## 24. Empty states

Empty states should:

- explain what is missing
- offer the next best action
- distinguish first-use from no-results

Examples:

- no investments yet
- no commissions yet
- no open proposals
- no incidents found

## 25. Error states

Error state design principles:

- explain what happened
- explain impact
- explain the next step
- avoid panic language for recoverable states

## 26. Skeleton loading

Skeletons should mirror actual layout shape closely:

- card skeletons
- table row skeletons
- chart frame skeletons
- property media skeletons
- document and timeline skeletons

## 27. Dark mode and light mode strategy

Relcko supports both light and dark modes, but neither should feel like an afterthought.

### 21.1 Light mode

Default for:

- public website
- investor portal
- documents and detail-heavy reading experiences

### 21.2 Dark mode

Strong option for:

- trading-style investor sessions
- agent daily operations
- admin monitoring and operational review

### 21.3 Rule

Color meaning must remain stable between themes.

## 28. Role-specific visual posture

- Public: more atmospheric, editorial, and trust-led
- Investor: premium, clear, financially grounded
- Agent: energetic, performance-driven, efficient
- Admin: restrained, operational, evidence-led
- Mobile: condensed, touch-first, calm

## 29. Design system governance

The design system is the only approved UI primitive language for Relcko V3.

No portal or team should create parallel component families for:

- buttons
- tables
- forms
- alerts
- cards
- dialogs
- charts

Variation happens through tokens, density, shell, and semantic usage, not duplication.
