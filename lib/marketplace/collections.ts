"use client";

import { useSyncExternalStore } from "react";

/**
 * Client-side user collections (bookmarks, favorites, watchlist, recently
 * viewed, comparison). Persisted to localStorage. These are investor-facing UI
 * conveniences; without an authenticated account the backend `CollectionsService`
 * is not invoked (see IMPLEMENTATION_REPORT_V2_3.md, Known Issues).
 */

const STORAGE_KEY = "relcko.marketplace.collections.v1";
const MAX_RECENT = 12;
const MAX_COMPARE = 3;

export interface CollectionsState {
  bookmarks: string[];
  favorites: string[];
  watchlist: Record<string, string | undefined>;
  recentlyViewed: string[];
  comparison: string[];
}

const EMPTY: CollectionsState = {
  bookmarks: [],
  favorites: [],
  watchlist: {},
  recentlyViewed: [],
  comparison: [],
};

type Listener = () => void;

function load(): CollectionsState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CollectionsState>;
    return {
      bookmarks: parsed.bookmarks ?? [],
      favorites: parsed.favorites ?? [],
      watchlist: parsed.watchlist ?? {},
      recentlyViewed: parsed.recentlyViewed ?? [],
      comparison: parsed.comparison ?? [],
    };
  } catch {
    return EMPTY;
  }
}

let state: CollectionsState = EMPTY;
let initialized = false;
const listeners = new Set<Listener>();

function ensureInit() {
  if (initialized) return;
  initialized = true;
  state = load();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

function set(next: CollectionsState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export const collectionsStore = {
  subscribe(listener: Listener): () => void {
    ensureInit();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): CollectionsState {
    ensureInit();
    return state;
  },
  toggleBookmark(id: string) {
    set({ ...state, bookmarks: toggleIn(state.bookmarks, id) });
  },
  toggleFavorite(id: string) {
    set({ ...state, favorites: toggleIn(state.favorites, id) });
  },
  toggleWatchlist(id: string, note?: string) {
    const exists = id in state.watchlist;
    const watchlist = { ...state.watchlist };
    if (exists) delete watchlist[id];
    else watchlist[id] = note;
    set({ ...state, watchlist });
  },
  recordView(id: string) {
    const next = [id, ...state.recentlyViewed.filter((x) => x !== id)].slice(0, MAX_RECENT);
    set({ ...state, recentlyViewed: next });
  },
  toggleComparison(id: string) {
    if (state.comparison.includes(id)) {
      set({ ...state, comparison: state.comparison.filter((x) => x !== id) });
      return;
    }
    if (state.comparison.length >= MAX_COMPARE) return;
    set({ ...state, comparison: [...state.comparison, id] });
  },
  clearComparison() {
    set({ ...state, comparison: [] });
  },
  clearAll() {
    set({ ...EMPTY });
  },
};

export function useCollections(): CollectionsState & typeof collectionsStore {
  const snapshot = useSyncExternalStore(collectionsStore.subscribe, collectionsStore.getSnapshot);
  return { ...snapshot, ...collectionsStore };
}

export function isIn(list: readonly string[], id: string): boolean {
  return list.includes(id);
}
