import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { Team, TeamHierarchy } from "../types";
import { TeamRole, TeamStatus } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import {
  TeamNotFoundError,
  TeamMemberNotFoundError,
  DuplicateTeamMembershipError,
  CircularTeamHierarchyError,
  InactiveTeamMemberError,
  TeamOwnerInactiveError,
  ParentTeamNotFoundError,
} from "../errors";
import { TeamSchema } from "../validation";
import type { z } from "zod";

type CreateTeamInput = z.infer<typeof TeamSchema.createTeam>;
type AddMemberInput = z.infer<typeof TeamSchema.addMember>;
type RemoveMemberInput = z.infer<typeof TeamSchema.removeMember>;
type ChangeRoleInput = z.infer<typeof TeamSchema.changeRole>;
type MoveTeamInput = z.infer<typeof TeamSchema.moveTeam>;

export class TeamService {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async createTeam(actorId: EntityId, input: CreateTeamInput): Promise<Team> {
    const parsed = TeamSchema.createTeam.parse(input);

    if (parsed.parentTeamId) {
      const parent = this.repository.getTeam(parsed.parentTeamId);
      if (!parent) throw new ParentTeamNotFoundError(parsed.parentTeamId as string);
    }

    const now = new Date().toISOString();
    const team: Team = {
      id: generateId("team") as EntityId,
      name: parsed.name,
      ownerId: parsed.ownerId,
      parentTeamId: parsed.parentTeamId,
      status: TeamStatus.Active,
      metadata: {},
      createdAt: now,
    };

    this.repository.saveTeam(team);

    const ownerMember = {
      id: generateId("teammember") as EntityId,
      teamId: team.id,
      memberId: parsed.ownerId,
      role: TeamRole.Founder,
      joinedAt: now,
      active: true,
    };

    this.repository.saveMember(ownerMember);

    await publishNetworkEvent(this.events, NetworkEventType.TeamCreated, team.id, actorId, {
      teamId: team.id as string,
      name: team.name,
      ownerId: parsed.ownerId as string,
      parentTeamId: parsed.parentTeamId as string | undefined,
    });

    this.logger?.info("team created", { teamId: team.id, name: team.name });
    return team;
  }

  async addMember(actorId: EntityId, input: AddMemberInput): Promise<{
    id: EntityId;
    teamId: EntityId;
    memberId: EntityId;
    role: TeamRole;
    joinedAt: string;
    active: boolean;
  }> {
    const parsed = TeamSchema.addMember.parse(input);

    const team = this.repository.getTeam(parsed.teamId);
    if (!team) throw new TeamNotFoundError(parsed.teamId as string);

    const existing = this.repository.getMemberByTeamAndUser(parsed.teamId, parsed.memberId);
    if (existing) {
      throw new DuplicateTeamMembershipError(parsed.memberId as string, parsed.teamId as string);
    }

    const now = new Date().toISOString();
    const member = {
      id: generateId("teammember") as EntityId,
      teamId: parsed.teamId,
      memberId: parsed.memberId,
      role: parsed.role,
      joinedAt: now,
      active: true,
    };

    this.repository.saveMember(member);

    await publishNetworkEvent(this.events, NetworkEventType.TeamMemberAdded, member.id, actorId, {
      memberId: member.memberId as string,
      teamId: member.teamId as string,
      role: member.role,
    });

    this.logger?.info("team member added", { memberId: member.id, teamId: member.teamId });
    return member;
  }

