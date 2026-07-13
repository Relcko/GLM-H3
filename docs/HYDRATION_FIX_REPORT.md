# Hydration Fix Report

**Date:** July 2026
**File:** `components/dashboard/AdminDashboard.tsx`
**Bug:** Next.js hydration mismatch — `Server rendered: 0, Client rendered: 1`

---

## Root Cause

Two render-time calls in `AdminDashboard` read from `localStorage`, which is unavailable during Server-Side Rendering (SSR):

### 1. `getMetrics()` (line 23)

```tsx
const metrics = useMemo(() => getMetrics(), []);
```

`getMetrics()` calls `getAnalytics()` → `load()`, which executes:

```ts
function load(): AnalyticsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);  // ❌ SSR: localStorage undefined
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { events: [], uniqueWallets: [] };
}
```

- **SSR:** `localStorage` throws → catch returns `{ events: [], uniqueWallets: [] }` → all metric values are `0`
- **Client:** `localStorage` succeeds → returns stored data → if any event exists, metric values differ from `0`

### 2. `getAnalytics()` in `avgConfTime` IIFE (lines 37-55)

```tsx
const avgConfTime = (() => {
    const store = getAnalytics();  // ❌ SSR: returns empty store
    ...
})();
```

- **SSR:** Returns `"—"` (events.length < 2 in empty store)
- **Client:** If 2+ events exist, returns a calculated time string like `"1.2s"`

### Why the Error Shows "0" vs "1"

When a tester visits the dashboard, `AnalyticsTracker` fires a `wallet_connected` event and saves it to `localStorage`. On the **next** SSR page load:

- SSR: `localStorage` unavailable → `metrics.totalEvents` = `0`
- Client: `localStorage` has 1 event → `metrics.totalEvents` = `1`

React detects `0 !== 1` in the corresponding `<StatCard>` and throws the hydration warning.

---

## Files Changed

| File | Change |
|---|---|
| `components/dashboard/AdminDashboard.tsx` | Guarded `getMetrics()` and `getAnalytics()` behind a `mounted` flag |

### What Changed

**1. Added `useEffect` mount guard:**

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);
```

**2. Guarded `getMetrics()` with `mounted`:**

```tsx
const metrics = useMemo(() => mounted ? getMetrics() : EMPTY_METRICS, [mounted]);
```

Where `EMPTY_METRICS` is a constant matching the zero-state return type of `getMetrics()`.

**3. Guarded `avgConfTime` with `mounted`:**

```tsx
const avgConfTime = useMemo(() => {
  if (!mounted) return "\u2014";
  // ... rest of calculation using getAnalytics()
}, [mounted]);
```

---

## Why Hydration Now Matches

| Phase | mounted | getMetrics() | avgConfTime |
|---|---|---|---|
| SSR | `false` | Returns `EMPTY_METRICS` (all zeros) | Returns `"—"` |
| Client (1st render) | `false` | Returns `EMPTY_METRICS` (all zeros) | Returns `"—"` |
| Client (after useEffect) | `true` | Returns real localStorage data | Returns real calculation |

**SSR and the first client render produce identical output** because neither reads `localStorage`. The `useEffect` fires after hydration is complete, so the subsequent re-render with real data is a normal client-side update — not a hydration mismatch.

---

## No SSR Disabled

- The component remains a `"use client"` boundary component
- No `dynamic(() => ... , { ssr: false })` was added
- No `suppressHydrationWarning` was added
- SEO and SSR are fully preserved
- The page is statically generated (`○` in build output)

---

## Remaining Hydration Risks

| Risk | Status |
|---|---|
| Other components reading localStorage during render | None found — `AdminDashboard` was the only component calling `getMetrics()` directly |
| `AnalyticsTracker` reading localStorage | Already runs in `useEffect` (safe) |
| `PresalePurchasePanel` reading sessionStorage | Already runs in `useEffect` (safe) |
| React Query hooks returning undefined on SSR | Safe — conditional rendering already handles `undefined` with `"—"` |
| `formatUnits` with `undefined` values | Safe — guarded by `!== undefined` ternaries |
| `mounted` pattern itself | Standard Next.js pattern for client-only data — no false positives |
