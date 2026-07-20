import type { SecretReference } from '../value-objects';

export interface ISecretStore {
  store(key: string, value: string): Promise<SecretReference>;
  retrieve(reference: SecretReference): Promise<string | null>;
  revoke(reference: SecretReference): Promise<void>;
  rotate(reference: SecretReference, newValue: string): Promise<SecretReference>;
}
