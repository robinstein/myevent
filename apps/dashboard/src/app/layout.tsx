import { Geist, Geist_Mono } from "next/font/google";
import { Theme } from "frosted-ui";
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
          {children}
        </Theme>
      </body>
    </html>
  );
}
