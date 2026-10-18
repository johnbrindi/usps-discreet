"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/button";

/** Opens the browser's print dialog, where "Save as PDF" produces the file. Opens once automatically. */
export function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    // Let fonts and the map settle before the dialog captures the page.
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [auto]);
  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses("primary", "md")}>
      <Printer className="size-4" aria-hidden /> Save as PDF / Print
    </button>
  );
}
