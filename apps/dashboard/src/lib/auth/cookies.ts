import { cookies } from "next/headers";
import { cache } from "react";
import { validateSession } from "@myevent/core";

async function setSessionTokenCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });
}

type SignInMethod = "google" | "linkedin" | "otp";
async function setPreferredSignInMethodCookie(
  method: SignInMethod,
  expiresAt: Date
) {
  const cookieStore = await cookies();

  cookieStore.set("preferred-signin-method", method, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    expires: expiresAt,
  });
}

async function deleteSessionTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
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
  setSessionTokenCookie,
  setPreferredSignInMethodCookie,
  deleteSessionTokenCookie,
  fetchFreshSession,
  getCachedSession,
};
