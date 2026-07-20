import { timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";

export class AuthenticationError extends Error {
  readonly statusCode = 401;
  readonly code = "UNAUTHENTICATED";
  constructor(message = "Authentication required") {
    super(message);
  }
}

export class AuthorizationError extends Error {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";
  constructor(message = "Access denied") {
    super(message);
  }
}

export class ConfigurationError extends Error {
  readonly statusCode = 500;
  readonly code = "MISCONFIGURATION";
  constructor(message: string) {
    super(message);
  }
}

export interface AuthenticatedAccount {
  readonly id: string;
  readonly email: string;
  readonly role: string;
}

let internalAuthSecret: string | undefined;

export function initInternalAuth(): void {
  const secret = process.env.INTERNAL_AUTH_SECRET;
  if (!secret) {
    throw new ConfigurationError(
      "INTERNAL_AUTH_SECRET is not set. " +
      "In production, set INTERNAL_AUTH_SECRET to a strong random value. " +
      "In development, create a .env file with INTERNAL_AUTH_SECRET=<your-secret>. " +
      "To rotate: update the secret in all running instances and in your .env. " +
      "Old tokens are immediately rejected after rotation."
    );
  }
  if (secret.length < 32) {
    throw new ConfigurationError(
      "INTERNAL_AUTH_SECRET must be at least 32 characters long for security. " +
      "Generate a strong secret with: openssl rand -hex 16"
    );
  }
  internalAuthSecret = secret;
}

function getInternalAuthSecret(): string {
  if (internalAuthSecret) return internalAuthSecret;
  const fallback = process.env.INTERNAL_AUTH_SECRET;
  if (fallback) return fallback;
  throw new ConfigurationError("INTERNAL_AUTH_SECRET is not set");
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function bearerToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (!auth) return undefined;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? undefined;
}

export function internalAuthToken(request: Request): string | undefined {
  const auth = request.headers.get("x-internal-authorization");
  if (!auth) return undefined;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? undefined;
}

export function assertInternalRequest(request: Request): void {
  const token = internalAuthToken(request);
  const secret = getInternalAuthSecret();
  if (!token || !constantTimeEqual(token, secret)) {
    throw new AuthorizationError("Only the payment subsystem may advance settlement states");
  }
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedAccount> {
  const token = bearerToken(request);
  if (!token) {
    throw new AuthenticationError("Missing or invalid Authorization header — use Bearer <token>");
  }

  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) {
    throw new AuthenticationError("Session not found — token may be invalid or revoked");
  }
  if (session.expiresAt < new Date()) {
    throw new AuthenticationError("Session has expired — please re-authenticate");
  }

  const account = await prisma.account.findUnique({ where: { id: session.accountId } });
  if (!account) {
    throw new AuthenticationError("Account not found");
  }

  return { id: account.id, email: account.email, role: account.role };
}
