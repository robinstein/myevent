import { deleteFromCache, getFromCache, setToCache } from "@myevent/kv";

export interface VerificationCode {
  code: string;
  identifier: string;
  expiresAt: Date;
}

interface RawVerificationCode {
  code: string;
  identifier: string;
  expires_at: Date;
}

const KEYS = {
  verification: (identifier: string) => `verification:${identifier}`,
} as const;

function generateVerificationCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const number = new DataView(bytes.buffer).getUint32(0);
  return String(number % 1000000).padStart(6, "0");
}

async function createVerificationCode(identifier: string) {
  const code = generateVerificationCode();

  const FIVE_MINUTES_IN_MS = 1000 * 60 * 5;
  const expirationDate = new Date(Date.now() + FIVE_MINUTES_IN_MS);

  const verificationCode: VerificationCode = {
    code,
    identifier,
    expiresAt: expirationDate,
  };

  // TODO
  await setToCache<RawVerificationCode>(
    KEYS.verification(identifier),
    {
      code: verificationCode.code,
      identifier: verificationCode.identifier,
      expires_at: Math.floor(verificationCode.expiresAt.getTime() / 1000),
    },
    Math.floor(verificationCode.expiresAt.getTime() / 1000)
  );

  return verificationCode;
}

async function getVerificationCode(identifier: string) {
  const result = await getFromCache<RawVerificationCode>(
    KEYS.verification(identifier)
  );
  if (!result) return null;

  const verificationCode: VerificationCode = {
    code: result.code,
    identifier: result.identifier,
    expiresAt: new Date(result.expires_at * 1000),
  };

  return verificationCode;
}

async function validateVerificationCode(
  identifier: string,
  code: string
): Promise<VerificationCode | null> {
  const result = await getFromCache<RawVerificationCode>(
    KEYS.verification(identifier)
  );
  if (!result) return null;

  const verificationCode: VerificationCode = {
    code: result.code,
    identifier: result.identifier,
    expiresAt: new Date(result.expires_at * 1000),
  };

  // TODO: Fix
  if (Date.now() >= Number(verificationCode.expiresAt)) {
    await deleteFromCache(KEYS.verification(identifier));
    return null;
  }

  if (verificationCode.code !== code) {
    return null;
  }

  await deleteFromCache(KEYS.verification(identifier));
  return verificationCode;
}

async function invalidateVerificationCode(identifier: string): Promise<void> {
  await deleteFromCache(KEYS.verification(identifier));
}

async function requestNewVerificationCode(
  identifier: string
): Promise<VerificationCode> {
  const result = await getFromCache<RawVerificationCode>(
    KEYS.verification(identifier)
  );
  if (result) {
    await invalidateVerificationCode(identifier);
  }

  return createVerificationCode(identifier);
}

export {
  generateVerificationCode,
  createVerificationCode,
  getVerificationCode,
  validateVerificationCode,
  invalidateVerificationCode,
  requestNewVerificationCode,
};
