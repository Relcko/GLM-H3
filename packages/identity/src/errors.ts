import {
  ConflictError,
  ErrorCategory,
  PermissionError,
  RelckoError,
  SecurityError,
  ValidationError,
} from "@relcko/error";

/**
 * Identity & Authentication error hierarchy. Every class extends the shared
 * `RelckoError` so the boundary layer serializes them uniformly.
 */

export class IdentityError extends RelckoError {
  constructor(message: string, code = "IDENTITY_VIOLATION", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Domain, 422, { metadata });
  }
}

export class AuthenticationError extends SecurityError {
  constructor(message: string, code = "AUTH_FAILED", metadata?: RelckoError["metadata"]) {
    super(message, code, { ...metadata, subsystem: "identity" });
  }
}

export class WalletError extends SecurityError {
  constructor(message: string, code = "WALLET_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, { ...metadata, subsystem: "wallet" });
  }
}

export class SessionError extends SecurityError {
  constructor(message: string, code = "SESSION_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, { ...metadata, subsystem: "session" });
  }
}

export class MfaError extends SecurityError {
  constructor(message: string, code = "MFA_FAILED", metadata?: RelckoError["metadata"]) {
    super(message, code, { ...metadata, subsystem: "mfa" });
  }
}

export class AccountLockedError extends PermissionError {
  constructor(message: string, code = "ACCOUNT_LOCKED", metadata?: RelckoError["metadata"]) {
    super(message, code, { ...metadata, subsystem: "identity" });
  }
}

export {
  ConflictError,
  PermissionError,
  SecurityError,
  ValidationError,
};
