import type { HealthCheckService, HealthReport } from "./health-check.service";
import type { MetricsExporter, MetricSnapshot } from "./metrics-exporter";
import type { DeadLetterQueue } from "./dead-letter-queue";
import type { LifecycleManager, LifecycleReport } from "./lifecycle-manager";
import type { OperationLogger } from "./operation-logger";

export interface DiagnosticReport {
  readonly generatedAt: number;
  readonly system: SystemSummary;
  readonly health: HealthReport | null;
  readonly projections: ProjectionStatus;
  readonly replays: ReplayStatus;
  readonly checkpoints: CheckpointStatus;
  readonly queues: QueueStatistics;
  readonly batches: BatchStatistics;
  readonly payments: PaymentStatistics;
  readonly security: SecurityStatistics;
  readonly deadLetter: DeadLetterStatistics;
  readonly lifecycle: LifecycleReport | null;
  readonly recommendations: readonly RecoveryRecommendation[];
}

export interface SystemSummary {
  readonly uptimeMs: number;
  readonly version: string;
  readonly phase: string;
  readonly healthy: boolean;
  readonly activeWorkers: number;
}

export interface ProjectionStatus {
  readonly totalRegistered: number;
  readonly healthyCount: number;
  readonly degradedCount: number;
  readonly failedCount: number;
}

export interface ReplayStatus {
  readonly lastReplayAt: number | null;
  readonly totalEventsReplayed: number;
  readonly inProgress: boolean;
}

export interface CheckpointStatus {
  readonly totalCheckpoints: number;
  readonly oldestCheckpointAgeMs: number | null;
  readonly corruptedCount: number;
}

export interface QueueStatistics {
  readonly deadLetterCount: number;
  readonly poisonCount: number;
  readonly pendingWrites: number;
}

export interface BatchStatistics {
  readonly totalBatchesProcessed: number;
  readonly totalItemsProcessed: number;
  readonly currentBatchSize: number;
  readonly successRate: number;
}

export interface PaymentStatistics {
  readonly totalPayments: number;
  readonly successfulPayments: number;
  readonly failedPayments: number;
  readonly retriedPayments: number;
  readonly timeoutCount: number;
}

export interface SecurityStatistics {
  readonly totalAuthorizations: number;
  readonly grantedCount: number;
  readonly deniedCount: number;
  readonly reservationCount: number;
  readonly approvalCount: number;
}

export interface DeadLetterStatistics {
  readonly totalEntries: number;
  readonly poisonEntries: number;
  readonly uniqueProjections: readonly string[];
  readonly uniqueEventTypes: readonly string[];
}

export interface RecoveryRecommendation {
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly component: string;
  readonly message: string;
  readonly action: string;
}

export class DiagnosticService {
  constructor(
    private readonly healthService: HealthCheckService,
    private readonly metricsExporter: MetricsExporter,
    private readonly deadLetterQueue: DeadLetterQueue,
    private readonly lifecycleManager: LifecycleManager,
    private readonly logger: OperationLogger,
    private readonly clock: { nowMs: () => number },
  ) {}

  generateReport(): DiagnosticReport {
    const generatedAt = this.clock.nowMs();
    const lifecycle = this.lifecycleManager.getReport();

    const system: SystemSummary = {
      uptimeMs: lifecycle.uptimeMs,
      version: "1.0.0",
      phase: lifecycle.phase,
      healthy: lifecycle.healthy,
      activeWorkers: 0,
    };

    const health = this.healthService.lastReport;

    const projections = this.getProjectionStatus(health);
    const replays: ReplayStatus = {
      lastReplayAt: null,
      totalEventsReplayed: 0,
      inProgress: false,
    };
    const checkpoints = this.getCheckpointStatus(health);
    const queues: QueueStatistics = {
      deadLetterCount: this.deadLetterQueue.entryCount,
      poisonCount: this.deadLetterQueue.poisonEntryCount,
      pendingWrites: 0,
    };
    const batches: BatchStatistics = {
      totalBatchesProcessed: this.getMetricValue("batch_processed"),
      totalItemsProcessed: this.getMetricValue("items_processed"),
      currentBatchSize: this.getMetricValue("batch_size"),
      successRate: this.computeSuccessRate(),
    };
    const payments: PaymentStatistics = {
      totalPayments: this.getMetricValue("payment_total"),
      successfulPayments: this.getMetricValue("payment_success"),
      failedPayments: this.getMetricValue("payment_failed"),
      retriedPayments: this.getMetricValue("payment_retried"),
      timeoutCount: this.getMetricValue("payment_timeout"),
    };
    const security: SecurityStatistics = {
      totalAuthorizations: this.getMetricValue("auth_total"),
      grantedCount: this.getMetricValue("auth_granted"),
      deniedCount: this.getMetricValue("auth_denied"),
      reservationCount: this.getMetricValue("reservation_total"),
      approvalCount: this.getMetricValue("approval_total"),
    };
    const deadLetter: DeadLetterStatistics = {
      totalEntries: this.deadLetterQueue.entryCount,
      poisonEntries: this.deadLetterQueue.poisonEntryCount,
      uniqueProjections: this.getUniqueProjections(),
      uniqueEventTypes: this.getUniqueEventTypes(),
    };

    const recommendations = this.generateRecommendations(
      health,
      queues,
      payments,
      security,
      deadLetter,
    );

    return {
      generatedAt,
      system,
      health,
      projections,
      replays,
      checkpoints,
      queues,
      batches,
      payments,
      security,
      deadLetter,
      lifecycle,
      recommendations,
    };
  }

