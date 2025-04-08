import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { processAuthentication } from "@/lib/auth/sessions";
import { getCachedSession } from "@/lib/auth/cookies";
import { applyIpRateLimit } from "@/lib/rate-limit";
import {
  type SignInMethod,
  COOKIE,
  AUTH_ERRORS,
  AUTH_REDIRECTS,
  validateVerificationCode,
} from "@myevent/auth";
import { getUserByEmailOrMobile } from "@myevent/repositories";
import {
  parseQueryParams,
  identifierAndCodeSchema,
  emailAndCodeSchema,
  isValidEmail,
  otpLoginLimiter,
  createRedirectResponse,
  getRedirectUrlFromQueryParams,
} from "@myevent/utils";

const SIGN_IN_METHOD: SignInMethod = "otp";

export async function POST(req: NextRequest) {
  try {
    const headers = await req.headers;
    const searchParams = req.nextUrl.searchParams;

    const rateLimit = await applyIpRateLimit(otpLoginLimiter, headers);
    if (rateLimit.throttled) {
      return rateLimit.response;
    }

    const { user } = await getCachedSession();
    const cookieStore = await cookies();

    const redirectTo =
      getRedirectUrlFromQueryParams(searchParams) ??
      cookieStore.get(COOKIE.NAMES.REDIRECT_URL)?.value ??
      AUTH_REDIRECTS.DEFAULT;

    const body = await req.json();
    const result = identifierAndCodeSchema.safeParse(body);
    if (!result.success) {
      return Response.json(
        { message: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { identifier, code } = result.data;
    const verificationCode = await validateVerificationCode(
      identifier.identifier,
      code
    );
    if (!verificationCode) {
      return Response.json(
        { message: "Invalid verification code" },
        { status: 400 }
      );
    }

    const userDetails = isValidEmail(verificationCode.identifier)
      ? { email: verificationCode.identifier, emailVerified: true }
      : { mobile: verificationCode.identifier, mobileVerified: true };

    const existingUser = await getUserByEmailOrMobile(
      verificationCode.identifier
    ).catch(() => null);

    return processAuthentication(
      userDetails,
      existingUser,
      user,
      redirectTo,
      SIGN_IN_METHOD,
      false
    );
  } catch (err) {
    console.error("OTP verification error:", err);
    return createRedirectResponse(
      AUTH_REDIRECTS.LOGIN,
      AUTH_ERRORS.AUTH_CODE_ERROR
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const headers = await req.headers;
    const searchParams = req.nextUrl.searchParams;

    const rateLimit = await applyIpRateLimit(otpLoginLimiter, headers);
    if (rateLimit.throttled) {
      return rateLimit.response;
    }

    const { user } = await getCachedSession();
    const cookieStore = await cookies();

    const params = parseQueryParams(req.url);
    const result = emailAndCodeSchema.safeParse(params);
    if (!result.success) {
      return createRedirectResponse(
        AUTH_REDIRECTS.LOGIN,
        AUTH_ERRORS.INVALID_CODE
      );
    }

    const redirectTo =
      getRedirectUrlFromQueryParams(searchParams) ??
      cookieStore.get(COOKIE.NAMES.REDIRECT_URL)?.value ??
      AUTH_REDIRECTS.DEFAULT;

    const { email, code } = result.data;
    const verificationCode = await validateVerificationCode(email, code);
    if (!verificationCode) {
      return createRedirectResponse(
        AUTH_REDIRECTS.LOGIN,
        AUTH_ERRORS.INVALID_CODE
      );
    }

    const userDetails = {
      email: verificationCode.identifier,
      emailVerified: true,
    } as const;

    const existingUser = await getUserByEmailOrMobile(
      verificationCode.identifier
    ).catch(() => null);

    return processAuthentication(
      userDetails,
      existingUser,
      user,
      redirectTo,
      SIGN_IN_METHOD,
      true
    );
  } catch (err) {
    console.error("OTP verification error:", err);
    return createRedirectResponse(
      AUTH_REDIRECTS.LOGIN,
      AUTH_ERRORS.AUTH_CODE_ERROR
    );
  }
}
