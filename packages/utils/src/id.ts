import {
  encodeBase32UpperCaseNoPadding,
  encodeBase64url,
} from "@oslojs/encoding";

const charset = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generate a random ID of specified length
 * @param length Length of the ID
 * @returns Random ID string using alphanumeric charset
 */
export function generateId(length: number): string {
  if (length < 1) return "";

  const bytes = new Uint8Array(Math.ceil(length * 1.5)); // Add extra bytes to ensure we have enough random values
  crypto.getRandomValues(bytes);

  let result = "";
  for (let i = 0; i < length && i < bytes.length; i++) {
    // Use modulo to map the random byte to our charset range
    const randomIndex = bytes[i]! % charset.length;
    result += charset.charAt(randomIndex);
  }

  return result;
}

export type TokenEncoding = "base32" | "base64url" | "hex";
/**
 * Generate a cryptographically secure random token
 * @param byteLength Length of the token in bytes (default: 16)
 * @param encoding Encoding format for the output (default: "base32")
 * @returns Encoded random token
 */
export function generateSecureToken(
  byteLength = 16,
  encoding: TokenEncoding = "base32"
): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  switch (encoding) {
    case "base32":
      return encodeBase32UpperCaseNoPadding(bytes);
    case "base64url":
      return encodeBase64url(bytes);
    case "hex":
      return Buffer.from(bytes).toString("hex");
    default:
      return encodeBase32UpperCaseNoPadding(bytes);
  }
}
