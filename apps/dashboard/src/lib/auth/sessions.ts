import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import {
  KEYS,
  generateRandomToken,
  type RawSession,
  type Session,
} from "@myevent/core";
import { deleteFromCache, getFromCache, setToCache } from "@myevent/kv";
import {
  setPreferredSignInMethodCookie,
  setSessionTokenCookie,
  type SignInMethod,
} from "./cookies";
import { addYears } from "date-fns";

function generateSessionToken(): string {
  return generateRandomToken(20);
}

async function createSession(token: string, userId: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const currentTime = Date.now();
  const THIRTY_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 30;
  const expirationDate = new Date(currentTime + THIRTY_DAYS_IN_MS);

  const session: Session = {
    id: sessionId,
    userId,
    twoFactorVerified: false,
    expiresAt: expirationDate,
  };

  const ttl = Math.floor(session.expiresAt.getTime() / 1000);

  await setToCache<RawSession>(
    KEYS.session(session.id),
    {
      id: session.id,
      user_id: session.userId,
      two_factor_verified: session.twoFactorVerified,
      expires_at: ttl,
    },
    ttl
  );

  return session;
}

async function setSessionTwoFactorVerified(sessionId: string, verified = true) {
  const result = await getFromCache<RawSession>(KEYS.session(sessionId));
  if (!result) return;

  const session: Session = {
    id: result.id,
    userId: result.user_id,
    twoFactorVerified: result.two_factor_verified,
    expiresAt: new Date(result.expires_at * 1000),
  };

  const currentTime = Date.now();

  if (currentTime >= Number(session.expiresAt)) {
    await deleteFromCache(KEYS.session(sessionId));
    return null;
  }

  const ttl = Math.floor(session.expiresAt.getTime() / 1000);

  const updatedSession: Session = {
    ...session,
    twoFactorVerified: verified,
  };

  await setToCache<RawSession>(
    KEYS.session(sessionId),
    {
      id: updatedSession.id,
      user_id: updatedSession.userId,
      two_factor_verified: updatedSession.twoFactorVerified,
      expires_at: updatedSession.expiresAt,
    },
    ttl
  );

  return updatedSession;
}

async function initializeUserSession(userId: string, method: SignInMethod) {
  const SIGN_IN_METHOD_COOKIE_EXPIRY_YEARS = 1;
  const signInMethodCookieExpiryDate = addYears(
    new Date(),
    SIGN_IN_METHOD_COOKIE_EXPIRY_YEARS
  );

  await setPreferredSignInMethodCookie(method, signInMethodCookieExpiryDate);
  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, userId);
  await setSessionTokenCookie(sessionToken, session.expiresAt);
  return session;
}

async function invalidateSession(sessionId: string): Promise<void> {
  await deleteFromCache(KEYS.session(sessionId));
}

export {
  generateSessionToken,
  createSession,
  setSessionTwoFactorVerified,
  initializeUserSession,
  invalidateSession,
};
