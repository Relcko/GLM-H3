import type { Json } from "@relcko/types";

export interface SearchDocument {
  readonly id: string;
  readonly text: string;
  readonly keywords: readonly string[];
  readonly tags: Readonly<Record<string, Json>>;
}

export interface SearchHit {
  readonly id: string;
  readonly score: number;
}

/**
 * Lightweight inverted-index search optimizer. Builds a term → docId index once
 * and answers queries with tf-style scoring, avoiding linear scans over large
 * collections. Used for admin/search and read-model lookups.
 */
export class SearchOptimization {
  private readonly docs = new Map<string, SearchDocument>();
  private readonly inverted = new Map<string, Map<string, number>>();

  index(doc: SearchDocument): void {
    this.remove(doc.id);
    this.docs.set(doc.id, doc);
    const terms = tokenize(doc.text).concat(doc.keywords.map((k) => k.toLowerCase()));
    const freq = new Map<string, number>();
    for (const t of terms) freq.set(t, (freq.get(t) ?? 0) + 1);
    for (const [term, count] of freq) {
      let postings = this.inverted.get(term);
      if (!postings) { postings = new Map(); this.inverted.set(term, postings); }
      postings.set(doc.id, count);
    }
  }

  remove(id: string): void {
    const doc = this.docs.get(id);
    if (!doc) return;
    for (const term of tokenize(doc.text).concat(doc.keywords.map((k) => k.toLowerCase()))) {
      this.inverted.get(term)?.delete(id);
    }
    this.docs.delete(id);
  }

  search(query: string, limit = 20): readonly SearchHit[] {
    const qterms = tokenize(query);
    const scores = new Map<string, number>();
    for (const term of qterms) {
      const postings = this.inverted.get(term);
      if (!postings) continue;
      const max = Math.max(...postings.values());
      for (const [docId, count] of postings) {
        scores.set(docId, (scores.get(docId) ?? 0) + count / (max || 1));
      }
    }
    return [...scores.entries()]
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  size(): number { return this.docs.size; }
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}
