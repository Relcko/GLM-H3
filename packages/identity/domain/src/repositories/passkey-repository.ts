import type { PasskeyId, UserId } from '../value-objects';

export interface IPasskeyRepository {
  findById(id: PasskeyId): Promise<unknown>;
  getById(id: PasskeyId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: PasskeyId): Promise<void>;
  findByUserId(userId: UserId): Promise<readonly unknown[]>;
  findByCredentialId(credentialId: string): Promise<unknown>;
}
