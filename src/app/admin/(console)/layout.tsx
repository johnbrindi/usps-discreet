import Link from "next/link";
import { AdminNav, SignOutButton } from "@/components/admin/admin-nav";
import { LiveRefresh } from "@/components/live-refresh";
import { LogoMark } from "@/components/layout/logo";
import { siteConfig } from "@/config/site";
import { requireStaffPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  return (
    <div className="flex flex-1 flex-col bg-slate-50 md:flex-row">
      <aside className="border-white/5 bg-navy-950 text-white md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r">
        <div className="flex h-full flex-col gap-5 px-3 py-4">
          <Link href="/admin" className="flex items-center gap-2.5 rounded-md px-2 py-1">
            <LogoMark className="size-7" />
            <span className="text-[0.9375rem] font-semibold tracking-tight">{siteConfig.shortName} Admin</span>
          </Link>
          <nav aria-label="Admin">
            <AdminNav />
          </nav>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4 md:mt-auto md:flex-col md:items-stretch">
            <LiveRefresh showIndicator className="px-2 text-navy-100/60" />
            <div className="flex min-w-0 items-center gap-2.5 px-2">
              <span
                aria-hidden
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-sm font-semibold uppercase"
              >
                {user.email.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white/90">{user.email}</p>
                <p className="text-xs text-navy-100/50 capitalize">{user.role}</p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
