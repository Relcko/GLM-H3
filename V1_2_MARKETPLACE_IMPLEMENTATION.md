# V1.2.0 — Marketplace Implementation (Domain-Driven)

**Module:** First implementation of the Marketplace browsing experience inside the
Relcko Next.js app, built directly on the V1.1.1 domain extraction
(`DOMAIN_MODEL.md`, `ENTITY_RELATIONSHIP.md`, `MIGRATION_STRATEGY.md`).

**Status:** Production-quality browsing experience only. **No property investment
yet** (per milestone scope).

---

## 1. Folder structure

```
app/
  marketplace/
    page.tsx                      # route entry -> CinematicShell + MarketplaceLayout

marketplace/                      # self-contained feature module (separated per spec)
  domain/
    property.ts                   # Property, PropertyFraction, SPV + enums (DOMAIN_MODEL.md verbatim)
    index.ts
  types/
    index.ts                     # MarketplaceProperty view-model + FilterState/SortKey/status
  mock/
    properties.ts                # raw domain dataset + getMarketplaceProperties() mapper
    index.ts
  hooks/
    useMarketplaceData.ts        # async load simulator (loading/error/empty/populated)
    useMarketplaceSearch.ts      # search query state
    useMarketplaceFilters.ts     # filter state + toggle/range/reset
    useMarketplaceSort.ts        # sort key state + SORT_LABELS
    useBookmarks.ts              # localStorage-backed bookmark set
    index.ts
  utils/
    format.ts                    # currency / percent / number formatters
    search.ts                    # matchesQuery() — pure
    filtering.ts                 # matchesFilters() + getFilterOptions() — pure
    sorting.ts                   # getSortComparator() — pure
    index.ts
  components/
    MarketplaceLayout.tsx        # orchestrator: composes hooks -> states
    MarketplaceHeader.tsx        # title + summary band
    MarketplaceToolbar.tsx       # search + sort + mobile filter toggle + counts
    MarketplaceSidebar.tsx       # desktop sticky panel + mobile drawer
    MarketplaceFilters.tsx       # Country/City/Type/Status/ROI/Price/Funding controls
    MarketplaceGrid.tsx          # memoized card grid
    PropertyCard.tsx             # (React.memo) full card
    PropertyBadge.tsx            # badge + StatusBadge + label/tone maps
    PropertyStats.tsx            # ROI / Yield / Occupancy row + funding progress bar
    PropertyProgress.tsx         # (co-located with stats)
    BookmarkButton.tsx           # bookmark toggle
    LoadingSkeleton.tsx          # skeleton grid
    EmptyState.tsx               # empty / no-results / error variants
```

Supporting (infra, not module code):
- `next.config.ts` — `dangerouslyAllowSVG` + strict CSP so local `/public/marketplace/*.svg` heroes are optimized offline.
- `public/marketplace/property-01.svg … property-12.svg` — generated gradient hero placeholders.
- `tsconfig.json` / `eslint.config.mjs` — exclude `legacy-marketplace/` (read-only reference spec) from app typecheck/lint.

---

## 2. Components created

| Component | Responsibility |
|-----------|----------------|
| `MarketplaceLayout` | Owns all hook state; derives `visible` (filtered+sorted) via `useMemo`; renders header + sidebar + toolbar + state branches. |
| `MarketplaceHeader` | Title, subtitle, and a 4-stat summary band (Properties / Total Raise / Avg ROI / Active). |
| `MarketplaceToolbar` | Client-side search input, sort `<select>`, mobile Filters button (with active count), result + bookmark counts. |
| `MarketplaceSidebar` | Desktop: sticky glass panel. Mobile (`<lg`): slide-over drawer. Hosts `MarketplaceFilters`. |
| `MarketplaceFilters` | Checkbox groups (Country, City, Property Type, Status) + range rows (ROI, Price/Fraction, Funding %). |
| `MarketplaceGrid` | Responsive grid mapping `visible` to memoized `PropertyCard`s. |
| `PropertyCard` | Hero image (lazy), status + SPV badges, bookmark, name, location, stats, progress, key figures, View Details. |
| `PropertyBadge` | Reusable badge + `StatusBadge` + `ASSET_LABEL` / `STATUS_LABEL` / `STATUS_TONE` maps. |
| `PropertyStats` | ROI / Rental Yield / Occupancy stat row and the `PropertyProgress` funding bar. |
| `BookmarkButton` | Accessible toggle (aria-pressed), stops propagation. |
| `LoadingSkeleton` | Shimmer skeleton grid (9 cards) for the loading state. |
| `EmptyState` | Three variants: `empty`, `no-results`, `error` (with retry / clear-filters actions). |

