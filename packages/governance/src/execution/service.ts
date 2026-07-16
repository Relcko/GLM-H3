import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { ExecutionRequest } from "../types";
import { ExecutionStatus, ProposalStatus } from "../types";
import { publishGovernanceEvent, GovernanceEventType } from "../events";
import { ProposalNotFoundError, ExecutionError } from "../errors";

export class ExecutionOrchestrator {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  queueExecution(actorId: EntityId, proposalId: EntityId): ExecutionRequest {
    const proposal = this.repository.getProposal(proposalId);
    if (!proposal) throw new ProposalNotFoundError(proposalId as string);
    if (proposal.status !== ProposalStatus.Succeeded) {
      throw new ExecutionError(
        `Proposal ${proposalId} is not in Succeeded status (status: ${proposal.status})`,
        { proposalId: proposalId as string, status: proposal.status },
      );
    }

    const request: ExecutionRequest = {
      id: generateId("execreq") as EntityId,
      proposalId,
      executorId: actorId,
      targetAddress: proposal.targetAddress ?? "",
      calldata: proposal.calldata ?? "",
      value: proposal.value ?? { amount: 0n, currency: Currency.USDT },
      status: ExecutionStatus.Queued,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveExecutionRequest(request);

    publishGovernanceEvent(this.events, GovernanceEventType.ExecutionQueued, request.id, actorId, {
      executionId: request.id as string,
      proposalId: proposalId as string,
    });

    this.logger?.info("execution queued", {
      executionId: request.id as string,
      proposalId: proposalId as string,
    });

    return request;
  }

  execute(actorId: EntityId, executionId: EntityId): ExecutionRequest {
    const request = this.repository.getExecutionRequest(executionId);
    if (!request) throw new ExecutionError(`Execution ${executionId} not found`, { executionId: executionId as string });

    const executing: ExecutionRequest = {
      ...request,
      status: ExecutionStatus.Executing,
    };
    this.repository.saveExecutionRequest(executing);

    publishGovernanceEvent(
      this.events,
      GovernanceEventType.ExecutionStarted,
      executionId,
      actorId,
      {
        executionId: executionId as string,
        proposalId: request.proposalId as string,
      },
    );

    const completed: ExecutionRequest = {
      ...executing,
      status: ExecutionStatus.Completed,
      executedAt: new Date().toISOString(),
      txHash: `0x${generateId("tx").replace(/-/g, "")}`,
    };
    this.repository.saveExecutionRequest(completed);

    publishGovernanceEvent(
      this.events,
      GovernanceEventType.ExecutionCompleted,
      executionId,
      actorId,
      {
        executionId: executionId as string,
        proposalId: request.proposalId as string,
        txHash: completed.txHash ?? "",
      },
    );

    this.logger?.info("execution completed", {
      executionId: executionId as string,
      txHash: completed.txHash,
    });

    return completed;
  }

  failExecution(actorId: EntityId, executionId: EntityId, error: string): ExecutionRequest {
    const request = this.repository.getExecutionRequest(executionId);
    if (!request) throw new ExecutionError(`Execution ${executionId} not found`, { executionId: executionId as string });

    const failed: ExecutionRequest = {
      ...request,
      status: ExecutionStatus.Failed,
      error,
    };
    this.repository.saveExecutionRequest(failed);

    publishGovernanceEvent(
      this.events,
      GovernanceEventType.ExecutionFailed,
      executionId,
      actorId,
      {
        executionId: executionId as string,
        proposalId: request.proposalId as string,
        error,
      },
    );

    this.logger?.info("execution failed", {
      executionId: executionId as string,
      error,
    });

    return failed;
  }

  getExecution(executionId: EntityId): ExecutionRequest | undefined {
    return this.repository.getExecutionRequest(executionId);
  }

  getExecutionByProposal(proposalId: EntityId): ExecutionRequest | undefined {
    return this.repository.getExecutionRequestByProposal(proposalId);
  }

  listPendingExecutions(): ExecutionRequest[] {
    return this.repository.listPendingExecutions();
  }
}
