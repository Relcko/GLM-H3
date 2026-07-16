"use client";

import { useState } from "react";
import { cn } from "@/lib/shared/cn";
import { Button } from "@/components/shared/ui/Button";
import { Badge } from "@/components/shared/ui/Badge";
import { useNotifications } from "@/components/shared/providers/NotificationProvider";
import { formatRelativeTime } from "@/lib/shared/format";

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-yellow-500",
  medium: "bg-accent",
  low: "bg-white/30",
  informational: "bg-white/20",
};

export function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead, acknowledge, clearNotification, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2 text-white/50 hover:bg-white/[0.04] hover:text-white/80 transition-all"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-black">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-white/[0.08] bg-bg-secondary shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-accent hover:text-accent/80 transition-colors">
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-white/30">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 50).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markRead(n.id);
                      if (n.priority === "critical") acknowledge(n.id);
                    }}
                    className={cn(
                      "flex w-full gap-3 border-b border-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.02]",
                      !n.read && "bg-accent/[0.02]"
                    )}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", priorityColors[n.priority])} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", n.read ? "text-white/60" : "text-white font-medium")}>{n.title}</p>
                      {n.message && <p className="mt-0.5 text-xs text-white/40 line-clamp-2">{n.message}</p>}
                      <p className="mt-1 text-[10px] text-white/20">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearNotification(n.id); }}
                      className="shrink-0 rounded p-0.5 text-white/20 hover:text-white/50"
                      aria-label="Remove notification"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
