import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import * as arctic from "arctic";
import { z } from "zod";
import {
  getLinkedinProfile,
  linkedin,
  LinkedinUserSchema,
} from "@/lib/auth/providers";
import { initializeUserSession } from "@/lib/auth/sessions";
import { getCachedSession, type SignInMethod } from "@/lib/auth/cookies";
import { createRedirectResponse } from "@/lib/http";
import { getDifferingValues } from "@/utils/objects";
import { generateId } from "@myevent/core";
import {
  getUserByLinkedinId,
  updateUser,
  createUser,
} from "@myevent/repositories";

const SIGN_IN_METHOD: SignInMethod = "linkedin";

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
    const storedState = cookieStore.get("linkedin_oauth_state")?.value;

    if (!storedState || state !== storedState) {
      return createRedirectResponse("/login", "INVALID_STATE");
    }

    const tokens = await linkedin.validateAuthorizationCode(code);
    const linkedinUser = LinkedinUserSchema.parse(
      arctic.decodeIdToken(tokens.idToken())
    );

    const linkedinProfile = await getLinkedinProfile(tokens.accessToken());
    if (!linkedinProfile) {
      throw new Error("Failed to fetch LinkedIn profile");
    }

    const existingUser = await getUserByLinkedinId(linkedinUser.sub).catch(
      () => null
    );
    const userId = existingUser?.id ?? user?.id ?? generateId(16);

    const userDetails = {
      name: linkedinUser.name,
      avatarUrl: linkedinUser.picture,
      email: linkedinUser.email,
      emailVerified: linkedinUser.email_verified,
      linkedinId: linkedinUser.sub,
      linkedinVanityName: linkedinProfile.vanityName,
      biography: linkedinProfile.localizedHeadline,
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
    console.error("LinkedIn authentication error:", error);
    return createRedirectResponse("/login", "AUTH_CODE_ERROR");
  }
}
