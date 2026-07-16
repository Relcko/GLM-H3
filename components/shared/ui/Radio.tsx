"use client";

import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/shared/cn";

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(({ label, className, id, ...props }, ref) => {
  const radioId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={radioId} className="flex items-center gap-2.5 cursor-pointer group">
      <input
        ref={ref}
        id={radioId}
        type="radio"
        className={cn(
          "h-4 w-4 appearance-none rounded-full border border-white/[0.15] bg-white/[0.03] checked:border-accent checked:bg-accent/20 checked:shadow-[inset_0_0_0_3px] checked:shadow-accent focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer transition-all",
          className
        )}
        {...props}
      />
      {label && <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">{label}</span>}
    </label>
  );
});

Radio.displayName = "Radio";
