const UNSAFE_PROTOCOL = /^(javascript|data|vbscript):/i;

export function sanitizePlainText(input: string, max = 2000): string {
  return input
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

export function sanitizeRichText(input: string, max = 20_000): string {
  let out = input.slice(0, max);
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/javascript:/gi, "");
  return out.trim();
}

export function isTrustedAppUrl(url: string, appOrigin: string): boolean {
  try {
    const parsed = new URL(url, appOrigin);
    const base = new URL(appOrigin);
    if (UNSAFE_PROTOCOL.test(parsed.protocol)) return false;
    return parsed.origin === base.origin;
  } catch {
    return false;
  }
}

export function buildTrustedUrl(path: string, appOrigin: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalized, appOrigin.replace(/\/$/, ""));
  if (!isTrustedAppUrl(url.toString(), appOrigin)) {
    throw new Error("untrusted_url");
  }
  return url.toString();
}

export function sanitizeEmailHeader(value: string): string {
  return value.replace(/[\r\n]/g, "").trim();
}

export function sanitizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/password[=:]\S+/gi, "[redacted]")
    .replace(/api[_-]?key[=:]\S+/gi, "[redacted]")
    .slice(0, 500);
}
