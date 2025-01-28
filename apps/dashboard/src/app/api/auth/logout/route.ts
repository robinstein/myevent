import { deleteSessionTokenCookie } from "@/lib/auth/cookies";
import type { NextRequest } from "next/server";

export async function GET(_: NextRequest) {
  await deleteSessionTokenCookie();

  return new Response(null, {
    status: 302,
    headers: { Location: "/login" },
  });
}
