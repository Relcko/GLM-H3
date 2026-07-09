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

// Neutral, near-white architectural light — the way real buildings are lit.
// Only a whisper of temperature separates the beats: cool moonlight at the
// hero, neutral daylight through the middle, warm-white at the finale. The
// colors are almost achromatic on purpose — if you notice the light color,
// it is too strong. Light guides emotion; it never announces itself.
export const CHAPTERS: Chapter[] = [
  {
    id: "chapter-01",
    num: "01",
    title: "Arrival",
    light: [150, 164, 190],
    intensity: 0.34,
  },
  {
    id: "chapter-02",
    num: "02",
    title: "Architecture",
    light: [158, 168, 186],
    intensity: 0.3,
  },
  {
    id: "chapter-03",
    num: "03",
    title: "Innovation",
    light: [160, 170, 188],
    intensity: 0.34,
  },
  {
    id: "chapter-04",
    num: "04",
    title: "Tokenization",
    light: [172, 176, 184],
    intensity: 0.32,
  },
  {
    id: "chapter-05",
    num: "05",
    title: "Investment",
    light: [184, 182, 174],
    intensity: 0.32,
  },
  {
    id: "chapter-06",
    num: "06",
    title: "Ecosystem",
    light: [192, 190, 182],
    intensity: 0.34,
  },
  {
    id: "chapter-07",
    num: "07",
    title: "Future",
    light: [200, 196, 188],
    intensity: 0.36,
  },
  {
    id: "chapter-08",
    num: "08",
    title: "Reveal",
    light: [212, 210, 204],
    intensity: 0.4,
  },
];

/** IDs of all chapters — convenience export. */
export const CHAPTER_IDS = CHAPTERS.map((c) => c.id);
