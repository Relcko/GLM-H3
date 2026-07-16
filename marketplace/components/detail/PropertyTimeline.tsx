import type { PropertyTimelineEvent } from "@/marketplace/domain";
import { formatDate } from "@/marketplace/utils/format";

const DOT: Record<PropertyTimelineEvent["status"], string> = {
  done: "bg-[#3CE37D] border-[#3CE37D]/40",
  active: "bg-accent border-accent/40 status-dot",
  upcoming: "bg-white/20 border-white/20",
};

export function PropertyTimeline({ events }: { events: PropertyTimelineEvent[] }) {
  return (
    <ol className="relative ml-2 border-l border-white/10">
      {events.map((ev, i) => (
        <li key={`${ev.title}-${i}`} className="relative pb-6 pl-6 last:pb-0">
          <span
            className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 ${DOT[ev.status]}`}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-white/90">{ev.title}</h3>
            <span className="dashboard-label text-[0.5rem]">{formatDate(ev.date)}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-white/50">{ev.description}</p>
        </li>
      ))}
    </ol>
  );
}
