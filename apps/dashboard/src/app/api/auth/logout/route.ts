import { deleteSessionTokenCookie } from "@/lib/auth/cookies";

export async function GET() {
  await deleteSessionTokenCookie();

  return new Response(null, {
    status: 302,
    headers: { Location: "/login" },
  });
}
