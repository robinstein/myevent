import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { requestNewVerificationCode } from "@/lib/auth/email-verification";
import { resend } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const { email } = await req.json();

  const createdCode = await requestNewVerificationCode(email);

  cookieStore.set(
    "redirect_to_url",
    req.nextUrl.searchParams.get("redirectTo") ?? "/app",
    {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10,
    }
  );

  const verificationCode = createdCode.code;
  // TODO: Move to dedicated email template
  const sentEmail = await resend.emails.send({
    // TODO: Setup myevent.now domain
    from: "onboarding@resend.dev",
    to: email,
    subject: `Verify your myevent Sign-in - ${verificationCode}`,
    // TODO: Setup email templates
    html: `Verify Login Attempt<br /><br />We want to make sure it's really you logging in<br/><br/>Please use the following code to confirm your login attempt:<br />${verificationCode}`,
  });

  if (sentEmail.error) {
    // TODO: Handle error appropriately
    switch (sentEmail.error.name) {
      default:
        return Response.json(sentEmail.error, {
          status: 500,
        });
    }
  }

  return Response.json(null, {
    status: 200,
  });
}
