import type { EntityId, Json } from "@relcko/types";
import { BaseAdministration, type AdminDeps } from "./base";
import type { DomainAdminPort, DomainRegistry } from "./ports";
import type { AdminAction, AdminActor, AdminResult, AdminArea, AdminResourceContext } from "./types";
import { AdministrationValidationError } from "./errors";

function ok<T>(action: AdminAction, actor: AdminActor, data: T, entityId?: EntityId, entityType?: AdminResourceContext["entityType"]): AdminResult<T> {
  return { success: true, data, action, actorId: actor.id, entityId, entityType, occurredAt: new Date().toISOString() };
}

abstract class PortBackedAdministration extends BaseAdministration {
  constructor(deps: AdminDeps, area: AdminArea, protected readonly port: DomainAdminPort | undefined) {
    super(deps, area);
  }
  protected requirePort(): DomainAdminPort {
    if (!this.port) throw new AdministrationValidationError(`${this.area} administration is not wired to a domain adapter`);
    return this.port;
  }
}

// ---------------------------------------------------------------------------
// Identity / access administration
// ---------------------------------------------------------------------------

export class UserAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "user", port); }
  list(actor: AdminActor) { this.assert(actor); return this.requirePort().list(); }
  get(actor: AdminActor, userId: EntityId) { this.assert(actor); return this.requirePort().get(userId); }
  async suspend(actor: AdminActor, userId: EntityId, reason: string) {
    return this.execute("admin.user.suspend", actor, userId, async () => {
      await this.requirePort().setEnabled(userId, false, reason);
      return ok("admin.user.suspend", actor, { userId, reason }, userId);
    }, { after: { reason } });
  }
  async reinstate(actor: AdminActor, userId: EntityId, reason: string) {
    return this.execute("admin.user.reinstate", actor, userId, async () => {
      await this.requirePort().setEnabled(userId, true, reason);
      return ok("admin.user.reinstate", actor, { userId, reason }, userId);
    }, { after: { reason } });
  }
}

export class RoleAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "role", port); }
  async assign(actor: AdminActor, userId: EntityId, role: Json, reason: string) {
    return this.execute("admin.role.assign", actor, userId, async () => {
      await this.requirePort().update(userId, { role }, reason);
      return ok("admin.role.assign", actor, { userId, role, reason }, userId);
    }, { after: { role, reason } });
  }
  async revoke(actor: AdminActor, userId: EntityId, reason: string) {
    return this.execute("admin.role.revoke", actor, userId, async () => {
      await this.requirePort().update(userId, { role: null }, reason);
      return ok("admin.role.revoke", actor, { userId, reason }, userId);
    }, { after: { reason } });
  }
}

export class PermissionAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "permission", port); }
  async grant(actor: AdminActor, subjectId: EntityId, permission: string, scope: string, reason: string) {
    return this.execute("admin.permission.grant", actor, subjectId, async () => {
      await this.requirePort().update(subjectId, { permission, scope }, reason);
      return ok("admin.permission.grant", actor, { subjectId, permission, scope, reason }, subjectId);
    }, { after: { permission, scope, reason } });
  }
  async revoke(actor: AdminActor, subjectId: EntityId, permission: string, reason: string) {
    return this.execute("admin.permission.revoke", actor, subjectId, async () => {
      await this.requirePort().update(subjectId, { permission: null }, reason);
      return ok("admin.permission.revoke", actor, { subjectId, permission, reason }, subjectId);
    }, { after: { permission, reason } });
  }
}

export class AgentAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "agent", port); }
  async approve(actor: AdminActor, agentId: EntityId, reason: string) {
    return this.execute("admin.agent.approve", actor, agentId, async () => {
      await this.requirePort().setEnabled(agentId, true, reason);
      return ok("admin.agent.approve", actor, { agentId, reason }, agentId);
    }, { after: { reason } });
  }
  async reject(actor: AdminActor, agentId: EntityId, reason: string) {
    return this.execute("admin.agent.reject", actor, agentId, async () => {
      await this.requirePort().update(agentId, { status: "rejected" }, reason);
      return ok("admin.agent.reject", actor, { agentId, reason }, agentId);
    }, { after: { reason } });
  }
  async suspend(actor: AdminActor, agentId: EntityId, reason: string) {
    return this.execute("admin.agent.suspend", actor, agentId, async () => {
      await this.requirePort().setEnabled(agentId, false, reason);
      return ok("admin.agent.suspend", actor, { agentId, reason }, agentId);
    }, { after: { reason } });
  }
}

