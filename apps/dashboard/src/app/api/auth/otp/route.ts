import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email/sender";
import { sendSMS } from "@/lib/sms/sender";
import { setRedirectUrlCookie } from "@/lib/auth/cookies";
import {
  AUTH_REDIRECTS,
  COOKIE,
  requestVerificationCode,
  type VerificationCode,
} from "@myevent/auth";
import {
  contactSchema,
  getRedirectUrlFromQueryParams,
  parseUserAgent,
} from "@myevent/utils";
import { VerifyEmail } from "@myevent/email/emails/otp";

const validator = z.object({
  identifier: contactSchema,
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const heads = new Headers(await headers());
  const body = await req.json();
  const searchParams = req.nextUrl.searchParams;

  const result = validator.safeParse(body);
  if (!result.success) {
    return Response.json(result.error, {
      status: 400,
    });
  }

  const { identifier } = result.data;

  let createdCode: VerificationCode;
  try {
    createdCode = await requestVerificationCode(identifier.identifier);
  } catch (err) {
    return Response.json(
      { message: "Failed to request verification code." },
      { status: 500 }
    );
  }

  const redirectTo =
    getRedirectUrlFromQueryParams(searchParams) ??
    cookieStore.get(COOKIE.NAMES.REDIRECT_URL)?.value ??
    AUTH_REDIRECTS.DEFAULT;

  setRedirectUrlCookie(redirectTo);

  const verificationCode = createdCode.code;

  try {
    if (identifier.type === "email") {
      const userAgent = heads.get("user-agent") ?? "";
      const city = heads.get("x-vercel-ip-city") ?? "";
      const country = heads.get("x-vercel-ip-country") ?? "";

      const device = parseUserAgent(userAgent).toString();

      const location = [city, country].filter(Boolean).join(", ");

      const time = new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      }).format(Date.now());

      const sentEmail = await sendEmail({
        to: identifier.identifier,
        subject: `Verify your MyEvent Sign-in - ${verificationCode}`,
        template: VerifyEmail({
          email: identifier.identifier,
          code: verificationCode,
          redirectTo,
          attemptDetails: {
            device,
            location,
            time,
          },
        }),
      });

      if (sentEmail.error) {
        // TODO: Handle more specific errors
        switch (sentEmail.error.name) {
          default:
            return Response.json(sentEmail.error, {
              status: 500,
            });
        }
      }
    } else if (identifier.type === "phone") {
      const sentMessage = await sendSMS({
        body: `Verify your MyEvent Sign-in - ${verificationCode}`,
        to: identifier.identifier,
      });

      if (sentMessage.errorCode) {
        // TODO: Handle more specific errors
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
    } else {
      // Edge case, won't happen
      throw new Error("Invalid identifier type.");
    }

    return Response.json(
      { type: identifier.type },
      {
        status: 200,
      }
    );
  } catch (err) {
    return Response.json(
      { message: "Failed to send verification code." },
      { status: 500 }
    );
  }
}
