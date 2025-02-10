import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requestNewVerificationCode } from "@/lib/auth/verification";
import { resend } from "@/lib/clients/resend";
import { twilio } from "@/lib/clients/twilio";

const validator = z.object({
  identifier: z.string(),
  type: z.enum(["email", "phone"]),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  const parsed = validator.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { identifier, type } = parsed.data;

  const createdCode = await requestNewVerificationCode(identifier);

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

  if (type === "email") {
    // TODO: Move to dedicated email template
    const sentEmail = await resend.emails.send({
      // TODO: Setup myevent.now domain
      from: process.env.EMAIL_SENDER!,
      to: identifier,
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
  } else {
    // TODO: Move to dedicated sms sender
    const sentMessage = await twilio.messages.create({
      body: `Verify your myevent Sign-in - ${verificationCode}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: identifier,
    });

    if (sentMessage.errorCode) {
      // TODO: Handle error appropriately
      switch (sentMessage.errorCode.toString()) {
        default:
          return Response.json(
            { message: sentMessage.errorMessage },
            {
              status: 500,
            }
          );
      }
    }
  }

  return new Response(null, {
    status: 200,
  });
}
