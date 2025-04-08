import {
  deleteRedirectUrlCookie,
  deleteSessionTokenCookie,
  getCachedSession,
} from "@/lib/auth/cookies";
import { AUTH_REDIRECTS, invalidateSession } from "@myevent/auth";
import { createRedirectResponse } from "@myevent/utils";

export async function GET() {
  const { session } = await getCachedSession();

  if (session) {
    await deleteRedirectUrlCookie();

    await invalidateSession(session.id);
    await deleteSessionTokenCookie();
  }

  return createRedirectResponse(AUTH_REDIRECTS.LOGIN);
}
