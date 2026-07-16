"use client";

import { type ReactNode } from "react";
import { AppProviders } from "@/components/shared/providers/AppProviders";

export default function Providers({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
