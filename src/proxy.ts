import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { isClerkAuthProvider } from "./shared/config/auth-provider";

const handleI18n = createMiddleware(routing);

function withRequestId(response: NextResponse, request: NextRequest): NextResponse {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  response.headers.set("x-request-id", requestId);
  return response;
}

function applyI18n(request: NextRequest): NextResponse {
  // next-intl must not rewrite API, Clerk proxy, or well-known root files.
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/__clerk") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico"
  ) {
    return withRequestId(NextResponse.next(), request);
  }
  return withRequestId(handleI18n(request), request);
}

const clerkEnabled = isClerkAuthProvider();

export default clerkEnabled
  ? clerkMiddleware(async (_auth, request) => applyI18n(request))
  : function proxy(request: NextRequest) {
      return applyI18n(request);
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
