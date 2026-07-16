import { createContext, useContext } from "react";

export function createSafeContext<T>(name: string) {
  const ctx = createContext<T | null>(null);
  function useSafeContext(): T {
    const value = useContext(ctx);
    if (value === null) {
      throw new Error(`use${name} must be used within ${name}Provider`);
    }
    return value;
  }
  return [ctx, useSafeContext] as const;
}
