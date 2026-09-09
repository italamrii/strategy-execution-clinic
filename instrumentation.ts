export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertProductionSafeStartup } = await import("@/shared/config/env");
  const { isProductionRuntime } = await import("@/shared/config/runtime");
  if (isProductionRuntime()) {
    assertProductionSafeStartup();
    if (process.env.BOOTSTRAP_ADMIN_EMAIL && process.env.BOOTSTRAP_CONFIRM === "YES") {
      const { bootstrapSuperAdmin } = await import("@/modules/identity/bootstrap");
      await bootstrapSuperAdmin();
    }
  }
}

