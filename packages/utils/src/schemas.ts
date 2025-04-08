import { z } from "zod";
import { identifyAndFormatContact } from "./validation";

export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: {
    withCountryCodeAndPlus: /^\+\d{10,15}$/,
    withCountryCodeNoPlus: /^\d{11,15}$/,
    germanLocalFormat: /^0\d{10,11}$/,
  },
  SIX_DIGIT_CODE: /^\d{6}$/,
} as const;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email format");

export const phoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      const cleaned = value.replace(/\s+/g, "").replace(/[()-]/g, "");
      return /^\+?[0-9]{10,15}$/.test(cleaned);
    },
    { message: "Invalid phone number format" }
  );

export const sixDigitCodeSchema = z
  .string()
  .length(6, "Code must be exactly 6 characters long")
  .regex(
    VALIDATION_PATTERNS.SIX_DIGIT_CODE,
    "Code must contain exactly 6 digits"
  );

export const recoveryCodeSchema = z
  .string()
  .length(16, "Recovery code must be 16 characters");

export const contactSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (VALIDATION_PATTERNS.EMAIL.test(value)) return true;

      const cleanedNumber = value.replace(/[^\d+]/g, "");
      return Object.values(VALIDATION_PATTERNS.PHONE).some((regex) =>
        regex.test(cleanedNumber)
      );
    },
    { message: "Invalid email or phone number format" }
  )
  .transform(identifyAndFormatContact);

export const identifierAndCodeSchema = z.object({
  identifier: contactSchema,
  code: sixDigitCodeSchema,
});

export const emailAndCodeSchema = z.object({
  email: emailSchema,
  code: sixDigitCodeSchema,
});
