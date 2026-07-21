import crypto from "node:crypto";
import type { CommandHandler, Command } from "@relcko/application";
import type { DomainEvent } from "@relcko/kernel";

import { DistributionAggregate } from "../domain/distribution.aggregate";
import { DistributionRecipientAggregate } from "../domain/distribution-recipient.aggregate";
import { DistributionScheduleAggregate } from "../domain/distribution-schedule.aggregate";
import { DistributionSaga } from "../saga/distribution.saga";
import type {
  DistributionId,
  RecipientId,
  ScheduleId,
  SagaId,
} from "../domain/value-objects";
import {
  DistributionType,
  EligibilityProof,
  RecoveryStrategy,
} from "../domain/value-objects";
import type { FinalTotals } from "../domain/value-objects";
import type {
  ApprovalRecord,
  CreateDistributionCommandData,
  ApproveDistributionCommandData,
  ProcessRecipientPaymentCommandData,
  RecoverRecipientPaymentCommandData,
  ReconcileDistributionCommandData,
  CreateDistributionScheduleCommandData,
  ActivateScheduleCommandData,
  CloseScheduleCommandData,
} from "../domain/events";
import type { IOutbox } from "../saga/outbox.interface";
import type { IIdempotencyLedger } from "../saga/idempotency-ledger.interface";
import type {
  IDistributionRepository,
  IDistributionRecipientRepository,
  IDistributionScheduleRepository,
  ISagaRepository,
} from "./repositories";
import type { UnitOfWorkFactory } from "../infrastructure/persistence/unit-of-work";

export interface DistributionCommandDeps {
  distributionRepo: IDistributionRepository;
  recipientRepo: IDistributionRecipientRepository;
  scheduleRepo: IDistributionScheduleRepository;
  sagaRepo: ISagaRepository;
  idempotencyLedger: IIdempotencyLedger;
  outbox: IOutbox;
  unitOfWorkFactory?: UnitOfWorkFactory;
}

function getActorId(command: Command): string {
  const payload = command.payload as Record<string, unknown>;
  return typeof payload.actorId === "string" ? payload.actorId : command.metadata.causationId ?? "system";
}

async function checkIdempotency<T>(
  ledger: IIdempotencyLedger,
  key: string | undefined,
): Promise<T | null> {
  if (!key) return null;
  const existing = await ledger.get(key);
  if (existing && existing.responseStatus === "success") {
    return existing.responsePayload as T;
  }
  return null;
}

async function recordIdempotency(
  ledger: IIdempotencyLedger,
  key: string | undefined,
  commandType: string,
  aggregateId: string,
  actorId: string,
  payload: unknown,
  responsePayload: unknown,
  producedEvents: string[],
): Promise<void> {
  if (!key) return;
  await ledger.record(
    key,
    commandType,
    aggregateId,
    actorId,
    JSON.stringify(payload),
    responsePayload,
    "success",
    producedEvents,
  );
}

async function publishEvents(
  outbox: IOutbox,
  aggregateId: string,
  events: readonly { eventType: string; eventId: string }[],
  idempotencyKey: string,
): Promise<void> {
  for (const event of events) {
    await outbox.add(
      aggregateId,
      event.eventType,
      event,
      idempotencyKey,
      `outbox:${event.eventId}`,
    );
  }
}

interface AggWithEvents {
  readonly aggregateType: string;
  readonly id: unknown;
  readonly version: number;
  getUncommittedEvents(): readonly DomainEvent[];
  markEventsAsCommitted(): void;
}

