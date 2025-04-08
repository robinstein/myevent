import type { NextRequest } from "next/server";
import { decodeBase64, encodeBase64 } from "@oslojs/encoding";
import { verifyTOTP } from "@oslojs/otp";
import { z } from "zod";
import { getCachedSession } from "@/lib/auth/cookies";
import { TWO_FACTOR_DEFAULT_CONFIG } from "@/lib/auth/two-factor";
import { setSessionTwoFactorVerified } from "@myevent/auth";
import { encrypt, sixDigitCodeSchema } from "@myevent/utils";
import { updateUser } from "@myevent/repositories";

const validator = z.object({
  code: sixDigitCodeSchema,
  key: z.string().min(1),
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
      !session.twoFactorVerified &&
      user.twoFactorEnabled &&
      user.twoFactorSecret
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

    const { key: encodedKey, code } = result.data;

    let key: Uint8Array;
    try {
      key = decodeBase64(encodedKey);

      if (key.byteLength !== 20) {
        throw new Error("Invalid key length");
      }
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

    await updateUser(user.id, {
      twoFactorEnabled: true,
      twoFactorSecret: encodeBase64(encrypt(key)),
    });
    await setSessionTwoFactorVerified(session.id);

    return Response.json(
      {
        success: true,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Two-factor setup error:", err);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
