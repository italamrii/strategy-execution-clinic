import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";
const isProdDeploy = process.env.APP_ENV === "production" || process.env.APP_ENV === "staging";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

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
    value: `default-src 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; ${scriptSrc}; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
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
