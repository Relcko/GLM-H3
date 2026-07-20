import type { DecisionId, UserId } from '../value-objects';

export interface IPolicyDecisionRepository {
  findById(id: DecisionId): Promise<unknown>;
  getById(id: DecisionId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: DecisionId): Promise<void>;
  findByUserId(userId: UserId): Promise<readonly unknown[]>;
}
