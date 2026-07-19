import { EventCatalog } from './event-catalog';

import type { PasskeyId, UserId } from '../value-objects';

export interface PasskeyRegisteredPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly name: string;
  readonly registeredAt: Date;
}

export interface PasskeyRemovedPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly removedAt: Date;
}

export const PasskeyEventTypeMap = {
  registered: EventCatalog.PASSKEY_REGISTERED,
  removed: EventCatalog.PASSKEY_REMOVED,
} as const;
