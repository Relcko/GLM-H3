import { ErrorCategory, RelckoError } from "@relcko/error";

export class AdministrationError extends RelckoError {
  constructor(message: string, code = "ADMINISTRATION_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Infrastructure, 422, { metadata });
  }
}

export class AdministrationValidationError extends RelckoError {
  readonly issues: ReadonlyArray<{ readonly path: string; readonly message: string }>;
  constructor(
    message: string,
    issues: ReadonlyArray<{ readonly path: string; readonly message: string }> = [],
    code = "ADMIN_VALIDATION_FAILED",
  ) {
    super(message, code, ErrorCategory.Validation, 400, { metadata: { issues } });
    this.issues = issues;
  }
}

export class AdministrationAuthorizationError extends RelckoError {
  constructor(message: string, code = "ADMIN_FORBIDDEN", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Permission, 403, { metadata });
  }
}

export class EmergencyStateError extends RelckoError {
  constructor(message: string, code = "EMERGENCY_STATE", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Security, 409, { metadata });
  }
}
