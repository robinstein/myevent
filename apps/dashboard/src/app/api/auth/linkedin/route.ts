import * as arctic from "arctic";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { linkedin } from "@/lib/auth/providers";
import { COOKIE_BASE_OPTIONS } from "@/lib/auth/cookies";
import { createRedirectResponse } from "@/lib/http";

const SCOPES = ["openid", "profile", "email", "r_basicprofile"];

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const state = arctic.generateState();
  const redirectTo = req.nextUrl.searchParams.get("redirectTo") ?? "/app";

  const oauthUrl = linkedin.createAuthorizationURL(state, SCOPES);

  cookieStore.set("redirect_to_url", redirectTo, {
    ...COOKIE_BASE_OPTIONS,
    maxAge: 60 * 10,
  });
  cookieStore.set("linkedin_oauth_state", state, {
    ...COOKIE_BASE_OPTIONS,
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return createRedirectResponse(oauthUrl.toString());
}
