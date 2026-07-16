import { cn } from "./primitives";

/** A stylized, non-interactive map placeholder (no external map provider). */
export function MapPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c1622]",
        className,
      )}
      aria-label="Property location map placeholder"
      role="img"
    >
      <svg viewBox="0 0 800 400" className="h-full w-full opacity-70" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="mp-glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#47C2FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#47C2FF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="400" fill="#0c1622" />
        <rect width="800" height="400" fill="url(#mp-glow)" />
        <g stroke="#1c2c3a" strokeWidth="1">
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="400" />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} />
          ))}
        </g>
        <path d="M0 250 Q 200 180 400 240 T 800 220" stroke="#47C2FF" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M0 320 Q 250 280 500 320 T 800 300" stroke="#D6B25E" strokeWidth="2" fill="none" opacity="0.4" />
        <g fill="#47C2FF">
          <circle cx="180" cy="170" r="4" />
          <circle cx="420" cy="230" r="4" />
          <circle cx="640" cy="180" r="4" />
          <circle cx="300" cy="300" r="4" />
          <circle cx="560" cy="280" r="4" />
        </g>
      </svg>
      <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[0.65rem] uppercase tracking-wider text-white/60 backdrop-blur">
        Map preview
      </div>
    </div>
  );
}