// ---------------------------------------------------------------------------
// Marketplace / property / investment / nft / portfolio
// ---------------------------------------------------------------------------

export class MarketplaceAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "marketplace", port); }
  async updateListing(actor: AdminActor, listingId: EntityId, patch: Record<string, Json>, reason: string) {
    return this.execute("admin.marketplace.listing.update", actor, listingId, async () => {
      await this.requirePort().update(listingId, patch, reason);
      return ok("admin.marketplace.listing.update", actor, { listingId }, listingId);
    }, { after: { reason, ...patch } });
  }
  async removeListing(actor: AdminActor, listingId: EntityId, reason: string) {
    return this.execute("admin.marketplace.listing.remove", actor, listingId, async () => {
      await this.requirePort().setEnabled(listingId, false, reason);
      return ok("admin.marketplace.listing.remove", actor, { listingId, reason }, listingId);
    }, { after: { reason } });
  }
  async flag(actor: AdminActor, listingId: EntityId, reason: string) {
    return this.execute("admin.marketplace.flag", actor, listingId, async () => {
      await this.requirePort().flag(listingId, reason);
      return ok("admin.marketplace.flag", actor, { listingId, reason }, listingId);
    }, { after: { reason } });
  }
}

export class PropertyAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "property", port); }
  async publish(actor: AdminActor, propertyId: EntityId, reason: string) {
    return this.execute("admin.property.publish", actor, propertyId, async () => {
      await this.requirePort().setEnabled(propertyId, true, reason);
      return ok("admin.property.publish", actor, { propertyId, reason }, propertyId);
    }, { resource: { entityType: "property" }, after: { reason } });
  }
  async unpublish(actor: AdminActor, propertyId: EntityId, reason: string) {
    return this.execute("admin.property.unpublish", actor, propertyId, async () => {
      await this.requirePort().setEnabled(propertyId, false, reason);
      return ok("admin.property.unpublish", actor, { propertyId, reason }, propertyId);
    }, { resource: { entityType: "property" }, after: { reason } });
  }
  async update(actor: AdminActor, propertyId: EntityId, patch: Record<string, Json>, reason: string) {
    return this.execute("admin.property.update", actor, propertyId, async () => {
      await this.requirePort().update(propertyId, patch, reason);
      return ok("admin.property.update", actor, { propertyId }, propertyId);
    }, { resource: { entityType: "property" }, after: { reason, ...patch } });
  }
}

export class InvestmentAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "investment", port); }
  async flag(actor: AdminActor, investmentId: EntityId, reason: string) {
    return this.execute("admin.investment.flag", actor, investmentId, async () => {
      await this.requirePort().flag(investmentId, reason);
      return ok("admin.investment.flag", actor, { investmentId, reason }, investmentId);
    }, { resource: { entityType: "investment" }, after: { reason } });
  }
  async refund(actor: AdminActor, investmentId: EntityId, reason: string) {
    return this.execute("admin.investment.refund", actor, investmentId, async () => {
      await this.requirePort().update(investmentId, { status: "refunded" }, reason);
      return ok("admin.investment.refund", actor, { investmentId, reason }, investmentId);
    }, { resource: { entityType: "investment" }, after: { reason } });
  }
}

export class NftAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "nft", port); }
  async reviewMint(actor: AdminActor, mintId: EntityId, approved: boolean, reason: string) {
    return this.execute("admin.nft.mint.review", actor, mintId, async () => {
      await this.requirePort().setEnabled(mintId, approved, reason);
      return ok("admin.nft.mint.review", actor, { mintId, approved, reason }, mintId);
    }, { after: { approved, reason } });
  }
  async flagTransfer(actor: AdminActor, transferId: EntityId, reason: string) {
    return this.execute("admin.nft.transfer.flag", actor, transferId, async () => {
      await this.requirePort().flag(transferId, reason);
      return ok("admin.nft.transfer.flag", actor, { transferId, reason }, transferId);
    }, { after: { reason } });
  }
}

export class PortfolioAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "portfolio", port); }
  async rebalance(actor: AdminActor, portfolioId: EntityId, strategy: Json, reason: string) {
    return this.execute("admin.portfolio.rebalance", actor, portfolioId, async () => {
      await this.requirePort().update(portfolioId, { strategy }, reason);
      return ok("admin.portfolio.rebalance", actor, { portfolioId, reason }, portfolioId);
    }, { after: { strategy, reason } });
  }
  async flag(actor: AdminActor, portfolioId: EntityId, reason: string) {
    return this.execute("admin.portfolio.flag", actor, portfolioId, async () => {
      await this.requirePort().flag(portfolioId, reason);
      return ok("admin.portfolio.flag", actor, { portfolioId, reason }, portfolioId);
    }, { after: { reason } });
  }
}

