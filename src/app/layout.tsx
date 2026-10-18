import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import { ServiceWorker } from "@/components/pwa/service-worker";
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
  // iPhone home-screen install (iOS ignores most of the web manifest).
  appleWebApp: { capable: true, title: siteConfig.shortName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0c2340",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android Chrome: shrink the layout viewport for the on-screen keyboard so the chat input stays visible.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={publicSans.variable}>
      <body className="flex min-h-dvh flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
