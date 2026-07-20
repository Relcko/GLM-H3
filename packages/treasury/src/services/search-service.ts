import type { TreasuryRepository } from "../repository";
import type {
  TreasuryAccount, JournalEntry, MovementRequest, DividendProposal, BuybackRequest,
} from "../types";
import { JournalStatus, MovementStatus, DividendStatus, BuybackStatus } from "../types";

export interface SearchResult<T> {
  readonly items: T[];
  readonly total: number;
}

export interface AllSearchResults {
  readonly accounts: SearchResult<TreasuryAccount>;
  readonly journals: SearchResult<JournalEntry>;
  readonly movements: SearchResult<MovementRequest>;
  readonly dividends: SearchResult<DividendProposal>;
  readonly buybacks: SearchResult<BuybackRequest>;
}

export class SearchService {
  constructor(private readonly repository: TreasuryRepository) {}

  searchAccounts(query: string): SearchResult<TreasuryAccount> {
    const lower = query.toLowerCase();
    const items = this.repository.listAllAccounts().filter(a =>
      a.name.toLowerCase().includes(lower) ||
      a.accountType.toLowerCase().includes(lower) ||
      a.description.toLowerCase().includes(lower),
    );
    return { items, total: items.length };
  }

  searchJournals(query: string): SearchResult<JournalEntry> {
    const lower = query.toLowerCase();
    const statuses: JournalStatus[] = [JournalStatus.Draft, JournalStatus.Posted, JournalStatus.Reversed];
    const all = statuses.flatMap(s => this.repository.listJournalsByStatus(s));
    const items = all.filter(j =>
      j.description.toLowerCase().includes(lower) ||
      j.reference.toLowerCase().includes(lower),
    );
    return { items, total: items.length };
  }

  searchMovements(query: string): SearchResult<MovementRequest> {
    const lower = query.toLowerCase();
    const statuses: MovementStatus[] = [MovementStatus.Pending, MovementStatus.Approved, MovementStatus.Completed, MovementStatus.Rejected];
    const all = statuses.flatMap(s => this.repository.listMovementsByStatus(s));
    const items = all.filter(m =>
      m.reason.toLowerCase().includes(lower) ||
      m.fromAccountId.toLowerCase().includes(lower) ||
      m.toAccountId.toLowerCase().includes(lower),
    );
    return { items, total: items.length };
  }

  searchDividends(query: string): SearchResult<DividendProposal> {
    const lower = query.toLowerCase();
    const statuses: DividendStatus[] = [DividendStatus.Pending, DividendStatus.Approved, DividendStatus.Distributed, DividendStatus.Failed, DividendStatus.Recovered];
    const all = statuses.flatMap(s => this.repository.listDividendProposalsByStatus(s));
    const items = all.filter(d => d.period.toLowerCase().includes(lower));
    return { items, total: items.length };
  }

  searchBuybacks(query: string): SearchResult<BuybackRequest> {
    const lower = query.toLowerCase();
    const statuses: BuybackStatus[] = [BuybackStatus.Pending, BuybackStatus.Approved, BuybackStatus.Executing, BuybackStatus.Completed, BuybackStatus.Cancelled];
    const all = statuses.flatMap(s => this.repository.listBuybacksByStatus(s));
    const items = all.filter(b =>
      b.reason.toLowerCase().includes(lower) ||
      b.type.toLowerCase().includes(lower),
    );
    return { items, total: items.length };
  }

  searchAll(query: string): AllSearchResults {
    return {
      accounts: this.searchAccounts(query),
      journals: this.searchJournals(query),
      movements: this.searchMovements(query),
      dividends: this.searchDividends(query),
      buybacks: this.searchBuybacks(query),
    };
  }
}

export default SearchService;
