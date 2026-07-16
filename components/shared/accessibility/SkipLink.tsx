"use client";

export function SkipLink({ href = "#main-content" }: { href?: string }) {
  return (
    <a
      href={href}
      className="fixed left-4 top-4 z-50 -translate-y-20 rounded-xl border border-white/[0.08] bg-bg-base/90 px-4 py-2 text-xs text-white/70 backdrop-blur-xl transition-transform duration-300 focus:translate-y-0 focus-visible:outline-2 focus-visible:outline-accent"
    >
      Skip to content
    </a>
  );
}

export function FocusTrap({ children, active }: { children: React.ReactNode; active: boolean }) {
  if (!active) return <>{children}</>;
  return <div tabIndex={-1}>{children}</div>;
}

export function Announcement({ message, priority = "polite" }: { message: string; priority?: "polite" | "assertive" }) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
