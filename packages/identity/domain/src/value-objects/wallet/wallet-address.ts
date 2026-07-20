import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const ETH_ADDRESS_RE = /^0x[0-9a-f]{40}$/i;

export class WalletAddress extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!ETH_ADDRESS_RE.test(value)) {
      throw new ValidationError(`Invalid WalletAddress: ${value}`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
