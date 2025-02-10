import { encodeBase32UpperCaseNoPadding } from "@oslojs/encoding";
import { randomInt } from "node:crypto";

const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
const charsetLength = charset.length;
const charsetBuffer = Buffer.from(charset);

function generateId(length: number): string {
  if (length < 1) return "";

  const buffer = Buffer.allocUnsafe(length);

  for (let i = 0; i < length; i++) {
    const randomIndex = randomInt(0, charsetLength);

    const charCode = charsetBuffer[randomIndex];
    if (charCode === undefined) {
      throw new Error(`Invalid character index: ${randomIndex}`);
    }

    buffer[i] = charCode;
  }

  return buffer.toString("utf8");
}

function generateRandomToken(byteLength = 10): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return encodeBase32UpperCaseNoPadding(bytes);
}

export { generateId, generateRandomToken };
