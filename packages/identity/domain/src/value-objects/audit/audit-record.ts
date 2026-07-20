import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

import type { AuditCategory } from './audit-category';
import type { AuditContext } from './audit-context';

export interface AuditRecordValues {
  readonly category: AuditCategory;
  readonly action: string;
  readonly actorId: string;
  readonly targetId?: string;
  readonly context?: AuditContext;
  readonly outcome: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

export class AuditRecord extends ValueObject {
  public readonly category: AuditCategory;
  public readonly action: string;
  public readonly actorId: string;
  public readonly targetId?: string;
  public readonly context?: AuditContext;
  public readonly outcome: string;
  public readonly timestamp: Date;
  public readonly metadata?: Record<string, unknown>;

  constructor(values: AuditRecordValues) {
    super();
    if (!values.action) throw new ValidationError('AuditRecord action must not be empty');
    if (!values.actorId) throw new ValidationError('AuditRecord actorId must not be empty');
    if (!values.outcome) throw new ValidationError('AuditRecord outcome must not be empty');

    this.category = values.category;
    this.action = values.action;
    this.actorId = values.actorId;
    this.targetId = values.targetId;
    this.context = values.context;
    this.outcome = values.outcome;
    this.timestamp = values.timestamp;
    this.metadata = values.metadata ? { ...values.metadata } : undefined;
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [
      this.category.toString(),
      this.action,
      this.actorId,
      this.targetId,
      this.context?.toJSON(),
      this.outcome,
      this.timestamp.getTime(),
      JSON.stringify(this.metadata),
    ];
  }

  toJSON(): AuditRecordValues {
    return {
      category: this.category,
      action: this.action,
      actorId: this.actorId,
      targetId: this.targetId,
      context: this.context,
      outcome: this.outcome,
      timestamp: this.timestamp,
      metadata: this.metadata ? { ...this.metadata } : undefined,
    };
  }
}
