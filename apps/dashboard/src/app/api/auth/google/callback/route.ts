import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getGoogleUser, google } from "@/lib/auth/providers";
import { initializeUserSession } from "@/lib/auth/sessions";
import { getCachedSession, type SignInMethod } from "@/lib/auth/cookies";
import { createRedirectResponse } from "@/lib/http";
import { getDifferingValues } from "@/utils/objects";
import { generateId } from "@myevent/core";
import {
  createUser,
  getUserByGoogleId,
  updateUser,
} from "@myevent/repositories";

const SIGN_IN_METHOD: SignInMethod = "google";

const callbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().min(1, "State is required"),
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await getCachedSession();
    const cookieStore = await cookies();
    let redirectUrl = cookieStore.get("redirect_to_url")?.value ?? "/app";

    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = callbackSchema.safeParse(params);

    if (!result.success) {
      return createRedirectResponse("/login", "AUTH_CODE_ERROR");
    }

    const { code, state } = result.data;
    const storedState = cookieStore.get("google_oauth_state")?.value;
    const codeVerifier = cookieStore.get("google_code_verifier")?.value;

    if (!storedState || !codeVerifier || state !== storedState) {
      return createRedirectResponse("/login", "INVALID_STATE");
    }

    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const googleUser = await getGoogleUser(tokens.accessToken());

    if (!googleUser) {
      throw new Error("Failed to fetch Google profile");
    }

    const existingUser = await getUserByGoogleId(googleUser.id).catch(
      () => null
    );
    const userId = existingUser?.id ?? user?.id ?? generateId(16);

    const userDetails = {
      name: googleUser.name,
      avatarUrl: googleUser.picture,
      email: googleUser.email,
      emailVerified: googleUser.verified_email,
      googleId: googleUser.id,
    };

    if (existingUser) {
      const updates = getDifferingValues(existingUser, userDetails);
      if (Object.keys(updates).length > 0) {
        await updateUser(existingUser.id, updates);
      }
    } else if (user) {
      const updates = getDifferingValues(user, userDetails);
      if (Object.keys(updates).length > 0) {
        await updateUser(user.id, updates);
      }
    } else {
      await createUser({
        id: userId,
        ...userDetails,
      });

      redirectUrl = "/onboarding";
    }

    await initializeUserSession(userId, SIGN_IN_METHOD);
    return createRedirectResponse(redirectUrl);
  } catch (error) {
    console.error("Google authentication error:", error);
    return createRedirectResponse("/login", "AUTH_CODE_ERROR");
  }
}
