import { encodeBase64 } from "@oslojs/encoding";
import { db, eq, webauthnCredentials } from "@myevent/db";
import { redis, setToCache } from "@myevent/kv";

export const CHALLENGE = {
  EXPIRY_SECONDS: 60 * 2,
  PREFIX: "webauthn:challenge",
} as const;

export async function createWebAuthnChallenge(): Promise<Uint8Array> {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const encoded = encodeBase64(challenge);
  const challengeId = `${CHALLENGE.PREFIX}:${encoded}`;

  const timestamp = Date.now();
  await setToCache<string>(
    challengeId,
    timestamp.toString(),
    CHALLENGE.EXPIRY_SECONDS
  );
  return challenge;
}

export async function verifyWebAuthnChallenge(
  challenge: Uint8Array
): Promise<boolean> {
  const encoded = encodeBase64(challenge);
  const challengeId = `${CHALLENGE.PREFIX}:${encoded}`;

  const timestamp = (await redis.get(challengeId)) as string;
  if (!timestamp) return false;

  // Verify challenge hasn't expired
  const challengeAge = Date.now() - Number.parseInt(timestamp);
  if (challengeAge > CHALLENGE.EXPIRY_SECONDS * 1000) {
    await setToCache<string>(challengeId, "", 0);
    return false;
  }

  // Invalidate challenge
  await setToCache<string>(challengeId, "", 0);
  return true;
}

export async function createPasskeyCredential(
  credential: WebAuthnUserCredential
): Promise<void> {
  await db.insert(webauthnCredentials).values({
    id: encodeBase64(credential.id),
    userId: credential.userId,
    name: credential.name,
    credentialId: encodeBase64(credential.id),
    publicKey: encodeBase64(credential.publicKey),
    algorithm: credential.algorithmId,
  });
}

export async function getUserPasskeyCredential(
  userId: string,
  credentialId: Uint8Array
) {
  const encodedId = encodeBase64(credentialId);
  return db.query.webauthnCredentials.findFirst({
    where: (credentials) =>
      eq(credentials.userId, userId) && eq(credentials.credentialId, encodedId),
  });
}

export async function getUserPasskeyCredentials(userId: string) {
  return db.query.webauthnCredentials.findMany({
    where: () => eq(webauthnCredentials.userId, userId),
  });
}

export async function getPasskeyCredential(credentialId: Uint8Array) {
  const encodedId = encodeBase64(credentialId);
  return db.query.webauthnCredentials.findFirst({
    where: (credentials) => eq(webauthnCredentials.credentialId, encodedId),
  });
}

export async function deleteUserPasskeyCredential(
  userId: string,
  credentialId: Uint8Array
) {
  const encodedId = encodeBase64(credentialId);
  await db
    .delete(webauthnCredentials)
    .where(
      eq(webauthnCredentials.userId, userId) &&
        eq(webauthnCredentials.credentialId, encodedId)
    );
}

export async function deletePasskeyById(userId: string, credentialId: string) {
  await db
    .delete(webauthnCredentials)
    .where(
      eq(webauthnCredentials.userId, userId) &&
        eq(webauthnCredentials.id, credentialId)
    );
}

export interface WebAuthnUserCredential {
  id: Uint8Array;
  userId: string;
  name: string;
  algorithmId: number;
  publicKey: Uint8Array;
}
