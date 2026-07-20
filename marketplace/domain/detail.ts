/**
 * Marketplace detail-only domain entities.
 *
 * These describe the secondary information surfaces of a property (documents,
 * amenities, lifecycle timeline, FAQ, risk disclosure, ownership structure).
 * They are display projections of the canonical Property / SPV entities and
 * contain no business logic. Mock seed data is generated deterministically
 * from the base property attributes (see marketplace/mock).
 */

export type DocumentCategory =
  | "legal"
  | "financial"
  | "technical"
  | "compliance";

export interface PropertyDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  /** File kind shown to the user, e.g. "PDF". */
  kind: string;
  /** Human-readable size, e.g. "1.2 MB". */
  sizeLabel: string;
  url: string;
  /** Whether the document is publicly downloadable. */
  public: boolean;
}

export interface PropertyAmenityGroup {
  category: string;
  items: string[];
}

export type TimelineStatus = "done" | "active" | "upcoming";

export interface PropertyTimelineEvent {
  /** ISO date. */
  date: string;
  title: string;
  description: string;
  status: TimelineStatus;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export type RiskLevel = "low" | "moderate" | "elevated";

export interface RiskDisclosure {
  level: RiskLevel;
  summary: string;
  items: string[];
}

export interface OwnershipStructure {
  /** Human label for the holding model, e.g. "SPV-backed fractional title". */
  model: string;
  spvLegalName: string;
  jurisdiction: string;
  registrationNumber: string;
  beneficialHolders: number;
  tokenStandard: string;
  /** Custody arrangement description. */
  custody: string;
}

export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  legal: "Legal",
  financial: "Financial",
  technical: "Technical",
  compliance: "Compliance",
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
};
