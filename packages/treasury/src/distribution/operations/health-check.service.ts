import type { EventStore } from "@relcko/event-store";
import type { IDurableProjectionStore } from "../infrastructure/projections/durable/durable-projection-store";
import type { IProjectionCheckpointStore } from "../infrastructure/projections/durable/projection-checkpoint-store";
import type { ITreasuryAdapter } from "../infrastructure/adapters/treasury-adapter.interface";
import type { IPaymentGateway } from "../infrastructure/adapters/payment-gateway.interface";
import type { AuthorizationService } from "../security/authorization.service";
import type { ProjectionReplayService } from "../infrastructure/projections/durable/projection-replay.service";
import type { IClock } from "../infrastructure/services/clock";

export enum HealthState {
  Ready = "ready",
  Live = "live",
  Degraded = "degraded",
  Failed = "failed",
}

export interface HealthCheckResult {
  readonly component: string;
  readonly state: HealthState;
  readonly message: string | null;
  readonly latencyMs: number;
  readonly checkedAt: number;
}

export interface HealthReport {
  readonly overall: HealthState;
  readonly checks: readonly HealthCheckResult[];
  readonly degradedCount: number;
  readonly failedCount: number;
  readonly checkedAt: number;
  readonly durationMs: number;
}

export interface HealthCheckable {
  readonly name: string;
  check(): Promise<HealthCheckResult>;
}

export class ComponentHealthCheck implements HealthCheckable {
  constructor(
    public readonly name: string,
    private readonly checkFn: () => Promise<boolean>,
    private readonly clock: IClock,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const start = this.clock.nowMs();
    try {
      const healthy = await this.checkFn();
      const latencyMs = this.clock.nowMs() - start;
      return {
        component: this.name,
        state: healthy ? HealthState.Ready : HealthState.Failed,
        message: healthy ? null : `${this.name} check returned unhealthy`,
        latencyMs,
        checkedAt: start,
      };
    } catch (err) {
      const latencyMs = this.clock.nowMs() - start;
      return {
        component: this.name,
        state: HealthState.Failed,
        message: `${this.name} check threw: ${err instanceof Error ? err.message : String(err)}`,
        latencyMs,
        checkedAt: start,
      };
    }
  }
}

export class HealthCheckService {
  private readonly _checks = new Map<string, HealthCheckable>();
  private _lastReport: HealthReport | null = null;

  constructor(private readonly clock: IClock) {}

  registerCheck(check: HealthCheckable): void {
    this._checks.set(check.name, check);
  }

  registerEventStoreCheck(eventStore: EventStore): void {
    this.registerCheck(
      new ComponentHealthCheck("event_store", async () => {
        const stream = await eventStore.load("health-check" as never);
        return stream !== null;
      }, this.clock),
    );
  }

  registerProjectionStoreCheck(store: IDurableProjectionStore<{ version: number }>): void {
    this.registerCheck(
      new ComponentHealthCheck("projection_store", async () => {
        const count = await store.count();
        return count >= 0;
      }, this.clock),
    );
  }

  registerCheckpointStoreCheck(store: IProjectionCheckpointStore): void {
    this.registerCheck(
      new ComponentHealthCheck("checkpoint_store", async () => {
        await store.load("health-check");
        return true;
      }, this.clock),
    );
  }

  registerTreasuryAdapterCheck(adapter: ITreasuryAdapter): void {
    this.registerCheck(
      new ComponentHealthCheck("treasury_adapter", async () => {
        await adapter.getBalance("health-check", "USD");
        return true;
      }, this.clock),
    );
  }

  registerPaymentGatewayCheck(gateway: IPaymentGateway): void {
    this.registerCheck(
      new ComponentHealthCheck("payment_gateway", async () => {
        await gateway.getStatus("health-check-tx");
        return true;
      }, this.clock),
    );
  }

  registerAuthorizationServiceCheck(authService: AuthorizationService): void {
    this.registerCheck(
      new ComponentHealthCheck("authorization_service", async () => {
        const actor = { id: "health-check", roles: [] };
        const result = authService.authorize(actor, "" as never);
        return result.granted === false;
      }, this.clock),
    );
  }

  registerReplayServiceCheck(replayService: ProjectionReplayService): void {
    this.registerCheck(
      new ComponentHealthCheck("replay_service", async () => {
        return replayService !== null;
      }, this.clock),
    );
  }

  getCheck(name: string): HealthCheckable | undefined {
    return this._checks.get(name);
  }

  getRegisteredChecks(): readonly string[] {
    return Array.from(this._checks.keys());
  }

  get lastReport(): HealthReport | null {
    return this._lastReport;
  }

  async checkAll(): Promise<HealthReport> {
    const start = this.clock.nowMs();
    const results = await Promise.all(
      Array.from(this._checks.values()).map((c) => c.check()),
    );
    const sorted = [...results].sort((a, b) => a.component.localeCompare(b.component));
    const degradedCount = sorted.filter((r) => r.state === HealthState.Degraded).length;
    const failedCount = sorted.filter((r) => r.state === HealthState.Failed).length;

    let overall: HealthState;
    if (failedCount > 0) overall = HealthState.Failed;
    else if (degradedCount > 0) overall = HealthState.Degraded;
    else overall = HealthState.Ready;

    this._lastReport = {
      overall,
      checks: sorted,
      degradedCount,
      failedCount,
      checkedAt: start,
      durationMs: this.clock.nowMs() - start,
    };

    return this._lastReport;
  }

  async isReady(): Promise<boolean> {
    const report = await this.checkAll();
    return report.overall === HealthState.Ready || report.overall === HealthState.Degraded;
  }

  async isLive(): Promise<boolean> {
    const report = await this.checkAll();
    return report.overall !== HealthState.Failed;
  }
}
