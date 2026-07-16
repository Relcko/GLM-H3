import type { AuditStore, AuditLog, EntityType } from "@relcko/audit-contracts";
import { generateId } from "@relcko/utils";
import type { EntityId, Json } from "@relcko/types";
import type { AdminAction, AdminActor, AdminArea, AdminResourceContext } from "./types";

/** Map an administration area to the nearest domain-core entity type for the audit record. */
const AREA_ENTITY: Readonly<Record<AdminArea, EntityType>> = {
  user: "agent", role: "agent", permission: "agent", agent: "agent",
  marketplace: "marketplace_sale", property: "property", investment: "investment",
  nft: "ownership", portfolio: "ownership", treasury: "payment", governance: "document",
  ai: "document", compliance: "document", kyc: "kyc", aml: "document", document: "document",
  audit: "document", operations: "document", notification: "document", configuration: "document",
  feature_flag: "document", emergency: "document", maintenance: "document", backup: "document",
  job: "document", announcement: "document", search: "document",
};

export interface AdminAuditInput {
  readonly actor: AdminActor;
  readonly action: AdminAction;
  readonly area: AdminArea;
  readonly entityId: EntityId;
  readonly resource?: AdminResourceContext;
  readonly before?: Record<string, Json>;
  readonly after?: Record<string, Json>;
  readonly ip?: string;
  readonly userAgent?: string;
}

/**
 * Writes immutable audit entries for every administrative action, reusing the
 * shared AuditStore (append-only). The canonical admin action + area are
 * embedded in `metadata` so the audit record is fully queryable while keeping
 * the domain-core entity type valid.
 */
export class AdministrationAuditService {
  constructor(private readonly audit: AuditStore) {}

  async record(input: AdminAuditInput): Promise<AuditLog> {
    const entry: AuditLog = {
      id: generateId("audit") as EntityId,
      actorId: input.actor.id as EntityId,
      action: input.action,
      entityType: AREA_ENTITY[input.area],
      entityId: input.entityId as EntityId,
      before: input.before,
      after: {
        ...input.after,
        area: input.area,
        adminAction: input.action,
        jurisdiction: input.resource?.jurisdiction,
      },
      ip: input.ip,
      userAgent: input.userAgent,
      timestamp: new Date().toISOString(),
    };
    await this.audit.write(entry);
    return entry;
  }
}
