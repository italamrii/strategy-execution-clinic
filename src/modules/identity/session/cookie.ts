import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "../constants";

function sessionCookieSecure(): boolean {
  // Secure cookies are not sent on http://127.0.0.1; E2E runs HTTP locally.
  if (process.env.E2E === "true") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAME)?.value ?? null;
}
