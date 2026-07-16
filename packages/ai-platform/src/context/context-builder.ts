import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { ContextEntry, AdvisorDomain, KnowledgeEntry, MemoryEntry } from "../types";
import { AiEventType, publishAiEvent } from "../events";
import type { AiKnowledgeRepository, AiMemoryRepository } from "../repository";
import { ContextError } from "../errors";

export interface ContextSource {
  readonly name: string;
  readonly priority: number;
  fetch(params: { actorId: EntityId; domain: AdvisorDomain; query: string; context?: Record<string, unknown> }): Promise<ContextEntry[]>;
}

export class ContextBuilder {
  private readonly sources: ContextSource[] = [];

  constructor(
    private readonly knowledgeRepo: AiKnowledgeRepository,
    private readonly memoryRepo: AiMemoryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  registerSource(source: ContextSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => a.priority - b.priority);
  }

  async build(params: {
    actorId: EntityId;
    domain: AdvisorDomain;
    query: string;
    context?: Record<string, unknown>;
    includeKnowledge?: boolean;
    includeMemory?: boolean;
    maxEntries?: number;
  }): Promise<ContextEntry[]> {
    const entries: ContextEntry[] = [];
    const max = params.maxEntries ?? 50;

    if (params.includeKnowledge !== false) {
      const knowledgeEntries = this.knowledgeRepo.searchKnowledge({ domain: params.domain });
      for (const k of knowledgeEntries) {
        if (entries.length >= max) break;
        entries.push({
          source: `knowledge:${k.key}`,
          content: typeof k.value === "string" ? k.value : JSON.stringify(k.value),
          priority: Math.round(k.confidence * 10),
          metadata: { knowledgeId: k.id, type: k.type, confidence: k.confidence },
        });
      }
    }

    if (params.includeMemory !== false) {
      const memoryEntries = this.memoryRepo.searchMemory({
        scopeId: params.actorId,
      });
      for (const m of memoryEntries) {
        if (entries.length >= max) break;
        entries.push({
          source: `memory:${m.key}`,
          content: typeof m.value === "string" ? m.value : JSON.stringify(m.value),
          priority: m.priority,
          metadata: { memoryId: m.id, scope: m.scope, retention: m.retention },
        });
      }
    }

    for (const source of this.sources) {
      if (entries.length >= max) break;
      try {
        const sourceEntries = await source.fetch({
          actorId: params.actorId,
          domain: params.domain,
          query: params.query,
          context: params.context,
        });
        for (const se of sourceEntries) {
          if (entries.length >= max) break;
          entries.push(se);
        }
      } catch (error) {
        this.logger?.warn("context source failed", { source: source.name, error: String(error) });
      }
    }

    entries.sort((a, b) => b.priority - a.priority);

    if (params.context) {
      for (const [key, value] of Object.entries(params.context)) {
        entries.push({
          source: `input:${key}`,
          content: typeof value === "string" ? value : JSON.stringify(value),
          priority: 100,
        });
      }
    }

    try {
      await publishAiEvent(this.events, AiEventType.ContextBuilt, params.actorId, params.actorId, {
        domain: params.domain,
        entryCount: entries.length,
        sources: entries.map(e => e.source),
      });
    } catch (error) {
      this.logger?.warn("failed to publish context built event", { error: String(error) });
    }

    return entries.slice(0, max);
  }
}
