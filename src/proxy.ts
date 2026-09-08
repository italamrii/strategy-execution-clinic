import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const response = handleI18n(request);
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
