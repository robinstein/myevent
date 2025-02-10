import { deleteFromCache, getFromCache, setToCache } from "@myevent/kv";
import { getUserById } from "@myevent/repositories";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

export interface Session {
  id: string;
  userId: string;
  twoFactorVerified: boolean;
  expiresAt: Date;
}

export interface RawSession {
  id: string;
  user_id: string;
  two_factor_verified: boolean;
  expires_at: Date;
}

const KEYS = {
  session: (id: string) => `session:${id}`,
} as const;

async function validateSessionToken(token: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const result = await getFromCache<RawSession>(KEYS.session(sessionId));
  if (!result) return null;
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

  if (currentTime >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    const ttl = Math.floor(session.expiresAt.getTime() / 1000);

    session.expiresAt = new Date(currentTime + 1000 * 60 * 60 * 24 * 30);
    // TODO
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
  }

  return session;
}

async function validateSession(token?: string) {
  if (!token) return { session: null, user: null };

  const session = await validateSessionToken(token);
  if (!session) return { session: null, user: null };

  const user = await getUserById(session.userId);
  // TODO: Refractor
  return user
    ? { session, user: { ...user, identifier: (user.email ?? user.mobile)! } }
    : { session: null, user: null };
}

export { validateSession };
