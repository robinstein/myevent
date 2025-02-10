import type { NextRequest } from "next/server";
import { verifyTOTP } from "@oslojs/otp";
import { decodeBase64 } from "@oslojs/encoding";
import { z } from "zod";
import { getCachedSession } from "@/lib/auth/cookies";
import { setSessionTwoFactorVerified } from "@/lib/auth/sessions";
import { TWO_FACTOR_DEFAULT_CONFIG } from "@/lib/auth/two-factor";
import { decrypt } from "@myevent/core";

const validator = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, {
      message: "Code must be a 6-digit numeric string.",
    }),
});

export async function POST(req: NextRequest) {
  try {
    const { session, user } = await getCachedSession();

    if (!session || !user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (
      (!user.emailVerified && !user.mobileVerified) ||
      !user.twoFactorEnabled ||
      !user.twoFactorSecret ||
      session.twoFactorVerified
    ) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const result = validator.safeParse(await req.json());
    if (!result.success) {
      return Response.json({ message: result.error.message }, { status: 400 });
    }

    const { code } = result.data;
    const decodedSecret = decrypt(decodeBase64(user.twoFactorSecret));

    const isValidCode = verifyTOTP(
      decodedSecret,
      TWO_FACTOR_DEFAULT_CONFIG.period,
      TWO_FACTOR_DEFAULT_CONFIG.digits,
      code
    );

    if (!isValidCode) {
      return Response.json({ message: "Invalid code" }, { status: 400 });
    }

    await setSessionTwoFactorVerified(session.id);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Two-factor verification error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
