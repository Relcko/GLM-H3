import { ErrorCategory, RelckoError } from "@relcko/error";

export class PerformanceError extends RelckoError {
  constructor(message: string, code = "PERFORMANCE_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Infrastructure, 500, { metadata });
  }
}

export class CacheError extends PerformanceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "CACHE_ERROR", metadata);
  }
}

export class ConcurrencyError extends PerformanceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "CONCURRENCY_LIMIT", metadata);
  }
}

export class RateLimitExceededError extends PerformanceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "RATE_LIMIT_EXCEEDED", metadata);
  }
}

export class BatchProcessingError extends PerformanceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "BATCH_PROCESSING_ERROR", metadata);
  }
}