async function saveWithUow(
  deps: DistributionCommandDeps,
  agg: AggWithEvents,
  outboxAggregateId: string,
  idempotencyKey: string | undefined,
  commandType: string,
  actorId: string,
  requestPayload: unknown,
  responsePayload: unknown,
  legacySave: () => Promise<void>,
): Promise<void> {
  const events = agg.getUncommittedEvents();
  if (events.length === 0) return;

  if (deps.unitOfWorkFactory) {
    const uow = deps.unitOfWorkFactory.create();
    const expectedVersion = agg.version - events.length;
    uow.registerAppend(agg.aggregateType, String(agg.id), events, expectedVersion);
    for (const event of events) {
      uow.registerOutbox(outboxAggregateId, event.eventType, event, idempotencyKey ?? "", `outbox:${event.eventId}`);
    }
    uow.registerIdempotency(
      idempotencyKey ?? "", commandType, String(agg.id),
      actorId, JSON.stringify(requestPayload), responsePayload,
      events.map((e) => e.eventType),
    );
    await uow.commit();
    agg.markEventsAsCommitted();
  } else {
    await legacySave();
    await publishEvents(deps.outbox, outboxAggregateId, events, idempotencyKey ?? "");
    await recordIdempotency(deps.idempotencyLedger, idempotencyKey, commandType, String(agg.id), actorId, requestPayload, responsePayload, events.map((e) => e.eventType));
  }
}

async function saveRecipientWithSaga(
  deps: DistributionCommandDeps,
  recipient: AggWithEvents,
  distributionId: DistributionId,
  recEvents: readonly DomainEvent[],
  expectedVersion: number,
  idempotencyKey: string | undefined,
  command: Command,
  responsePayload: unknown,
  legacySaveRecipient: () => Promise<void>,
  sagaAction: (saga: DistributionSaga) => void,
): Promise<void> {
  let sagaEvents: { eventType: string; eventId: string }[] = [];
  let saga: DistributionSaga | null = null;
  const sagaRef = await deps.sagaRepo.findByDistributionId(distributionId);
  if (sagaRef) {
    saga = sagaRef;
    sagaAction(saga);
    sagaEvents = [...saga.getUncommittedEvents()];
  }

  const allEvents = [...recEvents, ...sagaEvents];
  const recipientId = recipient.id as unknown as RecipientId;

  if (deps.unitOfWorkFactory) {
    const uow = deps.unitOfWorkFactory.create();
    uow.registerAppend(recipient.aggregateType, String(recipient.id), recEvents, expectedVersion);
    if (saga && sagaEvents.length > 0) {
      const sagaExpectedVersion = saga.version - sagaEvents.length;
      uow.registerAppend("saga", String(saga.sagaId), sagaEvents, sagaExpectedVersion);
    }
    for (const event of allEvents) {
      uow.registerOutbox(String(recipientId), event.eventType, event, idempotencyKey ?? "", `outbox:${event.eventId}`);
    }
    uow.registerIdempotency(
      idempotencyKey ?? "", command.type, String(recipientId),
      getActorId(command), JSON.stringify(command.payload), responsePayload,
      allEvents.map((e) => e.eventType),
    );
    await uow.commit();
    recipient.markEventsAsCommitted();
    saga?.markEventsAsCommitted();
    if (saga) await deps.sagaRepo.save(saga);
  } else {
    await legacySaveRecipient();
    if (saga) await deps.sagaRepo.save(saga);
    await publishEvents(deps.outbox, String(recipientId), allEvents, idempotencyKey ?? "");
    await recordIdempotency(deps.idempotencyLedger, idempotencyKey, command.type, String(recipientId), getActorId(command), command.payload, responsePayload, allEvents.map((e) => e.eventType));
  }
}

// ─── CreateDistribution ────────────────────────────────────────────────

export interface CreateDistributionPayload extends CreateDistributionCommandData {
  readonly actorId?: string;
}

export class CreateDistributionHandler
  implements CommandHandler<Command<CreateDistributionPayload>, { distributionId: string }>
{
  readonly commandType = "treasury.distribution.create";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(
    command: Command<CreateDistributionPayload>,
  ): Promise<{ distributionId: string }> {
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<{ distributionId: string }>(
      this.deps.idempotencyLedger,
      idempotencyKey,
    );
    if (cached) return cached;

    const distributionId = crypto.randomUUID() as unknown as DistributionId;

    const data: CreateDistributionCommandData = {
      distributionType: command.payload.distributionType,
      sourceAccountId: command.payload.sourceAccountId,
      totalAmount: command.payload.totalAmount,
      currency: command.payload.currency,
      perUnitAmount: command.payload.perUnitAmount,
      scheduleId: command.payload.scheduleId,
      snapshotId: command.payload.snapshotId,
      allocationMethod: command.payload.allocationMethod,
      proposalRef: command.payload.proposalRef,
      metadata: command.payload.metadata,
    };

    const aggregate = DistributionAggregate.create(distributionId, data);
    aggregate.getUncommittedEvents();
    const result = { distributionId: String(distributionId) };

    await saveWithUow(
      this.deps, aggregate, String(distributionId),
      idempotencyKey, command.type, getActorId(command),
      command.payload, result,
      () => this.deps.distributionRepo.save(aggregate),
    );

    return result;
  }
}

