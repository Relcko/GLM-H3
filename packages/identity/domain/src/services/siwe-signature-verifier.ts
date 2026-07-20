import type { Signature, SiweMessage, WalletAddress } from '../value-objects';

export interface ISiweSignatureVerifier {
  verify(message: SiweMessage, signature: Signature, address: WalletAddress): Promise<boolean>;
}
