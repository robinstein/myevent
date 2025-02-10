import {
  boolean,
  pgTable as table,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createUpdateSchema } from "drizzle-zod";
import type { z } from "zod";

const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp({ mode: "date" })
    .$onUpdate(() => new Date())
    .notNull(),
};

export const users = table("users", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name"),
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  mobile: varchar({ length: 255 }).unique(),
  mobileVerified: boolean().default(false).notNull(),
  avatarUrl: varchar({ length: 255 }),
  biography: varchar("biography"),
  role: varchar({ length: 255 }).default("visitor").notNull(),
  onboardingCompleted: boolean().default(false).notNull(),
  googleId: varchar("google_id", { length: 255 }),
  linkedinId: varchar("linkedin_id", { length: 255 }),
  linkedinVanityName: varchar("linkedin_vanity_name"),
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorRecoveryCode: varchar("two_factor_recovery_code", {
    length: 255,
  }).notNull(),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = Omit<
  typeof users.$inferInsert,
  "twoFactorRecoveryCode"
> & {
  twoFactorRecoveryCode?: string;
};

export const UpdateUserSchema = createUpdateSchema(users).omit({
  id: true,
  email: true,
  emailVerified: true,
  mobile: true,
  mobileVerified: true,
  onboardingCompleted: true,
  googleId: true,
  linkedinId: true,
  linkedinVanityName: true,
  twoFactorSecret: true,
  twoFactorRecoveryCode: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
