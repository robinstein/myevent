import type { NextRequest } from "next/server";
import { verifyTOTP } from "@oslojs/otp";
import { decodeBase64 } from "@oslojs/encoding";
import { z } from "zod";
import { getCachedSession } from "@/lib/auth/cookies";
import { setSessionTwoFactorVerified } from "@myevent/auth";
import { TWO_FACTOR_DEFAULT_CONFIG } from "@/lib/auth/two-factor";
import { sixDigitCodeSchema, decrypt } from "@myevent/utils";

const validator = z.object({
  code: sixDigitCodeSchema,
});

export async function POST(req: NextRequest) {
  try {
    const { user, session } = await getCachedSession();

    if (!user || !session) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!user.emailVerified && user.email) {
      return Response.json(
        { message: "Please verify your email first" },
        { status: 403 }
      );
    }
    if (!user.mobileVerified && user.mobile) {
      return Response.json(
        { message: "Please verify your mobile number first" },
        { status: 403 }
      );
    }
    if (
      session.twoFactorVerified ||
      !user.twoFactorEnabled ||
      !user.twoFactorSecret
    ) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = validator.safeParse(body);
    if (!result.success) {
      return Response.json(
        { message: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { code } = result.data;

    let key: Uint8Array;
    try {
      key = decrypt(decodeBase64(user.twoFactorSecret));
    } catch {
      return Response.json({ message: "Invalid key" }, { status: 400 });
    }

    const isValid = verifyTOTP(
      key,
      TWO_FACTOR_DEFAULT_CONFIG.period,
      TWO_FACTOR_DEFAULT_CONFIG.digits,
      code
    );

    if (!isValid) {
      return Response.json({ message: "Invalid code" }, { status: 400 });
    }

    await setSessionTwoFactorVerified(session.id);

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Two-factor verification error:", err);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
