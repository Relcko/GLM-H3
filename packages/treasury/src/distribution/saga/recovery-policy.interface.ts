import type { RecoveryStrategy } from "../domain/value-objects";

export interface FailureInfo {
  readonly errorCode: string;
  readonly reason: string;
  readonly attemptNumber: number;
}

export interface IRecoveryPolicy {
  readonly maxAttempts: number;
  readonly strategy: RecoveryStrategy;

  shouldRetry(failure: FailureInfo): boolean;

  isExhausted(attempts: number): boolean;
}
