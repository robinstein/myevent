import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Preview,
  Tailwind,
  type PreviewProps,
} from "@react-email/components";
import { Footer } from "./footer";

export interface LayoutProps {
  children: React.ReactNode;
  preview: PreviewProps["children"];
  locale?: string;
}

export function Layout({ children, preview, locale = "en" }: LayoutProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Geist"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-400-normal.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Geist"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-500-normal.woff2",
            format: "woff2",
          }}
          fontWeight={500}
          fontStyle="normal"
        />
        <Font
          fontFamily="Geist"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-700-normal.woff2",
            format: "woff2",
          }}
          fontWeight={700}
          fontStyle="normal"
        />
      </Head>

      <Preview>{preview}</Preview>

      <Tailwind>
        <Body className="bg-white font-sans py-[40px]">
          <Container className="mx-auto max-w-[560px] px-[20px]">
            {children}
            <Footer locale={locale} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
