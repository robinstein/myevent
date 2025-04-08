import {
  boolean,
  integer,
  pgTable as table,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createUpdateSchema } from "drizzle-zod";
import type { z } from "zod";
import type { UserRole } from "@myevent/types";

const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp({ mode: "date" })
    .$onUpdate(() => new Date())
    .notNull(),
} as const;

export const users = table("users", {
  id: varchar().primaryKey().notNull(),
  name: varchar(),
  email: varchar({ length: 255 }).unique(),
  emailVerified: boolean().default(false).notNull(),
  mobile: varchar({ length: 255 }).unique(),
  mobileVerified: boolean().default(false).notNull(),
  avatarUrl: varchar(),
  avatarS3Key: varchar("avatar_s3_key", { length: 255 }),
  biography: varchar(),
  role: varchar({ length: 255 }).default("visitor").$type<UserRole>().notNull(),
  onboardingCompleted: boolean().default(false).notNull(),
  googleId: varchar({ length: 255 }),
  linkedinId: varchar({ length: 255 }),
  linkedinVanityName: varchar(),
  twoFactorSecret: varchar({ length: 255 }),
  twoFactorEnabled: boolean().default(false).notNull(),
  twoFactorRecoveryCode: varchar({
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
  avatarS3Key: true,
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

// Add relations for users
export const usersRelations = relations(users, ({ one, many }) => ({
  webauthnCredentials: many(webauthnCredentials),
}));

export const webauthnCredentials = table("webauthn_credentials", {
  id: varchar().primaryKey(),
  userId: varchar().notNull(),
  credentialId: text().notNull(),
  name: varchar().notNull(),
  publicKey: text().notNull(),
  algorithm: integer().notNull(),
  ...timestamps,
});

export type WebAuthnCredential = typeof webauthnCredentials.$inferSelect;
export type NewWebAuthnCredential = typeof webauthnCredentials.$inferInsert;

export const webauthnCredentialsRelations = relations(
  webauthnCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [webauthnCredentials.userId],
      references: [users.id],
    }),
  })
);
