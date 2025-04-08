/**
 * Cookie configuration constants
 */
export const COOKIE = {
  BASE_OPTIONS: {
    PATH: "/",
    SECURE: process.env.NODE_ENV === "production",
    HTTP_ONLY: true,
    SAME_SITE: "lax" as const,
  },
  NAMES: {
    SESSION: "session",
    AUTH_METHOD: "auth_preferred_method",
    REDIRECT_URL: "redirect_uri",
    OAUTH_GOOGLE_STATE: "oauth_google_state",
    OAUTH_GOOGLE_VERIFIER: "oauth_google_verifier",
    OAUTH_LINKEDIN_STATE: "oauth_linkedin_state",
  },
};

/**
 * Standard authentication-related error codes
 */
export const AUTH_ERRORS = {
  INVALID_CODE: "INVALID_CODE",
  INVALID_STATE: "INVALID_STATE",
  AUTH_CODE_ERROR: "AUTH_CODE_ERROR",
  LINKEDIN_ALREADY_LINKED: "LINKEDIN_ALREADY_LINKED",
  VERIFICATION_REQUIRED: "VERIFICATION_REQUIRED",
  TWO_FACTOR_NOT_ENABLED: "TWO_FACTOR_NOT_ENABLED",
  TWO_FACTOR_ALREADY_VERIFIED: "TWO_FACTOR_ALREADY_VERIFIED",
};

/**
 * Auth redirection paths
 */
export const AUTH_REDIRECTS = {
  DEFAULT: "/app",
  LOGIN: "/login",
  TWO_FACTOR_VERIFY: "/two-factor/verify",
  EMAIL_VERIFY: "/verify-email",
  ONBOARDING: "/onboarding",
};

/**
 * Authentication methods supported
 */
export type SignInMethod = "google" | "linkedin" | "otp";
