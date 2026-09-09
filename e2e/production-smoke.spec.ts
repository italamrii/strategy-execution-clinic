import { test, expect } from "@playwright/test";

/**
 * Safe production smoke — read-only checks only.
 * Set PRODUCTION_SMOKE_BASE_URL=https://your-domain for hosted smoke.
 * Full destructive flows remain on staging via pnpm test:e2e.
 */
const base =
  process.env.PRODUCTION_SMOKE_BASE_URL ??
  process.env.E2E_BASE_URL ??
  "http://localhost:3100";

test.describe("production smoke (read-only)", () => {
  test.skip(!process.env.PRODUCTION_SMOKE_BASE_URL && process.env.E2E_ORCHESTRATED !== "true");

  test("health and robots are reachable", async ({ request }) => {
    const health = await request.get(`${base}/api/health`);
    expect(health.ok(), await health.text()).toBeTruthy();
    const body = (await health.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);

    const robots = await request.get(`${base}/robots.txt`);
    expect(robots.ok(), await robots.text()).toBeTruthy();
    const text = await robots.text();
    expect(text.toLowerCase()).toContain("disallow: /admin");
  });

  test("public homepages respond", async ({ page }) => {
    await page.goto(`${base}/ar`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.goto(`${base}/en`);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("test endpoints disabled outside E2E", async ({ request }) => {
    if (process.env.E2E === "true") {
      test.skip();
    }
    const otp = await request.get(`${base}/api/test/last-otp?email=smoke@clinic.test`);
    expect(otp.status()).toBe(404);
    const grant = await request.post(`${base}/api/test/grant-role`, {
      data: { email: "smoke@clinic.test", role: "super_admin" },
    });
    expect(grant.status()).toBe(404);
  });

  test("design preview blocked when APP_ENV=production", async ({ page }) => {
    if (process.env.APP_ENV !== "production") {
      test.skip();
    }
    await page.goto(`${base}/en/design-preview`);
    await expect(page.getByText(/not found|غير موجودة/i)).toBeVisible();
  });
});