  private getProjectionStatus(health: HealthReport | null): ProjectionStatus {
    if (!health) {
      return { totalRegistered: 0, healthyCount: 0, degradedCount: 0, failedCount: 0 };
    }
    const projectionCheck = health.checks.find((c) => c.component === "projection_store");
    return {
      totalRegistered: 1,
      healthyCount: projectionCheck?.state === "ready" ? 1 : 0,
      degradedCount: projectionCheck?.state === "degraded" ? 1 : 0,
      failedCount: projectionCheck?.state === "failed" ? 1 : 0,
    };
  }

  private getCheckpointStatus(health: HealthReport | null): CheckpointStatus {
    if (!health) {
      return { totalCheckpoints: 0, oldestCheckpointAgeMs: null, corruptedCount: 0 };
    }
    const ckptCheck = health.checks.find((c) => c.component === "checkpoint_store");
    return {
      totalCheckpoints: ckptCheck?.state === "ready" ? 1 : 0,
      oldestCheckpointAgeMs: null,
      corruptedCount: ckptCheck?.state === "failed" ? 1 : 0,
    };
  }

  private getMetricValue(name: string): number {
    return this.metricsExporter.getGaugeValue(name) + this.metricsExporter.getCounterValue(name);
  }

  private computeSuccessRate(): number {
    const total = this.getMetricValue("payment_total");
    if (total === 0) return 1;
    const successful = this.getMetricValue("payment_success");
    return successful / total;
  }

  private getUniqueProjections(): readonly string[] {
    const entries = this.deadLetterQueue.getAllEntries();
    return Array.from(new Set(entries.map((e) => e.projectionName)));
  }

  private getUniqueEventTypes(): readonly string[] {
    const entries = this.deadLetterQueue.getAllEntries();
    return Array.from(new Set(entries.map((e) => e.eventType)));
  }

  private generateRecommendations(
    health: HealthReport | null,
    queues: QueueStatistics,
    payments: PaymentStatistics,
    security: SecurityStatistics,
    deadLetter: DeadLetterStatistics,
  ): RecoveryRecommendation[] {
    const recommendations: RecoveryRecommendation[] = [];

    if (health && health.failedCount > 0) {
      for (const check of health.checks) {
        if (check.state === "failed") {
          recommendations.push({
            severity: "critical",
            component: check.component,
            message: `${check.component} health check failed: ${check.message}`,
            action: `Investigate and restart ${check.component}`,
          });
        }
      }
    }

    if (queues.deadLetterCount > 0) {
      recommendations.push({
        severity: queues.poisonCount > 0 ? "high" : "medium",
        component: "dead_letter_queue",
        message: `${queues.deadLetterCount} events in dead letter queue (${queues.poisonCount} poison)`,
        action: "Review dead letter entries and replay or remove",
      });
    }

    if (payments.failedPayments > 10) {
      recommendations.push({
        severity: "high",
        component: "payment",
        message: `${payments.failedPayments} failed payments detected`,
        action: "Review payment gateway health and retry failed payments",
      });
    }

    if (payments.retriedPayments > payments.successfulPayments * 0.5) {
      recommendations.push({
        severity: "medium",
        component: "retry_engine",
        message: "High retry rate detected",
        action: "Review retry policy and payment gateway stability",
      });
    }

    if (security.deniedCount > security.totalAuthorizations * 0.3 && security.totalAuthorizations > 0) {
      recommendations.push({
        severity: "medium",
        component: "authorization",
        message: "High authorization denial rate",
        action: "Review permission assignments and access patterns",
      });
    }

    if (deadLetter.uniqueProjections.length > 0) {
      recommendations.push({
        severity: "low",
        component: "projections",
        message: `${deadLetter.uniqueProjections.length} projections have dead letter entries`,
        action: "Consider replaying affected projections",
      });
    }

    return recommendations;
  }
}
