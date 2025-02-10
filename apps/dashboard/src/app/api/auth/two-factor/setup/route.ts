import type { NextRequest } from "next/server";
import { decodeBase64, encodeBase64 } from "@oslojs/encoding";
import { verifyTOTP } from "@oslojs/otp";
import { z } from "zod";
import { getCachedSession } from "@/lib/auth/cookies";
import { setSessionTwoFactorVerified } from "@/lib/auth/sessions";
import { TWO_FACTOR_DEFAULT_CONFIG } from "@/lib/auth/two-factor";
import { encrypt } from "@myevent/core";
import { updateUser } from "@myevent/repositories";

const validator = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, {
      message: "Code must be a 6-digit numeric string.",
    }),
  key: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { session, user } = await getCachedSession();

    if (!session || !user) {
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
    if (user.twoFactorEnabled && !session.twoFactorVerified) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const result = validator.safeParse(await req.json());
    if (!result.success) {
      return Response.json({ message: result.error.message }, { status: 400 });
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

    const isValidCode = verifyTOTP(
      key,
      TWO_FACTOR_DEFAULT_CONFIG.period,
      TWO_FACTOR_DEFAULT_CONFIG.digits,
      code
    );

    if (!isValidCode) {
      return Response.json({ message: "Invalid code" }, { status: 400 });
    }

    await updateUser(user.id, {
      twoFactorEnabled: true,
      twoFactorSecret: encodeBase64(encrypt(key)),
    });
    await setSessionTwoFactorVerified(session.id);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Two-factor setup error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
