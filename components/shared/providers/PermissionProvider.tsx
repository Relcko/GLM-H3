"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Role } from "@relcko/types";

interface PermissionContextType {
  roles: Role[];
  can: (action: string) => boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({
  children,
  roles = [],
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const value = useMemo(
    () => ({
      roles,
      can: (_action: string) => true,
      hasRole: (role: Role) => roles.includes(role),
      hasAnyRole: (checkRoles: Role[]) => checkRoles.some((r) => roles.includes(r)),
      isLoading: false,
    }),
    [roles]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermission(): PermissionContextType {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermission must be used within PermissionProvider");
  return ctx;
}
