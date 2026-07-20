import type { PropertyAmenityGroup } from "@/marketplace/domain";

export function Amenities({ groups }: { groups: PropertyAmenityGroup[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <div key={group.category}>
          <div className="dashboard-label mb-3">{group.category}</div>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="m5 12 5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
