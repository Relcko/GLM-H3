export type { Projection } from './projection';
export { InMemoryCheckpointStore } from './checkpoint';
export type { CheckpointStore, ProjectionCheckpoint } from './checkpoint';
export { ProjectionManager } from './projection-manager';
export type { CatchUpOptions, CatchUpResult, ProjectionManagerDeps } from './projection-manager';
export { ProjectionAlreadyRegisteredError, ProjectionNotFoundError } from './errors';
