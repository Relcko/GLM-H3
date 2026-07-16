"use client";

import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/shared/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, fullWidth = true, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn(fullWidth && "w-full")}>
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-white/70">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/20 focus:border-accent/40 focus:bg-accent/[0.03] focus:shadow-[0_0_22px_-8px_rgba(71,194,255,0.30)]",
              error && "border-red-500/40 focus:border-red-500/60 focus:shadow-[0_0_22px_-8px_rgba(239,68,68,0.30)]",
              icon && "pl-10",
              className
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-white/30">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
