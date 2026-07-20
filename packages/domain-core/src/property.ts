import { DomainError } from "@relcko/error";
import type { Address, Currency, EntityId, Money } from "@relcko/types";
import { generateId, money } from "@relcko/utils";
import { assertTransition, transition } from "./state-machine";

export enum PropertyStatus {
  Draft = "draft",
  Upcoming = "upcoming",
  Active = "active",
  SoldOut = "sold_out",
  Closed = "closed",
}

export enum AssetType {
  Residential = "residential",
  Commercial = "commercial",
  Land = "land",
}

const PROPERTY_TRANSITIONS: Readonly<Record<PropertyStatus, readonly PropertyStatus[]>> = {
  [PropertyStatus.Draft]: [PropertyStatus.Upcoming],
  [PropertyStatus.Upcoming]: [PropertyStatus.Active, PropertyStatus.Closed],
  [PropertyStatus.Active]: [PropertyStatus.SoldOut, PropertyStatus.Closed],
  [PropertyStatus.SoldOut]: [PropertyStatus.Closed],
  [PropertyStatus.Closed]: [],
};

export interface Property {
  readonly id: EntityId;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly location: string;
  readonly assetType: AssetType;
  readonly totalValue: Money;
  readonly tokenPrice: Money;
  readonly totalTokens: bigint;
  readonly availableTokens: bigint;
  readonly soldTokens: bigint;
  readonly expectedRoi: number;
  readonly rentalYield: number;
  readonly appreciationRate: number;
  readonly minInvestment: Money;
  readonly blockchain: string;
  readonly contractAddress: Address;
  readonly tokenId: string;
  readonly status: PropertyStatus;
  readonly images: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly spvId?: EntityId;
}

export interface CreatePropertyInput {
  slug: string;
  name: string;
  description: string;
  location: string;
  assetType: AssetType;
  totalValue: number;
  tokenPrice: number;
  totalTokens: bigint;
  currency: Currency;
  expectedRoi: number;
  rentalYield: number;
  appreciationRate: number;
  minInvestment: number;
  blockchain: string;
  contractAddress: Address;
  tokenId: string;
  images?: readonly string[];
  spvId?: EntityId;
}

export function assertPropertyInvariants(p: Property): void {
  if (p.totalTokens <= 0n) throw new DomainError("totalTokens must be > 0", "PROPERTY_TOTAL_TOKENS", { id: p.id });
  if (p.availableTokens < 0n || p.availableTokens > p.totalTokens)
    throw new DomainError("availableTokens out of range", "PROPERTY_AVAILABLE_TOKENS", { id: p.id });
  if (p.soldTokens < 0n || p.soldTokens > p.totalTokens)
    throw new DomainError("soldTokens out of range", "PROPERTY_SOLD_TOKENS", { id: p.id });
  if (p.availableTokens + p.soldTokens !== p.totalTokens)
    throw new DomainError("availableTokens + soldTokens must equal totalTokens", "PROPERTY_SUPPLY_MISMATCH", { id: p.id });
  if (p.tokenPrice.amount <= 0n) throw new DomainError("tokenPrice must be > 0", "PROPERTY_TOKEN_PRICE", { id: p.id });
  if (p.minInvestment.amount > p.totalValue.amount)
    throw new DomainError("minInvestment exceeds totalValue", "PROPERTY_MIN_INVESTMENT", { id: p.id });
}

export function createProperty(input: CreatePropertyInput, now = new Date().toISOString()): Property {
  const id = generateId("prop");
  const property: Property = {
    id,
    slug: input.slug,
    name: input.name,
    description: input.description,
    location: input.location,
    assetType: input.assetType,
    totalValue: money(input.totalValue, input.currency),
    tokenPrice: money(input.tokenPrice, input.currency),
    totalTokens: input.totalTokens,
    availableTokens: input.totalTokens,
    soldTokens: 0n,
    expectedRoi: input.expectedRoi,
    rentalYield: input.rentalYield,
    appreciationRate: input.appreciationRate,
    minInvestment: money(input.minInvestment, input.currency),
    blockchain: input.blockchain,
    contractAddress: input.contractAddress,
    tokenId: input.tokenId,
    status: PropertyStatus.Draft,
    images: input.images ?? [],
    createdAt: now,
    updatedAt: now,
    spvId: input.spvId,
  };
  assertPropertyInvariants(property);
  return property;
}

