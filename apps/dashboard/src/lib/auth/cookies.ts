import { cookies } from "next/headers";
import { cache } from "react";
import { validateSession, COOKIE, type SignInMethod } from "@myevent/auth";
import { transformUser } from "@myevent/utils";

export async function setSessionTokenCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE.NAMES.SESSION, token, {
    ...COOKIE.BASE_OPTIONS,
    expires: expiresAt,
  });
}

export async function deleteSessionTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE.NAMES.SESSION, "", {
    ...COOKIE.BASE_OPTIONS,
    maxAge: 0,
  });
}

export async function setRedirectUrlCookie(url: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE.NAMES.REDIRECT_URL, url, {
    ...COOKIE.BASE_OPTIONS,
    maxAge: 60 * 10,
  });
}

export async function deleteRedirectUrlCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE.NAMES.REDIRECT_URL, "", {
    ...COOKIE.BASE_OPTIONS,
    maxAge: 0,
  });
}

export async function setPreferredSignInMethodCookie(
  method: SignInMethod,
  expiresAt: Date
) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE.NAMES.AUTH_METHOD, method, {
    ...COOKIE.BASE_OPTIONS,
    expires: expiresAt,
  });
}

export async function fetchFreshSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE.NAMES.SESSION)?.value;

  const validationResult = await validateSession(sessionToken);

  if (!validationResult.user) {
    return validationResult;
  }

  return {
    ...validationResult,
    user: validationResult.user ? transformUser(validationResult.user) : null,
  };
}

export const getCachedSession = cache(fetchFreshSession);