All reuse the RC18–RC20 design language: `.dashboard-glass`, `.dashboard-card`
(`.lux-hover`), `.dashboard-label`, `.institutional-figure`, `.summary-band`,
`.health-bar`, `.dashboard-input`, `.dashboard-btn`, `.status-dot`, `.loader-shimmer`,
and the shared `EASE_LUX` motion token. No new visual language was introduced.

---

## 3. Routes created

- **`/marketplace`** — new standalone module. Wrapped in the existing
  `CinematicShell` (keeps global chrome: canvas, particles, navbar, cursor,
  scroll progress) and rendered via `MarketplaceLayout`.
- No existing routes modified (Landing `/`, `/presale`, Dashboard/Staking/Wallet/
  Admin untouched). No `Navbar` edit was made — see §10 on nav integration.

---

## 4. Mock dataset structure

`marketplace/mock/properties.ts` holds **raw domain-shaped** data (faithful to
`DOMAIN_MODEL.md` entity 1 `Property`, entity 2 `PropertyFraction`, entity 15 `SPV`):

- `rawProperties: Property[]` — 12 properties across `residential` / `commercial` /
  `land`, statuses `upcoming` / `active` / `sold_out` / `closed`, varied ROI / yield /
  occupancy / funding levels, and `images: ["/marketplace/property-NN.svg"]`.
- `rawSpvs: SPV[]` — 8 active SPVs linked to properties (the rest have no SPV to
  exercise the SPV indicator conditionally).
- `rawFractions: PropertyFraction[]` — derived 1:1 from `rawProperties`
  (`standard: "ERC1155"`, USDT payment token with `decimals: 6`).

`getMarketplaceProperties()` joins SPV by `property_id` and computes the **derived
display fields** (never stored): `targetRaise = token_price * total_tokens`,
`raisedAmount = token_price * sold_tokens`, `fundingProgress = sold_tokens /
total_tokens`, `availableFractions = available_tokens`, `hasSpv`.

**Field-fidelity note (DOMAIN_MODEL.md vs. card spec):** the card requires Country,
City, Target Raise, Raised Amount, and Occupancy. The domain `location` is
decomposed into `{ country, city, address }`; Target Raise / Raised Amount are
derived from `token_price` & `total_tokens`/`sold_tokens`; and `occupancy` is added
as an operational building metric (documented deviation, consistent with the
real-estate domain intent). `property_type` on the card maps to domain
`asset_type`. No random/invented stored fields were introduced.

---

## 5. Filtering architecture

- **State:** `FilterState` (in `types/index.ts`) — multi-select arrays for
  `countries`, `cities`, `assetTypes`, `statuses`; nested `RangeFilter` for
  `roi` / `price` (token_price) / `funding` (0–100).
- **Pure predicate:** `matchesFilters(property, filters)` in `utils/filtering.ts`
  (set membership + numeric range checks). Kept side-effect free so it is safe to
  memoize.
- **Options:** `getFilterOptions(properties)` derives available countries/cities/
  types/statuses and numeric ranges from the full dataset (recomputed via
  `useMemo` only when the dataset changes).
- **Wiring:** `useMarketplaceFilters` exposes `toggleInArray` (categorical),
  `setRange` (ranges), `reset`, and `activeCount`. `MarketplaceFilters` renders the
  controls; `MarketplaceLayout` applies the predicate inside a `useMemo`.

---

## 6. Search architecture

- **State:** `useMarketplaceSearch` → `{ query, setQuery, clear }`.
- **Pure matcher:** `matchesQuery(property, query)` in `utils/search.ts` does a
  case-insensitive substring scan over `name`, `country`, `city`, `address`,
  `description`, plus `asset_type`, `status`, and SPV `legal_name`/`jurisdiction`.
- Combined with filtering in one `useMemo` pipeline before sorting.

---

## 7. Sorting architecture

- **Keys (`SortKey`):** `newest` (created_at desc), `funding` (progress desc),
  `roi` (expected_roi desc), `minInvestAsc`, `minInvestDesc`, `alphabetical`
  (name asc) — exactly the six requested options.
