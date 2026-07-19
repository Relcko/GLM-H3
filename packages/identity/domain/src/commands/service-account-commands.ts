import type { ServiceAccountId, UserId } from '../value-objects';

export interface CreateServiceAccountCommand {
  readonly name: string;
  readonly createdBy: UserId;
}

export interface UpdateServiceAccountCommand {
  readonly serviceAccountId: ServiceAccountId;
  readonly name?: string;
}

export interface ActivateServiceAccountCommand {
  readonly serviceAccountId: ServiceAccountId;
}

export interface DeactivateServiceAccountCommand {
  readonly serviceAccountId: ServiceAccountId;
}
