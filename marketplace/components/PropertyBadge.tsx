import type { PropertyStatus, AssetType } from "@/marketplace/domain";

export type Tone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "gold"
  | "danger"
  | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-white/10 bg-white/[0.04] text-white/70",
  accent: "border-accent/25 bg-accent/10 text-accent",
  success: "border-[#3CE37D]/25 bg-[#3CE37D]/10 text-[#3CE37D]",
  warning: "border-[#FFC857]/25 bg-[#FFC857]/10 text-[#FFC857]",
  gold: "border-[#D6B25E]/25 bg-[#D6B25E]/10 text-[#D6B25E]",
  danger: "border-red-400/25 bg-red-500/10 text-red-300",
  muted: "border-white/10 bg-white/[0.03] text-white/45",
};

export function PropertyBadge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.14em] ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<PropertyStatus, Tone> = {
  draft: "muted",
  upcoming: "gold",
  active: "success",
  sold_out: "accent",
  closed: "danger",
};

export const STATUS_LABEL: Record<PropertyStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  active: "Active",
  sold_out: "Sold Out",
  closed: "Closed",
};

export const ASSET_LABEL: Record<AssetType, string> = {
  residential: "Residential",
  commercial: "Commercial",
  land: "Land",
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <PropertyBadge tone={STATUS_TONE[status]}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "active" ? "bg-[#3CE37D] status-dot" : "bg-current"
        }`}
      />
      {STATUS_LABEL[status]}
    </PropertyBadge>
  );
}
