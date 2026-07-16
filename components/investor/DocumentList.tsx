"use client";

import { Card, CardContent } from "@/components/shared/ui/Card";
import { Badge } from "@/components/shared/ui/Badge";
import { Button } from "@/components/shared/ui/Button";
import { formatDate } from "@/lib/shared/format";
import type { Document } from "@/lib/investor/types";

interface Props {
  documents: Document[];
}

export function DocumentList({ documents }: Props) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-text-muted">No documents in this category.</p>
        </CardContent>
      </Card>
    );
  }

  const typeVariant: Record<string, "accent" | "info" | "success" | "warning" | "default"> = {
    agreement: "accent",
    statement: "info",
    tax: "warning",
    legal: "default",
    report: "success",
    identity: "info",
  };

  const statusVariant: Record<string, "success" | "warning" | "default"> = {
    ready: "success",
    generating: "warning",
    expired: "default",
  };

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id} variant="interactive" padding="sm">
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={typeVariant[doc.type] ?? "default"} size="sm">{doc.type}</Badge>
                  <Badge variant={statusVariant[doc.status] ?? "default"} size="sm">{doc.status}</Badge>
                  {doc.signed && <Badge variant="success" size="sm">Signed</Badge>}
                </div>
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                  <span>{doc.category}</span>
                  <span>{(doc.size / 1024 / 1024).toFixed(1)} MB</span>
                  <span>{formatDate(doc.uploadedAt)}</span>
                  {doc.propertyName && <span>{doc.propertyName}</span>}
                </div>
              </div>
              <Button variant="secondary" size="sm">Download</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
