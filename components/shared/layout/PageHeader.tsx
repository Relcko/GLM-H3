"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/shared/cn";
import { Breadcrumbs } from "@/components/shared/layout/Breadcrumbs";
import type { Breadcrumb } from "@/lib/shared/types";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs: Breadcrumb[];
  action?: ReactNode;
  secondaryActions?: ReactNode[];
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, action, secondaryActions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-white/50">{description}</p>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0">
          {secondaryActions?.map((a, i) => (
            <div key={i}>{a}</div>
          ))}
          {action && <div>{action}</div>}
        </div>
      </div>
    </div>
  );
}
