"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Badge } from "@/components/shared/ui/Badge";
import { useUploadDocument } from "@/lib/investor/adapters";
import { useToast } from "@/components/shared/notifications/Toast";
import type { KYCLevel } from "@/lib/investor/types";

interface Props {
  currentStatus: KYCLevel;
}

const TIERS: { level: KYCLevel; label: string; description: string; limit: string; requirements: string[] }[] = [
  { level: "basic", label: "Basic", description: "Standard investor access", limit: "$50,000 annual limit", requirements: ["Email verification", "Government ID", "Proof of address"] },
  { level: "advanced", label: "Advanced", description: "Increased investment limits", limit: "$250,000 annual limit", requirements: ["All Basic requirements", "Source of funds", "Bank statement (3 months)", "Video verification call"] },
  { level: "institutional", label: "Institutional", description: "Unlimited investment access", limit: "No annual limit", requirements: ["All Advanced requirements", "Legal entity verification", "Board resolution (if applicable)", "Compliance questionnaire", "Signed institutional agreement"] },
];

export function KYCWizard({ currentStatus }: Props) {
  const { addToast } = useToast();
  const uploadDocument = useUploadDocument();
  const [selectedTier, setSelectedTier] = useState<KYCLevel | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const currentIdx = TIERS.findIndex((t) => t.level === currentStatus);
  const availableTiers = TIERS.slice(currentIdx + 1);

  const handleUpload = async (requirement: string) => {
    setUploadingDoc(requirement);
    await new Promise((r) => setTimeout(r, 1500));
    uploadDocument.mutate(
      { type: requirement, file: new File([], "") },
      {
        onSuccess: () => {
          addToast({ title: "Document uploaded", message: `${requirement} submitted for review.`, type: "success" });
        },
      }
    );
    setUploadingDoc(null);
  };

  if (currentStatus === "institutional") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Complete</CardTitle>
          <CardDescription>You have reached the highest verification tier.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-success-base/10">
            <Badge variant="success" size="lg">Verified</Badge>
            <p className="text-sm">You have full access to all investment opportunities with no annual limit.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upgrade Verification</CardTitle>
          <CardDescription>Increase your investment limits by completing higher verification tiers.</CardDescription>
        </CardHeader>
      </Card>

      {availableTiers.map((tier) => (
        <Card key={tier.level} variant={selectedTier === tier.level ? "interactive" : "default"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{tier.label} Tier</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </div>
              <Badge variant="accent" size="lg">{tier.limit}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium mb-3">Requirements:</p>
            <ul className="space-y-2">
              {tier.requirements.map((req) => (
                <li key={req} className="flex items-center justify-between rounded-lg bg-bg-tertiary/50 px-3 py-2">
                  <span className="text-sm">{req}</span>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleUpload(req)}
                    loading={uploadingDoc === req}
                    disabled={currentStatus === "advanced" && tier.level === "advanced"}
                  >
                    Upload
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button fullWidth onClick={() => { addToast({ title: `Application submitted for ${tier.label} tier`, type: "info" }); }}>
              Apply for {tier.label}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
