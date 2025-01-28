import * as arctic from "arctic";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { google } from "@/lib/auth/providers";

const SCOPES = ["openid", "profile", "email"];

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();

  const oauthUrl = google.createAuthorizationURL(state, codeVerifier, SCOPES);

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
  cookieStore.set("google_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
  });
  cookieStore.set("google_code_verifier", codeVerifier, {
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
