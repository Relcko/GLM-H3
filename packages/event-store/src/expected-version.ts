/**
 * Optimistic-concurrency expectation used on append (Playbook 12.3).
 *
 * A non-negative number requires the stream to be at exactly that version
 * before the append; {@link EXPECTED_VERSION_EMPTY} (0) therefore requires a
 * new, empty stream. {@link EXPECTED_VERSION_ANY} disables the check.
 */
export type ExpectedVersion = number;

/** Append succeeds regardless of the current stream version. */
export const EXPECTED_VERSION_ANY: ExpectedVersion = -1;

/** Append succeeds only when the stream does not exist yet. */
export const EXPECTED_VERSION_EMPTY: ExpectedVersion = 0;
