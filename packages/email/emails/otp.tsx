import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { getAppUrl } from "@myevent/utils";
import { Layout } from "../components/layout";
import { SecurityTips } from "../components/security-tips";

const baseAppUrl = getAppUrl();

interface VerifyEmailProps {
  code: string;
  email: string;
  locale?: string;
  redirectTo?: string;
  attemptDetails?: { time?: string; location?: string; device?: string };
}

export function VerifyEmail({
  code,
  email,
  locale = "en",
  redirectTo,
  attemptDetails,
}: VerifyEmailProps) {
  const verifyEmailLink = `${baseAppUrl}/api/auth/otp/verify?code=${code}&email=${email}${redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;

  return (
    <Layout preview={`Your MyEvent verification code: ${code}`} locale={locale}>
      <Text className="text-[24px] font-bold text-[#111827] m-0">
        <span className="text-[#FA4617]">My</span>Event
      </Text>

      <Heading className="text-[24px] font-normal text-[#484848] mt-[32px] mb-[24px] leading-[1.3]">
        Your verification code
      </Heading>

      <Text className="text-[15px] text-[#3c4149] leading-[1.4] m-0 mb-[15px]">
        Please use the following code to complete your verification process.
        This code will expire in 10 minutes.
      </Text>

      <Section className="py-[27px]">
        <Text className="font-mono font-bold text-[21px] bg-[#f2f3f5] text-[#3c4149] inline-block py-[6px] px-[12px] rounded-[4px] tracking-[2px] my-0">
          {code}
        </Text>
      </Section>

      <Section className="pb-[27px]">
        <Button
          className="bg-[#FA4617] rounded-[3px] font-semibold text-white text-[15px] no-underline text-center block py-[11px] px-[23px] box-border"
          href={verifyEmailLink}
        >
          Verify My Identity
        </Button>
      </Section>

      <Text className="text-[15px] text-[#3c4149] leading-[1.4] m-0 mb-[32px]">
        If you didn't request this code, you can safely ignore this email.
        Someone may have typed your email address by mistake.
      </Text>

      {attemptDetails && (
        <>
          <Hr className="border-[#dfe1e4] my-[32px]" />

          <Section>
            <Text className="text-[15px] font-medium text-[#3c4149] m-0 mb-[16px]">
              Sign-in attempt details:
            </Text>
            {attemptDetails.time && (
              <Text className="text-[14px] text-[#3c4149] m-0 mb-[8px]">
                <span className="text-[#6b7280]">Time: </span>
                {attemptDetails.time}
              </Text>
            )}
            {attemptDetails.location && (
              <Text className="text-[14px] text-[#3c4149] m-0 mb-[8px]">
                <span className="text-[#6b7280]">Location: </span>
                {attemptDetails.location}
              </Text>
            )}
            {attemptDetails.device && (
              <Text className="text-[14px] text-[#3c4149] m-0">
                <span className="text-[#6b7280]">Device: </span>
                {attemptDetails.device}
              </Text>
            )}
          </Section>
        </>
      )}

      <SecurityTips />
    </Layout>
  );
}
