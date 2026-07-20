/**
 * User collections store — bookmarks, favorites, watchlist, recently viewed
 * and the comparison list.
 *
 * All persisted to localStorage, SSR-safe, degrades silently when storage is
 * unavailable. This is the single source of truth for the "My Collections"
 * surface; the investment panel and detail page read eligibility/membership
 * from here. No backend calls.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

const KEYS = {
  bookmarks: "relcko.marketplace.bookmarks",
  favorites: "relcko.marketplace.favorites",
  watchlist: "relcko.marketplace.watchlist",
  recentlyViewed: "relcko.marketplace.recentlyViewed",
  comparison: "relcko.marketplace.comparison",
} as const;

const RECENT_LIMIT = 12;
const COMPARE_LIMIT = 4;

function readSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeSet(key: string, set: Set<string>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

function writeList(key: string, list: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function toggleInSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function useCollections() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [comparison, setComparison] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialBookmarks = readSet(KEYS.bookmarks);
    const initialFavorites = readSet(KEYS.favorites);
    const initialWatchlist = readSet(KEYS.watchlist);
    const initialRecent = readList(KEYS.recentlyViewed);
    const initialComparison = readList(KEYS.comparison);
    queueMicrotask(() => {
      setBookmarks(initialBookmarks);
      setFavorites(initialFavorites);
      setWatchlist(initialWatchlist);
      setRecentlyViewed(initialRecent);
      setComparison(initialComparison);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeSet(KEYS.bookmarks, bookmarks);
  }, [bookmarks, ready]);
  useEffect(() => {
    if (!ready) return;
    writeSet(KEYS.favorites, favorites);
  }, [favorites, ready]);
  useEffect(() => {
    if (!ready) return;
    writeSet(KEYS.watchlist, watchlist);
  }, [watchlist, ready]);
  useEffect(() => {
    if (!ready) return;
    writeList(KEYS.recentlyViewed, recentlyViewed);
  }, [recentlyViewed, ready]);
  useEffect(() => {
    if (!ready) return;
    writeList(KEYS.comparison, comparison);
  }, [comparison, ready]);

  const toggleBookmark = useCallback(
    (id: string) => setBookmarks((p) => toggleInSet(p, id)),
    []
  );
  const toggleFavorite = useCallback(
    (id: string) => setFavorites((p) => toggleInSet(p, id)),
    []
  );
  const toggleWatch = useCallback(
    (id: string) => setWatchlist((p) => toggleInSet(p, id)),
    []
  );

  const addToComparison = useCallback((id: string) => {
    setComparison((prev) => {
      if (prev.includes(id)) return prev;
      if (prev.length >= COMPARE_LIMIT) return prev;
      return [...prev, id];
    });
  }, []);
  const removeFromComparison = useCallback(
    (id: string) => setComparison((prev) => prev.filter((x) => x !== id)),
    []
  );
  const clearComparison = useCallback(() => setComparison([]), []);

  const recordView = useCallback((id: string) => {
    setRecentlyViewed((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)];
      return next.slice(0, RECENT_LIMIT);
    });
  }, []);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.has(id),
    [bookmarks]
  );
  const isFavourite = useCallback(
    (id: string) => favorites.has(id),
    [favorites]
  );
  const isWatched = useCallback((id: string) => watchlist.has(id), [watchlist]);
  const isComparing = useCallback(
    (id: string) => comparison.includes(id),
    [comparison]
  );

  return {
    ready,
    bookmarks,
    favorites,
    watchlist,
    recentlyViewed,
    comparison,
    bookmarkCount: bookmarks.size,
    favoriteCount: favorites.size,
    watchCount: watchlist.size,
    compareCount: comparison.length,
    toggleBookmark,
    toggleFavorite,
    toggleWatch,
    addToComparison,
    removeFromComparison,
    clearComparison,
    recordView,
    isBookmarked,
    isFavourite,
    isWatched,
    isComparing,
  };
}
