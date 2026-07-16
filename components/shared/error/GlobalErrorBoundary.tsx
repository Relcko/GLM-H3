"use client";

import { cn } from "@/lib/shared/cn";

export function GlobalErrorFallback({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-bg-base p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-red-400" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
              <path d="M12 8v4M12 16h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">Critical error</h1>
          <p className="mt-2 text-sm text-white/50">The application encountered an unexpected error.</p>
          {error.digest && <p className="mt-1 text-xs text-white/20">Error ID: {error.digest}</p>}
          <button
            onClick={reset}
            className={cn(
              "mt-6 inline-flex items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.08]"
            )}
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
