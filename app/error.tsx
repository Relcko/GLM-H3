"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-bg-base text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, rgba(71,194,255,0.06) 0%, rgba(14,15,19,0) 55%)",
        }}
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div
          role="alert"
          className="glass-strong w-full max-w-md rounded-2xl px-8 py-10 text-center sm:px-10"
        >
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-accent/70">
            Relcko
          </p>
          <h1 className="mt-4 font-display text-display font-light text-white">
            Something went wrong
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            An unexpected error occurred while loading this page.
            <br />
            Please try again.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={reset}
              className="btn-depth w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-bg-base transition duration-300 ease-lux hover:shadow-btn-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
            >
              Try Again
            </button>

            <Link
              href="/presale"
              className="w-full rounded-full border border-[var(--line)] px-6 py-3 text-sm font-medium text-white/70 transition duration-300 ease-lux hover:border-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
            >
              Return to Dashboard
            </Link>

            <Link
              href="/"
              className="w-full rounded-full border border-[var(--line)] px-6 py-3 text-sm font-medium text-white/70 transition duration-300 ease-lux hover:border-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
