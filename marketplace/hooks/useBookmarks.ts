"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "relcko.marketplace.bookmarks";

/**
 * Bookmark set persisted to localStorage. Survives reloads; degrades silently
 * if storage is unavailable (SSR / private mode).
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let parsed: Set<string> | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) parsed = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    queueMicrotask(() => {
      if (parsed) setBookmarks(parsed);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(bookmarks))
      );
    } catch {
      /* ignore */
    }
  }, [bookmarks, ready]);

  const toggle = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.has(id),
    [bookmarks]
  );

  return { bookmarks, toggle, isBookmarked, count: bookmarks.size };
}
