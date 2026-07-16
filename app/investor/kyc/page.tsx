"use client";

import { useKYCStatus, useKYCStats } from "@/lib/investor/adapters";
import { KYCWizard } from "@/components/investor/KYCWizard";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { GridSection, GridFull, GridHalf } from "@/components/shared/layout/Grid";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";
import { formatDate } from "@/lib/shared/format";

function KYCContent() {
  const { data: kyc, isLoading: kycLoading } = useKYCStatus();
  const { data: stats, isLoading: statsLoading } = useKYCStats();

  if (kycLoading || statsLoading) return <SectionLoading />;

  return (
    <GridSection>
      <GridHalf>
        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>Complete your verification to unlock higher investment limits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {kyc && (
              <>
                <div className="flex items-center gap-3">
                  <Badge variant={kyc.status === "institutional" ? "gold" : kyc.status === "advanced" ? "success" : kyc.status === "basic" ? "info" : "warning"} size="lg">
                    {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1)}
                  </Badge>
                  {kyc.verifiedAt && <span className="text-xs text-text-muted">Verified {formatDate(kyc.verifiedAt)}</span>}
                </div>

                <div className="space-y-3">
                  {kyc.verificationSteps.map((step) => (
                    <div key={step.id} className={`flex items-center gap-3 p-3 rounded-lg ${step.current ? "bg-accent-base/10 border border-accent-base/20" : step.completed ? "bg-success-base/10" : "bg-bg-tertiary/50"}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${step.completed ? "bg-success-base text-white" : step.current ? "bg-accent-base text-white" : "bg-bg-tertiary text-text-muted"}`}>
                        {step.completed ? "✓" : step.current ? "→" : String(kyc.verificationSteps.indexOf(step) + 1)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-xs text-text-muted">{step.completed ? "Completed" : step.current ? "In progress" : "Pending"}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {kyc.documents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Submitted Documents</h4>
                    <div className="space-y-2">
                      {kyc.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-lg bg-bg-tertiary/50 px-3 py-2">
                          <div>
                            <p className="text-sm">{doc.type}</p>
                            <p className="text-xs text-text-muted">{formatDate(doc.uploadedAt)}</p>
                          </div>
                          <Badge variant={doc.status === "approved" ? "success" : doc.status === "pending" ? "warning" : "danger"} size="sm">
                            {doc.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {stats && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Platform Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-2xl font-bold">{stats.totalVerified.toLocaleString()}</p><p className="text-xs text-text-muted">Total Verified</p></div>
                <div><p className="text-2xl font-bold">{stats.pendingReview}</p><p className="text-xs text-text-muted">Pending Review</p></div>
                <div><p className="text-2xl font-bold">{stats.averageApprovalTime}</p><p className="text-xs text-text-muted">Avg. Approval Time</p></div>
              </div>
            </CardContent>
          </Card>
        )}
      </GridHalf>

      <GridHalf>
        {kyc && <KYCWizard currentStatus={kyc.status} />}
      </GridHalf>
    </GridSection>
  );
}

export default function KYCPage() {
  return (
    <div>
      <PageHeader
        title="Verification & KYC"
        description="Complete identity verification for higher investment limits"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Verification", href: "/investor/kyc" },
        ]}
      />
      <ErrorBoundary context="investor-kyc">
        <KYCContent />
      </ErrorBoundary>
    </div>
  );
}
