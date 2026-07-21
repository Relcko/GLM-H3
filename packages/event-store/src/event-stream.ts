import type { StoredEvent } from './stored-event';
import type { StreamId } from './stream-id';

/** Version of a stream that contains no events. */
export const EMPTY_STREAM_VERSION = 0;

/**
 * Materialized view over a slice of one event stream.
 */
export interface EventStream {
  /** Stream identifier. */
  readonly streamId: StreamId;
  /** Current version of the whole stream (0 when empty). */
  readonly version: number;
  /** Events contained in this view, ascending by version. */
  readonly events: readonly StoredEvent[];
}
