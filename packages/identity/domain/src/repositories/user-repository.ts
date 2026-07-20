import type { User } from '../aggregates';
import type { EmailAddress, UserId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IUserRepository extends IRepository<User, UserId> {
  findByEmail(email: EmailAddress): Promise<User | null>;
  existsByEmail(email: EmailAddress): Promise<boolean>;
}
