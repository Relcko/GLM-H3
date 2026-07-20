import type { ChainId, Nonce, SiweMessage, WalletAddress } from '../value-objects';

export interface ISiweMessageBuilder {
  build(
    address: WalletAddress,
    chainId: ChainId,
    nonce: Nonce,
    options?: { domain?: string; uri?: string; statement?: string },
  ): SiweMessage;
}
