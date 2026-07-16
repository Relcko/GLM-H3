"use client";

import { BookmarkButton } from "./BookmarkButton";

/** Heart-style favourite toggle, mirroring the BookmarkButton language. */
export function FavoriteButton({
  isFavourite,
  onToggle,
  className = "",
}: {
  isFavourite: boolean;
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
      aria-pressed={isFavourite}
      aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
      className={`group/fav flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 ease-lux ${
        isFavourite
          ? "border-[#FF6B8A]/40 bg-[#FF6B8A]/15 text-[#FF6B8A]"
          : "border-white/10 bg-black/30 text-white/70 hover:border-white/20 hover:text-white"
      } ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={isFavourite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-300 ease-lux group-active/fav:scale-90"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  );
}

export { BookmarkButton };
