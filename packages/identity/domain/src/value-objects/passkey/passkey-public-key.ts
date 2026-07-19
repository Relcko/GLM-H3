import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const HEX_RE = /^[0-9a-f]+$/i;

export class PasskeyPublicKey extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value) {
      throw new ValidationError('PasskeyPublicKey must not be empty');
    }
    if (!BASE64URL_RE.test(value) && !HEX_RE.test(value)) {
      throw new ValidationError('PasskeyPublicKey must be base64url or hex encoded');
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
