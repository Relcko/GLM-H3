import { generateId } from "@relcko/utils";
import type { EntityId, Timestamp } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { KnowledgeEntry, KnowledgeType } from "../types";
import { KnowledgeError } from "../errors";
import { AiEventType, publishAiEvent } from "../events";
import type { AiKnowledgeRepository } from "../repository";

export class KnowledgeService {
  constructor(
    private readonly repository: AiKnowledgeRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async ingest(
    actorId: EntityId,
    params: {
      domain: string;
      key: string;
      value: unknown;
      type: KnowledgeType;
      confidence: number;
      evidence?: string;
      provenance?: string;
      tags?: readonly string[];
    },
  ): Promise<KnowledgeEntry> {
    if (params.confidence < 0 || params.confidence > 1) {
      throw new KnowledgeError("Confidence must be between 0 and 1");
    }

    const now = new Date().toISOString();
    const existing = this.repository.getKnowledgeByKey(params.domain, params.key);

    const entry: KnowledgeEntry = {
      id: existing?.id ?? (generateId() as EntityId),
      type: params.type,
      domain: params.domain,
      key: params.key,
      value: params.value,
      confidence: params.confidence,
      evidence: params.evidence,
      provenance: params.provenance,
      version: existing ? existing.version + 1 : 1,
      tags: params.tags ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.repository.saveKnowledge(entry);

    await publishAiEvent(this.events, AiEventType.KnowledgeIngested, entry.id, actorId, {
      knowledgeId: entry.id,
      domain: params.domain,
      key: params.key,
      type: params.type,
      version: entry.version,
    });

    this.logger?.info("knowledge ingested", { domain: params.domain, key: params.key, type: params.type });
    return entry;
  }

  get(id: EntityId): KnowledgeEntry | undefined {
    return this.repository.getKnowledge(id);
  }

  getByKey(domain: string, key: string): KnowledgeEntry | undefined {
    return this.repository.getKnowledgeByKey(domain, key);
  }

  search(query: {
    domain?: string;
    type?: KnowledgeType;
    tags?: readonly string[];
    minConfidence?: number;
  }): KnowledgeEntry[] {
    return this.repository.searchKnowledge(query);
  }

  async invalidate(actorId: EntityId, id: EntityId): Promise<void> {
    const entry = this.repository.getKnowledge(id);
    if (!entry) throw new KnowledgeError(`Knowledge entry ${id} not found`);

    this.repository.deleteKnowledge(id);

    try {
      await publishAiEvent(this.events, AiEventType.KnowledgeInvalidated, id, actorId, {
        knowledgeId: id,
        domain: entry.domain,
        key: entry.key,
      });
    } catch (error) {
      this.logger?.warn("failed to publish knowledge invalidated event", { id, error: String(error) });
    }

    this.logger?.info("knowledge invalidated", { id, domain: entry.domain, key: entry.key });
  }

  getByDomain(domain: string): KnowledgeEntry[] {
    return this.repository.getKnowledgeByDomain(domain);
  }

  getByType(type: KnowledgeType): KnowledgeEntry[] {
    return this.repository.getKnowledgeByType(type);
  }
}
