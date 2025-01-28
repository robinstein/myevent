import * as arctic from "arctic";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { linkedin } from "@/lib/auth/providers";

const SCOPES = ["openid", "profile", "email", "r_basicprofile"];

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  const state = arctic.generateState();

  const oauthUrl = linkedin.createAuthorizationURL(state, SCOPES);

  cookieStore.set(
    "redirect_to_url",
    req.nextUrl.searchParams.get("redirectTo") ?? "/app",
    {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10,
    }
  );
  cookieStore.set("linkedin_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: oauthUrl.toString(),
    },
  });
}
