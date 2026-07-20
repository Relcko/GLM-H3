"use client";

export function BookmarkButton({
  isBookmarked,
  onToggle,
  className = "",
}: {
  isBookmarked: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={isBookmarked}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      className={`group/bookmark flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 ease-lux ${
        isBookmarked
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-white/10 bg-black/30 text-white/70 hover:border-white/20 hover:text-white"
      } ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={isBookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-300 ease-lux group-active/bookmark:scale-90"
      >
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}
