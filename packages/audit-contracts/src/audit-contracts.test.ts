import { describe, expect, it } from "vitest";
import { createAuditLog } from "@relcko/domain-core";
import { createInMemoryAuditStore, redactAudit } from "@relcko/audit-contracts";

describe("audit contracts", () => {
  it("writes and queries audit entries by actor/entity", async () => {
    const store = createInMemoryAuditStore();
    const log = createAuditLog({
      actorId: "admin_1" as never, action: "role_changed", entityType: "agent",
      entityId: "agent_1" as never, before: { status: "pending" }, after: { status: "active" },
    });
    await store.write(log);
    const byActor = await store.query({ actorId: "admin_1" as never });
    expect(byActor).toHaveLength(1);
    const byEntity = await store.query({ entityType: "agent" });
    expect(byEntity[0].action).toBe("role_changed");
  });

  it("redacts sensitive fields for PII minimization", () => {
    const log = createAuditLog({
      actorId: "a" as never, action: "x", entityType: "kyc", entityId: "e" as never,
      before: { ssn: "123" }, after: { ssn: "456" },
    });
    const redacted = redactAudit(log, ["ssn"]);
    expect(redacted.before?.["ssn"]).toBeUndefined();
  });
});
