import type { EmailAddress, UserId } from '../value-objects';

export interface IUserRepository {
  findById(id: UserId): Promise<unknown>;
  getById(id: UserId): Promise<unknown>;
  save(aggregate: unknown): Promise<void>;
  delete(id: UserId): Promise<void>;
  findByEmail(email: EmailAddress): Promise<unknown>;
  existsByEmail(email: EmailAddress): Promise<boolean>;
}
