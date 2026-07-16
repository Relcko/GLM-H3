"use client";

import { type HTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/shared/cn";

type CardVariant = "default" | "elevated" | "glass" | "dashboard" | "interactive";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: "border border-white/[0.06] bg-white/[0.02]",
  elevated: "border border-white/[0.08] bg-white/[0.03] shadow-lg shadow-black/20",
  glass: "glass",
  dashboard: "dashboard-card",
  interactive:
    "card-interactive border border-white/[0.06] bg-white/[0.02] hover:border-accent/20 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/20 cursor-pointer transition-all duration-200",
};

const paddingStyles = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6 md:p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", padding = "md", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl backdrop-blur-sm transition-all duration-200",
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-3 flex items-center justify-between", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-semibold text-white", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-0.5 text-xs text-white/45", className)}>{children}</p>;
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-4 flex items-center gap-3 border-t border-white/[0.06] pt-4", className)}>{children}</div>;
}
