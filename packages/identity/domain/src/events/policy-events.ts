import { EventCatalog } from './event-catalog';

import type { DecisionId, UserId } from '../value-objects';

export interface PolicyEvaluatedPayload {
  readonly decisionId: DecisionId;
  readonly userId: UserId;
  readonly resource: string;
  readonly action: string;
  readonly effect: string;
  readonly evaluatedAt: Date;
  readonly policies: readonly string[];
}

export const PolicyEventTypeMap = {
  evaluated: EventCatalog.POLICY_EVALUATED,
} as const;
