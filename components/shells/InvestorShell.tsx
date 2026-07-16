"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";
import { useSession } from "@/components/shared/providers/SessionProvider";

interface InvestorShellProps {
  children: ReactNode;
  sidebar?: ReactNode;
  topNav?: ReactNode;
  className?: string;
}

export function InvestorShell({ children, sidebar, topNav, className }: InvestorShellProps) {
  const { state } = useSession();

  if (state === "anonymous") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <p className="text-white/50">Please sign in to access the Investor Portal</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {topNav}
      {sidebar}
      <main
        id="main-content"
        className={cn(
          "transition-all duration-300",
          "lg:ml-60",
          className
        )}
      >
        <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6 md:px-8 lg:px-10 lg:pt-8 xl:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}
