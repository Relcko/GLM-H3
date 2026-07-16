"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: boolean;
}

const maxWidthStyles = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[90rem]",
  full: "max-w-full",
};

export function PageContainer({ children, className, maxWidth = "lg", padding = true }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        maxWidthStyles[maxWidth],
        padding && "px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export function SectionContainer({ children, className, id, ariaLabel }: SectionContainerProps) {
  return (
    <section id={id} aria-label={ariaLabel} className={cn("py-6 sm:py-8", className)}>
      {children}
    </section>
  );
}
