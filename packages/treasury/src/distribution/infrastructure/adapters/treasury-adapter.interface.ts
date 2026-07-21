export interface ReserveFundsRequest {
  readonly accountId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly journalId: string;
  readonly reference: string;
}

export interface ReleaseFundsRequest {
  readonly accountId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly journalId: string;
  readonly reference: string;
}

export interface ITreasuryAdapter {
  reserveFunds(request: ReserveFundsRequest): Promise<void>;
  releaseFunds(request: ReleaseFundsRequest): Promise<void>;
  getBalance(accountId: string, currency: string): Promise<bigint>;
}
