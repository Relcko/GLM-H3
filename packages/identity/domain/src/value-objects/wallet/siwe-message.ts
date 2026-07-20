import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

export interface SiweMessageValues {
  readonly domain: string;
  readonly address: string;
  readonly uri: string;
  readonly version: string;
  readonly chainId: number;
  readonly nonce: string;
  readonly issuedAt: string;
  readonly statement?: string;
  readonly expirationTime?: string;
  readonly notBefore?: string;
  readonly requestId?: string;
  readonly resources?: readonly string[];
}

export class SiweMessage extends ValueObject {
  public readonly domain: string;
  public readonly address: string;
  public readonly uri: string;
  public readonly version: string;
  public readonly chainId: number;
  public readonly nonce: string;
  public readonly issuedAt: string;
  public readonly statement?: string;
  public readonly expirationTime?: string;
  public readonly notBefore?: string;
  public readonly requestId?: string;
  public readonly resources?: readonly string[];

  constructor(values: SiweMessageValues) {
    super();
    if (!values.domain) throw new ValidationError('SiweMessage domain must not be empty');
    if (!values.address) throw new ValidationError('SiweMessage address must not be empty');
    if (!values.uri) throw new ValidationError('SiweMessage uri must not be empty');
    if (!values.version) throw new ValidationError('SiweMessage version must not be empty');
    if (!Number.isInteger(values.chainId) || values.chainId < 1) {
      throw new ValidationError('SiweMessage chainId must be a positive integer');
    }
    if (!values.nonce) throw new ValidationError('SiweMessage nonce must not be empty');
    if (!values.issuedAt) throw new ValidationError('SiweMessage issuedAt must not be empty');

    this.domain = values.domain;
    this.address = values.address;
    this.uri = values.uri;
    this.version = values.version;
    this.chainId = values.chainId;
    this.nonce = values.nonce;
    this.issuedAt = values.issuedAt;
    this.statement = values.statement;
    this.expirationTime = values.expirationTime;
    this.notBefore = values.notBefore;
    this.requestId = values.requestId;
    this.resources = values.resources;
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
      this.statement,
      this.expirationTime,
      this.notBefore,
      this.requestId,
      this.resources,
    ];
  }

  toJSON(): SiweMessageValues {
    return {
      domain: this.domain,
      address: this.address,
      uri: this.uri,
      version: this.version,
      chainId: this.chainId,
      nonce: this.nonce,
      issuedAt: this.issuedAt,
      statement: this.statement,
      expirationTime: this.expirationTime,
      notBefore: this.notBefore,
      requestId: this.requestId,
      resources: this.resources,
    };
  }
}
