"use client";

import CinematicShell from "@/components/CinematicShell";
import { MarketplaceLayout } from "@/marketplace/components/MarketplaceLayout";

export default function MarketplacePage() {
  return (
    <CinematicShell className="bg-gradient-to-b from-[#0E0F13] via-[#0E0F13] to-[#0A0D14]">
      <MarketplaceLayout />
    </CinematicShell>
  );
}