// ─── ApproveDistribution ───────────────────────────────────────────────

export interface ApproveDistributionPayload {
  readonly distributionId: DistributionId;
  readonly approvals: readonly ApprovalRecord[];
  readonly approvalEpoch: number;
  readonly reservationJournalId: string;
  readonly actorId?: string;
}

export class ApproveDistributionHandler
  implements CommandHandler<Command<ApproveDistributionPayload>, void>
{
  readonly commandType = "treasury.distribution.approve";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<ApproveDistributionPayload>): Promise<void> {
    const { distributionId, approvals, approvalEpoch, reservationJournalId } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const aggregate = await this.deps.distributionRepo.getById(distributionId);

    const approveData: ApproveDistributionCommandData = { approvals };
    aggregate.approve(approveData, approvalEpoch, reservationJournalId);

    await saveWithUow(
      this.deps, aggregate, String(distributionId),
      idempotencyKey, command.type, getActorId(command),
      command.payload, null,
      () => this.deps.distributionRepo.save(aggregate),
    );
  }
}

// ─── CancelDistribution ────────────────────────────────────────────────

export interface CancelDistributionPayload {
  readonly distributionId: DistributionId;
  readonly reason: string | null;
  readonly cancelledBy: string;
}

export class CancelDistributionHandler
  implements CommandHandler<Command<CancelDistributionPayload>, void>
{
  readonly commandType = "treasury.distribution.cancel";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<CancelDistributionPayload>): Promise<void> {
    const { distributionId, reason, cancelledBy } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const aggregate = await this.deps.distributionRepo.getById(distributionId);
    aggregate.cancel(reason, cancelledBy);

    await saveWithUow(
      this.deps, aggregate, String(distributionId),
      idempotencyKey, command.type, cancelledBy,
      command.payload, null,
      () => this.deps.distributionRepo.save(aggregate),
    );
  }
}

// ─── MaterializeDistributionRecipients ─────────────────────────────────

export interface RecipientEntry {
  readonly recipientId: RecipientId;
  readonly investorId: string;
  readonly eligibleAmount: bigint;
  readonly currency: string;
  readonly proof: {
    readonly snapshotId: string;
    readonly positionIndex: number;
    readonly quantity: bigint;
    readonly perUnitAmount: bigint;
    readonly hash: string;
  };
}

export interface MaterializeDistributionRecipientsPayload {
  readonly distributionId: DistributionId;
  readonly snapshotId: string;
  readonly eligibilityRuleId: string | null;
  readonly recipients: readonly RecipientEntry[];
}

