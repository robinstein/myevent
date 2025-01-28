import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { validateVerificationCode } from "@/lib/auth/email-verification";
import { createSession, generateSessionToken } from "@/lib/auth/sessions";
import { getCachedSession, setSessionTokenCookie } from "@/lib/auth/cookies";
import { createUser, getUserByEmail, updateUser } from "@/repositories/user";
import { generateId } from "@/utils/random";
import { addYears } from "date-fns";

export async function POST(req: NextRequest) {
  const { user } = await getCachedSession();
  const cookieStore = await cookies();
  const { email, code } = await req.json();

  let redirectUrl = cookieStore.get("redirect_to_url")?.value ?? "/app";

  if (!email || !code) {
    console.error("Invalid state or code. Redirecting to login...");

    return new Response(null, {
      status: 320,
      headers: {
        Location: `/login?error=AUTH_CODE_ERROR&redirectTo=${encodeURIComponent(
          redirectUrl
        )}`,
      },
    });
  }

  const verificationCode = await validateVerificationCode(email, code);
  if (!verificationCode) {
    console.error("Invalid code...");

    // TODO: Handle redirect
    return new Response(null, {
      status: 320,
      headers: {
        Location: `/login?error=INVALID_EMAIL_CODE&redirectTo=${encodeURIComponent(
          redirectUrl
        )}`,
      },
    });
  }

  try {
    let myeventUser = null;
    try {
      myeventUser = await getUserByEmail(verificationCode.email);
    } catch {}

    const userId = user?.id ?? generateId(16);

    if (myeventUser) {
      if (user) {
        await updateUser(userId, {
          email: verificationCode.email,
          emailVerified: true,
        });
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl,
        },
      });
    }

    await createUser({
      id: userId,
      email: verificationCode.email,
      emailVerified: true,
    });

    redirectUrl = "/onboarding";

    cookieStore.set("preferred-signin-method", "email", {
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
