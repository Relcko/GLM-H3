import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const ALLOWED = ['usb', 'nfc', 'ble', 'internal', 'hybrid'] as const;

export class WebAuthnTransport extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!(ALLOWED as readonly string[]).includes(value)) {
      throw new ValidationError(
        `Invalid WebAuthnTransport: ${value}. Must be one of: ${ALLOWED.join(', ')}`,
      );
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
