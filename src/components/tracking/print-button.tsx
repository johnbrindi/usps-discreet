"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/button";
import { ROUTE_MAP_READY } from "./live-route-map";

/**
 * Opens the browser's print dialog, where "Save as PDF" produces the file. With `auto` it opens once by
 * itself — after the route map's tiles have loaded when there is a map, so the PDF isn't missing them.
 */
export function PrintButton({ auto = false, waitForMap = false }: { auto?: boolean; waitForMap?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      // A moment for the last tiles and fonts to paint.
      setTimeout(() => window.print(), 400);
    };
    if (!waitForMap) {
      go();
      return;
    }
    window.addEventListener(ROUTE_MAP_READY, go, { once: true });
    const fallback = setTimeout(go, 6000);
    return () => {
      window.removeEventListener(ROUTE_MAP_READY, go);
      clearTimeout(fallback);
    };
  }, [auto, waitForMap]);
  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses("primary", "md")}>
      <Printer className="size-4" aria-hidden /> Save as PDF / Print
    </button>
  );
}
