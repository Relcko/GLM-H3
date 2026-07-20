import type { EntityId } from "@relcko/types";
import type { Json } from "@relcko/types";
import { asCorrelationId, asTraceId } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus, RelckoEventEnvelope } from "@relcko/events";
import { generateCorrelationId, generateTraceId } from "@relcko/utils";

/**
 * Canonical identity events. Per the mission, EVERY identity action publishes
 * a canonical event through the SHARED event bus — no new event infrastructure.
 * `source` is pinned so subscribers can route identity traffic.
 */
export enum IdentityEventType {
  Login = "identity.login",
  Logout = "identity.logout",
  WalletLinked = "identity.wallet.linked",
  WalletRemoved = "identity.wallet.removed",
  EmailLinked = "identity.email.linked",
  ProfileUpdated = "identity.profile.updated",
  SessionExpired = "identity.session.expired",
  PermissionChanged = "identity.permission.changed",
  MfaVerified = "identity.mfa.verified",
}

export interface PublishIdentityEventInput {
  type: IdentityEventType;
  aggregateId: EntityId;
  actorId: EntityId;
  payload: Record<string, Json>;
  correlationId?: string;
  traceId?: string;
  idempotencyKey?: string;
}

export async function publishIdentityEvent(
  bus: EventBus,
  input: PublishIdentityEventInput,
): Promise<RelckoEventEnvelope> {
  const envelope = createEnvelope({
    type: input.type,
    aggregateId: input.aggregateId,
    actorId: input.actorId,
    payload: input.payload,
    correlationId: input.correlationId ?? generateCorrelationId(),
    traceId: input.traceId ?? generateTraceId(),
    idempotencyKey: input.idempotencyKey,
    source: "relcko.identity",
  });
  await bus.publish(envelope);
  return envelope;
}
