import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[1400px] flex-col items-center justify-center px-5 text-center">
      <div className="dashboard-label mb-3">404</div>
      <h1 className="font-display text-3xl font-light text-white/95">
        Property not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-white/45">
        The property you’re looking for may have been removed or never published.
      </p>
      <Link
        href="/marketplace"
        className="dashboard-btn dashboard-btn-primary mt-6 !px-5 !py-2.5 !text-xs"
      >
        Back to Marketplace
      </Link>
    </div>
  );
}
