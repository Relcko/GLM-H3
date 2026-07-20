import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { ConfidenceLevel, ExplainabilityResult, EvidenceItem, Alternative, AffectedEntity, RiskAssessment, RiskLevel } from "../types";
import { AiEventType, publishAiEvent } from "../events";
import { ExplainabilityError } from "../errors";

export interface ExplainabilityInput {
  readonly domain: string;
  readonly query: string;
  readonly modelOutput: string;
  readonly metadata?: Record<string, unknown>;
}

export class ExplainabilityEngine {
  constructor(
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async compute(
    actorId: EntityId,
    input: ExplainabilityInput,
  ): Promise<ExplainabilityResult> {
    const recommendationId = generateId() as EntityId;

    const confidence = this.assessConfidence(input.modelOutput);
    const score = this.computeConfidenceScore(confidence);
    const evidence = this.extractEvidence(input.modelOutput, input.metadata);
    const reasoning = this.extractReasoning(input.modelOutput);
    const alternatives = this.extractAlternatives(input.modelOutput);
    const affectedEntities = this.extractAffectedEntities(input.modelOutput);
    const risk = this.assessRisk(input.modelOutput);
    const sources = this.extractSources(input.modelOutput);
    const requiresHumanReview = this.determineReviewRequirement(risk.level, confidence, score);

    const result: ExplainabilityResult = {
      recommendationId,
      confidence,
      score,
      evidence,
      reasoning,
      alternatives,
      affectedEntities,
      risk,
      sources,
      requiresHumanReview,
      computedAt: new Date().toISOString(),
    };

    try {
      await publishAiEvent(this.events, AiEventType.ExplainabilityComputed, recommendationId, actorId, {
        recommendationId,
        confidence,
        score,
        riskLevel: risk.level,
        requiresHumanReview,
      });
    } catch (error) {
      this.logger?.warn("failed to publish explainability computed event", { error: String(error) });
    }

    this.logger?.info("explainability computed", {
      recommendationId,
      confidence,
      score,
      requiresHumanReview,
    });

    return result;
  }

  private assessConfidence(output: string): ConfidenceLevel {
    const lower = output.toLowerCase();
    if (lower.includes("very high confidence")) return "very_high";
    if (lower.includes("high confidence")) return "high";
    if (lower.includes("medium confidence") || lower.includes("moderate confidence")) return "medium";
    if (lower.includes("low confidence")) return "low";
    return "medium";
  }

  private computeConfidenceScore(confidence: ConfidenceLevel): number {
    const scores: Record<ConfidenceLevel, number> = {
      very_low: 0.1,
      low: 0.3,
      medium: 0.6,
      high: 0.8,
      very_high: 0.95,
    };
    return scores[confidence];
  }

  private extractEvidence(output: string, metadata?: Record<string, unknown>): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];
    const lines = output.split("\n");
    let inEvidence = false;
    for (const line of lines) {
      if (line.toLowerCase().includes("evidence:") || line.toLowerCase().includes("supporting evidence:")) {
        inEvidence = true;
        continue;
      }
      if (inEvidence) {
        if (line.startsWith("- ") || line.startsWith("* ")) {
          evidence.push({
            source: "model_output",
            content: line.replace(/^[-*]\s*/, ""),
            relevance: 0.8,
            confidence: 0.7,
          });
        } else if (line.trim() === "") {
          break;
        } else {
          evidence.push({
            source: "model_output",
            content: line.trim(),
            relevance: 0.6,
            confidence: 0.5,
          });
        }
      }
    }
    if (evidence.length === 0) {
      evidence.push({
        source: "model_output",
        content: output.slice(0, 200),
        relevance: 1,
        confidence: 0.5,
      });
    }
    return evidence;
  }

  private extractReasoning(output: string): string {
    const lines = output.split("\n");
    let inReasoning = false;
    const reasoning: string[] = [];
    for (const line of lines) {
      if (line.toLowerCase().includes("reasoning:") || line.toLowerCase().includes("rationale:")) {
        inReasoning = true;
        continue;
      }
      if (inReasoning) {
        if (line.toLowerCase().includes("evidence:") || line.toLowerCase().includes("alternatives:")) break;
        reasoning.push(line);
      }
    }
    return reasoning.length > 0 ? reasoning.join("\n").trim() : output.slice(0, 300);
  }

  private extractAlternatives(output: string): Alternative[] {
    const alternatives: Alternative[] = [];
    const lines = output.split("\n");
    let inAlternatives = false;
    for (const line of lines) {
      if (line.toLowerCase().includes("alternatives:")) {
        inAlternatives = true;
        continue;
      }
      if (inAlternatives && line.trim() !== "" && !line.toLowerCase().includes("evidence:") && !line.toLowerCase().includes("conclusion")) {
        const desc = line.replace(/^[-*\d+.]\s*/, "").trim();
        if (desc) {
          alternatives.push({
            description: desc,
            impact: "unknown",
            risk: "medium",
          });
        }
      }
      if (inAlternatives && line.trim() === "") break;
    }
    return alternatives;
  }

  private extractAffectedEntities(output: string): AffectedEntity[] {
    return [];
  }

  private assessRisk(output: string): RiskAssessment {
    const lower = output.toLowerCase();
    let level: RiskLevel = "low";
    if (lower.includes("high risk") || lower.includes("significant risk")) level = "high";
    else if (lower.includes("medium risk") || lower.includes("moderate risk")) level = "medium";
    else if (lower.includes("critical risk")) level = "critical";

    const factors: string[] = [];
    if (output.includes("market volatility") || output.includes("market risk")) factors.push("Market volatility");
    if (output.includes("liquidity") && !output.includes("no liquidity")) factors.push("Liquidity concerns");
    if (output.includes("regulatory") || output.includes("compliance")) factors.push("Regulatory considerations");

    return {
      level,
      score: level === "critical" ? 0.9 : level === "high" ? 0.7 : level === "medium" ? 0.4 : 0.1,
      factors: factors.length > 0 ? factors : ["Standard advisory risk"],
    };
  }

  private extractSources(output: string): string[] {
    const sources: string[] = ["ai_model_analysis"];
    return sources;
  }

  private determineReviewRequirement(risk: RiskLevel, _confidence: ConfidenceLevel, _score: number): boolean {
    return risk === "high" || risk === "critical";
  }
}
