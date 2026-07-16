"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";

export function GridSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-12 gap-3 lg:gap-4", className)}>{children}</div>;
}

export function GridMain({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("col-span-12 xl:col-span-7 flex flex-col gap-6", className)}>{children}</div>;
}

export function GridSidebar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("col-span-12 xl:col-span-5 flex flex-col gap-6", className)}>{children}</div>;
}

export function GridFull({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("col-span-12", className)}>{children}</div>;
}

export function GridHalf({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("col-span-12 lg:col-span-6", className)}>{children}</div>;
}

export function GridThird({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("col-span-12 md:col-span-6 lg:col-span-4", className)}>{children}</div>;
}

export function GridQuarter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("col-span-6 lg:col-span-3", className)}>{children}</div>;
}
