import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const paths = ["", "/membership", "/volunteer", "/members", "/about", "/contact", "/privacy", "/terms"];
  const locales = ["ar", "en"] as const;
  const now = new Date();
  return locales.flatMap((locale) =>
    paths.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
  );
}
