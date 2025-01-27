import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema: schema,
  casing: "snake_case",
  logger: true,
});

export * from "drizzle-orm/sql";
export * from "./schema";
