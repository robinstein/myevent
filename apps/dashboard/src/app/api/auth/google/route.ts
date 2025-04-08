import * as arctic from "arctic";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { google } from "@/lib/auth/providers";
import { setRedirectUrlCookie } from "@/lib/auth/cookies";
import { applyIpRateLimit } from "@/lib/rate-limit";
import { AUTH_REDIRECTS, COOKIE } from "@myevent/auth";
import {
  googleOAuthLimiter,
  createRedirectResponse,
  getRedirectUrlFromQueryParams,
} from "@myevent/utils";

const SCOPES = ["openid", "profile", "email"];

export async function GET(req: NextRequest) {
  const headers = await req.headers;
  const searchParams = req.nextUrl.searchParams;

  const rateLimit = await applyIpRateLimit(googleOAuthLimiter, headers);
  if (rateLimit.throttled) {
    return rateLimit.response;
  }

  const cookieStore = await cookies();
  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();
  const redirectTo =
    getRedirectUrlFromQueryParams(searchParams) ??
    cookieStore.get(COOKIE.NAMES.REDIRECT_URL)?.value ??
    AUTH_REDIRECTS.DEFAULT;

  const oauthUrl = google.createAuthorizationURL(state, codeVerifier, SCOPES);

  setRedirectUrlCookie(redirectTo);
  cookieStore.set(COOKIE.NAMES.OAUTH_GOOGLE_STATE, state, {
    ...COOKIE.BASE_OPTIONS,
    maxAge: 60 * 10,
  });
  cookieStore.set(COOKIE.NAMES.OAUTH_GOOGLE_VERIFIER, codeVerifier, {
    ...COOKIE.BASE_OPTIONS,
    maxAge: 60 * 10,
  });

  return createRedirectResponse(oauthUrl.toString());
}
