import { cn } from "./primitives";

export function FundingBar({
  pct,
  className = "",
  showLabel = true,
}: {
  pct: number;
  className?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {showLabel ? (
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono uppercase tracking-wider text-white/45">Funded</span>
          <span className="tabular-nums text-white/80">{clamped.toFixed(0)}%</span>
        </div>
      ) : null}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent transition-[width] duration-700 ease-lux"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
