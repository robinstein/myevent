import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCachedSession } from "@/lib/auth/cookies";
import { setSessionTwoFactorVerified } from "@myevent/auth";
import { resetTwoFactorWithRecoveryCode } from "@myevent/repositories";
import { recoveryCodeSchema } from "@myevent/utils";

const validator = z.object({
  recovery_code: recoveryCodeSchema,
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { user, session } = await getCachedSession();

    if (!user || !session) {
      return Response.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    if (!user.twoFactorEnabled && !user.twoFactorSecret) {
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

    const { recovery_code: recoveryCode } = result.data;

    let newRecoveryCode: string;
    try {
      newRecoveryCode = await resetTwoFactorWithRecoveryCode(
        user.id,
        recoveryCode
      );
    } catch (error) {
      console.error("Failed to reset two-factor authentication:", error);
      return Response.json(
        { message: "Invalid recovery code or reset failed" },
        { status: 400 }
      );
    }

    try {
      await setSessionTwoFactorVerified(session.id, false);
    } catch (error) {
      console.error("Failed to update session verification status:", error);
    }

    return Response.json({ recovery_code: newRecoveryCode }, { status: 200 });
  } catch (error) {
    console.error("Two-factor reset error:", error);
    return Response.json(
      { message: "Failed to process two-factor authentication reset" },
      { status: 500 }
    );
  }
}
