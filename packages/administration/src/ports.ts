import type { EntityId, Json } from "@relcko/types";
import type { AdminArea } from "./types";

/**
 * Uniform admin-facing read/mutate surface for a domain. This is the
 * integration seam: in production each port is satisfied by an adapter that
 * wraps the real domain package (Treasury, Governance, Marketplace, ...).
 * The administration package never re-implements business logic — it only
 * authorizes, audits, observes, and delegates through these ports.
 */
export interface AdminEntitySummary {
  readonly id: EntityId;
  readonly label: string;
  readonly status: string;
  readonly details?: Readonly<Record<string, Json>>;
}

export interface DomainAdminPort {
  readonly area: AdminArea;
  list(filter?: Record<string, Json>): Promise<readonly AdminEntitySummary[]>;
  get(id: EntityId): Promise<AdminEntitySummary | undefined>;
  update(id: EntityId, patch: Record<string, Json>, reason: string): Promise<AdminEntitySummary>;
  flag(id: EntityId, reason: string): Promise<void>;
  setEnabled(id: EntityId, enabled: boolean, reason: string): Promise<AdminEntitySummary>;
}

export type DomainRegistry = Readonly<Partial<Record<AdminArea, DomainAdminPort>>>;

/** In-memory reference adapter used as a default/stand-in for a domain port. */
export class InMemoryDomainAdminPort implements DomainAdminPort {
  private readonly store = new Map<string, AdminEntitySummary>();
  constructor(public readonly area: AdminArea, seed: readonly AdminEntitySummary[] = []) {
    for (const s of seed) this.store.set(s.id, s);
  }
  private clone(s: AdminEntitySummary): AdminEntitySummary { return { ...s, details: s.details ? { ...s.details } : undefined }; }
  async list(filter?: Record<string, Json>): Promise<readonly AdminEntitySummary[]> {
    let items = [...this.store.values()].map(s => this.clone(s));
    if (filter?.status) items = items.filter(v => v.status === filter.status);
    if (filter?.label) items = items.filter(v => v.label.toLowerCase().includes(String(filter.label).toLowerCase()));
    return items;
  }
  async get(id: EntityId): Promise<AdminEntitySummary | undefined> {
    const s = this.store.get(id);
    return s ? this.clone(s) : undefined;
  }
  async update(id: EntityId, patch: Record<string, Json>, _reason: string): Promise<AdminEntitySummary> {
    const current = this.store.get(id);
    if (!current) throw new Error(`${this.area} entity ${id} not found`);
    const next: AdminEntitySummary = {
      ...current,
      label: typeof patch.label === "string" ? patch.label : current.label,
      status: typeof patch.status === "string" ? patch.status : current.status,
      details: { ...current.details, ...patch },
    };
    this.store.set(id, next);
    return this.clone(next);
  }
  async flag(id: EntityId, _reason: string): Promise<void> {
    const current = this.store.get(id);
    if (!current) throw new Error(`${this.area} entity ${id} not found`);
    this.store.set(id, { ...current, status: "flagged", details: { ...current.details, flagged: true } });
  }
  async setEnabled(id: EntityId, enabled: boolean, _reason: string): Promise<AdminEntitySummary> {
    const current = this.store.get(id);
    if (!current) throw new Error(`${this.area} entity ${id} not found`);
    const next: AdminEntitySummary = { ...current, status: enabled ? "active" : "disabled", details: { ...current.details, enabled } };
    this.store.set(id, next);
    return this.clone(next);
  }
}
