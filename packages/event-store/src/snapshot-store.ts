import type { Snapshot } from './snapshot';
import type { StreamId } from './stream-id';

/**
 * Snapshot persistence contract.
 *
 * Snapshots accelerate aggregate rebuilds and projection catch-up; the event
 * stream remains the source of truth (Playbook 2.3).
 */
export interface SnapshotStore {
  /**
   * Persists a snapshot, replacing any snapshot of the same stream and
   * version.
   *
   * @param snapshot - snapshot to persist
   */
  snapshot(snapshot: Snapshot): Promise<void>;

  /**
   * Loads the most recent snapshot of a stream.
   *
   * @param streamId - stream to load the snapshot for
   * @returns the latest snapshot, or null when none exists
   */
  loadLatest(streamId: StreamId): Promise<Snapshot | null>;

  /**
   * Loads the most recent snapshot of a stream at or below a version.
   *
   * @param streamId - stream to load the snapshot for
   * @param version - maximum stream version the snapshot may capture
   * @returns the snapshot, or null when none qualifies
   */
  loadAtVersion(streamId: StreamId, version: number): Promise<Snapshot | null>;
}
