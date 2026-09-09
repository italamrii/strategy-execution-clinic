import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, locale: "ar" | "en") {
  const email = `e2e-${locale}-${Date.now()}@clinic.test`;
  await page.goto(`/${locale}/login`);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.locator("html")).toHaveAttribute(
    "dir",
    locale === "ar" ? "rtl" : "ltr",
  );

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
  return email;
}

test.describe("identity e2e", () => {
  test("arabic login and RTL account", async ({ page }) => {
    await login(page, "ar");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("english login and LTR account", async ({ page }) => {
    await login(page, "en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("logout and unauthorized admin probe", async ({ page }) => {
    await login(page, "en");
    await page.goto("/en/account/security");
    await page.getByRole("button", { name: /Sign out|تسجيل الخروج/ }).first().click();
    await expect(page).toHaveURL(/\/en\/login/);
    await page.goto("/en/admin/probe");
    await expect(page.locator('[data-access="denied"]')).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