export class MaterializeDistributionRecipientsHandler
  implements CommandHandler<Command<MaterializeDistributionRecipientsPayload>, void>
{
  readonly commandType = "treasury.distribution.materialize_recipients";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<MaterializeDistributionRecipientsPayload>): Promise<void> {
    const { distributionId, snapshotId, recipients } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const aggregate = await this.deps.distributionRepo.getById(distributionId);

    const totalEligibleAmount = recipients.reduce(
      (sum, r) => sum + r.eligibleAmount,
      0n,
    );
    const manifestHash = crypto
      .createHash("sha256")
      .update(recipients.map((r) => `${r.investorId}:${r.eligibleAmount}`).join(","))
      .digest("hex");

    aggregate.materializeRecipients(snapshotId, totalEligibleAmount, recipients.length, manifestHash);
    const distEvents = aggregate.getUncommittedEvents();
    const distExpectedVersion = aggregate.version - distEvents.length;

    const allAggs: { agg: AggWithEvents; outboxId: string }[] = [
      { agg: aggregate, outboxId: String(distributionId) },
    ];

    for (const entry of recipients) {
      const proof = EligibilityProof.create({
        snapshotId: entry.proof.snapshotId,
        positionIndex: entry.proof.positionIndex,
        quantity: entry.proof.quantity,
        perUnitAmount: entry.proof.perUnitAmount,
        hash: entry.proof.hash,
      });

      const recipientAgg = DistributionRecipientAggregate.create(
        entry.recipientId,
        distributionId,
        entry.investorId,
        entry.eligibleAmount,
        entry.currency,
        proof,
      );

      allAggs.push({ agg: recipientAgg, outboxId: String(entry.recipientId) });
    }

    if (this.deps.unitOfWorkFactory) {
      const uow = this.deps.unitOfWorkFactory.create();
      for (const { agg, outboxId } of allAggs) {
        const evts = agg.getUncommittedEvents();
        if (evts.length === 0) continue;
        const expectedVer = agg.version - evts.length;
        uow.registerAppend(agg.aggregateType, String(agg.id), evts, expectedVer);
        for (const event of evts) {
          uow.registerOutbox(outboxId, event.eventType, event, idempotencyKey ?? "", `outbox:${event.eventId}`);
        }
      }
      uow.registerIdempotency(
        idempotencyKey ?? "", command.type, String(distributionId),
        getActorId(command), JSON.stringify(command.payload), null,
        allAggs.flatMap(({ agg }) => agg.getUncommittedEvents().map((e) => e.eventType)),
      );
      await uow.commit();
      for (const { agg } of allAggs) {
        agg.markEventsAsCommitted();
      }
    } else {
      for (const { agg } of allAggs) {
        if (agg === aggregate) {
          await this.deps.distributionRepo.save(agg as typeof aggregate);
        } else {
          await this.deps.recipientRepo.save(agg as DistributionRecipientAggregate);
        }
      }

      const allEvents = allAggs.flatMap(({ agg }) => agg.getUncommittedEvents());

      await publishEvents(this.deps.outbox, String(distributionId), allEvents, idempotencyKey ?? command.metadata.messageId);
      await recordIdempotency(this.deps.idempotencyLedger, idempotencyKey, command.type, String(distributionId), getActorId(command), command.payload, null, allEvents.map((e) => e.eventType));
    }
  }
}

// ─── ExecuteDistribution ───────────────────────────────────────────────

export interface ExecuteDistributionPayload {
  readonly distributionId: DistributionId;
  readonly sagaOptions?: {
    readonly perRecipientTimeoutMs?: number;
    readonly maxParallelism?: number;
    readonly recoveryPolicyId?: string | null;
  };
}

export class ExecuteDistributionHandler
  implements CommandHandler<Command<ExecuteDistributionPayload>, { sagaId: string }>
{
  readonly commandType = "treasury.distribution.execute";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(
    command: Command<ExecuteDistributionPayload>,
  ): Promise<{ sagaId: string }> {
    const { distributionId, sagaOptions } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<{ sagaId: string }>(
      this.deps.idempotencyLedger,
      idempotencyKey,
    );
    if (cached) return cached;

    const aggregate = await this.deps.distributionRepo.getById(distributionId);

    const sagaId = crypto.randomUUID() as unknown as SagaId;

    const recipients = await this.deps.recipientRepo.findByDistributionId(distributionId);
    const recipientIds = recipients.map((r) => String(r.id));

    const saga = DistributionSaga.start(sagaId, distributionId, recipientIds, sagaOptions);
    aggregate.execute({}, sagaId);

    const distEvents = aggregate.getUncommittedEvents();
    const sagaEvents = saga.getUncommittedEvents();
    const allEvents = [...distEvents, ...sagaEvents];
    const result = { sagaId: String(sagaId) };

    if (this.deps.unitOfWorkFactory) {
      const uow = this.deps.unitOfWorkFactory.create();
      const expectedVersion = aggregate.version - distEvents.length;
      uow.registerAppend(aggregate.aggregateType, String(aggregate.id), distEvents, expectedVersion);
      const sagaExpectedVersion = saga.version - sagaEvents.length;
      uow.registerAppend("saga", String(saga.sagaId), sagaEvents, sagaExpectedVersion);
      for (const event of allEvents) {
        uow.registerOutbox(String(distributionId), event.eventType, event, idempotencyKey ?? "", `outbox:${event.eventId}`);
      }
      uow.registerIdempotency(
        idempotencyKey ?? "", command.type, String(distributionId),
        getActorId(command), JSON.stringify(command.payload), result,
        allEvents.map((e) => e.eventType),
      );
      await uow.commit();
      aggregate.markEventsAsCommitted();
      saga.markEventsAsCommitted();
      await this.deps.sagaRepo.save(saga);
    } else {
      await this.deps.distributionRepo.save(aggregate);
      await this.deps.sagaRepo.save(saga);
      await publishEvents(this.deps.outbox, String(distributionId), allEvents, idempotencyKey ?? command.metadata.messageId);
      await recordIdempotency(this.deps.idempotencyLedger, idempotencyKey, command.type, String(distributionId), getActorId(command), command.payload, result, allEvents.map((e) => e.eventType));
    }

    return result;
  }
}

