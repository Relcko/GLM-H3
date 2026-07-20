import type { Logger } from "@relcko/logging";
import { PermissionResolver, type AuthorizationContext } from "@relcko/permission";
import type { EventBus } from "@relcko/events";
import type { EntityId, Json } from "@relcko/types";
import { generateId } from "@relcko/utils";
import { AdministrationAuditService } from "./audit";
import { assertAreaAuthorized } from "./authorization";
import { AdministrationEventType, newAdminCorrelationId, publishAdministrationEvent } from "./events";
import { InMemoryAdministrationRepository } from "./repository";
import type { AdminAction, AdminActivityEntry, AdminActor, AdminArea, AdminResourceContext } from "./types";

export interface AdminDeps {
  readonly permission: PermissionResolver;
  readonly events: EventBus;
  readonly audit: AdministrationAuditService;
  readonly repo: InMemoryAdministrationRepository;
  readonly logger?: Logger;
}

/**
 * Shared base for every administration module. Centralizes the cross-cutting
 * contract required by the mission:
 *   1. authorize via the Permission Engine (never bypassed),
 *   2. publish an immutable audit entry for the action,
 *   3. append to the administrator activity timeline,
 *   4. emit a canonical administration event.
 * Subclasses implement only the orchestration logic that delegates to a port
 * or domain service — no duplicated business rules.
 */
export abstract class BaseAdministration {
  constructor(protected readonly deps: AdminDeps, protected readonly area: AdminArea) {}

  /** Assert the actor may administer this area (throws PermissionError). */
  protected assert(actor: AdminActor, resource: AdminResourceContext = {}, env: AuthorizationContext["env"] = {}): void {
    assertAreaAuthorized(this.deps.permission, actor, this.area, resource, env);
  }

  protected async execute<T>(
    action: AdminAction,
    actor: AdminActor,
    entityId: EntityId,
    fn: () => Promise<T> | T,
    opts: {
      readonly resource?: AdminResourceContext;
      readonly before?: Record<string, Json>;
      readonly after?: Record<string, Json>;
      readonly emitEvent?: boolean;
      readonly env?: AuthorizationContext["env"];
    } = {},
  ): Promise<T> {
    this.assert(actor, opts.resource, opts.env);
    const result = await fn();
    const correlationId = newAdminCorrelationId();
    await this.deps.audit.record({
      actor, action, area: this.area, entityId,
      resource: opts.resource, before: opts.before, after: opts.after,
    });
    this.recordActivity(action, actor, entityId, opts.resource, correlationId);
    if (opts.emitEvent !== false) {
      await publishAdministrationEvent(
        this.deps.events, AdministrationEventType.ActionExecuted, actor.id as EntityId,
        { action, area: this.area, entityId, correlationId } as Json,
        { correlationId, aggregateId: entityId },
      );
    }
    this.deps.logger?.info(`admin action ${action}`, { area: this.area, actorId: actor.id, entityId });
    return result;
  }

  private recordActivity(
    action: AdminAction, actor: AdminActor, entityId: EntityId,
    resource: AdminResourceContext | undefined, correlationId: string,
  ): void {
    const entry: AdminActivityEntry = {
      id: generateId("act") as EntityId,
      action, actorId: actor.id as EntityId,
      entityType: resource?.entityType, entityId,
      message: `${action} by ${actor.id} on ${entityId}`,
      correlationId, occurredAt: new Date().toISOString(),
    };
    this.deps.repo.saveActivity(entry);
  }
}
