import type { AuditCategory, UserId } from '../value-objects';

export interface ListAuditRecordsQuery {
  readonly userId?: UserId;
  readonly category?: AuditCategory;
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly offset?: number;
  readonly limit?: number;
}
