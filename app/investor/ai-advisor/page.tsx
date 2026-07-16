"use client";

import { useAIRecommendations, useMarketInsights, useAIPortfolioAnalysis } from "@/lib/investor/adapters";
import { AIAdvisorPanel } from "@/components/investor/AIAdvisorPanel";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull } from "@/components/shared/layout/Grid";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Tabs } from "@/components/shared/ui/Tabs";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";
import { formatDate } from "@/lib/shared/format";

function AIAdvisorContent() {
  const { data: recommendations, isLoading: recLoading } = useAIRecommendations();
  const { data: insights, isLoading: insLoading } = useMarketInsights();
  const { data: analysis, isLoading: anLoading } = useAIPortfolioAnalysis();

  if (recLoading || insLoading || anLoading) return <SectionLoading />;

  return (
    <>
      {analysis && <AIAdvisorPanel analysis={analysis} />}
      <GridSection>
        <GridFull>
          <Tabs
            tabs={[
              {
                id: "recommendations",
                label: "Recommendations",
                content: recommendations && recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.map((rec) => (
                      <Card key={rec.id} variant="interactive">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <Badge variant={rec.impact === "high" ? "danger" : rec.impact === "medium" ? "warning" : "default"}>
                              {rec.impact}
                            </Badge>
                            <Badge variant="accent">{rec.type.replace("-", " ")}</Badge>
                            <span className="text-xs text-text-muted ml-auto">{Math.round(rec.confidence * 100)}% confidence</span>
                          </div>
                          <CardTitle className="mt-2">{rec.title}</CardTitle>
                          <CardDescription>{rec.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {rec.reasoning.length > 0 && (
                            <ul className="space-y-1">
                              {rec.reasoning.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm text-text-secondary"><span className="mt-1 block h-1.5 w-1.5 rounded-full bg-accent-base shrink-0" />{r}</li>)}
                            </ul>
                          )}
                          <p className="mt-3 text-xs text-text-muted">Generated {formatDate(rec.createdAt)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : <EmptyState title="No recommendations" description="AI analysis in progress." />,
                badge: recommendations?.length,
              },
              {
                id: "insights",
                label: "Market Insights",
                content: insights && insights.length > 0 ? (
                  <div className="space-y-4">
                    {insights.map((ins) => (
                      <Card key={ins.id} variant="interactive">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <Badge variant={ins.sentiment === "bullish" ? "success" : ins.sentiment === "bearish" ? "danger" : "default"}>
                              {ins.sentiment}
                            </Badge>
                            <Badge variant="info">{ins.category}</Badge>
                            <span className="text-xs text-text-muted ml-auto">{Math.round(ins.confidence * 100)}% confidence</span>
                          </div>
                          <CardTitle className="mt-2">{ins.title}</CardTitle>
                          <CardDescription>{ins.summary}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {ins.sources.map((s, i) => <Badge key={i} variant="default" size="sm">{s}</Badge>)}
                          </div>
                          <p className="mt-2 text-xs text-text-muted">{formatDate(ins.timestamp)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : <EmptyState title="No market insights" description="Market analysis is being updated." />,
              },
            ]}
          />
        </GridFull>
      </GridSection>
    </>
  );
}

export default function AIAdvisorPage() {
  return (
    <div>
      <PageHeader
        title="AI Advisor"
        description="AI-powered portfolio insights and recommendations"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "AI Advisor", href: "/investor/ai-advisor" },
        ]}
      />
      <ErrorBoundary context="investor-ai-advisor">
        <AIAdvisorContent />
      </ErrorBoundary>
    </div>
  );
}
