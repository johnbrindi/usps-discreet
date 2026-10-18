import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

/**
 * Staff app: a separate install with its own name and scope, offered on /admin pages
 * (src/app/admin/layout.tsx). An installed app has no address bar, so staff need their own entry point.
 */
export function GET() {
  return Response.json(
    {
      id: "/admin",
      name: `${siteConfig.name} Admin`,
      short_name: `${siteConfig.shortName} Admin`,
      description: `Record scans and manage shipments for ${siteConfig.name}.`,
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#071526",
      theme_color: "#071526",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "New shipment", url: "/admin/shipments/new" },
        { name: "Shipments", url: "/admin/shipments" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
