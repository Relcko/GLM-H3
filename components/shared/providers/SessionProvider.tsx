"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { SessionContextValue, AuthState, UserProfile, SessionStatus } from "@/lib/shared/types";

interface SessionContextType extends SessionContextValue {
  login: (user: UserProfile) => void;
  logout: () => void;
  elevate: () => void;
  deElevate: () => void;
  setImpersonating: (active: boolean) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({
  children,
  defaultUser,
}: {
  children: ReactNode;
  defaultUser?: UserProfile;
}) {
  const [state, setState] = useState<AuthState>(defaultUser ? "authenticated" : "anonymous");
  const [user, setUser] = useState<UserProfile | null>(defaultUser ?? null);
  const [sessionId, setSessionId] = useState<string | null>(defaultUser ? crypto.randomUUID() : null);
  const [status, setStatus] = useState<SessionStatus>("active");
  const [expiresAt, setExpiresAt] = useState<number | null>(defaultUser ? Date.now() + 86400000 : null);
  const [impersonating, setImpersonating] = useState(false);

  const login = useCallback((user: UserProfile) => {
    setUser(user);
    setState("authenticated");
    setSessionId(crypto.randomUUID());
    setStatus("active");
    setExpiresAt(Date.now() + 3600000);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setState("anonymous");
    setSessionId(null);
    setStatus("expired");
    setExpiresAt(null);
    setImpersonating(false);
  }, []);

  const elevate = useCallback(() => {
    if (state === "authenticated") setState("elevated");
  }, [state]);

  const deElevate = useCallback(() => {
    if (state === "elevated") setState("authenticated");
  }, [state]);

  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  return (
    <SessionContext.Provider
      value={{
        state,
        user,
        sessionId,
        status,
        expiresAt,
        impersonating,
        login,
        logout,
        elevate,
        deElevate,
        setImpersonating,
        updateUser,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
