"use client";

import { useQuery } from "@tanstack/react-query";
import type { Property, RiskRating, PropertyType, PropertyStatus } from "../types";

const MOCK_PROPERTIES: Property[] = [
  {
    id: "prop-1", slug: "luxury-tower-manhattan", name: "Luxury Tower Manhattan",
    description: "Premium 45-story mixed-use tower in the heart of Manhattan with retail, office, and luxury residential units.",
    location: { address: "421 8th Ave", city: "New York", state: "NY", country: "USA", coordinates: { lat: 40.7527, lng: -73.9942 } },
    type: "mixed-use", status: "operational",
    valuation: { totalValue: 85_000_000, tokenPrice: 142.50, totalTokens: 596_491, availableTokens: 12_500, minimumInvestment: 1_425 },
    financials: { annualReturn: 8.5, occupancyRate: 94, grossYield: 9.2, netYield: 7.8, appreciationRate: 4.2 },
    media: { images: ["/images/properties/manhattan.jpg"], documents: [] },
    features: ["Smart Building", "LEED Certified", "24/7 Concierge", "Rooftop Terrace", "Fitness Center"],
    risk: "low", createdAt: "2024-01-15", updatedAt: "2026-06-01",
  },
  {
    id: "prop-2", slug: "silicon-valley-tech-hub", name: "Silicon Valley Tech Hub",
    description: "State-of-the-art office campus in Palo Alto serving major tech companies with flexible workspace solutions.",
    location: { address: "2500 Hanover St", city: "Palo Alto", state: "CA", country: "USA", coordinates: { lat: 37.4419, lng: -122.1430 } },
    type: "commercial", status: "operational",
    valuation: { totalValue: 62_000_000, tokenPrice: 95.00, totalTokens: 652_631, availableTokens: 28_000, minimumInvestment: 950 },
    financials: { annualReturn: 10.2, occupancyRate: 97, grossYield: 11.0, netYield: 9.5, appreciationRate: 5.8 },
    media: { images: ["/images/properties/silicon.jpg"], documents: [] },
    features: ["24/7 Access", "On-site Cafeteria", "EV Charging", "Conference Centers", "Bike Storage"],
    risk: "low", createdAt: "2024-01-10", updatedAt: "2026-06-15",
  },
  {
    id: "prop-3", slug: "miami-beachfront", name: "Miami Beachfront Residences",
    description: "Exclusive beachfront condominium development in South Beach with world-class amenities and ocean views.",
    location: { address: "1001 Collins Ave", city: "Miami Beach", state: "FL", country: "USA", coordinates: { lat: 25.7826, lng: -80.1300 } },
    type: "residential", status: "under-development",
    valuation: { totalValue: 120_000_000, tokenPrice: 210.00, totalTokens: 571_428, availableTokens: 120_000, minimumInvestment: 4_200 },
    financials: { annualReturn: 7.2, occupancyRate: 88, grossYield: 8.0, netYield: 6.5, appreciationRate: 6.5 },
    media: { images: ["/images/properties/miami.jpg"], documents: [] },
    features: ["Ocean View", "Infinity Pool", "Spa & Wellness", "Private Beach Access", "Wine Cellar"],
    risk: "medium", createdAt: "2024-03-01", updatedAt: "2026-05-20",
  },
  {
    id: "prop-4", slug: "austin-mixed-use", name: "Austin Mixed-Use Development",
    description: "Live-work-play community in East Austin with residential lofts, retail spaces, and creative offices.",
    location: { address: "1200 E 6th St", city: "Austin", state: "TX", country: "USA", coordinates: { lat: 30.2672, lng: -97.7431 } },
    type: "mixed-use", status: "partially-funded",
    valuation: { totalValue: 28_000_000, tokenPrice: 78.50, totalTokens: 356_687, availableTokens: 95_000, minimumInvestment: 785 },
    financials: { annualReturn: 11.5, occupancyRate: 82, grossYield: 12.8, netYield: 10.2, appreciationRate: 7.0 },
    media: { images: ["/images/properties/austin.jpg"], documents: [] },
    features: ["Rooftop Garden", "Coworking Space", "Retail Plaza", "Fitness Studio", "Pet Friendly"],
    risk: "medium", createdAt: "2024-04-15", updatedAt: "2026-06-10",
  },
  {
    id: "prop-5", slug: "chicago-logistics", name: "Chicago Logistics Park",
    description: "Modern industrial logistics and warehousing facility strategically located near O'Hare International Airport.",
    location: { address: "8500 W Bryn Mawr Ave", city: "Chicago", state: "IL", country: "USA", coordinates: { lat: 41.9829, lng: -87.8372 } },
    type: "industrial", status: "operational",
    valuation: { totalValue: 45_000_000, tokenPrice: 112.00, totalTokens: 401_785, availableTokens: 5_000, minimumInvestment: 1_120 },
    financials: { annualReturn: 12.0, occupancyRate: 100, grossYield: 13.5, netYield: 11.2, appreciationRate: 3.5 },
    media: { images: ["/images/properties/chicago.jpg"], documents: [] },
    features: ["28 Dock Doors", "4 Acre Yard", "ESFR Sprinkler", "Rail Served", "Cold Storage"],
    risk: "low", createdAt: "2023-10-01", updatedAt: "2026-06-18",
  },
  {
    id: "prop-6", slug: "denver-tech-campus", name: "Denver Tech Campus",
    description: "Class A office campus in Denver's RiNo district with innovative design and sustainable infrastructure.",
    location: { address: "3501 Wazee St", city: "Denver", state: "CO", country: "USA", coordinates: { lat: 39.7684, lng: -104.9788 } },
    type: "commercial", status: "available",
    valuation: { totalValue: 52_000_000, tokenPrice: 88.00, totalTokens: 590_909, availableTokens: 250_000, minimumInvestment: 880 },
    financials: { annualReturn: 9.0, occupancyRate: 75, grossYield: 9.8, netYield: 8.0, appreciationRate: 4.8 },
    media: { images: ["/images/properties/denver.jpg"], documents: [] },
    features: ["Solar Panels", "Green Roof", "Smart HVAC", "Bike Rooms", "Shower Facilities"],
    risk: "medium", createdAt: "2024-06-01", updatedAt: "2026-06-20",
  },
  {
    id: "prop-7", slug: "seattle-waterfront", name: "Seattle Waterfront Development",
    description: "Premium waterfront mixed-use development in Belltown with panoramic views of Puget Sound.",
    location: { address: "2901 Western Ave", city: "Seattle", state: "WA", country: "USA", coordinates: { lat: 47.6133, lng: -122.3506 } },
    type: "mixed-use", status: "available",
    valuation: { totalValue: 95_000_000, tokenPrice: 175.00, totalTokens: 542_857, availableTokens: 300_000, minimumInvestment: 3_500 },
    financials: { annualReturn: 8.0, occupancyRate: 70, grossYield: 8.8, netYield: 7.2, appreciationRate: 5.5 },
    media: { images: ["/images/properties/seattle.jpg"], documents: [] },
    features: ["Waterfront Views", "Marina Access", "Restaurant Row", "Rooftop Lounge", "Fitness Club"],
    risk: "medium", createdAt: "2024-07-01", updatedAt: "2026-06-22",
  },
];

export function useProperties() {
  return useQuery({
    queryKey: ["investor", "marketplace", "properties"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_PROPERTIES;
    },
    staleTime: 60_000,
  });
}

export function useProperty(slug: string) {
  return useQuery({
    queryKey: ["investor", "marketplace", "properties", slug],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      const prop = MOCK_PROPERTIES.find((p) => p.slug === slug);
      if (!prop) throw new Error("Property not found");
      return prop;
    },
    enabled: !!slug,
  });
}

export function usePropertyFilters() {
  return useQuery({
    queryKey: ["investor", "marketplace", "filters"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return {
        types: ["residential", "commercial", "industrial", "land", "mixed-use"] as PropertyType[],
        statuses: ["available", "partially-funded", "fully-funded", "under-development", "operational", "sold"] as PropertyStatus[],
        riskLevels: ["low", "medium", "high"] as RiskRating[],
        priceRange: { min: 78_500, max: 120_000_000 },
        yieldRange: { min: 6.5, max: 13.5 },
      };
    },
    staleTime: 300_000,
  });
}
