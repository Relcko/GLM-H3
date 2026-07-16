"use client";

import { EmptyState } from "@/marketplace/components/EmptyState";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-28 sm:px-8 md:px-12 lg:px-16">
      <EmptyState variant="error" onRetry={reset} />
    </div>
  );
}
