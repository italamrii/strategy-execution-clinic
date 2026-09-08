import { isTestEndpointsEnabled } from "@/shared/config/runtime";

/**
 * Returns 404 JSON response metadata when test-only HTTP routes must be disabled.
 */
export function testRouteDisabled(): boolean {
  return !isTestEndpointsEnabled();
}

export function isDesignPreviewAllowed(): boolean {
  if (process.env.E2E === "true") return true;
  if (process.env.DISABLE_DESIGN_PREVIEW === "true") return false;
  if (process.env.APP_ENV === "production") return false;
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "staging") {
    return false;
  }
  return true;
}
