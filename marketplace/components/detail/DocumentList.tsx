import { DOCUMENT_CATEGORY_LABEL } from "@/marketplace/domain";
import type { PropertyDocument } from "@/marketplace/domain";
import { DetailStat } from "./primitives";

const CATEGORY_TONE: Record<PropertyDocument["category"], string> = {
  legal: "border-white/10 bg-white/[0.04] text-white/70",
  financial: "border-accent/25 bg-accent/10 text-accent",
  technical: "border-white/10 bg-white/[0.04] text-white/70",
  compliance: "border-[#D6B25E]/25 bg-[#D6B25E]/10 text-[#D6B25E]",
};

export function DocumentList({ documents }: { documents: PropertyDocument[] }) {
  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-white/90">{doc.title}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[0.7rem] text-white/40">
              <span>{doc.kind}</span>
              <span>·</span>
              <span>{doc.sizeLabel}</span>
              {!doc.public && (
                <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide">
                  Verified holders
                </span>
              )}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.58rem] font-medium uppercase tracking-[0.12em] ${CATEGORY_TONE[doc.category]}`}
          >
            {DOCUMENT_CATEGORY_LABEL[doc.category]}
          </span>
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Download ${doc.title}`}
            className="shrink-0 rounded-full border border-white/10 p-2 text-white/60 transition-colors hover:border-accent/30 hover:text-accent"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
            </svg>
          </a>
        </div>
      ))}
    </div>
  );
}

export { DetailStat };
