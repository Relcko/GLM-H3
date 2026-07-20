import type { HashAlgorithm, HashParameters } from '../value-objects';

export interface IPasswordHashingService {
  hash(plaintext: string, algorithm?: HashAlgorithm, params?: HashParameters): Promise<string>;
  verify(plaintext: string, hash: string): Promise<boolean>;
  needsRehash(hash: string, algorithm?: HashAlgorithm, params?: HashParameters): boolean;
}
