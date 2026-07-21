import crypto from "node:crypto";
import type { CommandHandler, Command } from "@relcko/application";

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

export interface DistributionCommandDeps {
  distributionRepo: IDistributionRepository;
  recipientRepo: IDistributionRecipientRepository;
  scheduleRepo: IDistributionScheduleRepository;
  sagaRepo: ISagaRepository;
  idempotencyLedger: IIdempotencyLedger;
  outbox: IOutbox;
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
    const events = aggregate.getUncommittedEvents();
    await this.deps.distributionRepo.save(aggregate);

    await publishEvents(
      this.deps.outbox,
      String(distributionId),
      events,
      idempotencyKey ?? command.metadata.messageId,
    );

    const result = { distributionId: String(distributionId) };
    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(distributionId),
      getActorId(command),
      command.payload,
      result,
      events.map((e) => e.eventType),
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
    const events = aggregate.getUncommittedEvents();
    await this.deps.distributionRepo.save(aggregate);

    await publishEvents(
      this.deps.outbox,
      String(distributionId),
      events,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(distributionId),
      getActorId(command),
      command.payload,
      null,
      events.map((e) => e.eventType),
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
    const events = aggregate.getUncommittedEvents();
    await this.deps.distributionRepo.save(aggregate);

    await publishEvents(
      this.deps.outbox,
      String(distributionId),
      events,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(distributionId),
      cancelledBy,
      command.payload,
      null,
      events.map((e) => e.eventType),
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

    const allocationEvents: { eventType: string; eventId: string }[] = [];
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

      allocationEvents.push(...recipientAgg.getUncommittedEvents());

      await this.deps.recipientRepo.save(recipientAgg);
    }

    await this.deps.distributionRepo.save(aggregate);

    const allEvents = [...distEvents, ...allocationEvents];

    await publishEvents(
      this.deps.outbox,
      String(distributionId),
      allEvents,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(distributionId),
      getActorId(command),
      command.payload,
      null,
      allEvents.map((e) => e.eventType),
    );
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
    await this.deps.distributionRepo.save(aggregate);
    await this.deps.sagaRepo.save(saga);

    const allEvents = [...distEvents, ...sagaEvents];

    await publishEvents(
      this.deps.outbox,
      String(distributionId),
      allEvents,
      idempotencyKey ?? command.metadata.messageId,
    );

    const result = { sagaId: String(sagaId) };
    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(distributionId),
      getActorId(command),
      command.payload,
      result,
      allEvents.map((e) => e.eventType),
    );

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
    const saga = await this.deps.sagaRepo.findBySagaId(sagaId);
    if (saga) {
      saga.compensate("Distribution completed");
      saga.complete();
      sagaEvents = [...saga.getUncommittedEvents()];
      await this.deps.sagaRepo.save(saga);
    }

    await this.deps.distributionRepo.save(aggregate);

    const allEvents = [...distEvents, ...sagaEvents];

    await publishEvents(
      this.deps.outbox,
      String(distributionId),
      allEvents,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(distributionId),
      getActorId(command),
      command.payload,
      null,
      allEvents.map((e) => e.eventType),
    );
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
    const saga = await this.deps.sagaRepo.findBySagaId(sagaId);
    if (saga) {
      saga.compensate(reason ?? "Distribution execution failed");
      saga.fail(reason ?? "Distribution execution failed");
      sagaEvents = [...saga.getUncommittedEvents()];
      await this.deps.sagaRepo.save(saga);
    }

    await this.deps.distributionRepo.save(aggregate);

    const allEvents = [...distEvents, ...sagaEvents];

    await publishEvents(
      this.deps.outbox,
      String(distributionId),
      allEvents,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(distributionId),
      getActorId(command),
      command.payload,
      null,
      allEvents.map((e) => e.eventType),
    );
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
    const events = aggregate.getUncommittedEvents();
    await this.deps.distributionRepo.save(aggregate);

    await publishEvents(
      this.deps.outbox,
      String(distributionId),
      events,
      idempotencyKey ?? command.metadata.messageId,
    );

    const result: ReconcileDistributionResult = {
      discrepancy: expectedTotal - actualTotal,
      reconciled: expectedTotal === actualTotal,
    };

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(distributionId),
      getActorId(command),
      command.payload,
      result,
      events.map((e) => e.eventType),
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
    await this.deps.recipientRepo.save(recipient);

    let sagaEvents: { eventType: string; eventId: string }[] = [];
    const saga = await this.deps.sagaRepo.findByDistributionId(distributionId);
    if (saga) {
      saga.markRecipientPaid(String(recipientId));
      sagaEvents = [...saga.getUncommittedEvents()];
      await this.deps.sagaRepo.save(saga);
    }

    const allEvents = [...recEvents, ...sagaEvents];

    await publishEvents(
      this.deps.outbox,
      String(recipientId),
      allEvents,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(recipientId),
      getActorId(command),
      command.payload,
      null,
      allEvents.map((e) => e.eventType),
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
    await this.deps.recipientRepo.save(recipient);

    let sagaEvents: { eventType: string; eventId: string }[] = [];
    const saga = await this.deps.sagaRepo.findByDistributionId(distributionId);
    if (saga) {
      saga.markRecipientFailed(String(recipientId));
      sagaEvents = [...saga.getUncommittedEvents()];
      await this.deps.sagaRepo.save(saga);
    }

    const allEvents = [...recEvents, ...sagaEvents];

    await publishEvents(
      this.deps.outbox,
      String(recipientId),
      allEvents,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(recipientId),
      getActorId(command),
      command.payload,
      null,
      allEvents.map((e) => e.eventType),
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
    await this.deps.recipientRepo.save(recipient);

    let sagaEvents: { eventType: string; eventId: string }[] = [];
    const saga = await this.deps.sagaRepo.findByDistributionId(distributionId);
    if (saga) {
      saga.markRecipientRecovered(String(recipientId));
      sagaEvents = [...saga.getUncommittedEvents()];
      await this.deps.sagaRepo.save(saga);
    }

    const allEvents = [...recEvents, ...sagaEvents];

    await publishEvents(
      this.deps.outbox,
      String(recipientId),
      allEvents,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(recipientId),
      getActorId(command),
      command.payload,
      null,
      allEvents.map((e) => e.eventType),
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
    const events = aggregate.getUncommittedEvents();
    await this.deps.scheduleRepo.save(aggregate);

    await publishEvents(
      this.deps.outbox,
      String(scheduleId),
      events,
      idempotencyKey ?? command.metadata.messageId,
    );

    const result = { scheduleId: String(scheduleId) };
    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(scheduleId),
      getActorId(command),
      command.payload,
      result,
      events.map((e) => e.eventType),
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
    const events = aggregate.getUncommittedEvents();
    await this.deps.scheduleRepo.save(aggregate);

    await publishEvents(
      this.deps.outbox,
      String(scheduleId),
      events,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(scheduleId),
      activatedBy,
      command.payload,
      null,
      events.map((e) => e.eventType),
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
    const events = aggregate.getUncommittedEvents();
    await this.deps.scheduleRepo.save(aggregate);

    await publishEvents(
      this.deps.outbox,
      String(scheduleId),
      events,
      idempotencyKey ?? command.metadata.messageId,
    );

    await recordIdempotency(
      this.deps.idempotencyLedger,
      idempotencyKey,
      command.type,
      String(scheduleId),
      closedBy,
      command.payload,
      null,
      events.map((e) => e.eventType),
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