// ─── CompleteDistribution ──────────────────────────────────────────────

export interface CompleteDistributionPayload {
  readonly distributionId: DistributionId;
  readonly finalTotals: FinalTotals;
  readonly sagaId: SagaId;
}

export class CompleteDistributionHandler
  implements CommandHandler<Command<CompleteDistributionPayload>, void>
{
  readonly commandType = "treasury.distribution.complete";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<CompleteDistributionPayload>): Promise<void> {
    const { distributionId, finalTotals, sagaId } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const aggregate = await this.deps.distributionRepo.getById(distributionId);
    aggregate.complete(finalTotals, sagaId);
    const distEvents = aggregate.getUncommittedEvents();

    let sagaEvents: { eventType: string; eventId: string }[] = [];
    let saga: DistributionSaga | null = null;
    const sagaRef = await this.deps.sagaRepo.findBySagaId(sagaId);
    if (sagaRef) {
      saga = sagaRef;
      saga.compensate("Distribution completed");
      saga.complete();
      sagaEvents = [...saga.getUncommittedEvents()];
    }

    const allEvents = [...distEvents, ...sagaEvents];

    if (this.deps.unitOfWorkFactory) {
      const uow = this.deps.unitOfWorkFactory.create();
      const expectedVersion = aggregate.version - distEvents.length;
      uow.registerAppend(aggregate.aggregateType, String(aggregate.id), distEvents, expectedVersion);
      if (saga && sagaEvents.length > 0) {
        const sagaExpectedVersion = saga.version - sagaEvents.length;
        uow.registerAppend("saga", String(saga.sagaId), sagaEvents, sagaExpectedVersion);
      }
      for (const event of allEvents) {
        uow.registerOutbox(String(distributionId), event.eventType, event, idempotencyKey ?? "", `outbox:${event.eventId}`);
      }
      uow.registerIdempotency(idempotencyKey ?? "", command.type, String(distributionId), getActorId(command), JSON.stringify(command.payload), null, allEvents.map((e) => e.eventType));
      await uow.commit();
      aggregate.markEventsAsCommitted();
      saga?.markEventsAsCommitted();
      if (saga) await this.deps.sagaRepo.save(saga);
    } else {
      if (saga) await this.deps.sagaRepo.save(saga);
      await this.deps.distributionRepo.save(aggregate);
      await publishEvents(this.deps.outbox, String(distributionId), allEvents, idempotencyKey ?? command.metadata.messageId);
      await recordIdempotency(this.deps.idempotencyLedger, idempotencyKey, command.type, String(distributionId), getActorId(command), command.payload, null, allEvents.map((e) => e.eventType));
    }
  }
}

// ─── FailDistribution ──────────────────────────────────────────────────

export interface FailDistributionPayload {
  readonly distributionId: DistributionId;
  readonly finalTotals: FinalTotals;
  readonly sagaId: SagaId;
  readonly reason?: string;
}

