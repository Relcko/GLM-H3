/**
 * Replay operating mode.
 *
 * - Full: replay the entire store from global position 0.
 * - FromPosition: replay starting after a given global position (exclusive).
 * - Range: replay events inside a (fromPosition, toPosition] window.
 */
export enum ReplayMode {
  Full = 'full',
  FromPosition = 'from-position',
  Range = 'range',
}
