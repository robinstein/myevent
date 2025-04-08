import type { User } from "@myevent/db";

export type UserRole = "visitor" | "investor" | "startup" | "sponsor";

export type UserIdentifier = string;
export interface UserWithIdentifier extends User {
  identifier: UserIdentifier;
}
