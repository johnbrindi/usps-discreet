import type { MetadataRoute } from "next";
import { TOOLS } from "@/config/service-requests";
import { allServices } from "@/config/services";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const monthly = "monthly" as const;
  const weekly = "weekly" as const;

  const staticPages = ["", "/track", "/tools", "/help", "/contact", "/privacy", "/terms", "/search"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: monthly,
  }));

  const toolPages = TOOLS.map((t) => ({
    url: `${base}/tools/${t.slug}`,
    changeFrequency: monthly,
  }));

  // zip-lookup is a special tool page but not in TOOLS array
  const zipLookup = { url: `${base}/tools/zip-lookup`, changeFrequency: monthly };

  const servicePages = allServices()
    .filter((s) => s.slug)
    .map((s) => ({
      url: `${base}/services/${s.slug}`,
      changeFrequency: weekly,
    }));

  return [...staticPages, ...toolPages, zipLookup, ...servicePages];
}
