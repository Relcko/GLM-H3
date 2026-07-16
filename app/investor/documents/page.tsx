"use client";

import { useDocuments, useDocumentCategories } from "@/lib/investor/adapters";
import { DocumentList } from "@/components/investor/DocumentList";
import { PageHeader } from "@/components/shared/layout/PageHeader";
import { Tabs } from "@/components/shared/ui/Tabs";
import { SectionLoading } from "@/components/shared/loading/Skeleton";
import { EmptyState } from "@/components/shared/error/EmptyState";
import { ErrorBoundary } from "@/components/shared/error/ErrorBoundary";

function DocumentsContent() {
  const { data: documents, isLoading: docLoading } = useDocuments();
  const { data: categories, isLoading: catLoading } = useDocumentCategories();

  if (docLoading || catLoading) return <SectionLoading />;

  if (!documents || documents.length === 0) {
    return <EmptyState title="No documents" description="Documents will appear here once you start investing." />;
  }

  return (
    <Tabs
      tabs={[
        { id: "all", label: "All", content: <DocumentList documents={documents} />, badge: documents.length },
        ...(categories ?? []).filter((c) => c.id !== "all").map((cat) => ({
          id: cat.id,
          label: cat.label,
          content: <DocumentList documents={documents.filter((d) => d.type === cat.id)} />,
          badge: documents.filter((d) => d.type === cat.id).length || undefined,
        })),
      ]}
    />
  );
}

export default function DocumentsPage() {
  return (
    <div>
      <PageHeader
        title="Documents"
        description="Access your investment documents and reports"
        breadcrumbs={[
          { label: "Investor Portal", href: "/investor" },
          { label: "Documents", href: "/investor/documents" },
        ]}
      />
      <ErrorBoundary context="investor-documents">
        <DocumentsContent />
      </ErrorBoundary>
    </div>
  );
}
