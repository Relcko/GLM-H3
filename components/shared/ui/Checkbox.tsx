"use client";

import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/shared/cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, className, id, ...props }, ref) => {
  const checkId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={checkId} className="flex items-center gap-2.5 cursor-pointer group">
      <input
        ref={ref}
        id={checkId}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border border-white/[0.15] bg-white/[0.03] text-accent accent-accent focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-0 cursor-pointer",
          className
        )}
        {...props}
      />
      {label && <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">{label}</span>}
    </label>
  );
});

Checkbox.displayName = "Checkbox";
