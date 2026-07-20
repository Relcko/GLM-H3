import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const isSqlite = dbUrl.startsWith("file:");

export default defineConfig({
  schema: isSqlite ? "prisma/schema.sqlite.prisma" : "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});
