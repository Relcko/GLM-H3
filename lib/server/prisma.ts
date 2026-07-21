import { PrismaClient } from "@prisma/client";

export const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

export function createPrismaClient(url: string = getDatabaseUrl()): PrismaClient {
  const isSqlite = url.startsWith("file:");
  if (isSqlite) {
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
    return new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url, timeout: 5_000 }),
    });
  }
  return new PrismaClient();
}

const globalForPrisma = globalThis as unknown as { __relckoPrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__relckoPrisma ?? (globalForPrisma.__relckoPrisma = createPrismaClient());
