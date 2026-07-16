"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  voterParticipation: number;
  userVotingPower: number;
  totalVotingPower: number;
  delegatedTo: string | null;
  delegatedFrom: number;
}

interface Props {
  stats: GovernanceStats;
}

export function GovernancePanel({ stats }: Props) {
  const items = [
    { label: "Total Proposals", value: stats.totalProposals.toString() },
    { label: "Active Proposals", value: stats.activeProposals.toString(), badge: "warning" as const },
    { label: "Voter Participation", value: `${stats.voterParticipation.toFixed(1)}%` },
    { label: "Your Voting Power", value: `${(stats.userVotingPower / 1000).toFixed(1)}K RLKO` },
  ];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} variant="dashboard">
          <CardContent>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{item.label}</p>
            <p className="mt-1 text-xl font-semibold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


