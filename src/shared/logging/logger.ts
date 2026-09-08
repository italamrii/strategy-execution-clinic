import { AsyncLocalStorage } from "node:async_hooks";

type LogContext = {
  requestId?: string;
  userId?: string;
  route?: string;
};

const contextStore = new AsyncLocalStorage<LogContext>();

const REDACT_KEYS = /password|secret|token|otp|cookie|authorization|smtp_pass|api[_-]?key/i;

function redact(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 8 && REDACT_KEYS.test(value)) return "[redacted]";
    return value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.test(k) ? "[redacted]" : redact(v);
    }
    return out;
  }
  return value;
}

function emit(level: string, message: string, meta?: Record<string, unknown>) {
  const ctx = contextStore.getStore();
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...ctx,
    ...(meta ? (redact(meta) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  withContext(ctx: LogContext, fn: () => Promise<void> | void) {
    return contextStore.run(ctx, fn);
  },
  info(message: string, meta?: Record<string, unknown>) {
    emit("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    emit("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    emit("error", message, meta);
  },
};

export function getRequestIdFromHeaders(headers: Headers): string {
  return headers.get("x-request-id") ?? crypto.randomUUID();
}
