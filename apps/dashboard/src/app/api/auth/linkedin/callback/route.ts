import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { addYears } from "date-fns";
import {
  getLinkedinProfile,
  linkedin,
  LinkedinUserSchema,
} from "@/lib/auth/providers";
import { createSession, generateSessionToken } from "@/lib/auth/sessions";
import { getCachedSession, setSessionTokenCookie } from "@/lib/auth/cookies";
import { generateId } from "@/utils/random";
import {
  getUserByLinkedinId,
  updateUser,
  createUser,
} from "@/repositories/user";
import * as arctic from "arctic";

export async function GET(req: NextRequest) {
  const { user } = await getCachedSession();
  const cookieStore = await cookies();

  const { code, state } = Object.fromEntries(
    req.nextUrl.searchParams.entries()
  );
  const storedState = cookieStore.get("linkedin_oauth_state")?.value ?? null;
  let redirectUrl = cookieStore.get("redirect_to_url")?.value ?? "/app";

  if (!code || !state || !storedState || state !== storedState) {
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
    const tokens = await linkedin.validateAuthorizationCode(code);
    const idToken = tokens.idToken();
    const linkedinUser = LinkedinUserSchema.parse(
      arctic.decodeIdToken(idToken)
    );

    const accessToken = tokens.accessToken();

    const myeventUser = await getUserByLinkedinId(linkedinUser.sub);
    const userId = myeventUser?.id ?? generateId(16);

    if (myeventUser) {
      if (linkedinUser.picture) {
        await updateUser(myeventUser.id, { avatarUrl: linkedinUser.picture });
      }
    } else {
      if (user) {
        await updateUser(user.id, { linkedinId: linkedinUser.sub });

        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectUrl,
          },
        });
      }

      const linkedinProfile = await getLinkedinProfile(accessToken);
      if (!linkedinProfile) {
        throw new Error("An Error occurred. Try again...");
      }

      const newUser = await createUser({
        id: userId,
        email: linkedinUser.email,
        name: linkedinUser.name,
        emailVerified: linkedinUser.email_verified,
        avatarUrl: linkedinUser.picture,
        linkedinId: linkedinUser.sub,
        linkedinVanityName: linkedinProfile.vanityName,
        linkedinHeadline: linkedinProfile.localizedHeadline,
      });

      redirectUrl = "/onboarding";
    }

    cookieStore.set("preferred-signin-method", "linkedin", {
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
