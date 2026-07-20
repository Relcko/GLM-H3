/** Domain error for financial operations; carries the HTTP status + code. */
export class FinancialError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
