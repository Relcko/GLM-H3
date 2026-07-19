import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

export interface SiweChallengeValues {
  readonly domain: string;
  readonly address: string;
  readonly uri: string;
  readonly version: string;
  readonly chainId: number;
  readonly nonce: string;
  readonly issuedAt: string;
}

export class SiweChallenge extends ValueObject {
  public readonly domain: string;
  public readonly address: string;
  public readonly uri: string;
  public readonly version: string;
  public readonly chainId: number;
  public readonly nonce: string;
  public readonly issuedAt: string;

  constructor(values: SiweChallengeValues) {
    super();
    if (!values.domain) throw new ValidationError('SiweChallenge domain must not be empty');
    if (!values.address) throw new ValidationError('SiweChallenge address must not be empty');
    if (!values.uri) throw new ValidationError('SiweChallenge uri must not be empty');
    if (!values.version) throw new ValidationError('SiweChallenge version must not be empty');
    if (!Number.isInteger(values.chainId) || values.chainId < 1) {
      throw new ValidationError('SiweChallenge chainId must be a positive integer');
    }
    if (!values.nonce) throw new ValidationError('SiweChallenge nonce must not be empty');
    if (!values.issuedAt) throw new ValidationError('SiweChallenge issuedAt must not be empty');

    this.domain = values.domain;
    this.address = values.address;
    this.uri = values.uri;
    this.version = values.version;
    this.chainId = values.chainId;
    this.nonce = values.nonce;
    this.issuedAt = values.issuedAt;
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [
      this.domain,
      this.address,
      this.uri,
      this.version,
      this.chainId,
      this.nonce,
      this.issuedAt,
    ];
  }

  toJSON(): SiweChallengeValues {
    return {
      domain: this.domain,
      address: this.address,
      uri: this.uri,
      version: this.version,
      chainId: this.chainId,
      nonce: this.nonce,
      issuedAt: this.issuedAt,
    };
  }
}
