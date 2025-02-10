import { deleteSessionTokenCookie } from "@/lib/auth/cookies";
import { createRedirectResponse } from "@/lib/http";

export async function GET() {
  await deleteSessionTokenCookie();

  return createRedirectResponse("/login");
}
