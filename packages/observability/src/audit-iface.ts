import type { AuditLog } from "@relcko/domain-core";

/**
 * Minimal audit reporting seam used by observability (every privileged action
 * appends an AuditLog). The full writer/reader contract lives in
 * `@relcko/audit-contracts`; this interface lets the observability layer emit
 * without depending on the storage implementation.
 */
export interface AuditReporter {
  report(entry: AuditLog): void | Promise<void>;
}

export class NoopAuditReporter implements AuditReporter {
  report(): void {}
}
