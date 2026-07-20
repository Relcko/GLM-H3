/**
 * Canonical error hierarchy for the Relcko platform (V2.0 foundation).
 *
 * Every package throws these typed errors. They carry a stable `code`, a
 * `category` (for metrics/observability), a suggested HTTP status, and optional
 * structured `metadata`. They are safe to serialize for API boundaries.
 */

export enum ErrorCategory {
  Domain = "domain",
  Validation = "validation",
  Permission = "permission",
  Compliance = "compliance",
  Financial = "financial",
  Security = "security",
  Infrastructure = "infrastructure",
  ExternalService = "external_service",
  Conflict = "conflict",
  Unknown = "unknown",
}

export interface ErrorMetadata {
  readonly [key: string]: unknown;
}

export interface SerializedError {
  readonly name: string;
  readonly code: string;
  readonly category: ErrorCategory;
  readonly message: string;
  readonly httpStatus: number;
  readonly metadata?: ErrorMetadata;
  readonly cause?: string;
}

export class RelckoError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly httpStatus: number;
  readonly metadata?: ErrorMetadata;
  override readonly cause?: unknown;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    httpStatus: number,
    options?: { cause?: unknown; metadata?: ErrorMetadata },
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.category = category;
    this.httpStatus = httpStatus;
    this.metadata = options?.metadata;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): SerializedError {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      httpStatus: this.httpStatus,
      metadata: this.metadata,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }
}

export class DomainError extends RelckoError {
  constructor(message: string, code = "DOMAIN_VIOLATION", metadata?: ErrorMetadata, cause?: unknown) {
    super(message, code, ErrorCategory.Domain, 422, { cause, metadata });
  }
}

export class ValidationError extends RelckoError {
  readonly issues: ReadonlyArray<{ readonly path: string; readonly message: string }>;
  constructor(
    message: string,
    issues: ReadonlyArray<{ readonly path: string; readonly message: string }> = [],
    code = "VALIDATION_FAILED",
    cause?: unknown,
  ) {
    super(message, code, ErrorCategory.Validation, 400, { cause });
    this.issues = issues;
  }
}

export class PermissionError extends RelckoError {
  constructor(message: string, code = "PERMISSION_DENIED", metadata?: ErrorMetadata, cause?: unknown) {
    super(message, code, ErrorCategory.Permission, 403, { cause, metadata });
  }
}

export class ComplianceError extends RelckoError {
  constructor(message: string, code = "COMPLIANCE_BLOCKED", metadata?: ErrorMetadata, cause?: unknown) {
    super(message, code, ErrorCategory.Compliance, 403, { cause, metadata });
  }
}

export class FinancialError extends RelckoError {
  constructor(message: string, code = "FINANCIAL_VIOLATION", metadata?: ErrorMetadata, cause?: unknown) {
    super(message, code, ErrorCategory.Financial, 422, { cause, metadata });
  }
}

export class SecurityError extends RelckoError {
  constructor(message: string, code = "SECURITY_VIOLATION", metadata?: ErrorMetadata, cause?: unknown) {
    super(message, code, ErrorCategory.Security, 403, { cause, metadata });
  }
}

export class InfrastructureError extends RelckoError {
  constructor(message: string, code = "INFRASTRUCTURE_ERROR", metadata?: ErrorMetadata, cause?: unknown) {
    super(message, code, ErrorCategory.Infrastructure, 500, { cause, metadata });
  }
}

export class ExternalServiceError extends RelckoError {
  readonly service: string;
  constructor(message: string, service: string, code = "EXTERNAL_SERVICE_ERROR", cause?: unknown) {
    super(message, code, ErrorCategory.ExternalService, 502, { cause, metadata: { service } });
    this.service = service;
  }
}

export class ConflictError extends RelckoError {
  constructor(message: string, code = "CONFLICT", metadata?: ErrorMetadata, cause?: unknown) {
    super(message, code, ErrorCategory.Conflict, 409, { cause, metadata });
  }
}

export function isRelckoError(value: unknown): value is RelckoError {
  return value instanceof RelckoError;
}

/** Coerce arbitrary thrown values into a RelckoError for safe boundaries. */
export function toRelckoError(value: unknown, fallbackMessage = "Unexpected error"): RelckoError {
  if (value instanceof RelckoError) return value;
  if (value instanceof Error) {
    return new InfrastructureError(value.message, "UNEXPECTED", undefined, value);
  }
  return new InfrastructureError(
    typeof value === "string" ? value : fallbackMessage,
    "UNEXPECTED",
  );
}