export function transitionProperty(p: Property, next: PropertyStatus): Property {
  const status = transition(PROPERTY_TRANSITIONS, p.status, next, "Property");
  return { ...p, status, updatedAt: new Date().toISOString() };
}

export function applyInvestmentToSupply(p: Property, tokens: bigint): Property {
  if (tokens > p.availableTokens)
    throw new DomainError("Cannot invest more than availableTokens", "PROPERTY_OVERSOLD", { id: p.id });
  const soldTokens = p.soldTokens + tokens;
  const availableTokens = p.availableTokens - tokens;
  const updated: Property = {
    ...p,
    soldTokens,
    availableTokens,
    status: availableTokens === 0n ? PropertyStatus.SoldOut : p.status,
    updatedAt: new Date().toISOString(),
  };
  assertPropertyInvariants(updated);
  return updated;
}

export enum FractionStatus {
  Created = "created",
  Active = "active",
  Paused = "paused",
  Retired = "retired",
}

export interface PropertyFraction {
  readonly id: EntityId;
  readonly propertyId: EntityId;
  readonly tokenId: string;
  readonly standard: string;
  readonly totalSupply: bigint;
  readonly availableSupply: bigint;
  readonly pricePerToken: Money;
  readonly paymentToken: Address;
  readonly paymentTokenDecimals: number;
  readonly metadataUri: string;
  readonly isActive: boolean;
  readonly paused: boolean;
  readonly status: FractionStatus;
  readonly createdAt: string;
}

export function assertFractionInvariants(f: PropertyFraction): void {
  if (f.totalSupply <= 0n) throw new DomainError("totalSupply must be > 0", "FRACTION_SUPPLY", { id: f.id });
  if (f.availableSupply < 0n || f.availableSupply > f.totalSupply)
    throw new DomainError("availableSupply out of range", "FRACTION_AVAILABLE", { id: f.id });
  if (f.pricePerToken.amount <= 0n) throw new DomainError("pricePerToken must be > 0", "FRACTION_PRICE", { id: f.id });
  if (!f.metadataUri) throw new DomainError("metadataUri required before active", "FRACTION_METADATA", { id: f.id });
}

export function createPropertyFraction(input: {
  propertyId: EntityId;
  tokenId: string;
  standard: string;
  totalSupply: bigint;
  pricePerToken: number;
  currency: Currency;
  paymentToken: Address;
  paymentTokenDecimals: number;
  metadataUri: string;
}): PropertyFraction {
  const id = generateId("frac");
  const fraction: PropertyFraction = {
    id,
    propertyId: input.propertyId,
    tokenId: input.tokenId,
    standard: input.standard,
    totalSupply: input.totalSupply,
    availableSupply: input.totalSupply,
    pricePerToken: money(input.pricePerToken, input.currency),
    paymentToken: input.paymentToken,
    paymentTokenDecimals: input.paymentTokenDecimals,
    metadataUri: input.metadataUri,
    isActive: false,
    paused: false,
    status: FractionStatus.Created,
    createdAt: new Date().toISOString(),
  };
  assertFractionInvariants(fraction);
  return fraction;
}

export enum SpvStatus {
  Formed = "formed",
  Active = "active",
  Dissolved = "dissolved",
}

export interface SPV {
  readonly id: EntityId;
  readonly propertyId: EntityId;
  readonly legalName: string;
  readonly jurisdiction: string;
  readonly registrationNumber: string;
  readonly governingDocumentUrl: string;
  readonly bankAccountRef: string;
  readonly status: SpvStatus;
  readonly formedAt: string;
  readonly dissolvedAt?: string;
}

export function createSpv(input: {
  propertyId: EntityId;
  legalName: string;
  jurisdiction: string;
  registrationNumber: string;
  governingDocumentUrl: string;
  bankAccountRef: string;
}): SPV {
  if (!input.legalName || !input.jurisdiction || !input.registrationNumber)
    throw new DomainError("SPV legal name, jurisdiction and registration are required", "SPV_IDENTITY", input);
  return {
    id: generateId("spv"),
    propertyId: input.propertyId,
    legalName: input.legalName,
    jurisdiction: input.jurisdiction,
    registrationNumber: input.registrationNumber,
    governingDocumentUrl: input.governingDocumentUrl,
    bankAccountRef: input.bankAccountRef,
    status: SpvStatus.Formed,
    formedAt: new Date().toISOString(),
  };
}
