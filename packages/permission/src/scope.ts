import { ScopeType } from "@relcko/types";
import type { EnvironmentContext, ResourceContext, SubjectContext } from "./context";

/**
 * Evaluate whether `subject` satisfies the required `scope` for `resource`
 * under `env`. Implements PERMISSION_MODEL.md §4 scope rules.
 */
export function evaluateScope(
  scope: ScopeType,
  subject: SubjectContext,
  resource: ResourceContext | undefined,
  env: EnvironmentContext = {},
): boolean {
  switch (scope) {
    case ScopeType.Global:
      return true;
    case ScopeType.Own:
      return resource?.ownerId !== undefined && resource.ownerId === subject.id;
    case ScopeType.Team: {
      if (resource?.ownerId !== undefined && resource.ownerId === subject.id) return true;
      const team = env.teamMemberIds ?? [];
      return team.includes(subject.id) && (resource?.ownerId === undefined || team.includes(resource.ownerId));
    }
    case ScopeType.Discipline:
      // Role gate already enforced the discipline; scope further narrows when a
      // disciplineScope is declared and the resource jurisdiction is known.
      if (env.disciplineScope && resource?.jurisdiction) {
        return env.disciplineScope === resource.jurisdiction;
      }
      return true;
    case ScopeType.Grant:
      return (env.grantedActorIds ?? []).includes(subject.id);
    default:
      return false;
  }
}
