"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { GridSection, GridHalf } from "@/components/shared/layout/Grid";

interface PortfolioAnalysis {
  riskScore: number;
  diversificationScore: number;
  yieldScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface Props {
  analysis: PortfolioAnalysis;
}

function ScoreRing({ label, value, color }: { label: string; value: number; color: string }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 10) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="mb-2">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--color-bg-tertiary)" strokeWidth="6" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90, 48, 48)" />
        <text x="48" y="52" textAnchor="middle" className="text-lg font-bold" fill="currentColor">{value.toFixed(1)}</text>
      </svg>
      <p className="text-xs font-medium text-text-muted text-center">{label}</p>
    </div>
  );
}

export function AIAdvisorPanel({ analysis }: Props) {
  return (
    <div className="mb-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Portfolio Health Score</CardTitle>
            <Badge variant={analysis.overallScore >= 7 ? "success" : analysis.overallScore >= 5 ? "warning" : "danger"} size="lg">
              {analysis.overallScore >= 7 ? "Good" : analysis.overallScore >= 5 ? "Fair" : "Needs Attention"}
            </Badge>
          </div>
          <CardDescription>AI-powered analysis of your portfolio's risk, diversification, and yield performance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6 mb-8">
            <ScoreRing label="Risk Score" value={analysis.riskScore} color={analysis.riskScore >= 7 ? "var(--color-success-base)" : analysis.riskScore >= 5 ? "var(--color-warning-base)" : "var(--color-danger-base)"} />
            <ScoreRing label="Diversification" value={analysis.diversificationScore} color={analysis.diversificationScore >= 7 ? "var(--color-success-base)" : analysis.diversificationScore >= 5 ? "var(--color-warning-base)" : "var(--color-danger-base)"} />
            <ScoreRing label="Yield Score" value={analysis.yieldScore} color={analysis.yieldScore >= 7 ? "var(--color-success-base)" : analysis.yieldScore >= 5 ? "var(--color-warning-base)" : "var(--color-danger-base)"} />
            <ScoreRing label="Overall" value={analysis.overallScore} color={analysis.overallScore >= 7 ? "var(--color-success-base)" : analysis.overallScore >= 5 ? "var(--color-warning-base)" : "var(--color-danger-base)"} />
          </div>
          <GridSection>
            <GridHalf>
              <div className="space-y-4">
                <div><p className="text-sm font-medium text-success-base mb-2">Strengths</p><ul className="space-y-1">{analysis.strengths.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-text-secondary"><span className="mt-1 block h-1.5 w-1.5 rounded-full bg-success-base shrink-0" />{s}</li>)}</ul></div>
                <div className="mt-4"><p className="text-sm font-medium text-danger-base mb-2">Weaknesses</p><ul className="space-y-1">{analysis.weaknesses.map((w, i) => <li key={i} className="flex items-start gap-2 text-sm text-text-secondary"><span className="mt-1 block h-1.5 w-1.5 rounded-full bg-danger-base shrink-0" />{w}</li>)}</ul></div>
              </div>
            </GridHalf>
            <GridHalf>
              <div className="space-y-4">
                <div><p className="text-sm font-medium text-accent-base mb-2">Opportunities</p><ul className="space-y-1">{analysis.opportunities.map((o, i) => <li key={i} className="flex items-start gap-2 text-sm text-text-secondary"><span className="mt-1 block h-1.5 w-1.5 rounded-full bg-accent-base shrink-0" />{o}</li>)}</ul></div>
                <div className="mt-4"><p className="text-sm font-medium text-warning-base mb-2">Threats</p><ul className="space-y-1">{analysis.threats.map((t, i) => <li key={i} className="flex items-start gap-2 text-sm text-text-secondary"><span className="mt-1 block h-1.5 w-1.5 rounded-full bg-warning-base shrink-0" />{t}</li>)}</ul></div>
              </div>
            </GridHalf>
          </GridSection>
        </CardContent>
      </Card>
    </div>
  );
}
