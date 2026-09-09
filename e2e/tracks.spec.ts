import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, locale: "ar" | "en", email: string) {
  await page.goto(`/${locale}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('input[name="code"]')).toBeVisible({ timeout: 15_000 });
  const response = await page.request.get(
    `/api/test/last-otp?email=${encodeURIComponent(email)}`,
  );
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = (await response.json()) as { code: string };
  await page.locator('input[name="code"]').fill(body.code);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/account`), { timeout: 15_000 });
}

test.describe("professional tracks journeys", () => {
  test("arabic tracks directory and AI path are public", async ({ page }) => {
    const directory = await page.goto("/ar/tracks");
    expect(directory?.ok()).toBeTruthy();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const ai = await page.goto("/ar/tracks/ai-automation");
    expect(ai?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("الذكاء الاصطناعي");
  });

  test("english tracks directory uses ltr and shows Strategic Path", async ({ page }) => {
    await page.goto("/en/tracks");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("link", { name: /Strategic Path/i }).first()).toBeVisible();

    await page.goto("/en/tracks/strategy");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Strategic Path");
  });

  test("member can open account tracks workspace after login", async ({ page }) => {
    const email = `e2e-track-member-${Date.now()}@clinic.test`;
    await login(page, "en", email);
    await page.goto("/en/account/tracks");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("volunteer-tagged member reaches tracks apply surface", async ({ page }) => {
    const email = `e2e-track-volunteer-${Date.now()}@clinic.test`;
    await login(page, "ar", email);
    await page.goto("/ar/tracks/execution");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /التقديم|Apply/i })).toBeVisible();
  });

  test("expert/admin can open admin tracks console", async ({ browser }) => {
    const adminEmail = `e2e-track-expert-admin-${Date.now()}@clinic.test`;
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, "en", adminEmail);
    const grant = await adminPage.request.post("/api/test/grant-role", {
      data: { email: adminEmail, role: "super_admin" },
    });
    expect(grant.ok(), await grant.text()).toBeTruthy();
    await adminPage.goto("/en/admin/tracks");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await adminContext.close();
  });

  test("leader manage workspace redirects non-leaders", async ({ page }) => {
    const email = `e2e-track-leader-denied-${Date.now()}@clinic.test`;
    await login(page, "en", email);
    await page.goto("/en/account/tracks/strategy/manage");
    await expect(page.locator('[data-access="denied"]')).toBeVisible();
  });

  test("admin tracks console is reachable for platform admins", async ({ page }) => {
    const email = `e2e-track-admin-${Date.now()}@clinic.test`;
    await login(page, "ar", email);
    const grant = await page.request.post("/api/test/grant-role", {
      data: { email, role: "super_admin" },
    });
    expect(grant.ok(), await grant.text()).toBeTruthy();
    await page.goto("/ar/admin/tracks");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("homepage tracks section links into the directory", async ({ page }) => {
    await page.goto("/ar");
    const tracksNav = page.getByRole("link", { name: /المسارات|Tracks/i }).first();
    await expect(tracksNav).toBeVisible();
    await tracksNav.click();
    await expect(page).toHaveURL(/\/ar\/tracks/);
  });
});
