/**
 * Single source of truth for the chapter list.
 * Order matches the page layout and is used by ChapterRail, SectionTransition,
 * SectionLight, and any other layer that needs to be aware of the journey.
 */

export type Chapter = {
  id: string;
  num: string;
  title: string;
  /**
   * Atmospheric key color for this chapter — used by SectionLight to
   * subtly tint the scene. RGB triplet, 0..255.
   */
  light: [number, number, number];
  /**
   * Light intensity at the section's center. The light smoothly ramps
   * in as the user enters and ramps out as they leave.
   */
  intensity: number;
};

export const CHAPTERS: Chapter[] = [
  {
    id: "chapter-01",
    num: "01",
    title: "Arrival",
    light: [0, 212, 255],
    intensity: 0.55,
  },
  {
    id: "chapter-02",
    num: "02",
    title: "Architecture",
    light: [80, 140, 200],
    intensity: 0.4,
  },
  {
    id: "chapter-03",
    num: "03",
    title: "Innovation",
    light: [0, 87, 255],
    intensity: 0.55,
  },
  {
    id: "chapter-04",
    num: "04",
    title: "Tokenization",
    light: [80, 200, 255],
    intensity: 0.5,
  },
  {
    id: "chapter-05",
    num: "05",
    title: "Investment",
    light: [60, 227, 125],
    intensity: 0.45,
  },
  {
    id: "chapter-06",
    num: "06",
    title: "Ecosystem",
    light: [120, 180, 255],
    intensity: 0.45,
  },
  {
    id: "chapter-07",
    num: "07",
    title: "Future",
    light: [214, 178, 94],
    intensity: 0.5,
  },
  {
    id: "chapter-08",
    num: "08",
    title: "Reveal",
    light: [245, 228, 176],
    intensity: 0.55,
  },
];

/** IDs of all chapters — convenience export. */
export const CHAPTER_IDS = CHAPTERS.map((c) => c.id);
