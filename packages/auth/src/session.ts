import { deleteFromCache, getFromCache, setToCache } from "@myevent/kv";
import { getUserById } from "@myevent/repositories";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { addDays, getUserIdentifier, type ToSnakeCase } from "@myevent/utils";

export const SESSION = {
  DEFAULT_EXPIRY_DAYS: 30,
  REFRESH_THRESHOLD_DAYS: 15,
} as const;

export interface Session {
  id: string;
  userId: string;
  twoFactorVerified: boolean;
  expiresAt: Date;
}

export type RedisSession = ToSnakeCase<Session>;

const getSessionKey = (id: string) => `session:${id}`;

const toRedisSession = (session: Session): RedisSession => ({
  id: session.id,
  user_id: session.userId,
  two_factor_verified: session.twoFactorVerified,
  expires_at: Math.floor(session.expiresAt.getTime() / 1000),
});

const fromRedisSession = (result: RedisSession): Session => ({
  id: result.id,
  userId: result.user_id,
  twoFactorVerified: result.two_factor_verified,
  expiresAt: new Date(result.expires_at * 1000),
});

async function validateSessionToken(token: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const result = await getFromCache<RedisSession>(getSessionKey(sessionId));
  if (!result) return null;

  const session = fromRedisSession(result);
  if (Date.now() >= session.expiresAt.getTime()) {
    await deleteFromCache(getSessionKey(sessionId));
    return null;
  }

  if (
    Date.now() >=
    session.expiresAt.getTime() -
      1000 * 60 * 60 * 24 * SESSION.REFRESH_THRESHOLD_DAYS
  ) {
    session.expiresAt = addDays(SESSION.DEFAULT_EXPIRY_DAYS);
    await setToCache(
      getSessionKey(session.id),
      toRedisSession(session),
      Math.floor(session.expiresAt.getTime() / 1000)
    );
  }

  return session;
}

/**
 * Creates a new session for a user
 * @param token The session token
 * @param userId The user ID
 * @param expiryDays Number of days until the session expires (default: 30)
 * @returns The newly created session
 */
export async function createSession(
  token: string,
  userId: string,
  expiryDays = SESSION.DEFAULT_EXPIRY_DAYS
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const expiresAt = addDays(expiryDays);

  const session: Session = {
    id: sessionId,
    userId,
    twoFactorVerified: false,
    expiresAt,
  };

  await setToCache(
    getSessionKey(session.id),
    toRedisSession(session),
    Math.floor(expiresAt.getTime() / 1000)
  );
  return session;
}

/**
 * Updates the two-factor verification status of a session
 * @param sessionId The session ID
 * @param verified Whether two-factor auth is verified (default: true)
 * @returns The updated session, or null if the session is invalid or expired
 */
export async function setSessionTwoFactorVerified(
  sessionId: string,
  verified = true
): Promise<Session | null> {
  const result = await getFromCache<RedisSession>(getSessionKey(sessionId));
  if (!result) return null;

  const session = fromRedisSession(result);
  if (Date.now() >= session.expiresAt.getTime()) {
    await deleteFromCache(getSessionKey(sessionId));
    return null;
  }

  const updatedSession = {
    ...session,
    twoFactorVerified: verified,
  } satisfies Session;

  await setToCache(
    getSessionKey(sessionId),
    toRedisSession(updatedSession),
    Math.floor(session.expiresAt.getTime() / 1000)
  );

  return updatedSession;
}

/**
 * Invalidates a user session
 * @param sessionId The session ID to invalidate
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await deleteFromCache(getSessionKey(sessionId));
}

/**
 * Validate a session token and fetch the associated user
 * @param token The session token (from cookie)
 * @returns Session and user objects, or null values if invalid
 */
export async function validateSession(token?: string) {
  if (!token) {
    return { session: null, user: null };
  }

  const session = await validateSessionToken(token);
  if (!session) {
    return { session: null, user: null };
  }

  const user = await getUserById(session.userId);
  return user
    ? { session, user: { ...user, identifier: getUserIdentifier(user) } }
    : { session: null, user: null };
}
