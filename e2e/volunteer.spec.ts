import { test, expect } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const SCREENSHOT_DIR = path.join("e2e", "screenshots");

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

async function grantRole(page: import("@playwright/test").Page, email: string, role: string) {
  const grant = await page.request.post("/api/test/grant-role", {
    data: { email, role },
  });
  expect(grant.ok(), await grant.text()).toBeTruthy();
}

test.describe("volunteer operating system e2e", () => {
  test.beforeAll(async () => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
  });

  test("Arabic and English volunteer surfaces with full hour workflow", async ({ browser }) => {
    const volunteerEmail = `vol-flow-${Date.now()}@clinic.test`;
    const adminEmail = `vol-admin-${Date.now()}@clinic.test`;

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, "en", adminEmail);
    await grantRole(adminPage, adminEmail, "volunteer_admin");

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await login(memberPage, "en", volunteerEmail);

    await memberPage.goto("/en/membership/apply");
    await memberPage.locator('input[name="headline"]').fill("Volunteer journey member");
    await memberPage.locator('textarea[name="summary"]').fill("Volunteer member summary for phase four.");
    await memberPage.locator('textarea[name="motivation"]').fill("I want to volunteer with verified hours.");
    await memberPage.locator('textarea[name="experience"]').fill("Community and operations volunteering.");
    await memberPage.locator('button[type="submit"]').click();
    await expect(memberPage).toHaveURL(/\/en\/account\/membership/, { timeout: 20_000 });

    await grantRole(adminPage, adminEmail, "membership_admin");
    await adminPage.goto("/en/admin/memberships/applications?status=submitted");
    await adminPage.getByRole("link", { name: /Open|فتح/i }).first().click();
    await adminPage.getByRole("button", { name: /Start review|بدء المراجعة/i }).click();
    await adminPage.getByRole("button", { name: /Approve|موافقة/i }).click();
    await expect(adminPage.getByText(/approved|موافق/i)).toBeVisible({ timeout: 20_000 });

    await grantRole(adminPage, adminEmail, "volunteer_admin");

    await memberPage.goto("/ar/volunteer");
    await expect(memberPage.getByRole("heading", { level: 1 })).toBeVisible();
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "volunteer-landing-ar.png"),
      fullPage: true,
    });

    await memberPage.goto("/en/volunteer");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "volunteer-landing-en.png"),
      fullPage: true,
    });

    await memberPage.goto("/en/account/volunteer");
    await Promise.all([
      memberPage.waitForLoadState("networkidle"),
      memberPage.getByRole("button", { name: /Activate profile/i }).click(),
    ]);
    await expect(memberPage.getByText(/^active$/i)).toBeVisible({
      timeout: 15_000,
    });
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "volunteer-dashboard-en.png"),
      fullPage: true,
    });

    await adminPage.goto("/en/admin/volunteers/opportunities");
    await adminPage.locator('input[name="titleAr"]').fill("فرصة اختبار نهاية");
    await adminPage.locator('input[name="titleEn"]').fill(`E2E Volunteer Opportunity ${Date.now()}`);
    const oppTitle = await adminPage.locator('input[name="titleEn"]').inputValue();
    await adminPage.locator('textarea[name="descriptionAr"]').fill("وصف الفرصة للاختبار.");
    await adminPage.locator('textarea[name="descriptionEn"]').fill("Opportunity description for e2e.");
    await adminPage.locator('input[name="expectedHours"]').fill("6");
    await adminPage.getByRole("button", { name: /Create and publish/i }).click();
    await expect(adminPage.getByText(/Opportunity published/i)).toBeVisible({ timeout: 15_000 });

    await memberPage.goto("/en/volunteer/opportunities");
    await expect(memberPage.getByRole("heading", { name: oppTitle }).first()).toBeVisible();
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "volunteer-opportunities-en.png"),
      fullPage: true,
    });

    await memberPage.getByRole("heading", { name: oppTitle }).first().locator("..").getByRole("link").click();
    await memberPage.locator('textarea[name="motivation"]').fill(
      "I am motivated to contribute verified professional volunteer hours through this clinic opportunity.",
    );
    await memberPage.getByRole("button", { name: /Submit application/i }).click();
    await expect(memberPage.getByText(/Application submitted/i)).toBeVisible({ timeout: 15_000 });

    await adminPage.goto("/en/admin/volunteers/applications");
    await adminPage.getByRole("button", { name: /Accept/i }).first().click();
    await adminPage.waitForTimeout(1000);

    await memberPage.goto("/en/account/volunteer");
    const today = new Date().toISOString().slice(0, 10);
    await memberPage.locator('input[name="hours"]').fill("6");
    await memberPage.locator('input[name="activityDate"]').fill(today);
    await memberPage
      .locator('textarea[name="description"]')
      .fill("Delivered facilitation and documentation for the volunteer opportunity.");
    await memberPage.getByRole("button", { name: /Submit hours/i }).click();
    await expect(memberPage.getByText(/hours submitted for review|submitted for review/i)).toBeVisible({
      timeout: 15_000,
    });

    await adminPage.goto("/en/admin/volunteers/hours");
    await adminPage.getByRole("button", { name: /^Approve$/i }).first().click();
    await adminPage.waitForTimeout(1000);

    await memberPage.reload();
    await expect(memberPage.getByText(/6h · approved/i)).toBeVisible();
    await memberPage.setViewportSize({ width: 390, height: 844 });
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "volunteer-dashboard-mobile.png"),
      fullPage: true,
    });

    await adminPage.getByRole("button", { name: /Adjust −2h/i }).first().click();
    await adminPage.waitForTimeout(1000);
    await memberPage.reload();
    await expect(memberPage.getByText(/-2h/i)).toBeVisible();
    await expect(memberPage.locator("section").filter({ hasText: "Approved hours" }).getByText("4", { exact: true })).toBeVisible();

    await memberContext.close();
    await adminContext.close();
  });
});
