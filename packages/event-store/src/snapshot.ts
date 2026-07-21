import type { StreamId } from './stream-id';

/**
 * Point-in-time capture of a stream's derived state.
 *
 * Snapshots shorten rebuilds: a consumer loads the latest snapshot and
 * replays only events after {@link Snapshot.version}. The state is stored
 * serialized so the store stays schema-agnostic.
 */
export interface Snapshot {
  /** Stream the snapshot belongs to. */
  readonly streamId: StreamId;
  /** Stream version captured by this snapshot. */
  readonly version: number;
  /** Serialized state at {@link Snapshot.version}. */
  readonly state: string;
  /** Epoch milliseconds when the snapshot was taken. */
  readonly takenAt: number;
}
