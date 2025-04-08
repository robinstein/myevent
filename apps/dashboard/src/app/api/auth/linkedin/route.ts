import * as arctic from "arctic";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { linkedin } from "@/lib/auth/providers";
import { setRedirectUrlCookie } from "@/lib/auth/cookies";
import { applyIpRateLimit } from "@/lib/rate-limit";
import { AUTH_REDIRECTS, COOKIE } from "@myevent/auth";
import {
  linkedinOAuthLimiter,
  createRedirectResponse,
  getRedirectUrlFromQueryParams,
} from "@myevent/utils";

const SCOPES = ["openid", "profile", "email", "r_basicprofile"];

export async function GET(req: NextRequest) {
  const headers = await req.headers;
  const searchParams = req.nextUrl.searchParams;

  const rateLimit = await applyIpRateLimit(linkedinOAuthLimiter, headers);
  if (rateLimit.throttled) {
    return rateLimit.response;
  }

  const cookieStore = await cookies();
  const state = arctic.generateState();
  const redirectTo =
    getRedirectUrlFromQueryParams(searchParams) ??
    cookieStore.get(COOKIE.NAMES.REDIRECT_URL)?.value ??
    AUTH_REDIRECTS.DEFAULT;

  const oauthUrl = linkedin.createAuthorizationURL(state, SCOPES);

  setRedirectUrlCookie(redirectTo);
  cookieStore.set(COOKIE.NAMES.OAUTH_LINKEDIN_STATE, state, {
    ...COOKIE.BASE_OPTIONS,
    maxAge: 60 * 10,
  });

  return createRedirectResponse(oauthUrl.toString());
}
