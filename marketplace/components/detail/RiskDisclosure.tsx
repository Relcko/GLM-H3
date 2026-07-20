import { RISK_LEVEL_LABEL } from "@/marketplace/domain";
import type { RiskDisclosure } from "@/marketplace/domain";

const LEVEL_TONE: Record<RiskDisclosure["level"], string> = {
  low: "border-[#3CE37D]/25 bg-[#3CE37D]/10 text-[#3CE37D]",
  moderate: "border-[#FFC857]/25 bg-[#FFC857]/10 text-[#FFC857]",
  elevated: "border-red-400/25 bg-red-500/10 text-red-300",
};

export function RiskDisclosure({ risk }: { risk: RiskDisclosure }) {
  return (
    <div className="space-y-4">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${LEVEL_TONE[risk.level]}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="text-sm font-medium">Risk Level: {RISK_LEVEL_LABEL[risk.level]}</div>
          <div className="mt-0.5 text-xs opacity-80">{risk.summary}</div>
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {risk.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/60">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/30" />
            {item}
          </li>
        ))}
      </ul>
      <p className="text-[0.7rem] text-white/35">
        This disclosure is provided for informational purposes and is not financial advice.
      </p>
    </div>
  );
}