  async removeMember(actorId: EntityId, input: RemoveMemberInput): Promise<void> {
    const parsed = TeamSchema.removeMember.parse(input);

    const team = this.repository.getTeam(parsed.teamId);
    if (!team) throw new TeamNotFoundError(parsed.teamId as string);

    const member = this.repository.getMemberByTeamAndUser(parsed.teamId, parsed.memberId);
    if (!member) throw new TeamMemberNotFoundError(parsed.memberId as string);

    const now = new Date().toISOString();
    const updated = { ...member, active: false, leftAt: now };
    this.repository.saveMember(updated);

    await publishNetworkEvent(this.events, NetworkEventType.TeamMemberRemoved, member.id, actorId, {
      memberId: parsed.memberId as string,
      teamId: parsed.teamId as string,
    });

    this.logger?.info("team member removed", { memberId: member.id, teamId: parsed.teamId });
  }

  async changeRole(actorId: EntityId, input: ChangeRoleInput): Promise<void> {
    const parsed = TeamSchema.changeRole.parse(input);

    const team = this.repository.getTeam(parsed.teamId);
    if (!team) throw new TeamNotFoundError(parsed.teamId as string);

    const member = this.repository.getMemberByTeamAndUser(parsed.teamId, parsed.memberId);
    if (!member) throw new TeamMemberNotFoundError(parsed.memberId as string);

    if (!member.active) throw new InactiveTeamMemberError(parsed.memberId as string);

    const updated = { ...member, role: parsed.role };
    this.repository.saveMember(updated);

    await publishNetworkEvent(this.events, NetworkEventType.TeamRoleChanged, member.id, actorId, {
      memberId: parsed.memberId as string,
      teamId: parsed.teamId as string,
      previousRole: member.role,
      newRole: parsed.role,
    });

    this.logger?.info("team role changed", { memberId: member.id, role: parsed.role });
  }

  async moveTeam(actorId: EntityId, input: MoveTeamInput): Promise<void> {
    const parsed = TeamSchema.moveTeam.parse(input);

    const team = this.repository.getTeam(parsed.teamId);
    if (!team) throw new TeamNotFoundError(parsed.teamId as string);

    if (parsed.newParentTeamId) {
      const parent = this.repository.getTeam(parsed.newParentTeamId);
      if (!parent) throw new ParentTeamNotFoundError(parsed.newParentTeamId as string);

      if (this.wouldCreateCycle(parsed.teamId, parsed.newParentTeamId)) {
        throw new CircularTeamHierarchyError(parsed.teamId as string, parsed.newParentTeamId as string);
      }
    }

    const updated: Team = { ...team, parentTeamId: parsed.newParentTeamId };
    this.repository.saveTeam(updated);

    await publishNetworkEvent(this.events, NetworkEventType.TeamMoved, team.id, actorId, {
      teamId: team.id as string,
      previousParentId: team.parentTeamId as string | undefined,
      newParentId: parsed.newParentTeamId as string | undefined,
    });

    this.logger?.info("team moved", { teamId: team.id, newParentId: parsed.newParentTeamId });
  }

  getTeam(id: EntityId): Team | undefined {
    return this.repository.getTeam(id);
  }

  listTeams(): Team[] {
    return this.repository.listTeams();
  }

  listTeamsByOwner(ownerId: EntityId): Team[] {
    return this.repository.listTeamsByOwner(ownerId);
  }

  listMembers(teamId: EntityId) {
    const team = this.repository.getTeam(teamId);
    if (!team) throw new TeamNotFoundError(teamId as string);
    return this.repository.listMembersByTeam(teamId);
  }

  listHierarchy(rootTeamId?: EntityId): TeamHierarchy[] {
    const teams = rootTeamId
      ? this.repository.listTeamsByParent(rootTeamId)
      : this.repository.listTeams().filter(t => !t.parentTeamId);

    return teams.map(team => ({
      team,
      children: this.listHierarchy(team.id),
    }));
  }

  private wouldCreateCycle(teamId: EntityId, targetParentId: EntityId): boolean {
    if (targetParentId === teamId) return true;

    let current = this.repository.getTeam(targetParentId);
    while (current?.parentTeamId) {
      if (current.parentTeamId === teamId) return true;
      current = this.repository.getTeam(current.parentTeamId);
    }

    return false;
  }
}