export class FailDistributionHandler
  implements CommandHandler<Command<FailDistributionPayload>, void>
{
  readonly commandType = "treasury.distribution.fail";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<FailDistributionPayload>): Promise<void> {
    const { distributionId, finalTotals, sagaId, reason } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const aggregate = await this.deps.distributionRepo.getById(distributionId);
    aggregate.fail(finalTotals, sagaId);
    const distEvents = aggregate.getUncommittedEvents();

    let sagaEvents: { eventType: string; eventId: string }[] = [];
    let saga: DistributionSaga | null = null;
    const sagaRef = await this.deps.sagaRepo.findBySagaId(sagaId);
    if (sagaRef) {
      saga = sagaRef;
      saga.compensate(reason ?? "Distribution execution failed");
      saga.fail(reason ?? "Distribution execution failed");
      sagaEvents = [...saga.getUncommittedEvents()];
    }

    const allEvents = [...distEvents, ...sagaEvents];

    if (this.deps.unitOfWorkFactory) {
      const uow = this.deps.unitOfWorkFactory.create();
      const expectedVersion = aggregate.version - distEvents.length;
      uow.registerAppend(aggregate.aggregateType, String(aggregate.id), distEvents, expectedVersion);
      if (saga && sagaEvents.length > 0) {
        const sagaExpectedVersion = saga.version - sagaEvents.length;
        uow.registerAppend("saga", String(saga.sagaId), sagaEvents, sagaExpectedVersion);
      }
      for (const event of allEvents) {
        uow.registerOutbox(String(distributionId), event.eventType, event, idempotencyKey ?? "", `outbox:${event.eventId}`);
      }
      uow.registerIdempotency(idempotencyKey ?? "", command.type, String(distributionId), getActorId(command), JSON.stringify(command.payload), null, allEvents.map((e) => e.eventType));
      await uow.commit();
      aggregate.markEventsAsCommitted();
      saga?.markEventsAsCommitted();
      if (saga) await this.deps.sagaRepo.save(saga);
    } else {
      if (saga) await this.deps.sagaRepo.save(saga);
      await this.deps.distributionRepo.save(aggregate);
      await publishEvents(this.deps.outbox, String(distributionId), allEvents, idempotencyKey ?? command.metadata.messageId);
      await recordIdempotency(this.deps.idempotencyLedger, idempotencyKey, command.type, String(distributionId), getActorId(command), command.payload, null, allEvents.map((e) => e.eventType));
    }
  }
}

// ─── ReconcileDistribution ─────────────────────────────────────────────

export interface ReconcileDistributionPayload {
  readonly distributionId: DistributionId;
  readonly expectedTotal: bigint;
  readonly actualTotal: bigint;
  readonly actorId?: string;
}

export interface ReconcileDistributionResult {
  readonly discrepancy: bigint;
  readonly reconciled: boolean;
}

export class ReconcileDistributionHandler
  implements
    CommandHandler<Command<ReconcileDistributionPayload>, ReconcileDistributionResult>
{
  readonly commandType = "treasury.distribution.reconcile";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(
    command: Command<ReconcileDistributionPayload>,
  ): Promise<ReconcileDistributionResult> {
    const { distributionId, expectedTotal, actualTotal } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<ReconcileDistributionResult>(
      this.deps.idempotencyLedger,
      idempotencyKey,
    );
    if (cached) return cached;

    const aggregate = await this.deps.distributionRepo.getById(distributionId);
    aggregate.reconcile(expectedTotal, actualTotal);

    const result: ReconcileDistributionResult = {
      discrepancy: expectedTotal - actualTotal,
      reconciled: expectedTotal === actualTotal,
    };

    await saveWithUow(
      this.deps, aggregate, String(distributionId),
      idempotencyKey, command.type, getActorId(command),
      command.payload, result,
      () => this.deps.distributionRepo.save(aggregate),
    );

    return result;
  }
}

// ─── ProcessRecipientPayment ───────────────────────────────────────────

