import type { ReactNode } from "react";
import { cn } from "./primitives";

export function EmptyState({
  title,
  description,
  action,
  className = "",
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center",
        className,
      )}
    >
      {icon ? <div className="text-white/30">{icon}</div> : null}
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium text-white/90">{title}</h3>
        {description ? <p className="max-w-md text-sm text-white/50">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
  className = "",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-400/20 bg-red-500/[0.04] px-6 py-20 text-center",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium text-red-200">{title}</h3>
        <p className="max-w-md text-sm text-red-200/70">{description}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
