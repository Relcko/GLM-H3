import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { OverrideRoute } from "../types";
import { OverrideRouteStatus, ActiveStatusValue } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError, OverrideRoutingError } from "../errors";
import { TreeTraversalEngine } from "../tree-traversal/service";

export class OverrideRoutingEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly traversal: TreeTraversalEngine,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  resolveOverrideRoute(actorId: EntityId, fromAgentId: EntityId, commissionRate: number): OverrideRoute {
    const fromAgent = this.repository.getAgent(fromAgentId);
    if (!fromAgent) throw new AgentNotFoundError(fromAgentId as string);

    const compressedUpline = this.traversal.compressUpline(fromAgentId);
    const nearestActive = compressedUpline.length > 0 ? compressedUpline[0] : undefined;

    if (!nearestActive) {
      throw new OverrideRoutingError(`No active upline found for agent ${fromAgentId}`);
    }

    const route: OverrideRoute = {
      id: generateId("ovrroute") as EntityId,
      agentId: nearestActive.agentId,
      fromAgentId,
      uplineAgentId: nearestActive.agentId,
      routeLevel: nearestActive.depth,
      status: OverrideRouteStatus.Active,
      commissionRate,
      activeAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.repository.saveOverrideRoute(route);

    publishNetworkEvent(this.events, NetworkEventType.OverrideRouteCreated, route.id, actorId, {
      routeId: route.id as string,
      fromAgentId: fromAgentId as string,
      uplineAgentId: nearestActive.agentId as string,
      commissionRate,
    });

    this.logger?.info("override route created", { fromAgentId, uplineAgentId: nearestActive.agentId });

    return route;
  }

  expireRoute(actorId: EntityId, routeId: EntityId): OverrideRoute {
    const route = this.repository.getOverrideRoute(routeId);
    if (!route) throw new OverrideRoutingError(`Route ${routeId} not found`);

    const expired: OverrideRoute = { ...route, status: OverrideRouteStatus.Expired, expiresAt: new Date().toISOString() };
    this.repository.saveOverrideRoute(expired);

    publishNetworkEvent(this.events, NetworkEventType.OverrideRouteExpired, routeId, actorId, {
      routeId: routeId as string,
    });

    return expired;
  }

  recoverRoute(actorId: EntityId, routeId: EntityId): OverrideRoute {
    const route = this.repository.getOverrideRoute(routeId);
    if (!route) throw new OverrideRoutingError(`Route ${routeId} not found`);
    if (route.status !== OverrideRouteStatus.Expired) {
      throw new OverrideRoutingError(`Route ${routeId} is not expired`);
    }

    const recovered: OverrideRoute = {
      ...route,
      status: OverrideRouteStatus.Recovered,
      recoveredAt: new Date().toISOString(),
    };
    this.repository.saveOverrideRoute(recovered);

    publishNetworkEvent(this.events, NetworkEventType.OverrideRouteRecovered, routeId, actorId, {
      routeId: routeId as string,
    });

    return recovered;
  }

  listByAgent(agentId: EntityId): OverrideRoute[] {
    return this.repository.listOverrideRoutesByAgent(agentId);
  }

  listByUpline(uplineAgentId: EntityId): OverrideRoute[] {
    return this.repository.listOverrideRoutesByUpline(uplineAgentId);
  }

  listActive(): OverrideRoute[] {
    return this.repository.listActiveOverrideRoutes();
  }
}
