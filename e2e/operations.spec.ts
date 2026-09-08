import { test, expect } from "@playwright/test";
import path from "node:path";
import { mkdirSync } from "node:fs";

mkdirSync(path.join("e2e", "screenshots"), { recursive: true });

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

const shot = (name: string) =>
  path.resolve(process.cwd(), "e2e", "screenshots", name);

test.describe("phase 6 operations e2e", () => {
  test("member notification, admin dashboard, CMS, announcements, RBAC, errors", async ({
    browser,
    page,
  }) => {
    const memberEmail = `e2e-ops-member-${Date.now()}@clinic.test`;
    const adminEmail = `e2e-ops-admin-${Date.now()}@clinic.test`;
    const strangerEmail = `e2e-ops-stranger-${Date.now()}@clinic.test`;

    await login(page, "ar", memberEmail);
    await page.goto("/ar/membership/apply");
    await page.locator('input[name="headline"]').fill("عضو مهني");
    await page.locator('textarea[name="summary"]').fill("خبرة في الاستراتيجية والتنفيذ.");
    await page.locator('textarea[name="motivation"]').fill("أرغب بالانضمام للعيادة.");
    await page.locator('textarea[name="experience"]').fill("قيادة برامج تحول مؤسسي.");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/ar\/account\/membership/, { timeout: 20_000 });

    await page.goto("/ar/account/notifications");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: shot("notifications-ar.png"), fullPage: true });

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, "ar", adminEmail);
    const grant = await adminPage.request.post("/api/test/grant-role", {
      data: { email: adminEmail, role: "super_admin" },
    });
    expect(grant.ok(), await grant.text()).toBeTruthy();

    await adminPage.goto("/ar/admin");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await adminPage.screenshot({ path: shot("admin-dashboard-ar.png"), fullPage: true });

    await adminPage.goto("/en/admin");
    await adminPage.screenshot({ path: shot("admin-dashboard-en.png"), fullPage: true });
    await adminPage.setViewportSize({ width: 768, height: 1024 });
    await adminPage.screenshot({ path: shot("admin-dashboard-mobile-or-tablet.png"), fullPage: true });

    await adminPage.goto("/en/admin/content");
    await adminPage.screenshot({ path: shot("content-admin.png"), fullPage: true });
    const heroBlock = adminPage.locator('input[name="titleEn"]').first();
    if (await heroBlock.isVisible()) {
      await heroBlock.fill(`Clinic Hero ${Date.now()}`);
      await adminPage.getByRole("button", { name: /Save|حفظ/i }).first().click();
    }

    await adminPage.goto("/en/admin/announcements");
    await adminPage.locator('input[name="titleAr"]').fill("إعلان تجريبي");
    await adminPage.locator('input[name="titleEn"]').fill("Test announcement");
    await adminPage.locator('textarea[name="bodyAr"]').fill("محتوى الإعلان.");
    await adminPage.locator('textarea[name="bodyEn"]').fill("Announcement body.");
    await adminPage.getByRole("button", { name: /Publish|نشر/i }).click();
    await adminPage.screenshot({ path: shot("announcement-admin.png"), fullPage: true });

    await adminPage.goto("/en/admin/audit");
    await adminPage.screenshot({ path: shot("audit-log.png"), fullPage: true });
    await adminPage.goto("/en/admin/security");
    await adminPage.screenshot({ path: shot("security-events.png"), fullPage: true });
    await adminPage.goto("/en/admin/settings");
    await adminPage.screenshot({ path: shot("settings.png"), fullPage: true });

    await adminPage.goto("/en/admin/memberships/applications?status=submitted");
    await adminPage.getByRole("link", { name: /Open|فتح/i }).first().click();
    await adminPage.getByRole("button", { name: /Start review|بدء المراجعة/i }).click();
    await adminPage.getByRole("button", { name: /Approve|موافقة/i }).click();

    await page.goto("/en/account/notifications");
    await expect(page.getByText(/membership|عضوية/i).first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: shot("notifications-en.png"), fullPage: true });
    const markRead = page.getByRole("button", { name: /Mark read|تعليم كمقروء/i }).first();
    if (await markRead.isVisible()) {
      await markRead.click();
    }

    const strangerContext = await browser.newContext();
    const strangerPage = await strangerContext.newPage();
    await login(strangerPage, "en", strangerEmail);
    await strangerPage.goto("/en/admin/settings");
    await expect(strangerPage.getByText(/Forbidden|ممنوع/i)).toBeVisible();

    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: shot("homepage-final-ar.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: shot("homepage-final-mobile.png"), fullPage: true });
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await page.screenshot({ path: shot("homepage-final-en.png"), fullPage: true });

    await page.goto("/en/members");
    await page.screenshot({ path: shot("public-members-final.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/volunteer/opportunities");
    await page.screenshot({ path: shot("volunteer-final-mobile.png"), fullPage: true });

    await page.goto("/en/does-not-exist-route");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/not found|غير موجودة/i);
    await page.goto("/en/forbidden");
    await expect(page.getByText(/Access denied|الوصول مرفوض/i)).toBeVisible();

    const prodOtp = await page.request.get("/api/test/last-otp?email=nope@clinic.test", {
      headers: { "x-bypass-e2e": "1" },
    });
    if (process.env.E2E_ORCHESTRATED !== "true") {
      expect([404, 403]).toContain(prodOtp.status());
    }

    await adminContext.close();
    await strangerContext.close();
  });
});
