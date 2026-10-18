import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** Customer app: installable from any public page ("Add to Home Screen"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0c2340",
    categories: ["business", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Track a parcel", url: "/track", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Contact support", url: "/contact", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
