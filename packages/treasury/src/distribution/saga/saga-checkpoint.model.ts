import type { SagaId } from "../domain/value-objects";
import type { SagaStateData } from "./saga-state.model";

export class SagaCheckpoint {
  constructor(
    public readonly sagaId: SagaId,
    public readonly stateData: SagaStateData,
    public readonly globalPosition: number,
    public readonly createdAt: Date,
  ) {}
}
