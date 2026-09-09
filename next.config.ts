import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";
const isProdDeploy = process.env.APP_ENV === "production" || process.env.APP_ENV === "staging";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://*.protect.clerk.com"
  : "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://*.protect.clerk.com";

// Minimum Clerk origins from official CSP guidance:
// https://clerk.com/docs/guides/secure/best-practices/csp-headers
const clerkConnect =
  "https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://*.clerk-telemetry.com https://*.protect.clerk.com:*";
const clerkImg = "https://img.clerk.com";
const clerkFrame = "https://challenges.cloudflare.com https://*.protect.clerk.com";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: " + clerkImg,
      "font-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      scriptSrc,
      `connect-src 'self' ${clerkConnect}`,
      "worker-src 'self' blob:",
      `frame-src 'self' ${clerkFrame}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  ...(isProdDeploy
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
