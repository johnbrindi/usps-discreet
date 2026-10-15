import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/track", "/help", "/contact", "/privacy", "/terms"].map((path) => ({
    url: `${siteConfig.url}${path}`,
    changeFrequency: "monthly",
  }));
}
