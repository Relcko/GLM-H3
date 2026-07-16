"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { EASE_LUX } from "@/lib/motion";
import { usePropertyDetail } from "@/marketplace/hooks/usePropertyDetail";
import { useCollections } from "@/marketplace/hooks/useCollections";
import { PropertyGallery } from "./PropertyGallery";
import { PropertyHeader } from "./PropertyHeader";
import { InvestmentSummary } from "./InvestmentSummary";
import { PropertyMetrics } from "./PropertyMetrics";
import { FundingProgress } from "./FundingProgress";
import { DocumentList } from "./DocumentList";
import { Amenities } from "./Amenities";
import { PropertyTimeline } from "./PropertyTimeline";
import { OwnershipStructure } from "./OwnershipStructure";
import { RiskDisclosure } from "./RiskDisclosure";
import { Faq } from "./Faq";
import { InvestmentPanel } from "./InvestmentPanel";
import { RelatedProperties } from "./RelatedProperties";
import { DetailSection } from "./primitives";
import { EmptyState } from "../EmptyState";

export function PropertyDetailView({ slug }: { slug: string }) {
  const { status, property, related, error, retry } = usePropertyDetail(slug);
  const collections = useCollections();

  useEffect(() => {
    if (status === "populated" && property) {
      collections.recordView(property.id);
    }
    // record once per property load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, property?.id]);

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-28 sm:px-8 md:px-12 lg:px-16">
        <div className="h-10 w-40 animate-pulse rounded bg-white/[0.05]" />
        <div className="mt-6 aspect-[16/9] w-full animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />
          </div>
          <div className="h-96 animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-28 sm:px-8 md:px-12 lg:px-16">
        <EmptyState variant="error" onRetry={retry} />
      </div>
    );
  }

  if (status === "not-found" || !property) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-28 sm:px-8 md:px-12 lg:px-16">
        <EmptyState variant="empty" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE_LUX }}
      className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-28 sm:px-8 md:px-12 lg:px-16"
    >
      <PropertyHeader
        property={property}
        isBookmarked={collections.isBookmarked(property.id)}
        isFavourite={collections.isFavourite(property.id)}
        isWatched={collections.isWatched(property.id)}
        onToggleBookmark={() => collections.toggleBookmark(property.id)}
        onToggleFavorite={() => collections.toggleFavorite(property.id)}
        onToggleWatch={() => collections.toggleWatch(property.id)}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          <PropertyGallery images={property.images} name={property.name} />

          <DetailSection label="Overview" title="About this asset">
            <p className="text-sm leading-relaxed text-white/60">
              {property.description}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/45">
              Backed by the Relcko SPV structure and tokenized on-chain, {property.name}{" "}
              offers fractional, liquid ownership with monthly distributions and
              institutional-grade custody.
            </p>
          </DetailSection>

          <DetailSection label="Investment Summary" title="Headline figures">
            <InvestmentSummary property={property} />
          </DetailSection>

          <DetailSection label="Funding" title="Funding progress">
            <FundingProgress property={property} />
          </DetailSection>

          <DetailSection label="Metrics" title="Property metrics">
            <PropertyMetrics property={property} />
          </DetailSection>

          <DetailSection label="Amenities" title="Features & amenities">
            <Amenities groups={property.amenities} />
          </DetailSection>

          <DetailSection label="Ownership" title="Ownership & SPV structure">
            <OwnershipStructure ownership={property.ownership} />
          </DetailSection>

          <DetailSection label="Documents" title="Property documents">
            <DocumentList documents={property.documents} />
          </DetailSection>

          <DetailSection label="Timeline" title="Asset lifecycle">
            <PropertyTimeline events={property.timeline} />
          </DetailSection>

          <DetailSection label="Risk" title="Risk disclosure">
            <RiskDisclosure risk={property.risk} />
          </DetailSection>

          <DetailSection label="FAQ" title="Frequently asked">
            <Faq items={property.faq} />
          </DetailSection>
        </div>

        {/* Sticky investment panel */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <InvestmentPanel property={property} />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <div className="dashboard-label mb-4">Related Properties</div>
          <RelatedProperties
            properties={related}
            isBookmarked={collections.isBookmarked}
            onToggleBookmark={collections.toggleBookmark}
          />
        </section>
      )}
    </motion.div>
  );
}
