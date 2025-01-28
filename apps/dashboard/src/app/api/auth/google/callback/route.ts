import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getGoogleUser, google } from "@/lib/auth/providers";
import { createSession, generateSessionToken } from "@/lib/auth/sessions";
import { getCachedSession, setSessionTokenCookie } from "@/lib/auth/cookies";
import { generateId } from "@/utils/random";
import { createUser, getUserByGoogleId, updateUser } from "@/repositories/user";
import { addYears } from "date-fns";

export async function GET(req: NextRequest) {
  const { user } = await getCachedSession();
  const cookieStore = await cookies();

  const { code, state } = Object.fromEntries(
    req.nextUrl.searchParams.entries()
  );
  const storedState = cookieStore.get("google_oauth_state")?.value ?? null;
  const codeVerifier = cookieStore.get("google_code_verifier")?.value ?? null;
  let redirectUrl = cookieStore.get("redirect_to_url")?.value ?? "/app";

  if (
    !code ||
    !state ||
    !storedState ||
    !codeVerifier ||
    state !== storedState
  ) {
    console.error("Invalid state or code. Redirecting to login...");

    return new Response(null, {
      status: 200,
      headers: {
        Location: `/login?error=AUTH_CODE_ERROR&redirectTo=${encodeURIComponent(
          redirectUrl
        )}`,
      },
    });
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    const googleUser = await getGoogleUser(accessToken);
    if (!googleUser) {
      throw new Error("An Error occurred. Try again...");
    }

    const myeventUser = await getUserByGoogleId(googleUser.id);
    const userId = user?.id ?? generateId(16);

    if (myeventUser) {
      if (googleUser.picture) {
        await updateUser(myeventUser.id, { avatarUrl: googleUser.picture });
      }
    } else {
      if (user) {
        await updateUser(user.id, { googleId: googleUser.id });

        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectUrl,
          },
        });
      }

      await createUser({
        id: userId,
        email: googleUser.email,
        name: googleUser.name,
        emailVerified: googleUser.verified_email,
        avatarUrl: googleUser.picture,
        googleId: googleUser.id,
      });

      redirectUrl = "/onboarding";
    }

    cookieStore.set("preferred-signin-method", "google", {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      expires: addYears(new Date(), 1),
    });

    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, userId);
    await setSessionTokenCookie(sessionToken, session.expiresAt);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
      },
    });
  } catch (err) {
    console.error({ err });

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?error=AUTH_CODE_ERROR&redirectTo=${encodeURIComponent(
          redirectUrl
        )}`,
      },
    });
  }
}
