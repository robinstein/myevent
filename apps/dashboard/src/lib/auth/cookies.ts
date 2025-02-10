import { cookies } from "next/headers";
import { cache } from "react";
import { validateSession } from "@myevent/core";

const COOKIE_BASE_OPTIONS = {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};

async function setSessionTokenCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    ...COOKIE_BASE_OPTIONS,
    sameSite: "lax",
    expires: expiresAt,
  });
}

export type SignInMethod = "google" | "linkedin" | "otp";
async function setPreferredSignInMethodCookie(
  method: SignInMethod,
  expiresAt: Date
) {
  const cookieStore = await cookies();

  cookieStore.set("preferred-signin-method", method, {
    ...COOKIE_BASE_OPTIONS,
    expires: expiresAt,
  });
}

async function deleteSessionTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    ...COOKIE_BASE_OPTIONS,
    sameSite: "lax",
    maxAge: 0,
  });
}

async function fetchFreshSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  return validateSession(sessionToken);
}

const getCachedSession = cache(fetchFreshSession);

export {
  COOKIE_BASE_OPTIONS,
  setSessionTokenCookie,
  setPreferredSignInMethodCookie,
  deleteSessionTokenCookie,
  fetchFreshSession,
  getCachedSession,
};
