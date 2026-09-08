import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ar/", "/en/"],
        disallow: [
          "/account",
          "/admin",
          "/api/",
          "/design-preview",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
