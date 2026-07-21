/**
 * Durable progress marker of a projection.
 *
 * The position is the last scanned global event-store position; catch-up
 * resumes strictly after it.
 */
export interface ProjectionCheckpoint {
  /** Projection the checkpoint belongs to. */
  readonly projectionName: string;
  /** Last scanned global position (0 = nothing scanned yet). */
  readonly position: number;
  /** Epoch milliseconds when the checkpoint was saved. */
  readonly updatedAt: number;
}

/**
 * Checkpoint persistence interface.
 */
export interface CheckpointStore {
  /**
   * Loads the checkpoint of a projection.
   *
   * @param projectionName - projection name
   * @returns the checkpoint, or null when none exists
   */
  load(projectionName: string): Promise<ProjectionCheckpoint | null>;

  /**
   * Saves the checkpoint of a projection.
   *
   * @param checkpoint - checkpoint to persist
   */
  save(checkpoint: ProjectionCheckpoint): Promise<void>;

  /**
   * Deletes the checkpoint of a projection (used before a full rebuild).
   *
   * @param projectionName - projection name
   */
  delete(projectionName: string): Promise<void>;
}

/**
 * In-process {@link CheckpointStore}. Suitable for development and tests;
 * production deployments require a durable implementation.
 */
export class InMemoryCheckpointStore implements CheckpointStore {
  private readonly checkpoints = new Map<string, ProjectionCheckpoint>();

  load(projectionName: string): Promise<ProjectionCheckpoint | null> {
    return Promise.resolve(this.checkpoints.get(projectionName) ?? null);
  }

  save(checkpoint: ProjectionCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.projectionName, checkpoint);
    return Promise.resolve();
  }

  delete(projectionName: string): Promise<void> {
    this.checkpoints.delete(projectionName);
    return Promise.resolve();
  }
}
