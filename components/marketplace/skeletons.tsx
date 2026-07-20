import { cn } from "./primitives";

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-gradient-to-r from-white/[0.04] via-white/[0.09] to-white/[0.04] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <Shimmer className="aspect-[4/3] w-full" />
      <div className="flex flex-col gap-3 p-5">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-5 w-3/4" />
        <Shimmer className="h-3 w-1/2" />
        <Shimmer className="mt-2 h-1.5 w-full" />
        <div className="mt-2 flex gap-3">
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}
