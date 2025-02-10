import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCachedSession } from "@/lib/auth/cookies";
import { setSessionTwoFactorVerified } from "@/lib/auth/sessions";
import { resetTwoFactorWithRecoveryCode } from "@myevent/repositories";

const recoveryCodeSchema = z.object({
  recovery_code: z.string().length(16, "Recovery code must be 16 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const { session, user } = await getCachedSession();

    if (!session || !user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const result = recoveryCodeSchema.safeParse(await req.json());
    if (!result.success) {
      return Response.json(
        { message: "Invalid recovery code format" },
        { status: 400 }
      );
    }

    const { recovery_code: recoveryCode } = result.data;

    const newRecoveryCode = await resetTwoFactorWithRecoveryCode(
      user.id,
      recoveryCode
    ).catch((error) => {
      console.error("Failed to reset two-factor auth:", error);
      throw error;
    });

    await setSessionTwoFactorVerified(session.id, false);

    return Response.json({ recovery_code: newRecoveryCode }, { status: 200 });
  } catch (error) {
    console.error("Two-factor reset error:", error);
    return Response.json(
      { message: "Failed to reset two-factor authentication" },
      { status: 500 }
    );
  }
}
