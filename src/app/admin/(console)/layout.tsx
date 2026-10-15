import Link from "next/link";
import { AdminNav, SignOutButton } from "@/components/admin/admin-nav";
import { LogoMark } from "@/components/layout/logo";
import { siteConfig } from "@/config/site";
import { requireStaffPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="bg-navy-950 text-white md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0">
        <div className="flex h-full flex-col gap-4 p-4">
          <Link href="/admin" className="flex items-center gap-2 rounded-sm">
            <LogoMark className="size-8" />
            <span className="font-bold">{siteConfig.shortName} Admin</span>
          </Link>
          <nav aria-label="Admin">
            <AdminNav />
          </nav>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3 md:mt-auto md:block md:pt-4">
            <div className="min-w-0">
              <p className="truncate px-3 text-xs text-navy-100/70">{user.email}</p>
              <p className="px-3 text-xs text-navy-100/50 capitalize md:mb-2">{user.role}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
