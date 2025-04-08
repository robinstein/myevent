import { addYears } from "date-fns";
import {
  setPreferredSignInMethodCookie,
  setSessionTokenCookie,
} from "./cookies";
import {
  createSession,
  type SignInMethod,
  AUTH_REDIRECTS,
} from "@myevent/auth";
import type { User } from "@myevent/db";
import {
  createRedirectResponse,
  generateId,
  generateSessionToken,
} from "@myevent/utils";
import { createUser, updateUser } from "@myevent/repositories";

const SIGN_IN_METHOD_COOKIE_EXPIRY_YEARS = 1;

export async function initializeUserSession(
  userId: string,
  method?: SignInMethod
) {
  if (method) {
    const signInMethodCookieExpiryDate = addYears(
      new Date(),
      SIGN_IN_METHOD_COOKIE_EXPIRY_YEARS
    );

    await setPreferredSignInMethodCookie(method, signInMethodCookieExpiryDate);
  }

  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, userId);
  await setSessionTokenCookie(sessionToken, session.expiresAt);
  return session;
}

export async function processAuthentication(
  profileData: Record<string, string | boolean | undefined>,
  identifiedUser: User | null,
  authenticatedUser: User | null,
  destinationUrl: string,
  authMethod: SignInMethod = "otp",
  performRedirect = false
): Promise<Response> {
  try {
    const userId =
      identifiedUser?.id ?? authenticatedUser?.id ?? generateId(16);

    if (identifiedUser) {
      if (authenticatedUser) {
        await updateUser(userId, profileData);

        if (performRedirect) {
          return createRedirectResponse(destinationUrl);
        }

        return Response.json(
          {
            redirect_to: destinationUrl,
          },
          { status: 200 }
        );
      }

      await initializeUserSession(userId, authMethod);

      if (performRedirect) {
        return createRedirectResponse(destinationUrl);
      }

      return Response.json(
        {
          redirect_to: destinationUrl,
        },
        { status: 200 }
      );
    }

    try {
      await createUser({
        id: userId,
        ...profileData,
      });

      await initializeUserSession(userId, authMethod);

      if (performRedirect) {
        return createRedirectResponse(destinationUrl);
      }

      return Response.json(
        {
          redirect_to: AUTH_REDIRECTS.ONBOARDING,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("Failed to create user:", err);

      return Response.json(
        { message: "Failed to create user account" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Authentication processing error:", err);

    if (performRedirect) {
      return createRedirectResponse(destinationUrl);
    }

    return Response.json(
      {
        message: "Authentication failed",
        redirect_to: "/login?error=AUTH_ERROR",
      },
      { status: 500 }
    );
  }
}
