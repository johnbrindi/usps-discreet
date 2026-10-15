import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FloatingWidgets } from "@/components/widgets/floating-widgets";

// Static public pages show support hours; refresh hourly so time-zone labels stay correct.
export const revalidate = 3600;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-navy-900 focus:shadow-float"
        style={{ zIndex: "var(--z-skip)" }}
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <FloatingWidgets />
    </>
  );
}
