import type { PasskeyId, UserId } from '../value-objects';

export interface RegisterPasskeyCommand {
  readonly userId: UserId;
  readonly name: string;
  readonly publicKey: string;
  readonly credentialId: string;
  readonly transports?: readonly string[];
}

export interface RemovePasskeyCommand {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
}
