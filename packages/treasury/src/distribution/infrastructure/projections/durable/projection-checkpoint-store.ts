import type { EventEnvelope } from "@relcko/events";

export interface ProjectionCheckpoint {
  readonly projectionName: string;
  readonly position: number;
  readonly globalPosition: number;
  readonly version: number;
  readonly updatedAt: number;
  readonly eventCount: number;
}

export interface GlobalCheckpoint {
  readonly globalPosition: number;
  readonly version: number;
  readonly updatedAt: number;
}

export interface CheckpointValidationResult {
  readonly valid: boolean;
  readonly reason: string | null;
  readonly checkpoint: ProjectionCheckpoint | null;
  readonly globalCheckpoint: GlobalCheckpoint | null;
}

export interface IProjectionCheckpointStore {
  load(projectionName: string): Promise<ProjectionCheckpoint | null>;
  save(checkpoint: ProjectionCheckpoint): Promise<void>;
  delete(projectionName: string): Promise<void>;
  loadGlobal(): Promise<GlobalCheckpoint | null>;
  saveGlobal(checkpoint: GlobalCheckpoint): Promise<void>;
  verifyCheckpoint(projectionName: string): Promise<CheckpointValidationResult>;
  getAllProjections(): Promise<string[]>;
  clear(): Promise<void>;
}

export class InMemoryProjectionCheckpointStore implements IProjectionCheckpointStore {
  private readonly checkpoints = new Map<string, ProjectionCheckpoint>();
  private globalCheckpoint: GlobalCheckpoint | null = null;
  private versionCounter = 0;

  async load(projectionName: string): Promise<ProjectionCheckpoint | null> {
    const cp = this.checkpoints.get(projectionName);
    return cp ? { ...cp } : null;
  }

  async save(checkpoint: ProjectionCheckpoint): Promise<void> {
    this.versionCounter += 1;
    this.checkpoints.set(checkpoint.projectionName, {
      ...checkpoint,
      version: this.versionCounter,
      updatedAt: Date.now(),
    });
  }

  async delete(projectionName: string): Promise<void> {
    this.checkpoints.delete(projectionName);
  }

  async loadGlobal(): Promise<GlobalCheckpoint | null> {
    return this.globalCheckpoint ? { ...this.globalCheckpoint } : null;
  }

  async saveGlobal(checkpoint: GlobalCheckpoint): Promise<void> {
    this.versionCounter += 1;
    this.globalCheckpoint = {
      ...checkpoint,
      version: this.versionCounter,
      updatedAt: Date.now(),
    };
  }

  async verifyCheckpoint(projectionName: string): Promise<CheckpointValidationResult> {
    const cp = this.checkpoints.get(projectionName);
    if (!cp) {
      return {
        valid: false,
        reason: `No checkpoint found for projection ${projectionName}`,
        checkpoint: null,
        globalCheckpoint: this.globalCheckpoint,
      };
    }

    if (cp.eventCount < 0) {
      return {
        valid: false,
        reason: `Negative event count in checkpoint for ${projectionName}: ${cp.eventCount}`,
        checkpoint: cp,
        globalCheckpoint: this.globalCheckpoint,
      };
    }

    if (cp.globalPosition < 0) {
      return {
        valid: false,
        reason: `Negative global position in checkpoint for ${projectionName}: ${cp.globalPosition}`,
        checkpoint: cp,
        globalCheckpoint: this.globalCheckpoint,
      };
    }

    return {
      valid: true,
      reason: null,
      checkpoint: cp,
      globalCheckpoint: this.globalCheckpoint,
    };
  }

  async getAllProjections(): Promise<string[]> {
    return Array.from(this.checkpoints.keys());
  }

  async clear(): Promise<void> {
    this.checkpoints.clear();
    this.globalCheckpoint = null;
    this.versionCounter = 0;
  }

  async atomicUpdate(
    projectionName: string,
    update: (current: ProjectionCheckpoint | null) => ProjectionCheckpoint,
  ): Promise<ProjectionCheckpoint> {
    this.versionCounter += 1;
    const current = this.checkpoints.get(projectionName) ?? null;
    const next = update(current);
    const saved: ProjectionCheckpoint = {
      ...next,
      version: this.versionCounter,
      updatedAt: Date.now(),
    };
    this.checkpoints.set(projectionName, saved);

    if (!this.globalCheckpoint || saved.globalPosition > this.globalCheckpoint.globalPosition) {
      this.globalCheckpoint = {
        globalPosition: saved.globalPosition,
        version: this.versionCounter,
        updatedAt: Date.now(),
      };
    }

    return saved;
  }
}
