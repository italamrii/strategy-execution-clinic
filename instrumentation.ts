export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertProductionSafeStartup } = await import("@/shared/config/env");
  const { isProductionRuntime } = await import("@/shared/config/runtime");
  if (isProductionRuntime()) {
    assertProductionSafeStartup();
  }
}
