import { deleteFromCache, getFromCache, setToCache } from "@myevent/kv";

export interface VerificationCode {
  code: string;
  email: string;
  expiresAt: Date;
}

interface RawVerificationCode {
  code: string;
  email: string;
  expires_at: Date;
}

function generateVerificationCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const number = new DataView(bytes.buffer).getUint32(0);
  return String(number % 1000000).padStart(6, "0");
}

async function createVerificationCode(email: string) {
  const code = generateVerificationCode();

  const FIVE_MINUTES_IN_MS = 1000 * 60 * 5;
  const expirationDate = new Date(Date.now() + FIVE_MINUTES_IN_MS);

  const verificationCode: VerificationCode = {
    code,
    email,
    expiresAt: expirationDate,
  };

  await setToCache(
    `email_verification:${email}`,
    {
      code: verificationCode.code,
      email: verificationCode.email,
      expires_at: Math.floor(verificationCode.expiresAt.getTime() / 1000),
    },
    Math.floor(verificationCode.expiresAt.getTime() / 1000)
  );

  return verificationCode;
}

async function getVerificationCode(email: string) {
  const result = await getFromCache<RawVerificationCode>(
    `email_verification:${email}`
  );
  if (!result) return null;

  const verificationCode: VerificationCode = {
    code: result.code,
    email: result.email,
    expiresAt: new Date(result.expires_at.getTime() / 1000),
  };

  return verificationCode;
}

async function validateVerificationCode(
  email: string,
  code: string
): Promise<VerificationCode | null> {
  const result = await getFromCache<RawVerificationCode>(
    `email_verification:${email}`
  );
  if (!result) return null;

  const verificationCode: VerificationCode = {
    code: result.code,
    email: result.email,
    expiresAt: new Date(result.expires_at.getTime() / 1000),
  };

  if (Date.now() >= verificationCode.expiresAt.getTime()) {
    await deleteFromCache(`email_verification:${email}`);
    return null;
  }

  if (verificationCode.code !== code) {
    return null;
  }

  await deleteFromCache(`email_verification:${email}`);
  return verificationCode;
}

async function invalidateVerificationCode(email: string): Promise<void> {
  await deleteFromCache(`email_verification:${email}`);
}

async function requestNewVerificationCode(
  email: string
): Promise<VerificationCode> {
  const result = await getFromCache<RawVerificationCode>(
    `email_verification:${email}`
  );
  if (result) {
    await invalidateVerificationCode(email);
  }

  return createVerificationCode(email);
}

export {
  generateVerificationCode,
  createVerificationCode,
  getVerificationCode,
  validateVerificationCode,
  invalidateVerificationCode,
  requestNewVerificationCode,
};
