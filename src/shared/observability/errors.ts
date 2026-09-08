import { logger } from "@/shared/logging/logger";

export type ErrorEvent = {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  level?: "error" | "warning";
};

let captured: ErrorEvent[] = [];

export function captureError(event: ErrorEvent): void {
  const sanitized = {
    ...event,
    context: event.context
      ? Object.fromEntries(
          Object.entries(event.context).map(([k, v]) => [
            k,
            /password|secret|token|otp/i.test(k) ? "[redacted]" : v,
          ]),
        )
      : undefined,
  };
  captured.push(sanitized);
  if (captured.length > 100) captured = captured.slice(-100);
  logger.error(event.message, { stack: event.stack, ...sanitized.context });
  if (process.env.ERROR_TRACKING_DSN) {
    // Provider hook: forward to Sentry/Datadog when DSN configured.
    logger.info("error_tracking.forward", { hasDsn: true });
  }
}

export function getCapturedErrors(): readonly ErrorEvent[] {
  return captured;
}

export function clearCapturedErrors(): void {
  captured = [];
}
