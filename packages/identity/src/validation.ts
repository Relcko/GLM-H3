import { z } from "zod";
import {
  addressSchema,
  chainIdSchema,
  entityIdSchema,
  parseWith,
  roleSchema,
} from "@relcko/validation";
import { MfaLevel } from "@relcko/permission";
import { AccountType, WalletProviderKind } from "./types";

/**
 * Identity DTO schemas. Branded primitives (address/chainId/entityId) are
 * REUSED from the shared `@relcko/validation` package — no duplication. Only
 * identity-specific request/response shapes are defined here.
 */

export const mfaLevelSchema = z.nativeEnum(MfaLevel);

export const challengeWalletSchema = z.object({
  address: addressSchema,
  chainId: chainIdSchema,
  provider: z.nativeEnum(WalletProviderKind),
});

export const loginWithWalletSchema = z.object({
  address: addressSchema,
  chainId: chainIdSchema,
  provider: z.nativeEnum(WalletProviderKind),
  message: z.string().min(1),
  nonce: z.string().min(1),
  signature: z.string().min(1),
  publicKey: z.string().min(1),
  deviceFingerprint: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

export const loginWithEmailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  deviceFingerprint: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

export const linkWalletSchema = z.object({
  accountId: entityIdSchema,
  address: addressSchema,
  chainId: chainIdSchema,
  provider: z.nativeEnum(WalletProviderKind),
  message: z.string().min(1),
  nonce: z.string().min(1),
  signature: z.string().min(1),
  publicKey: z.string().min(1),
});

export const linkEmailSchema = z.object({
  accountId: entityIdSchema,
  email: z.string().email(),
  password: z.string().min(8),
});

export const mfaVerifySchema = z.object({
  accountId: entityIdSchema,
  code: z.string().min(4).max(12),
});

export const updateAccountSchema = z.object({
  email: z.string().email().optional(),
  mfaLevel: mfaLevelSchema.optional(),
  verification: z
    .enum(["unverified", "partial", "verified"])
    .optional(),
});

export const createOrganizationSchema = z.object({
  accountId: entityIdSchema,
  legalName: z.string().min(1),
  jurisdiction: z.string().min(1),
  kind: z.union([z.literal(AccountType.Institutional), z.literal(AccountType.Corporate)]),
  memberAccountIds: z.array(entityIdSchema).default([]),
});

export const addGuardianSchema = z.object({
  accountId: entityIdSchema,
  guardianAccountId: entityIdSchema,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  sessionId: entityIdSchema,
});

export const parseChallengeWallet = (d: unknown) => parseWith(challengeWalletSchema, d);
export const parseLoginWithWallet = (d: unknown) => parseWith(loginWithWalletSchema, d);
export const parseLoginWithEmail = (d: unknown) => parseWith(loginWithEmailSchema, d);
export const parseLinkWallet = (d: unknown) => parseWith(linkWalletSchema, d);
export const parseLinkEmail = (d: unknown) => parseWith(linkEmailSchema, d);
export const parseMfaVerify = (d: unknown) => parseWith(mfaVerifySchema, d);
export const parseUpdateAccount = (d: unknown) => parseWith(updateAccountSchema, d);
export const parseCreateOrganization = (d: unknown) => parseWith(createOrganizationSchema, d);
export const parseAddGuardian = (d: unknown) => parseWith(addGuardianSchema, d);
export const parseRefresh = (d: unknown) => parseWith(refreshSchema, d);
export const parseLogout = (d: unknown) => parseWith(logoutSchema, d);

export { roleSchema };
