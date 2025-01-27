import {
  boolean,
  pgTable as table,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp({ mode: "date" }).$onUpdate(() => new Date()),
};

export const users = table("users", {
  id: varchar().primaryKey(),
  name: varchar(),
  email: varchar({ length: 255 }).unique().notNull(),
  emailVerified: boolean().default(false).notNull(),
  avatarUrl: varchar({ length: 255 }),
  googleId: varchar({ length: 255 }).unique(),
  linkedinId: varchar({ length: 255 }).unique(),
  twitterId: varchar({ length: 255 }).unique(),
  linkedinVanityName: varchar(),
  linkedinHeadline: varchar(),
  onboardingCompleted: boolean().default(false).notNull(),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
