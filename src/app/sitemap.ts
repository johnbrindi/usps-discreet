import type { MetadataRoute } from "next";
import { TOOLS } from "@/config/service-requests";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/track", "/tools", ...TOOLS.map((t) => `/tools/${t.slug}`), "/help", "/contact", "/privacy", "/terms"].map(
    (path) => ({ url: `${siteConfig.url}${path}`, changeFrequency: "monthly" }),
  );
}
