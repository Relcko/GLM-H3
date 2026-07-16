"use client";

import { cn } from "@/lib/shared/cn";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={textareaId} className="text-sm text-white/70">{label}</label>}
      <textarea
        id={textareaId}
        className={cn(
          "w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors resize-y min-h-[80px]",
          className
        )}
        {...props}
      />
    </div>
  );
}
