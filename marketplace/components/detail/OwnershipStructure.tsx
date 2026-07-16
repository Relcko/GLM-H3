import type { OwnershipStructure } from "@/marketplace/domain";

export function OwnershipStructure({
  ownership,
}: {
  ownership: OwnershipStructure;
}) {
  const rows: [string, string][] = [
    ["Ownership Model", ownership.model],
    ["Token Standard", ownership.tokenStandard],
    ["SPV Legal Name", ownership.spvLegalName],
    ["Jurisdiction", ownership.jurisdiction],
    ["Registration No.", ownership.registrationNumber],
    ["Beneficial Holders", ownership.beneficialHolders.toLocaleString("en-US")],
    ["Custody", ownership.custody],
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={`grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[40%_60%] sm:gap-4 ${
            i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
          } ${i > 0 ? "border-t border-white/[0.05]" : ""}`}
        >
          <span className="dashboard-label text-[0.55rem]">{k}</span>
          <span className="text-sm text-white/85">{v}</span>
        </div>
      ))}
    </div>
  );
}
