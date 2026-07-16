"use client";

import { useCollections } from "@/lib/marketplace/collections";
import { cn } from "./primitives";

export function BookmarkButton({
  propertyId,
  className = "",
  label = "Save",
}: {
  propertyId: string;
  className?: string;
  label?: string;
}) {
  const { bookmarks, toggleBookmark } = useCollections();
  const active = bookmarks.includes(propertyId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove bookmark" : "Bookmark property"}
      title={active ? "Remove bookmark" : "Bookmark property"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark(propertyId);
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-white/15 text-white/70 hover:border-white/30 hover:text-white",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 4h12v16l-6-4-6 4V4z" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

export function FavoriteButton({
  propertyId,
  className = "",
}: {
  propertyId: string;
  className?: string;
}) {
  const { favorites, toggleFavorite } = useCollections();
  const active = favorites.includes(propertyId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      title={active ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(propertyId);
      }}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
        active
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-white/15 text-white/70 hover:border-white/30 hover:text-white",
        className,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-10-9.2C.6 9 1.8 5.5 5 5.5c2 0 3.3 1.2 4 2.3.7-1.1 2-2.3 4-2.3 3.2 0 4.4 3.5 3 6.3C19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
