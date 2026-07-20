import { ErrorCategory, RelckoError } from "@relcko/error";

export class PortfolioError extends RelckoError {
  constructor(message: string, code = "PORTFOLIO_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Domain, 422, { metadata });
  }
}

export class PortfolioNotFoundError extends PortfolioError {
  constructor(id: string) {
    super(`Portfolio ${id} not found`, "PORTFOLIO_NOT_FOUND", { id });
  }
}

export class SnapshotNotFoundError extends PortfolioError {
  constructor(id: string) {
    super(`Snapshot ${id} not found`, "SNAPSHOT_NOT_FOUND", { id });
  }
}

export class AggregationError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "AGGREGATION_ERROR", metadata);
  }
}

export class PerformanceError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "PERFORMANCE_ERROR", metadata);
  }
}

export class RoiError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "ROI_ERROR", metadata);
  }
}

export class AllocationError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "ALLOCATION_ERROR", metadata);
  }
}

export class CashflowError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "CASHFLOW_ERROR", metadata);
  }
}

export class TimelineError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "TIMELINE_ERROR", metadata);
  }
}

export class AnalyticsError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "ANALYTICS_ERROR", metadata);
  }
}

export class SearchError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "SEARCH_ERROR", metadata);
  }
}

export class ExportError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "EXPORT_ERROR", metadata);
  }
}

export class HealthError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "HEALTH_ERROR", metadata);
  }
}

export class NetworkStatsError extends PortfolioError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "NETWORK_STATS_ERROR", metadata);
  }
}
