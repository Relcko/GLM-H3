export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-28 sm:px-8 md:px-12 lg:px-16">
      <div className="h-10 w-40 animate-pulse rounded bg-white/[0.05]" />
      <div className="mt-6 aspect-[16/9] w-full animate-pulse rounded-2xl bg-white/[0.04]" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
          <div className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
