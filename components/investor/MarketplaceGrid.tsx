"use client";

import { useState } from "react";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/shared/ui/Select";
import { PropertyCard } from "./PropertyCard";
import type { Property } from "@/lib/investor/types";

interface Props {
  properties: Property[];
}

export function MarketplaceGrid({ properties }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = properties.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.location.city.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Search by name or city..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: "all", label: "All Types" },
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" },
            { value: "industrial", label: "Industrial" },
            { value: "mixed-use", label: "Mixed-Use" },
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "all", label: "All Status" },
            { value: "available", label: "Available" },
            { value: "partially-funded", label: "Partially Funded" },
            { value: "fully-funded", label: "Fully Funded" },
            { value: "under-development", label: "Under Development" },
            { value: "operational", label: "Operational" },
          ]}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-text-muted">No properties match your filters.</p>
        </div>
      )}
    </div>
  );
}
