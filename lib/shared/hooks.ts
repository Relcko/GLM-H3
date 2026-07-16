"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { BREAKPOINTS } from "./breakpoints";
import type { LoadingState } from "./types";

function subscribeMediaQuery(query: string, callback: () => void): () => void {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMediaQuerySnapshot(query: string): boolean {
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => subscribeMediaQuery(query, cb),
    () => getMediaQuerySnapshot(query),
    () => false
  );
}

export function useBreakpoint(breakpoint: keyof typeof BREAKPOINTS): boolean {
  const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
  return useSyncExternalStore(
    (cb) => subscribeMediaQuery(query, cb),
    () => getMediaQuerySnapshot(query),
    () => false
  );
}

export function useIsMobile(): boolean {
  const isLg = useBreakpoint("lg");
  return !isLg;
}

export function useIsTablet(): boolean {
  const isMd = useBreakpoint("md");
  const isLg = useBreakpoint("lg");
  return isMd && !isLg;
}

export function useIsDesktop(): boolean {
  return useBreakpoint("lg");
}

export function useReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  return useSyncExternalStore(
    (cb) => subscribeMediaQuery(query, cb),
    () => getMediaQuerySnapshot(query),
    () => false
  );
}

export function useLoadingState<T>(
  fetcher: () => Promise<T>
): { state: LoadingState; data: T | null; error: Error | null; refetch: () => void } {
  const [state, setState] = useState<LoadingState>("loading");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    setState("loading");
    setError(null);
    fetcher()
      .then((result) => {
        setData(result);
        setState("success");
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setState("error");
      });
  }, [fetcher]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  return { state, data, error, refetch: fetchData };
}

export function useKeyboardShortcut(key: string, handler: () => void, options?: { ctrl?: boolean; meta?: boolean; alt?: boolean; enabled?: boolean }) {
  useEffect(() => {
    if (options?.enabled === false) return;

    const listener = (e: KeyboardEvent) => {
      const ctrl = options?.ctrl ?? false;
      const meta = options?.meta ?? false;
      const alt = options?.alt ?? false;

      if (e.key === key && e.ctrlKey === ctrl && e.metaKey === meta && e.altKey === alt) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [key, handler, options?.ctrl, options?.meta, options?.alt, options?.enabled]);
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {}
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      try {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {}
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}
