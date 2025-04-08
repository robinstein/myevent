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
import { getCachedSession, deleteRedirectUrlCookie } from "@/lib/auth/cookies";
import { applyIpRateLimit } from "@/lib/rate-limit";
import {
  getDifferingValues,
  generateId,
  parseQueryParams,
  linkedinOAuthLimiter,
  createRedirectResponse,
} from "@myevent/utils";
import {
  getUserByLinkedinId,
  updateUser,
  createUser,
  getUserByEmail,
} from "@myevent/repositories";
import {
  type SignInMethod,
  AUTH_ERRORS,
  AUTH_REDIRECTS,
  COOKIE,
} from "@myevent/auth";

const SIGN_IN_METHOD: SignInMethod = "linkedin";

const callbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().min(1, "State is required"),
});

export async function GET(req: NextRequest) {
  const headers = await req.headers;
  const searchParams = req.nextUrl.searchParams;

  const rateLimit = await applyIpRateLimit(linkedinOAuthLimiter, headers);
  if (rateLimit.throttled) {
    return rateLimit.response;
  }

  try {
    const { user } = await getCachedSession();
    const cookieStore = await cookies();
    const redirectUrl =
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
    const storedState = cookieStore.get(
      COOKIE.NAMES.OAUTH_LINKEDIN_STATE
    )?.value;

    if (!storedState || state !== storedState) {
      return createRedirectResponse(
        AUTH_REDIRECTS.LOGIN,
        AUTH_ERRORS.INVALID_STATE
      );
    }

    const tokens = await linkedin.validateAuthorizationCode(code);
    const idToken = tokens.idToken();
    const linkedinUser = LinkedinUserSchema.parse(
      arctic.decodeIdToken(idToken)
    );

    const accessToken = tokens.accessToken();
    const linkedinProfile = await getLinkedinProfile(accessToken);
    if (!linkedinProfile) {
      throw new Error("Failed to fetch LinkedIn profile data from API");
    }

    if (user) {
      const existingLinkedInUser = await getUserByLinkedinId(
        linkedinUser.sub
      ).catch(() => null);
      if (existingLinkedInUser && existingLinkedInUser.id !== user.id) {
        return createRedirectResponse(
          "/settings/integrations",
          AUTH_ERRORS.LINKEDIN_ALREADY_LINKED
        );
      }

      await updateUser(user.id, {
        linkedinId: linkedinUser.sub,
        linkedinVanityName: linkedinProfile.vanityName,
        name: user.name || linkedinUser.name,
        avatarUrl: user.avatarUrl || linkedinUser.picture,
        biography: user.biography || linkedinProfile.localizedHeadline,
      });

      return createRedirectResponse(redirectUrl);
    }

    const existingUserById = await getUserByLinkedinId(linkedinUser.sub).catch(
      () => null
    );
    if (existingUserById) {
      const updates = getDifferingValues(existingUserById, {
        name: existingUserById.name || linkedinUser.name,
        avatarUrl: existingUserById.avatarUrl || linkedinUser.picture,
        linkedinVanityName:
          existingUserById.linkedinVanityName || linkedinProfile.vanityName,
        biography:
          existingUserById.biography || linkedinProfile.localizedHeadline,
      });

      if (Object.keys(updates).length > 0) {
        await updateUser(existingUserById.id, updates);
      }

      await initializeUserSession(existingUserById.id, SIGN_IN_METHOD);
      return createRedirectResponse(redirectUrl);
    }

    if (linkedinUser.email && linkedinUser.email_verified) {
      const existingUserByEmail = await getUserByEmail(
        linkedinUser.email
      ).catch(() => null);

      if (existingUserByEmail) {
        if (existingUserByEmail.linkedinId) {
          throw new Error("LinkedIn ID mismatch");
        }

        await updateUser(existingUserByEmail.id, {
          linkedinId: linkedinUser.sub,
          linkedinVanityName: linkedinProfile.vanityName,
          name: existingUserByEmail.name || linkedinUser.name,
          avatarUrl: existingUserByEmail.avatarUrl || linkedinUser.picture,
          biography:
            existingUserByEmail.biography || linkedinProfile.localizedHeadline,
        });

        await initializeUserSession(existingUserByEmail.id, SIGN_IN_METHOD);
        return createRedirectResponse(redirectUrl);
      }
    }

    const newUserId = generateId(16);
    await createUser({
      id: newUserId,
      name: linkedinUser.name,
      avatarUrl: linkedinUser.picture,
      email: linkedinUser.email,
      emailVerified: linkedinUser.email_verified,
      linkedinId: linkedinUser.sub,
      linkedinVanityName: linkedinProfile.vanityName,
      biography: linkedinProfile.localizedHeadline,
    });

    await initializeUserSession(newUserId, SIGN_IN_METHOD);
    return createRedirectResponse(AUTH_REDIRECTS.ONBOARDING);
  } catch (err) {
    console.error("LinkedIn authentication error:", err);
    return createRedirectResponse(
      AUTH_REDIRECTS.LOGIN,
      AUTH_ERRORS.AUTH_CODE_ERROR
    );
  }
}
