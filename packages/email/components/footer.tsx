import { getAppUrl } from "@myevent/utils";
import { Section, Text, Link, Hr } from "@react-email/components";

const baseAppUrl = getAppUrl();

interface FooterProps {
  locale?: string;
}

export function Footer({ locale = "en" }: FooterProps) {
  const termsOfServiceLink = `${baseAppUrl}/terms`;
  const privacyPolicyLink = `${baseAppUrl}/privacy`;

  return (
    <Section>
      <Hr className="border-[#dfe1e4] my-[32px]" />

      <Text className="text-[14px] text-[#b4becc] m-0 text-center">
        © 2025 MyEvent. All rights reserved.
      </Text>
      <Text className="text-[14px] text-[#b4becc] mt-[8px] m-0 text-center">
        <a href={termsOfServiceLink} className="text-[#b4becc] underline">
          Terms
        </a>{" "}
        •
        <a
          href={privacyPolicyLink}
          className="text-[#b4becc] underline ml-[4px]"
        >
          Privacy
        </a>
      </Text>
    </Section>
  );
}
