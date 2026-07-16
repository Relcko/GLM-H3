import type { Json } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PolicyRule, PolicyEvaluationResult, PolicyCondition, AdvisorDomain } from "./types";
import { AiEventType, publishAiEvent } from "./events";
import type { AiPolicyRepository } from "./repository";
import { SYSTEM_ACTOR_ID } from "./system-actor";

export class PolicyEngine {
  constructor(
    private readonly repository: AiPolicyRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async evaluate(domain: AdvisorDomain, payload: Record<string, unknown>): Promise<PolicyEvaluationResult[]> {
    const rules = this.repository.getRulesByDomain(domain);
    const results: PolicyEvaluationResult[] = [];

    for (const rule of rules) {
      const matched = this.evaluateCondition(rule.condition, payload);
      if (matched) {
        results.push({
          rule,
          matched: true,
          action: rule.action,
          reason: `Policy ${rule.name} matched`,
        });

        try {
          await publishAiEvent(this.events, AiEventType.PolicyEvaluated, rule.id, SYSTEM_ACTOR_ID, {
            ruleId: rule.id,
            ruleName: rule.name,
            domain,
            action: rule.action,
            matched: true,
          });
        } catch (error) {
          this.logger?.warn("failed to publish policy evaluated event", { ruleId: rule.id, error: String(error) });
        }

        if (rule.action === "deny") {
          try {
            await publishAiEvent(this.events, AiEventType.PolicyViolation, rule.id, SYSTEM_ACTOR_ID, {
              ruleId: rule.id,
              ruleName: rule.name,
              domain,
              payload,
            } as Json);
          } catch (error) {
            this.logger?.warn("failed to publish policy violation event", { ruleId: rule.id, error: String(error) });
          }
        }
      }
    }

    return results;
  }

  private evaluateCondition(condition: PolicyCondition, payload: Record<string, unknown>): boolean {
    const value = payload[condition.field];
    const target = condition.value;

    switch (condition.operator) {
      case "eq": return value === target;
      case "neq": return value !== target;
      case "gt": return typeof value === "number" && typeof target === "number" && value > target;
      case "gte": return typeof value === "number" && typeof target === "number" && value >= target;
      case "lt": return typeof value === "number" && typeof target === "number" && value < target;
      case "lte": return typeof value === "number" && typeof target === "number" && value <= target;
      case "in": return Array.isArray(target) && target.includes(value);
      case "not_in": return Array.isArray(target) && !target.includes(value);
      case "contains": return typeof value === "string" && typeof target === "string" && value.includes(target);
      case "matches":
        return typeof value === "string" && typeof target === "string" && this.safeRegexTest(target, value);
      default: return false;
    }
  }

  private static readonly MAX_PATTERN_LENGTH = 1000;
  private static readonly MAX_INPUT_LENGTH = 200;

  private safeRegexTest(pattern: string, input: string): boolean {
    if (pattern.length > PolicyEngine.MAX_PATTERN_LENGTH) {
      this.logger?.warn("policy matches pattern exceeds max length", { length: pattern.length });
      return false;
    }
    if (input.length > PolicyEngine.MAX_INPUT_LENGTH) {
      this.logger?.warn("policy matches input exceeds max length", { length: input.length });
      return false;
    }
    try {
      return new RegExp(pattern).test(input);
    } catch {
      this.logger?.warn("invalid regex pattern in policy matches", { pattern });
      return false;
    }
  }
}
