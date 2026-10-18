import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
  // Installs as its own "Admin" app rather than the customer app (src/app/admin-app.webmanifest).
  manifest: "/admin-app.webmanifest",
  appleWebApp: { capable: true, title: "Admin", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#071526" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-surface">{children}</div>;
}
