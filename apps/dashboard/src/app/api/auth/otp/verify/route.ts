import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { validateVerificationCode } from "@/lib/auth/verification";
import { initializeUserSession } from "@/lib/auth/sessions";
import { getCachedSession, type SignInMethod } from "@/lib/auth/cookies";
import { generateId, isEmail } from "@myevent/core";
import {
  createUser,
  getUserByEmailOrMobile,
  updateUser,
} from "@myevent/repositories";
import { createRedirectResponse } from "@/lib/http";

const SIGN_IN_METHOD: SignInMethod = "otp";

const verificationSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, {
      message: "Code must be a 6-digit numeric string.",
    }),
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCachedSession();
    const cookieStore = await cookies();
    const redirectUrl = cookieStore.get("redirect_to_url")?.value ?? "/app";

    const result = verificationSchema.safeParse(await req.json());
    if (!result.success) {
      return Response.json(
        {
          error: "Validation failed",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { identifier, code } = result.data;

    const verificationCode = await validateVerificationCode(identifier, code);
    if (!verificationCode) {
      return createRedirectResponse(redirectUrl, "INVALID_EMAIL_CODE");
    }

    const userDetails = isEmail(verificationCode.identifier)
      ? { email: verificationCode.identifier, emailVerified: true }
      : { mobile: verificationCode.identifier, mobileVerified: true };

    const existingUser = await getUserByEmailOrMobile(
      verificationCode.identifier
    ).catch(() => null);
    const userId = existingUser?.id ?? user?.id ?? generateId(16);

    if (existingUser) {
      if (user) {
        await updateUser(userId, userDetails);
      }

      await initializeUserSession(userId, SIGN_IN_METHOD);
      return Response.json({ redirectTo: redirectUrl }, { status: 200 });
    }

    await createUser({
      id: userId,
      ...userDetails,
    });

    await initializeUserSession(userId, SIGN_IN_METHOD);
    return Response.json({ redirectTo: "/onboarding" }, { status: 200 });
  } catch (error) {
    console.error("OTP verification error:", error);

    return createRedirectResponse("/login", "AUTH_CODE_ERROR");
  }
}
