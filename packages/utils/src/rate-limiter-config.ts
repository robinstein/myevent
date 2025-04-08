import { TokenBucketRateLimiter } from "./rate-limiter";

export const commonLimiterConfig = {
  trpc: {
    max: 100,
    refillIntervalSeconds: 60,
  },
  otpLogin: {
    max: 5,
    refillIntervalSeconds: 60,
  },
  linkedinOAuth: {
    max: 10,
    refillIntervalSeconds: 60,
  },
  googleOAuth: {
    max: 10,
    refillIntervalSeconds: 60,
  },
} as const;

export const trpcRequestLimiter = new TokenBucketRateLimiter(
  "trpc_requests",
  commonLimiterConfig.trpc
);

export const otpLoginLimiter = new TokenBucketRateLimiter(
  "otp_login_requests",
  commonLimiterConfig.otpLogin
);

export const linkedinOAuthLimiter = new TokenBucketRateLimiter(
  "oauth2_linkedin_requests",
  commonLimiterConfig.linkedinOAuth
);

export const googleOAuthLimiter = new TokenBucketRateLimiter(
  "oauth2_google_requests",
  commonLimiterConfig.googleOAuth
);