export interface ProcessRecipientPaymentPayload {
  readonly distributionId: DistributionId;
  readonly recipientId: RecipientId;
  readonly amount: bigint;
  readonly currency: string;
  readonly settlementRef: string;
  readonly txHash?: string | null;
}

export class ProcessRecipientPaymentHandler
  implements CommandHandler<Command<ProcessRecipientPaymentPayload>, void>
{
  readonly commandType = "treasury.distribution.process_recipient_payment";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<ProcessRecipientPaymentPayload>): Promise<void> {
    const { distributionId, recipientId, amount, currency, settlementRef, txHash } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const recipient = await this.deps.recipientRepo.getById(recipientId);

    const payData: ProcessRecipientPaymentCommandData = {
      distributionId,
      investorId: recipient.investorId,
      amount,
      currency,
      settlementRef,
    };
    recipient.pay(payData);
    const recEvents = recipient.getUncommittedEvents();
    const expectedVer = recipient.version - recEvents.length;

    await saveRecipientWithSaga(
      this.deps, recipient, distributionId,
      recEvents, expectedVer, idempotencyKey,
      command, null,
      () => this.deps.recipientRepo.save(recipient),
      (saga) => saga.markRecipientPaid(String(recipientId)),
    );
  }
}

// ─── FailRecipientPayment ──────────────────────────────────────────────

export interface FailRecipientPaymentPayload {
  readonly distributionId: DistributionId;
  readonly recipientId: RecipientId;
  readonly amount: bigint;
  readonly currency: string;
  readonly reason: string;
  readonly errorCode: string;
}

export class FailRecipientPaymentHandler
  implements CommandHandler<Command<FailRecipientPaymentPayload>, void>
{
  readonly commandType = "treasury.distribution.fail_recipient_payment";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<FailRecipientPaymentPayload>): Promise<void> {
    const { distributionId, recipientId, amount, currency, reason, errorCode } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const recipient = await this.deps.recipientRepo.getById(recipientId);

    recipient.fail(distributionId, recipient.investorId, amount, currency, reason, errorCode);
    const recEvents = recipient.getUncommittedEvents();
    const expectedVer = recipient.version - recEvents.length;

    await saveRecipientWithSaga(
      this.deps, recipient, distributionId,
      recEvents, expectedVer, idempotencyKey,
      command, null,
      () => this.deps.recipientRepo.save(recipient),
      (saga) => saga.markRecipientFailed(String(recipientId)),
    );
  }
}

// ─── RecoverRecipientPayment ───────────────────────────────────────────

export interface RecoverRecipientPaymentPayload {
  readonly distributionId: DistributionId;
  readonly recipientId: RecipientId;
  readonly amount: bigint;
  readonly currency: string;
  readonly settlementRef: string;
  readonly strategy: RecoveryStrategy;
}

export class RecoverRecipientPaymentHandler
  implements CommandHandler<Command<RecoverRecipientPaymentPayload>, void>
{
  readonly commandType = "treasury.distribution.recover_recipient_payment";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<RecoverRecipientPaymentPayload>): Promise<void> {
    const { distributionId, recipientId, settlementRef, strategy } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const recipient = await this.deps.recipientRepo.getById(recipientId);

    const recoverData: RecoverRecipientPaymentCommandData = {
      distributionId,
      strategy,
    };
    recipient.recover(recoverData, settlementRef);
    const recEvents = recipient.getUncommittedEvents();
    const expectedVer = recipient.version - recEvents.length;

    await saveRecipientWithSaga(
      this.deps, recipient, distributionId,
      recEvents, expectedVer, idempotencyKey,
      command, null,
      () => this.deps.recipientRepo.save(recipient),
      (saga) => saga.markRecipientRecovered(String(recipientId)),
    );
  }
}

// ─── CreateSchedule ────────────────────────────────────────────────────

export interface CreateSchedulePayload {
  readonly distributionType: DistributionType;
  readonly propertyId: string;
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly totalAmount: bigint;
  readonly perUnitAmount: bigint | null;
  readonly currency: string;
  readonly actorId?: string;
}

