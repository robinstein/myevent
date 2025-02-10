import { generateRandomToken } from "../crypto";

function generateRandomRecoveryCode(): string {
  return generateRandomToken(10);
}

export { generateRandomRecoveryCode };