- **Pure comparator:** `getSortComparator(sort)` in `utils/sorting.ts` returns a
  stable `Array.sort` comparator; applied to a shallow copy so the source array is
  never mutated.
- **Wiring:** `useMarketplaceSort` holds the active key; `MarketplaceToolbar`'s
  `<select>` updates it; `MarketplaceLayout` sorts the filtered list in `useMemo`.

**Pipeline (all memoized):** `properties → matchesQuery + matchesFilters →
getSortComparator → visible`.

---

## 8. State management

Four explicit states, rendered by `MarketplaceLayout`:

| State | Trigger | UI |
|-------|---------|-----|
| `loading` | initial mount / retry (650ms simulated async) | `LoadingSkeleton` |
| `error` | `?demo=error` query param (QA hook) | `EmptyState variant="error"` + retry |
| `empty` | dataset loaded but zero properties | `EmptyState variant="empty"` |
| `populated` | data present | `MarketplaceGrid`, or `EmptyState variant="no-results"` when filters exclude all |

Bookmarks: `useBookmarks` persists a `Set<id>` to `localStorage` (hydrated
post-mount via `queueMicrotask` to stay SSR-safe), reused across cards.

---

## 9. Performance decisions

- **Lazy images:** property heroes use `next/image` with `loading="lazy"` and
  responsive `sizes`; SVGs served under a strict CSP via `dangerouslyAllowSVG`.
- **Memoized filtering:** the full filter+search+sort pipeline runs inside one
  `useMemo` keyed on `[status, properties, query, filters, sort]` — no recompute
  on unrelated renders.
- **Memoized sorting:** pure comparator, applied to a copy (no mutation).
- **Memoized cards:** `PropertyCard` is wrapped in `React.memo`; stable callbacks
  (`bookmarks.toggle`) passed from the layout so cards don't re-render on
  bookmark toggles of *other* cards.
- **Virtualization:** intentionally **not** required (12 mock properties); grid
  uses CSS `grid` responsive columns.

---

## 10. Future integration points (API + blockchain)

| Concern | Current (V1.2.0) | Integration point |
|---------|------------------|-------------------|
| Data source | `getMarketplaceProperties()` (mock) | `useMarketplaceData` swaps the mock for a fetch to the Marketplace API; the `MarketplaceProperty` view-model stays the contract. |
| Token pricing | `token_price` hard-coded in mock | Bind `PropertyFraction.price_per_token` to on-chain read (ERC1155 + USDT, `decimals: 6` per MIGRATION_STRATEGY). |
| Identity / bookmarks | localStorage | Move to the Investor/Portfolio service once auth exists. |
| Property investment | "View Details" shows a *coming-soon* notice only | Next milestone: Investment flow per DOMAIN_MODEL entity 3, gated by KYC + Wallet SIWE login (Phase A/D of MIGRATION_STRATEGY). |
| Marketplace sale | not present | Secondary `MarketplaceListing`/`MarketplaceSale` (entities 5–6) anchored on-chain (legacy was off-chain). |
| Validation | client-only | Add the cross-entity invariants from `ENTITY_RELATIONSHIP.md` (money conservation, ownership supply, listing price cap). |
| Navigation | route reachable at `/marketplace` directly | Add a `Marketplace` entry to `Navbar` (left as a follow-up to avoid touching global chrome in this milestone). |

---

## 11. Verification results

| Gate | Command | Result |
|------|---------|--------|
| Production build | `npm run build` | ✅ passes (`/marketplace` prerendered, exit 0) |
| TypeScript | `tsc --noEmit` (app scope) | ✅ 0 errors in `marketplace/` & `app/marketplace/` |
| ESLint (new files) | `eslint marketplace app/marketplace` | ✅ 0 errors, 0 warnings |
| No blockchain changes | — | ✅ none |
| No wallet changes | — | ✅ none |
| No protected-module edits | — | ✅ Landing/Presale/Dashboard/Staking/Wallet/Admin untouched |
| Legacy spec untouched | — | ✅ `legacy-marketplace/` remains read-only reference; excluded from app typecheck/lint |

**QA hooks:** visit `/marketplace` (browse), apply search/filters/sort (states
update live), toggle bookmarks (persist across reload), resize for mobile drawer,
and `/marketplace?demo=error` to exercise the error state.