export class CreateScheduleHandler
  implements CommandHandler<Command<CreateSchedulePayload>, { scheduleId: string }>
{
  readonly commandType = "treasury.distribution.create_schedule";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(
    command: Command<CreateSchedulePayload>,
  ): Promise<{ scheduleId: string }> {
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<{ scheduleId: string }>(
      this.deps.idempotencyLedger,
      idempotencyKey,
    );
    if (cached) return cached;

    const scheduleId = crypto.randomUUID() as unknown as ScheduleId;

    const data: CreateDistributionScheduleCommandData = {
      distributionType: command.payload.distributionType,
      propertyId: command.payload.propertyId,
      periodStart: command.payload.periodStart,
      periodEnd: command.payload.periodEnd,
      totalAmount: command.payload.totalAmount,
      perUnitAmount: command.payload.perUnitAmount,
      currency: command.payload.currency,
    };

    const aggregate = DistributionScheduleAggregate.create(scheduleId, data);
    aggregate.getUncommittedEvents();
    const result = { scheduleId: String(scheduleId) };

    await saveWithUow(
      this.deps, aggregate, String(scheduleId),
      idempotencyKey, command.type, getActorId(command),
      command.payload, result,
      () => this.deps.scheduleRepo.save(aggregate),
    );

    return result;
  }
}

// ─── ActivateSchedule ──────────────────────────────────────────────────

export interface ActivateSchedulePayload {
  readonly scheduleId: ScheduleId;
  readonly activatedBy: string;
}

export class ActivateScheduleHandler
  implements CommandHandler<Command<ActivateSchedulePayload>, void>
{
  readonly commandType = "treasury.distribution.activate_schedule";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<ActivateSchedulePayload>): Promise<void> {
    const { scheduleId, activatedBy } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const aggregate = await this.deps.scheduleRepo.getById(scheduleId);
    const activateData: ActivateScheduleCommandData = { activatedBy };
    aggregate.activate(activateData);

    await saveWithUow(
      this.deps, aggregate, String(scheduleId),
      idempotencyKey, command.type, activatedBy,
      command.payload, null,
      () => this.deps.scheduleRepo.save(aggregate),
    );
  }
}

// ─── CloseSchedule ─────────────────────────────────────────────────────

export interface CloseSchedulePayload {
  readonly scheduleId: ScheduleId;
  readonly closedBy: string;
  readonly reason: string | null;
}

export class CloseScheduleHandler
  implements CommandHandler<Command<CloseSchedulePayload>, void>
{
  readonly commandType = "treasury.distribution.close_schedule";

  constructor(private readonly deps: DistributionCommandDeps) {}

  async handle(command: Command<CloseSchedulePayload>): Promise<void> {
    const { scheduleId, closedBy, reason } = command.payload;
    const idempotencyKey = command.metadata.causationId;

    const cached = await checkIdempotency<void>(this.deps.idempotencyLedger, idempotencyKey);
    if (cached !== null && cached !== undefined) return;

    const aggregate = await this.deps.scheduleRepo.getById(scheduleId);
    const closeData: CloseScheduleCommandData = { closedBy, reason };
    aggregate.close(closeData);

    await saveWithUow(
      this.deps, aggregate, String(scheduleId),
      idempotencyKey, command.type, closedBy,
      command.payload, null,
      () => this.deps.scheduleRepo.save(aggregate),
    );
  }
}

// ─── Factory ───────────────────────────────────────────────────────────

export function createDistributionCommandHandlers(
  deps: DistributionCommandDeps,
): CommandHandler<Command, unknown>[] {
  return [
    new CreateDistributionHandler(deps),
    new ApproveDistributionHandler(deps),
    new CancelDistributionHandler(deps),
    new MaterializeDistributionRecipientsHandler(deps),
    new ExecuteDistributionHandler(deps),
    new CompleteDistributionHandler(deps),
    new FailDistributionHandler(deps),
    new ReconcileDistributionHandler(deps),
    new ProcessRecipientPaymentHandler(deps),
    new FailRecipientPaymentHandler(deps),
    new RecoverRecipientPaymentHandler(deps),
    new CreateScheduleHandler(deps),
    new ActivateScheduleHandler(deps),
    new CloseScheduleHandler(deps),
  ];
}
