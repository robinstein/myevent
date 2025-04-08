import { Hr, Section, Text } from "@react-email/components";

export function SecurityTips() {
  return (
    <>
      <Hr className="border-[#dfe1e4] my-[32px]" />

      <Section>
        <Text className="text-[15px] font-medium text-[#3c4149] m-0 mb-[16px]">
          Security Tips
        </Text>
        <Text className="text-[14px] text-[#3c4149] m-0 mb-[8px]">
          • Never share your verification code with anyone
        </Text>
        <Text className="text-[14px] text-[#3c4149] m-0 mb-[8px]">
          • Our team will never ask for a verification code
        </Text>
        <Text className="text-[14px] text-[#3c4149] m-0">
          • Consider enabling two-factor authentication
        </Text>
      </Section>
    </>
  );
}
