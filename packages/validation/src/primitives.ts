import { z } from "zod";
import {
  Currency,
  Role,
  ScopeType,
  Severity,
} from "@relcko/types";
import {
  asAddress,
  asChainId,
  asCorrelationId,
  asEntityId,
  asEventId,
  asIdempotencyKey,
  asTraceId,
  asTxHash,
  asVersion,
  isAddress,
  isEntityId,
  isTxHash,
} from "@relcko/types";

/** Primitive schemas — defined ONCE and composed everywhere (no duplication). */

export const entityIdSchema = z
  .string()
  .refine(isEntityId, { message: "Invalid EntityId" })
  .transform(asEntityId);

export const addressSchema = z
  .string()
  .refine(isAddress, { message: "Invalid Address" })
  .transform(asAddress);

export const txHashSchema = z
  .string()
  .refine(isTxHash, { message: "Invalid TxHash" })
  .transform(asTxHash);

export const chainIdSchema = z
  .number()
  .int()
  .positive()
  .transform(asChainId);

export const versionSchema = z
  .number()
  .int()
  .positive()
  .transform(asVersion);

export const correlationIdSchema = z.string().min(1).transform(asCorrelationId);
export const traceIdSchema = z.string().min(1).transform(asTraceId);
export const eventIdSchema = z.string().min(1).transform(asEventId);
export const idempotencyKeySchema = z.string().min(1).transform(asIdempotencyKey);

export const currencySchema = z.nativeEnum(Currency);
export const roleSchema = z.nativeEnum(Role);
export const scopeTypeSchema = z.nativeEnum(ScopeType);
export const severitySchema = z.nativeEnum(Severity);

export const moneySchema = z.object({
  amount: z.bigint().nonnegative(),
  currency: currencySchema,
});

export const timestampSchema = z.string().datetime();

export const metadataSchema = z.record(z.unknown()).optional();
