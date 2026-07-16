"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";
import { Button } from "@/components/shared/ui/Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 text-white/20">{icon}</div>}
      <p className="text-base font-medium text-white/70">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-white/40">{description}</p>}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
