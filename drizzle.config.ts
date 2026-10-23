import { defineConfig } from "drizzle-kit";

// Generates SQL migrations for D1. They are applied with wrangler, not drizzle-kit:
//   pnpm db:migrate:local | pnpm db:migrate:staging | pnpm db:migrate:production
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "sqlite",
  verbose: true,
  strict: true,
});