// ---------------------------------------------------------------------------
// Treasury / governance / ai
// ---------------------------------------------------------------------------

export class TreasuryAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "treasury", port); }
  async reviewTransfer(actor: AdminActor, transferId: EntityId, approved: boolean, reason: string) {
    return this.execute("admin.treasury.transfer.review", actor, transferId, async () => {
      await this.requirePort().update(transferId, { status: approved ? "approved" : "rejected" }, reason);
      return ok("admin.treasury.transfer.review", actor, { transferId, approved, reason }, transferId);
    }, { after: { approved, reason }, env: { secondApproverPresent: true } });
  }
  async pause(actor: AdminActor, reason: string) {
    return this.execute("admin.treasury.pause", actor, "treasury" as EntityId, async () => {
      await this.requirePort().update("treasury" as EntityId, { status: "paused" }, reason);
      return ok("admin.treasury.pause", actor, { reason });
    }, { after: { reason }, env: { secondApproverPresent: true } });
  }
}

export class GovernanceAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "governance", port); }
  async flagProposal(actor: AdminActor, proposalId: EntityId, reason: string) {
    return this.execute("admin.governance.proposal.flag", actor, proposalId, async () => {
      await this.requirePort().flag(proposalId, reason);
      return ok("admin.governance.proposal.flag", actor, { proposalId, reason }, proposalId);
    }, { after: { reason } });
  }
  async holdExecution(actor: AdminActor, proposalId: EntityId, reason: string) {
    return this.execute("admin.governance.execution.hold", actor, proposalId, async () => {
      await this.requirePort().update(proposalId, { execution: "held" }, reason);
      return ok("admin.governance.execution.hold", actor, { proposalId, reason }, proposalId);
    }, { after: { reason }, env: { secondApproverPresent: true } });
  }
}

export class AiAdministration extends PortBackedAdministration {
  constructor(deps: AdminDeps, port?: DomainAdminPort) { super(deps, "ai", port); }
  async disableModel(actor: AdminActor, modelId: EntityId, reason: string) {
    return this.execute("admin.ai.model.disable", actor, modelId, async () => {
      await this.requirePort().setEnabled(modelId, false, reason);
      return ok("admin.ai.model.disable", actor, { modelId, reason }, modelId);
    }, { after: { reason } });
  }
  async reviewPrompt(actor: AdminActor, promptId: EntityId, approved: boolean, reason: string) {
    return this.execute("admin.ai.prompt.review", actor, promptId, async () => {
      await this.requirePort().update(promptId, { approved }, reason);
      return ok("admin.ai.prompt.review", actor, { promptId, approved, reason }, promptId);
    }, { after: { approved, reason } });
  }
}

export function buildDomainAdministration(deps: AdminDeps, registry: DomainRegistry): DomainAdministrationBundle {
  return {
    user: new UserAdministration(deps, registry.user),
    role: new RoleAdministration(deps, registry.role),
    permission: new PermissionAdministration(deps, registry.permission),
    agent: new AgentAdministration(deps, registry.agent),
    marketplace: new MarketplaceAdministration(deps, registry.marketplace),
    property: new PropertyAdministration(deps, registry.property),
    investment: new InvestmentAdministration(deps, registry.investment),
    nft: new NftAdministration(deps, registry.nft),
    portfolio: new PortfolioAdministration(deps, registry.portfolio),
    treasury: new TreasuryAdministration(deps, registry.treasury),
    governance: new GovernanceAdministration(deps, registry.governance),
    ai: new AiAdministration(deps, registry.ai),
  };
}

export interface DomainAdministrationBundle {
  readonly user: UserAdministration;
  readonly role: RoleAdministration;
  readonly permission: PermissionAdministration;
  readonly agent: AgentAdministration;
  readonly marketplace: MarketplaceAdministration;
  readonly property: PropertyAdministration;
  readonly investment: InvestmentAdministration;
  readonly nft: NftAdministration;
  readonly portfolio: PortfolioAdministration;
  readonly treasury: TreasuryAdministration;
  readonly governance: GovernanceAdministration;
  readonly ai: AiAdministration;
}


