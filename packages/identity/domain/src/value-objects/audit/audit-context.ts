import { ValueObject } from '@relcko/kernel';

export interface AuditContextValues {
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly sessionId?: string;
  readonly location?: string;
}

export class AuditContext extends ValueObject {
  public readonly ipAddress?: string;
  public readonly userAgent?: string;
  public readonly requestId?: string;
  public readonly correlationId?: string;
  public readonly sessionId?: string;
  public readonly location?: string;

  constructor(values: AuditContextValues) {
    super();
    this.ipAddress = values.ipAddress;
    this.userAgent = values.userAgent;
    this.requestId = values.requestId;
    this.correlationId = values.correlationId;
    this.sessionId = values.sessionId;
    this.location = values.location;
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [
      this.ipAddress,
      this.userAgent,
      this.requestId,
      this.correlationId,
      this.sessionId,
      this.location,
    ];
  }

  toJSON(): AuditContextValues {
    return {
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      requestId: this.requestId,
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      location: this.location,
    };
  }
}
