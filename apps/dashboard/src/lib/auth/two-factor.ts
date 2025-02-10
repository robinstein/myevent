import { encodeBase64 } from "@oslojs/encoding";
import { createTOTPKeyURI } from "@oslojs/otp";

interface TOTPConfig {
  issuer: string;
  period: number;
  digits: number;
}

const DEFAULT_CONFIG: TOTPConfig = {
  issuer: "myevent",
  period: 30,
  digits: 6,
};

function generateTOTPKey(): Uint8Array {
  const KEY_LENGTH = 20;
  const totpKey = new Uint8Array(KEY_LENGTH);
  crypto.getRandomValues(totpKey);
  return totpKey;
}

function generateTOTPData(
  identifier: string,
  config: Partial<TOTPConfig> = {}
) {
  const { issuer, period, digits } = { ...DEFAULT_CONFIG, ...config };
  const totpKey = generateTOTPKey();
  const encodedKey = encodeBase64(totpKey);
  const keyURI = createTOTPKeyURI(issuer, identifier, totpKey, period, digits);

  return {
    key: totpKey,
    encodedKey,
    uri: keyURI,
  };
}

export {
  DEFAULT_CONFIG as TWO_FACTOR_DEFAULT_CONFIG,
  generateTOTPKey,
  generateTOTPData,
};
export type { TOTPConfig };
