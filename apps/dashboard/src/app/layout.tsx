import { Geist, Geist_Mono } from "next/font/google";
import { Theme } from "frosted-ui";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";

import "./globals.css";
import "frosted-ui/styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Theme
          grayColor="gray"
          accentColor="orange"
          infoColor="sky"
          successColor="green"
          warningColor="yellow"
          dangerColor="red"
        >
          <NuqsAdapter>{children}</NuqsAdapter>
        </Theme>
      </body>
    </html>
  );
}
