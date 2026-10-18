import Link from "next/link";
import { AdminMobileMenu } from "@/components/admin/admin-mobile-menu";
import { AdminNav, SignOutButton } from "@/components/admin/admin-nav";
import { LiveRefresh } from "@/components/live-refresh";
import { LogoMark } from "@/components/layout/logo";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { NotificationToggle } from "@/components/pwa/notification-toggle";
import { siteConfig } from "@/config/site";
import { requireStaffPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  const account = (
    <div className="flex min-w-0 items-center gap-2.5 px-2">
      <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-sm font-semibold uppercase">
        {user.email.charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-white/90">{user.email}</p>
        <p className="text-xs text-navy-100/50 capitalize">{user.role}</p>
      </div>
    </div>
  );
  return (
    <div className="flex flex-1 flex-col bg-slate-50 md:flex-row">
      {/* Phones: top bar with a menu; sections live in the bottom tab bar below. */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-navy-950 px-4 py-2.5 text-white md:hidden"
        style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
      >
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
          <LogoMark className="size-7 shrink-0" />
          <span className="truncate text-[0.9375rem] font-semibold tracking-tight">{siteConfig.shortName} Admin</span>
        </Link>
        <AdminMobileMenu>
          <NotificationToggle />
          <InstallPrompt appName={`${siteConfig.shortName} Admin`} variant="inline" />
          <div className="border-t border-white/10 pt-3">{account}</div>
          <SignOutButton />
        </AdminMobileMenu>
      </header>

      {/* Tablets and up: sidebar. */}
      <aside className="hidden border-r border-white/5 bg-navy-950 text-white md:sticky md:top-0 md:block md:h-dvh md:w-60 md:shrink-0">
        <div className="flex h-full flex-col gap-5 px-3 py-4">
          <Link href="/admin" className="flex items-center gap-2.5 rounded-md px-2 py-1">
            <LogoMark className="size-7" />
            <span className="text-[0.9375rem] font-semibold tracking-tight">{siteConfig.shortName} Admin</span>
          </Link>
          <nav aria-label="Admin">
            <AdminNav />
          </nav>
          <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
            <NotificationToggle />
            <InstallPrompt appName={`${siteConfig.shortName} Admin`} variant="inline" />
            <LiveRefresh showIndicator className="px-2 text-navy-100/60" />
            {account}
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-8 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <AdminNav variant="tabs" />
      </nav>
    </div>
  );
}
