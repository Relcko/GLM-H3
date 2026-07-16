"use client";

import { useState } from "react";
import { Button } from "@/components/shared/ui/Button";

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  label?: string;
}

export function RetryButton({ onRetry, label = "Retry" }: RetryButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      await onRetry();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleRetry} loading={loading}>
      {label}
    </Button>
  );
}
