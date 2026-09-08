import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://clinic:clinic@localhost:5432/clinic",
  },
  strict: true,
});
