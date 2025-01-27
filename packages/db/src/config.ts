import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./packages/db/src/schema.ts",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL! },
  breakpoints: true,
  verbose: true,
});
