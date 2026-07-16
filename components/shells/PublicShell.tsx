"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";

interface PublicShellProps {
  children: ReactNode;
  className?: string;
  hideFooter?: boolean;
}

export function PublicShell({ children, className }: PublicShellProps) {
  return (
    <div className={cn("min-h-screen bg-bg-base", className)}>
      <main id="main-content">{children}</main>
    </div>
  );
}
