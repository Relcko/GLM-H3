import { DistributionInvalidStatusError, ScheduleInvalidStatusError } from "./errors";
import { DistributionStatus, RecipientStatus, ScheduleStatus } from "./value-objects";

export const DISTRIBUTION_TRANSITIONS: Record<DistributionStatus, readonly DistributionStatus[]> = {
  [DistributionStatus.Draft]: [DistributionStatus.Approved, DistributionStatus.Cancelled],
  [DistributionStatus.Approved]: [DistributionStatus.RecipientsMaterialized, DistributionStatus.Cancelled],
  [DistributionStatus.RecipientsMaterialized]: [DistributionStatus.Executing, DistributionStatus.Cancelled],
  [DistributionStatus.Executing]: [DistributionStatus.Completed, DistributionStatus.Failed],
  [DistributionStatus.Completed]: [],
  [DistributionStatus.Failed]: [],
  [DistributionStatus.Cancelled]: [],
};

export const RECIPIENT_TRANSITIONS: Record<RecipientStatus, readonly RecipientStatus[]> = {
  [RecipientStatus.Pending]: [RecipientStatus.Paid, RecipientStatus.Failed],
  [RecipientStatus.Failed]: [RecipientStatus.Paid, RecipientStatus.Recovered, RecipientStatus.Failed],
  [RecipientStatus.Paid]: [],
  [RecipientStatus.Recovered]: [],
};

export const SCHEDULE_TRANSITIONS: Record<ScheduleStatus, readonly ScheduleStatus[]> = {
  [ScheduleStatus.Draft]: [ScheduleStatus.Scheduled, ScheduleStatus.Executing, ScheduleStatus.Cancelled],
  [ScheduleStatus.Scheduled]: [ScheduleStatus.Executing, ScheduleStatus.Cancelled],
  [ScheduleStatus.Executing]: [ScheduleStatus.Completed],
  [ScheduleStatus.Completed]: [],
  [ScheduleStatus.Cancelled]: [],
};

export function assertDistributionTransition(current: DistributionStatus, next: DistributionStatus): void {
  const allowed = DISTRIBUTION_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new DistributionInvalidStatusError(
      current,
      String(current),
      allowed?.join(", ") ?? "none",
    );
  }
}

export function assertRecipientTransition(current: RecipientStatus, next: RecipientStatus): void {
  const allowed = RECIPIENT_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new DistributionInvalidStatusError(
      current,
      String(current),
      allowed?.join(", ") ?? "none",
    );
  }
}

export function assertScheduleTransition(current: ScheduleStatus, next: ScheduleStatus): void {
  const allowed = SCHEDULE_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new ScheduleInvalidStatusError(
      current,
      String(current),
      allowed?.join(", ") ?? "none",
    );
  }
}
