import type { Metadata } from "next";
import CinematicShell from "@/components/CinematicShell";
import { PropertyDetailView } from "@/marketplace/components/detail/PropertyDetailView";
import { getMarketplaceProperties } from "@/marketplace/mock";

export function generateStaticParams() {
  return getMarketplaceProperties().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = getMarketplaceProperties().find((p) => p.slug === slug);
  if (!property) {
    return { title: "Property not found" };
  }
  return {
    title: `${property.name} — ${property.city}, ${property.country}`,
    description: property.description,
    openGraph: {
      title: property.name,
      description: property.description,
      images: property.images.map((url) => ({ url })),
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <CinematicShell className="bg-gradient-to-b from-[#0E0F13] via-[#0E0F13] to-[#0A0D14]">
      <PropertyDetailView slug={slug} />
    </CinematicShell>
  );
}
