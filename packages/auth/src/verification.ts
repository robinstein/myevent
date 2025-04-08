import { deleteFromCache, getFromCache, setToCache } from "@myevent/kv";
import { generateVerificationCode, type ToSnakeCase } from "@myevent/utils";

const VERIFICATION_CODE_EXPIRY_SECONDS = 60 * 10;

export interface VerificationCode {
  code: string;
  identifier: string;
  expiresAt: Date;
}

type RedisVerificationCode = ToSnakeCase<VerificationCode>;

const getVerificationKey = (identifier: string) => `verification:${identifier}`;

const toRedisVerificationCode = (
  code: VerificationCode
): RedisVerificationCode => ({
  code: code.code,
  identifier: code.identifier,
  expires_at: Math.floor(code.expiresAt.getTime() / 1000),
});

const fromRedisVerificationCode = (
  result: RedisVerificationCode
): VerificationCode => ({
  code: result.code,
  identifier: result.identifier,
  expiresAt: new Date(result.expires_at * 1000),
});

/**
 * Creates a new verification code for an identifier
 * @param identifier The identifier to create the code for
 * @param expirySeconds Number of seconds until the code expires
 * @returns The newly created verification code
 */
export async function createVerificationCode(
  identifier: string,
  expirySeconds = VERIFICATION_CODE_EXPIRY_SECONDS
): Promise<VerificationCode> {
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  const verificationCode: VerificationCode = {
    code,
    identifier,
    expiresAt,
  };

  await setToCache(
    getVerificationKey(identifier),
    toRedisVerificationCode(verificationCode),
    Math.floor(expiresAt.getTime() / 1000)
  );

  return verificationCode;
}

/**
 * Retrieves a verification code for an identifier
 * @param identifier The identifier to get the code for
 * @returns The verification code if valid, null otherwise
 */
export async function getVerificationCode(
  identifier: string
): Promise<VerificationCode | null> {
  const result = await getFromCache<RedisVerificationCode>(
    getVerificationKey(identifier)
  );
  if (!result) return null;

  const verificationCode = fromRedisVerificationCode(result);
  if (Date.now() >= verificationCode.expiresAt.getTime()) {
    await deleteFromCache(getVerificationKey(identifier));
    return null;
  }

  return verificationCode;
}

/**
 * Validates a verification code for an identifier
 * @param identifier The identifier to validate the code for
 * @param code The code to validate
 * @returns The verification code if valid, null otherwise
 */
export async function validateVerificationCode(
  identifier: string,
  code: string
): Promise<VerificationCode | null> {
  const verificationCode = await getVerificationCode(identifier);
  if (!verificationCode || verificationCode.code !== code) return null;

  await deleteFromCache(getVerificationKey(identifier));
  return verificationCode;
}

/**
 * Invalidates any existing verification code for an identifier
 * @param identifier The identifier to invalidate the code for
 */
export async function invalidateVerificationCode(
  identifier: string
): Promise<void> {
  await deleteFromCache(getVerificationKey(identifier));
}

/**
 * Requests a new verification code for an identifier
 * @param identifier The identifier to request a code for
 * @param expirySeconds Number of seconds until the code expires
 * @returns The newly created verification code
 */
export async function requestVerificationCode(
  identifier: string,
  expirySeconds = VERIFICATION_CODE_EXPIRY_SECONDS
): Promise<VerificationCode> {
  await invalidateVerificationCode(identifier);
  return createVerificationCode(identifier, expirySeconds);
}
