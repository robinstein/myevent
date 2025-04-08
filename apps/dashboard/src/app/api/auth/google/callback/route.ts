import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getGoogleUser, google } from "@/lib/auth/providers";
import { initializeUserSession } from "@/lib/auth/sessions";
import { getCachedSession, deleteRedirectUrlCookie } from "@/lib/auth/cookies";
import { applyIpRateLimit } from "@/lib/rate-limit";
import {
  getDifferingValues,
  generateId,
  parseQueryParams,
  googleOAuthLimiter,
  createRedirectResponse,
} from "@myevent/utils";
import {
  createUser,
  getUserByEmail,
  getUserByGoogleId,
  updateUser,
} from "@myevent/repositories";
import {
  AUTH_ERRORS,
  AUTH_REDIRECTS,
  COOKIE,
  type SignInMethod,
} from "@myevent/auth";

const SIGN_IN_METHOD: SignInMethod = "google";

const callbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().min(1, "State is required"),
});

export async function GET(req: NextRequest) {
  const headers = await req.headers;

  const rateLimit = await applyIpRateLimit(googleOAuthLimiter, headers);
  if (rateLimit.throttled) {
    return rateLimit.response;
  }

  try {
    const { user } = await getCachedSession();
    const cookieStore = await cookies();
    let redirectUrl =
      cookieStore.get(COOKIE.NAMES.REDIRECT_URL)?.value ??
      AUTH_REDIRECTS.DEFAULT;

    await deleteRedirectUrlCookie();

    const params = parseQueryParams(req.url);
    const result = callbackSchema.safeParse(params);
    if (!result.success) {
      return createRedirectResponse(
        AUTH_REDIRECTS.LOGIN,
        AUTH_ERRORS.AUTH_CODE_ERROR
      );
    }

    const { code, state } = result.data;
    const storedState = cookieStore.get(COOKIE.NAMES.OAUTH_GOOGLE_STATE)?.value;
    const codeVerifier = cookieStore.get(
      COOKIE.NAMES.OAUTH_GOOGLE_VERIFIER
    )?.value;

    if (!storedState || !codeVerifier || state !== storedState) {
      return createRedirectResponse(
        AUTH_REDIRECTS.LOGIN,
        AUTH_ERRORS.INVALID_STATE
      );
    }

    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();
    const googleUser = await getGoogleUser(accessToken);
    if (!googleUser) {
      throw new Error("Failed to fetch Google profile data from API");
    }

    const [existingUserById, existingUserByEmail] = await Promise.all([
      getUserByGoogleId(googleUser.id).catch(() => null),
      googleUser.email
        ? getUserByEmail(googleUser.email).catch(() => null)
        : null,
    ]);

    const existingUser = existingUserById || existingUserByEmail;
    const userId = existingUser?.id ?? user?.id ?? generateId(16);

    const userDetails = {
      name: googleUser.name,
      avatarUrl: googleUser.picture,
      email: googleUser.email,
      emailVerified: googleUser.verified_email,
      googleId: googleUser.id,
    };

    if (existingUser) {
      const updates = getDifferingValues(existingUser, {
        name: existingUser.name || userDetails.name,
        avatarUrl: existingUser.avatarUrl || userDetails.avatarUrl,
        email: existingUser.email || userDetails.email,
        emailVerified: existingUser.emailVerified || userDetails.emailVerified,
        googleId: userDetails.googleId,
      });

      if (Object.keys(updates).length > 0) {
        await updateUser(existingUser.id, updates);
      }
    } else if (user) {
      const updates = getDifferingValues(user, {
        name: user.name || userDetails.name,
        avatarUrl: user.avatarUrl || userDetails.avatarUrl,
        email: user.email || userDetails.email,
        emailVerified: user.emailVerified || userDetails.emailVerified,
        googleId: userDetails.googleId,
      });

      if (Object.keys(updates).length > 0) {
        await updateUser(user.id, updates);
      }
    } else {
      try {
        await createUser({
          id: userId,
          ...userDetails,
        });

        redirectUrl = AUTH_REDIRECTS.ONBOARDING;
      } catch (err) {
        console.error(`Failed to create user: ${err}`);
        throw new Error(`User creation failed: ${err}`);
      }
    }

    await initializeUserSession(userId, SIGN_IN_METHOD);
    return createRedirectResponse(redirectUrl);
  } catch (err) {
    console.error(
      "Google authentication error:",
      err instanceof Error ? err.message : String(err)
    );
    return createRedirectResponse(
      AUTH_REDIRECTS.LOGIN,
      AUTH_ERRORS.AUTH_CODE_ERROR
    );
  }
}
