"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Phone-only account menu in the admin top bar: notifications, install, account and sign out. */
export function AdminMobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  // Close when navigating to another page.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="admin-menu"
        className="inline-flex size-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
      >
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Open menu</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Account menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <div
            id="admin-menu"
            className="fade-up absolute inset-x-0 top-0 flex flex-col gap-3 rounded-b-2xl bg-navy-950 px-4 pb-5 text-white shadow-float"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/80">Menu</p>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex size-10 items-center justify-center rounded-md hover:bg-white/10">
                <X className="size-5" aria-hidden />
                <span className="sr-only">Close menu</span>
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
