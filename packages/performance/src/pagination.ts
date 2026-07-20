import type { PaginationRequest, PaginationResult } from "./types";

/**
 * Stateless pagination + sorting helper. Operates over an in-memory array but is
 * designed to mirror a cursor/offset DB query so callers get a uniform shape.
 * Sorting is stable and supports string/number/date comparators.
 */
export class PaginationEngine {
  paginate<T>(
    source: readonly T[],
    request: PaginationRequest,
    sort?: (a: T, b: T) => number,
  ): PaginationResult<T> {
    const pageSize = Math.max(1, request.pageSize);
    const page = Math.max(1, request.page);
    const sorted = sort ? [...source].sort(sort) : source;
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);
    return {
      items,
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /** Build a stable comparator for a sortable field. */
  comparator<T>(field: keyof T, dir: "asc" | "desc" = "asc"): (a: T, b: T) => number {
    const sign = dir === "desc" ? -1 : 1;
    return (a, b) => {
      const av = a[field]; const bv = b[field];
      if (av == null && bv == null) return 0;
      if (av == null) return -sign;
      if (bv == null) return sign;
      if (av < bv) return -sign;
      if (av > bv) return sign;
      return 0;
    };
  }
}
