import { VALIDATION_PATTERNS, emailSchema, phoneSchema } from "./schemas";

export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function isValidPhoneNumber(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

export function formatPhoneNumber(value: string): string {
  const cleanedNumber = value.replace(/[^\d+]/g, "");

  if (cleanedNumber.startsWith("0")) {
    // Number starting with 0: convert to +49
    return `+49${cleanedNumber.substring(1)}`;
  }

  if (cleanedNumber.startsWith("+")) {
    return cleanedNumber;
  }

  return `+${cleanedNumber}`;
}

export function identifyAndFormatContact(value: string): {
  identifier: string;
  type: "email" | "phone";
} {
  if (VALIDATION_PATTERNS.EMAIL.test(value)) {
    return { identifier: value, type: "email" };
  }

  const cleanedNumber = value.replace(/[^\d+]/g, "");
  const isPhoneNumber = Object.values(VALIDATION_PATTERNS.PHONE).some((regex) =>
    regex.test(cleanedNumber)
  );

  if (isPhoneNumber) {
    return {
      identifier: formatPhoneNumber(cleanedNumber),
      type: "phone",
    };
  }

  return { identifier: value, type: "email" };
}
