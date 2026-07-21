import type { CheckpointStore, ProjectionCheckpoint } from "@relcko/projections";

export class InMemoryCheckpointStore implements CheckpointStore {
  private readonly checkpoints = new Map<string, ProjectionCheckpoint>();

  async load(projectionName: string): Promise<ProjectionCheckpoint | null> {
    return this.checkpoints.get(projectionName) ?? null;
  }

  async save(checkpoint: ProjectionCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.projectionName, {
      ...checkpoint,
      updatedAt: Date.now(),
    });
  }

  async delete(projectionName: string): Promise<void> {
    this.checkpoints.delete(projectionName);
  }

  clear(): void {
    this.checkpoints.clear();
  }

  count(): number {
    return this.checkpoints.size;
  }
}
