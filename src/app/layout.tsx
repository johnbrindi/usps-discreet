import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — Track your parcel`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: { type: "website", siteName: siteConfig.name, title: siteConfig.name, description: siteConfig.description },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0c2340",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={publicSans.variable}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
