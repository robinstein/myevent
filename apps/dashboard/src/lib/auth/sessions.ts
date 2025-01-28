import { deleteFromCache, getFromCache, setToCache } from "@myevent/kv";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

interface RawSession {
  id: string;
  user_id: string;
  expires_at: Date;
}

function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

async function createSession(token: string, userId: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const THIRTY_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 30;
  const expirationDate = new Date(Date.now() + THIRTY_DAYS_IN_MS);

  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: expirationDate,
  };

  await setToCache(
    `session:${session.id}`,
    {
      id: session.id,
      user_id: session.userId,
      expires_at: Math.floor(session.expiresAt.getTime() / 1000),
    },
    Math.floor(session.expiresAt.getTime() / 1000)
  );

  return session;
}

async function validateSessionToken(token: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const result = await getFromCache<RawSession>(`session:${sessionId}`);
  if (!result) return null;
  const session: Session = {
    id: result.id,
    userId: result.user_id,
    expiresAt: new Date(result.expires_at.getTime() / 1000),
  };

  if (Date.now() >= session.expiresAt.getTime()) {
    await deleteFromCache(`session:${sessionId}`);
    return null;
  }

  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await setToCache(
      `session:${session.id}`,
      {
        id: session.id,
        user_id: session.userId,
        expires_at: Math.floor(session.expiresAt.getTime() / 1000),
      },
      Math.floor(session.expiresAt.getTime() / 1000)
    );
  }

  return session;
}

async function invalidateSession(sessionId: string): Promise<void> {
  await deleteFromCache(`session:${sessionId}`);
}

export {
  generateSessionToken,
  createSession,
  validateSessionToken,
  invalidateSession,
};
