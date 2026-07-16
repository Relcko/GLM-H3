import { ErrorCategory, RelckoError } from "@relcko/error";

export class OperationsError extends RelckoError {
  constructor(message: string, code = "OPERATIONS_ERROR", metadata?: Record<string, unknown>) {
    super(message, code, ErrorCategory.Infrastructure, 500, { metadata });
  }
}

export class OperationsValidationError extends OperationsError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "OPERATIONS_VALIDATION_ERROR", metadata);
  }
}
