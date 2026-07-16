"use client";

import { Card, CardContent, CardFooter } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Button } from "@/components/shared/ui/Button";
import { useCastVote } from "@/lib/investor/adapters";
import { formatDate, formatPercent } from "@/lib/shared/format";
import type { Proposal, VoteChoice } from "@/lib/investor/types";

interface Props {
  proposal: Proposal;
}

export function ProposalCard({ proposal }: Props) {
  const castVote = useCastVote();

  const typeVariant = {
    treasury: "accent" as const,
    parameter: "info" as const,
    upgrade: "warning" as const,
    strategic: "default" as const,
    community: "success" as const,
  };

  const statusVariant = {
    active: "success" as const,
    pending: "default" as const,
    passed: "info" as const,
    rejected: "danger" as const,
    executed: "success" as const,
    cancelled: "default" as const,
  };

  const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes || 1;
  const forPercent = (proposal.forVotes / total) * 100;

  const isActive = proposal.status === "active";

  const handleVote = (vote: VoteChoice) => {
    castVote.mutate({ proposalId: proposal.id, vote });
  };

  return (
    <Card variant={proposal.status === "active" ? "interactive" : "default"}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={typeVariant[proposal.type]} size="sm">{proposal.type}</Badge>
              <Badge variant={statusVariant[proposal.status]} size="sm">{proposal.status}</Badge>
            </div>
            <h3 className="text-base font-semibold text-text-primary">{proposal.title}</h3>
            <p className="mt-1 text-sm text-text-muted line-clamp-2">{proposal.description}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-tertiary">
            <div className="bg-success-base transition-all" style={{ width: `${(proposal.forVotes / total) * 100}%` }} />
            <div className="bg-danger-base transition-all" style={{ width: `${(proposal.againstVotes / total) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-text-muted">
            <span>For: {proposal.forVotes.toLocaleString()} ({formatPercent(proposal.forVotes / total)})</span>
            <span>Against: {proposal.againstVotes.toLocaleString()} ({formatPercent(proposal.againstVotes / total)})</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
          <span>Ends: {formatDate(proposal.endDate)}</span>
          <span>Participation: {proposal.voterParticipation.toFixed(1)}%</span>
          <span>Quorum: {formatPercent(proposal.quorum / proposal.totalVotes || 0)}</span>
          {proposal.userVote && <span className="font-medium text-accent-base">Your vote: {proposal.userVote}</span>}
        </div>
      </CardContent>
      {isActive && !proposal.userVote && (
        <CardFooter className="flex gap-2">
          <Button size="sm" variant="success" onClick={() => handleVote("for")} loading={castVote.isPending}>For</Button>
          <Button size="sm" variant="danger" onClick={() => handleVote("against")} loading={castVote.isPending}>Against</Button>
          <Button size="sm" variant="ghost" onClick={() => handleVote("abstain")} loading={castVote.isPending}>Abstain</Button>
        </CardFooter>
      )}
    </Card>
  );
}
