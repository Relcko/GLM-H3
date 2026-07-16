import { PropertyStatus } from "@relcko/domain-core";
import { cn } from "./primitives";

const STATUS_STYLE: Record<PropertyStatus, { label: string; className: string; dot: string }> = {
  [PropertyStatus.Draft]: { label: "Draft", className: "text-white/60 border-white/15", dot: "bg-white/40" },
  [PropertyStatus.Upcoming]: { label: "Upcoming", className: "text-accent/80 border-accent/30", dot: "bg-accent" },
  [PropertyStatus.Active]: { label: "Active", className: "text-success/90 border-success/30", dot: "bg-success" },
  [PropertyStatus.SoldOut]: { label: "Sold Out", className: "text-gold/90 border-gold/30", dot: "bg-gold" },
  [PropertyStatus.Closed]: { label: "Closed", className: "text-white/50 border-white/15", dot: "bg-white/30" },
};

export function StatusBadge({ status, className = "" }: { status: PropertyStatus; className?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider",
        s.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden="true" />
      {s.label}
    </span>
  );
}
