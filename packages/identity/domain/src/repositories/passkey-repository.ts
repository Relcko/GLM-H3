import type { Passkey } from '../aggregates';
import type { PasskeyId, UserId } from '../value-objects';
import type { IRepository } from '@relcko/kernel';

export interface IPasskeyRepository extends IRepository<Passkey, PasskeyId> {
  findByUserId(userId: UserId): Promise<readonly Passkey[]>;
  findByCredentialId(credentialId: string): Promise<Passkey | null>;
}
