import type { QueryHandler, Query } from "@relcko/application";

import type {
  DistributionId,
  RecipientId,
  ScheduleId,
  SagaId,
  DistributionStatus,
  DistributionType,
  ScheduleStatus,
  RecipientStatus,
} from "../domain/value-objects";
import type {
  DistributionReadModel,
  DistributionProgressReadModel,
  SagaStateReadModel,
  RecipientReadModel,
  ScheduleReadModel,
  DistributionFilterCriteria,
  IDistributionQueryRepository,
  IRecipientQueryRepository,
  ISagaQueryRepository,
  IScheduleQueryRepository,
} from "./repositories";

export interface DistributionQueryDeps {
  distributionQueryRepo: IDistributionQueryRepository;
  recipientQueryRepo: IRecipientQueryRepository;
  sagaQueryRepo: ISagaQueryRepository;
  scheduleQueryRepo: IScheduleQueryRepository;
}

// ─── GetDistribution ──────────────────────────────────────────────────

export interface GetDistributionPayload {
  readonly distributionId: DistributionId;
}

export class GetDistributionHandler
  implements QueryHandler<Query<GetDistributionPayload>, DistributionReadModel | null>
{
  readonly queryType = "treasury.distribution.get_distribution";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<GetDistributionPayload>,
  ): Promise<DistributionReadModel | null> {
    return this.deps.distributionQueryRepo.findById(query.payload.distributionId);
  }
}

// ─── ListDistributions ─────────────────────────────────────────────────

export interface ListDistributionsPayload {
  readonly criteria?: DistributionFilterCriteria;
}

export class ListDistributionsHandler
  implements QueryHandler<Query<ListDistributionsPayload>, DistributionReadModel[]>
{
  readonly queryType = "treasury.distribution.list_distributions";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<ListDistributionsPayload>,
  ): Promise<DistributionReadModel[]> {
    return this.deps.distributionQueryRepo.findMany(query.payload.criteria);
  }
}

// ─── GetDistributionProgress ───────────────────────────────────────────

export interface GetDistributionProgressPayload {
  readonly distributionId: DistributionId;
}

export class GetDistributionProgressHandler
  implements
    QueryHandler<Query<GetDistributionProgressPayload>, DistributionProgressReadModel | null>
{
  readonly queryType = "treasury.distribution.get_progress";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<GetDistributionProgressPayload>,
  ): Promise<DistributionProgressReadModel | null> {
    const distribution = await this.deps.distributionQueryRepo.findById(
      query.payload.distributionId,
    );
    if (!distribution) return null;

    const recipients = await this.deps.recipientQueryRepo.findByDistributionId(
      query.payload.distributionId,
    );

    const totalRecipients = recipients.length;
    const paidCount = recipients.filter((r) => r.status === "paid" as RecipientStatus).length;
    const failedCount = recipients.filter((r) => r.status === "failed" as RecipientStatus).length;
    const recoveredCount = recipients.filter((r) => r.status === "recovered" as RecipientStatus).length;
    const pendingCount = recipients.filter((r) => r.status === "pending" as RecipientStatus).length;
    const inFlightCount = totalRecipients - paidCount - failedCount - recoveredCount - pendingCount;

    return {
      distributionId: query.payload.distributionId,
      totalRecipients,
      paidCount,
      failedCount,
      recoveredCount,
      pendingCount,
      inFlightCount: Math.max(0, inFlightCount),
      percentage: totalRecipients > 0
        ? Math.round(((paidCount + failedCount + recoveredCount) / totalRecipients) * 100)
        : 0,
    };
  }
}

// ─── GetSagaState ──────────────────────────────────────────────────────

export interface GetSagaStatePayload {
  readonly sagaId?: SagaId;
  readonly distributionId?: DistributionId;
}

export class GetSagaStateHandler
  implements QueryHandler<Query<GetSagaStatePayload>, SagaStateReadModel | null>
{
  readonly queryType = "treasury.distribution.get_saga_state";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<GetSagaStatePayload>,
  ): Promise<SagaStateReadModel | null> {
    const { sagaId, distributionId } = query.payload;

    if (sagaId) {
      return this.deps.sagaQueryRepo.findBySagaId(sagaId);
    }

    if (distributionId) {
      return this.deps.sagaQueryRepo.findByDistributionId(distributionId);
    }

    return null;
  }
}

// ─── GetRecipient ──────────────────────────────────────────────────────

export interface GetRecipientPayload {
  readonly recipientId: RecipientId;
}

