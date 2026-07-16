"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";
import { useSession } from "@/components/shared/providers/SessionProvider";

interface AdminShellProps {
  children: ReactNode;
  sidebar?: ReactNode;
  topNav?: ReactNode;
  banner?: ReactNode;
  className?: string;
}

export function AdminShell({ children, sidebar, topNav, banner, className }: AdminShellProps) {
  const { state } = useSession();

  if (state === "anonymous") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <p className="text-white/50">Unauthorized</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {banner}
      {topNav}
      {sidebar}
      <main id="main-content" className={cn("lg:ml-60", className)}>
        <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-20 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}
