import { cookies } from "next/headers";
import { cache } from "react";
import { validateSessionToken } from "./sessions";
import { getUserById } from "@/repositories/user";

async function setSessionTokenCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });
}

async function deleteSessionTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
}

async function fetchFreshSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value ?? null;
  if (!sessionToken) return { sesson: null, user: null };

  const session = await validateSessionToken(sessionToken);
  if (!session) return { sesson: null, user: null };

  const user = await getUserById(session.userId);
  if (!user) return { sesson: null, user: null };

  return { session, user };
}

const getCachedSession = cache(fetchFreshSession);

export {
  setSessionTokenCookie,
  deleteSessionTokenCookie,
  fetchFreshSession,
  getCachedSession,
};