export class GetRecipientHandler
  implements QueryHandler<Query<GetRecipientPayload>, RecipientReadModel | null>
{
  readonly queryType = "treasury.distribution.get_recipient";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<GetRecipientPayload>,
  ): Promise<RecipientReadModel | null> {
    return this.deps.recipientQueryRepo.findById(query.payload.recipientId);
  }
}

// ─── ListRecipientsByDistribution ──────────────────────────────────────

export interface ListRecipientsByDistributionPayload {
  readonly distributionId: DistributionId;
}

export class ListRecipientsByDistributionHandler
  implements
    QueryHandler<Query<ListRecipientsByDistributionPayload>, RecipientReadModel[]>
{
  readonly queryType = "treasury.distribution.list_recipients_by_distribution";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<ListRecipientsByDistributionPayload>,
  ): Promise<RecipientReadModel[]> {
    return this.deps.recipientQueryRepo.findByDistributionId(
      query.payload.distributionId,
    );
  }
}

// ─── ListRecipientsByInvestor ──────────────────────────────────────────

export interface ListRecipientsByInvestorPayload {
  readonly investorId: string;
}

export class ListRecipientsByInvestorHandler
  implements
    QueryHandler<Query<ListRecipientsByInvestorPayload>, RecipientReadModel[]>
{
  readonly queryType = "treasury.distribution.list_recipients_by_investor";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<ListRecipientsByInvestorPayload>,
  ): Promise<RecipientReadModel[]> {
    return this.deps.recipientQueryRepo.findByInvestorId(query.payload.investorId);
  }
}

// ─── GetSchedule ───────────────────────────────────────────────────────

export interface GetSchedulePayload {
  readonly scheduleId: ScheduleId;
}

export class GetScheduleHandler
  implements QueryHandler<Query<GetSchedulePayload>, ScheduleReadModel | null>
{
  readonly queryType = "treasury.distribution.get_schedule";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<GetSchedulePayload>,
  ): Promise<ScheduleReadModel | null> {
    return this.deps.scheduleQueryRepo.findById(query.payload.scheduleId);
  }
}

// ─── ListSchedulesByProperty ───────────────────────────────────────────

export interface ListSchedulesByPropertyPayload {
  readonly propertyId: string;
}

export class ListSchedulesByPropertyHandler
  implements
    QueryHandler<Query<ListSchedulesByPropertyPayload>, ScheduleReadModel[]>
{
  readonly queryType = "treasury.distribution.list_schedules_by_property";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<ListSchedulesByPropertyPayload>,
  ): Promise<ScheduleReadModel[]> {
    return this.deps.scheduleQueryRepo.findByPropertyId(query.payload.propertyId);
  }
}

// ─── ListSchedulesByStatus ─────────────────────────────────────────────

export interface ListSchedulesByStatusPayload {
  readonly status: ScheduleStatus;
}

export class ListSchedulesByStatusHandler
  implements
    QueryHandler<Query<ListSchedulesByStatusPayload>, ScheduleReadModel[]>
{
  readonly queryType = "treasury.distribution.list_schedules_by_status";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(
    query: Query<ListSchedulesByStatusPayload>,
  ): Promise<ScheduleReadModel[]> {
    return this.deps.scheduleQueryRepo.findByStatus(query.payload.status);
  }
}

// ─── ListAllSchedules ──────────────────────────────────────────────────

export class ListAllSchedulesHandler
  implements QueryHandler<Query<Record<string, never>>, ScheduleReadModel[]>
{
  readonly queryType = "treasury.distribution.list_all_schedules";

  constructor(private readonly deps: DistributionQueryDeps) {}

  async handle(): Promise<ScheduleReadModel[]> {
    return this.deps.scheduleQueryRepo.findMany();
  }
}

// ─── Factory ───────────────────────────────────────────────────────────

export function createDistributionQueryHandlers(
  deps: DistributionQueryDeps,
): QueryHandler<Query, unknown>[] {
  return [
    new GetDistributionHandler(deps),
    new ListDistributionsHandler(deps),
    new GetDistributionProgressHandler(deps),
    new GetSagaStateHandler(deps),
    new GetRecipientHandler(deps),
    new ListRecipientsByDistributionHandler(deps),
    new ListRecipientsByInvestorHandler(deps),
    new GetScheduleHandler(deps),
    new ListSchedulesByPropertyHandler(deps),
    new ListSchedulesByStatusHandler(deps),
    new ListAllSchedulesHandler(deps),
  ];
}
