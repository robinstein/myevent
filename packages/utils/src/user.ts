import { randomInt } from "node:crypto";
import type { User } from "@myevent/db";
import { generateSecureToken } from "./id";
import { encryptString } from "./crypto";
import { encodeBase64 } from "@oslojs/encoding";

export function getS3AvatarUrl(avatarS3Key: string | null): string | null {
  return avatarS3Key && process.env.CLOUDFRONT_DOMAIN
    ? `https://${process.env.CLOUDFRONT_DOMAIN}/${avatarS3Key}`
    : null;
}

export function getUserAvatarUrl(user: User): string | null {
  return user.avatarS3Key
    ? getS3AvatarUrl(user.avatarS3Key)
    : (user.avatarUrl ?? null);
}

export function transformUser(user: User): User {
  return {
    ...user,
    avatarUrl: getUserAvatarUrl(user),
  };
}

export function getUserIdentifier({
  email,
  mobile,
}: Partial<Pick<User, "email" | "mobile">>): string {
  const identifier = email ?? mobile;
  if (!identifier) {
    throw new Error("User must have either email or mobile as identifier");
  }
  return identifier;
}

export function getUserDisplayName(user: User): string {
  if (user.name) return user.name;

  return user.email?.split("@")[0] || "User";
}

interface NameAndEmail {
  fullName: string;
  email?: string;
}
export function getUserInitials({ fullName, email }: NameAndEmail): string {
  if (!fullName) {
    return email && email.length > 0 ? email.charAt(0).toUpperCase() : "U";
  }

  const nameParts = fullName.trim().split(" ").filter(Boolean);
  if (nameParts.length === 0) {
    return "U";
  }

  const firstName = getUserForename(fullName);

  if (nameParts.length === 1 || !firstName) {
    return firstName ? firstName.charAt(0).toUpperCase() : "U";
  }

  const lastName = nameParts[nameParts.length - 1];
  if (!lastName) {
    return firstName.charAt(0).toUpperCase();
  }

  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

export function getUserForename(fullName: string): string | null {
  const name = fullName ?? null;
  if (!name) return null;

  const nameParts = name.trim().split(" ").filter(Boolean);

  return nameParts[0] ?? null;
}

export function generateSessionToken(length = 20): string {
  return generateSecureToken(length);
}

export function generateRecoveryCode(length = 10): string {
  const recoveryCode = generateSecureToken(length);
  const encrypted = encryptString(recoveryCode);

  return encodeBase64(encrypted);
}

export function generateVerificationCode(length = 6): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;

  return randomInt(min, max + 1)
    .toString()
    .padStart(length, "0");
}
