import { Specification, specification } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';

export function lockoutSpec(
  maxAttempts: number,
  lockoutWindowMs: number,
): Specification<{ consecutiveFailures: number; lastAttemptAt: Date; clock: Clock }> {
  return specification((candidate) => {
    return candidate.consecutiveFailures >= maxAttempts &&
      candidate.clock.nowMs() - candidate.lastAttemptAt.getTime() < lockoutWindowMs;
  });
}

export function throttlingSpec(
  minIntervalMs: number,
): Specification<{ lastAttemptAt: Date; clock: Clock }> {
  return specification((candidate) => {
    return candidate.clock.nowMs() - candidate.lastAttemptAt.getTime() < minIntervalMs;
  });
}

export function passwordPolicySpec(): Specification<string> {
  return specification((password) => {
    return password.length >= 8 &&
      password.length <= 128 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password);
  });
}

export function deviceTrustSpec(
  knownDevices: readonly string[],
): Specification<string> {
  return specification((fingerprint) => knownDevices.includes(fingerprint));
}

export function emailVerificationExpirySpec(
  ttlMs: number,
): Specification<{ createdAt: Date; clock: Clock }> {
  return specification((candidate) => {
    return candidate.clock.nowMs() - candidate.createdAt.getTime() > ttlMs;
  });
}

export function passwordResetExpirySpec(
  ttlMs: number,
): Specification<{ createdAt: Date; clock: Clock }> {
  return specification((candidate) => {
    return candidate.clock.nowMs() - candidate.createdAt.getTime() > ttlMs;
  });
}

export function sessionExpirySpec(
  ttlMs: number,
): Specification<{ createdAt: Date; clock: Clock }> {
  return specification((candidate) => {
    return candidate.clock.nowMs() - candidate.createdAt.getTime() > ttlMs;
  });
}

export function membershipSpec(
  memberIds: readonly string[],
): Specification<string> {
  return specification((userId) => memberIds.includes(userId));
}

export function roleExistsSpec(
  validRoles: readonly string[],
): Specification<string> {
  return specification((role) => validRoles.includes(role));
}

export function capabilityExistsSpec(
  validCapabilities: readonly string[],
): Specification<string> {
  return specification((capability) => validCapabilities.includes(capability));
}

export function maxActiveSessionsSpec(
  maxSessions: number,
  currentCount: number,
): Specification<void> {
  return specification(() => currentCount < maxSessions);
}
