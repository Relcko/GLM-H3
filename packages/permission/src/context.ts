import type { Role } from "@relcko/types";
import type { MfaLevel } from "./policies";

export interface SubjectContext {
  readonly id: string;
  readonly role: Role;
  readonly kycApproved?: boolean;
  readonly mfaLevel?: MfaLevel;
  readonly riskScore?: number;
  readonly walletVerified?: boolean;
  readonly identityVerified?: boolean;
}

export interface ResourceContext {
  readonly ownerId?: string;
  readonly propertyId?: string;
  readonly portfolioId?: string;
  readonly treasuryAccount?: string;
  readonly jurisdiction?: string;
  readonly entityType?: string;
}

export interface EnvironmentContext {
  readonly time?: string;
  readonly region?: string;
  readonly ipReputation?: number;
  readonly sessionTrust?: number;
  readonly velocity?: number;
  readonly secondApproverPresent?: boolean;
  readonly teamMemberIds?: readonly string[];
  readonly grantedActorIds?: readonly string[];
  readonly disciplineScope?: string;
}

export interface AuthorizationContext {
  readonly subject: SubjectContext;
  readonly resource?: ResourceContext;
  readonly env?: EnvironmentContext;
}
