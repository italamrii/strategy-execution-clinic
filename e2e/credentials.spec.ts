import { test, expect } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const SCREENSHOT_DIR = path.join("docs", "review", "pr-6");

async function relativeLuminance(page: import("@playwright/test").Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const color = getComputedStyle(el).color;
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return 0;
    const channels = match.slice(1, 4).map((value) => {
      const channel = Number(value) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
  });
}

async function setTheme(page: import("@playwright/test").Page, theme: "light" | "dark") {
  await page.evaluate((next) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("clinic-theme", next);
      document.cookie = `clinic-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {
      // Ignore storage failures in constrained browsers.
    }
  }, theme);
}

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

async function applyProfessional(page: import("@playwright/test").Page) {
  await page.goto("/en/membership/apply");
  await page.locator('input[name="headline"]').fill("Credential journey member");
  await page
    .locator('textarea[name="summary"]')
    .fill("Professional summary for credential phase validation.");
  await page
    .locator('textarea[name="motivation"]')
    .fill("I want a verifiable digital credential.");
  await page
    .locator('textarea[name="experience"]')
    .fill("Delivery and strategy leadership experience.");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/en\/account\/membership/, { timeout: 20_000 });
}

async function approveLatestApplication(adminPage: import("@playwright/test").Page, adminEmail: string) {
  const grant = await adminPage.request.post("/api/test/grant-role", {
    data: { email: adminEmail, role: "membership_admin" },
  });
  expect(grant.ok(), await grant.text()).toBeTruthy();
  await adminPage.goto("/en/admin/memberships/applications?status=submitted");
  await adminPage.getByRole("link", { name: /Open|فتح/i }).first().click();
  await adminPage.getByRole("button", { name: /Start review|بدء المراجعة/i }).click();
  await expect(adminPage.getByRole("button", { name: /Approve|موافقة/i })).toBeVisible({
    timeout: 15_000,
  });
  await adminPage.getByRole("button", { name: /Approve|موافقة/i }).click();
  await expect(adminPage.getByText(/approved|موافق/i)).toBeVisible({ timeout: 20_000 });
}

test.describe("credentials e2e", () => {
  test.beforeAll(async () => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
  });

  test("design gallery founding and volunteer fixtures", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.getByRole("heading", { name: /نبني الاستراتيجية/ })).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "home-ar-light.png"),
      fullPage: false,
    });
    await page.getByRole("button", { name: /استخدام المظهر الداكن|Use dark theme/ }).click({ force: true });
    await expect.poll(() => relativeLuminance(page, ".site-header__nav a")).toBeGreaterThan(0.55);
    await expect.poll(() => relativeLuminance(page, ".header-login")).toBeGreaterThan(0.55);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "home-ar-dark.png"),
      fullPage: false,
    });
    await page.getByRole("button", { name: /استخدام المظهر الفاتح|Use light theme/ }).click({ force: true });
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "home-en-light.png"),
      fullPage: false,
    });
    await page.getByRole("button", { name: /Use dark theme|استخدام المظهر الداكن/ }).click({ force: true });
    await expect.poll(() => relativeLuminance(page, ".site-header__nav a")).toBeGreaterThan(0.55);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "home-en-dark.png"),
      fullPage: false,
    });
    await page.getByRole("button", { name: /Use light theme|استخدام المظهر الفاتح/ }).click({ force: true });
    await page.goto("/en/design-preview/credentials");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("SEC-FND-2026-K7M4QX")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "card-founding-fixture.png"),
      fullPage: true,
    });
    await expect(page.getByText("SEC-VOL-2026-R9M2QD")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "card-volunteer-fixture.png"),
      fullPage: true,
    });
  });

  test("member credential wallet, exports, verification, and revoke", async ({ browser }) => {
    test.setTimeout(180_000);
    const memberEmail = `cred-member-${Date.now()}@clinic.test`;
    const adminEmail = `cred-admin-${Date.now()}@clinic.test`;
    const strangerEmail = `cred-stranger-${Date.now()}@clinic.test`;

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await login(memberPage, "en", memberEmail);
    await applyProfessional(memberPage);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, "en", adminEmail);
    await approveLatestApplication(adminPage, adminEmail);
    const grantDashboard = await adminPage.request.post("/api/test/grant-role", {
      data: { email: adminEmail, role: "super_admin" },
    });
    expect(grantDashboard.ok(), await grantDashboard.text()).toBeTruthy();
    await adminPage.goto("/en/admin");
    await expect(adminPage.locator("[data-access=granted]")).toBeVisible({ timeout: 20_000 });
    await adminPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin-dashboard-en.png"),
      fullPage: true,
    });
    await setTheme(adminPage, "dark");
    await adminPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin-dashboard-en-dark.png"),
      fullPage: true,
    });
    await setTheme(adminPage, "light");
    await adminPage.goto("/ar/admin");
    await expect(adminPage.locator("[data-access=granted]")).toBeVisible({ timeout: 20_000 });
    await adminPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin-dashboard-ar.png"),
      fullPage: true,
    });
    await setTheme(adminPage, "dark");
    await adminPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin-dashboard-ar-dark.png"),
      fullPage: true,
    });
    await setTheme(adminPage, "light");

    await memberPage.goto("/en/account/membership");
    await expect(memberPage.getByText(/Active Membership|عضوية فعالة/i)).toBeVisible({
      timeout: 20_000,
    });

    await memberPage.goto("/en/account/credential");
    await expect(memberPage.getByTestId("public-code")).toBeVisible({ timeout: 20_000 });
    await expect(memberPage.getByTestId("credential-qr")).toBeVisible();
    await expect(memberPage.getByTestId("membership-card")).toBeVisible();
    await expect(memberPage.getByTestId("membership-card")).toContainText(/SEC-/);
    await memberPage.goto("/en/account");
    await expect(memberPage.getByText(/Your next professional step|خطوتك المهنية/)).toBeVisible({
      timeout: 20_000,
    });
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "member-dashboard-en.png"),
      fullPage: true,
    });
    await setTheme(memberPage, "dark");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "member-dashboard-en-dark.png"),
      fullPage: true,
    });
    await setTheme(memberPage, "light");
    await memberPage.goto("/ar/account");
    await expect(memberPage.getByText(/خطوتك المهنية|Your next professional step/)).toBeVisible({
      timeout: 20_000,
    });
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "member-dashboard-ar.png"),
      fullPage: true,
    });
    await setTheme(memberPage, "dark");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "member-dashboard-ar-dark.png"),
      fullPage: true,
    });
    await setTheme(memberPage, "light");

    await memberPage.goto("/en/account/credential");
    await expect(memberPage.getByTestId("public-code")).toBeVisible({ timeout: 20_000 });
    const codeText = (await memberPage.getByTestId("public-code").textContent())?.trim();
    expect(codeText).toMatch(/^SEC-/);
    const credentialId = await memberPage
      .getByTestId("membership-card")
      .getAttribute("data-credential-id");
    expect(credentialId).toBeTruthy();

    await expect(memberPage.locator("html")).toHaveAttribute("dir", "ltr");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "credential-en.png"),
      fullPage: true,
    });
    await setTheme(memberPage, "dark");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "credential-en-dark.png"),
      fullPage: true,
    });
    await setTheme(memberPage, "light");

  // Prefer download click (same browser cookie jar) for authenticated exports.
    const [pngDownload] = await Promise.all([
      memberPage.waitForEvent("download"),
      memberPage.getByRole("link", { name: /Download PNG/i }).click(),
    ]);
    expect(pngDownload.suggestedFilename()).toMatch(/sec-credential-.*\.png/i);
    const pngPath = await pngDownload.path();
    expect(pngPath).toBeTruthy();
    const pngStat = await import("node:fs/promises").then((fs) => fs.stat(pngPath!));
    expect(pngStat.size).toBeGreaterThan(2_000);

    const [pdfDownload] = await Promise.all([
      memberPage.waitForEvent("download"),
      memberPage.getByRole("link", { name: /Download PDF card/i }).click(),
    ]);
    expect(pdfDownload.suggestedFilename()).toMatch(/sec-credential-.*\.pdf/i);
    const pdfPath = await pdfDownload.path();
    expect(pdfPath).toBeTruthy();
    const pdfStat = await import("node:fs/promises").then((fs) => fs.stat(pdfPath!));
    expect(pdfStat.size).toBeGreaterThan(500);

    // API-level auth check still uses the authenticated request context.
    const pngResponse = await memberPage.request.get(
      `/api/credentials/${credentialId}/export/png?locale=en`,
    );
    expect(pngResponse.ok(), await pngResponse.text()).toBeTruthy();
    expect(pngResponse.headers()["content-type"]).toContain("image/png");
    expect(pngResponse.headers()["content-disposition"] ?? "").toMatch(/sec-credential-/i);

    await expect(memberPage.getByRole("heading", { name: /Share membership/i })).toBeVisible();
    await expect(memberPage.getByRole("link", { name: /Share on LinkedIn/i })).toBeVisible();

    await memberPage.goto(`/en/verify/${codeText}`);
    await expect(memberPage.getByRole("heading", { name: /Membership verified/i })).toBeVisible();
    await expect(memberPage.getByText(/^Active$/i).first()).toBeVisible();
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "verification-active-en.png"),
      fullPage: true,
    });

    await memberPage.goto("/ar/account/credential");
    await expect(memberPage.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(memberPage.locator("html")).toHaveAttribute("lang", "ar");
    await expect(memberPage.getByTestId("public-code")).toBeVisible({ timeout: 15_000 });
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "credential-ar.png"),
      fullPage: true,
    });
    await setTheme(memberPage, "dark");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "credential-ar-dark.png"),
      fullPage: true,
    });
    await setTheme(memberPage, "light");

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mobilePage = await mobile.newPage();
    await login(mobilePage, "en", memberEmail);
    await mobilePage.goto("/en/account/credential");
    await expect(mobilePage.getByTestId("public-code")).toBeVisible({ timeout: 15_000 });
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, "credential-mobile-en.png"),
      fullPage: true,
    });
    await mobilePage.getByRole("button", { name: /Open menu|فتح القائمة/i }).click();
    await setTheme(mobilePage, "dark");
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, "header-mobile-en-dark.png"),
      fullPage: false,
    });
    await mobile.close();

    const strangerContext = await browser.newContext();
    const strangerPage = await strangerContext.newPage();
    await login(strangerPage, "en", strangerEmail);
    const forbidden = await strangerPage.request.get(
      `/api/credentials/${credentialId}/export/png?locale=en`,
    );
    expect(forbidden.status()).toBe(403);
    await strangerContext.close();

    await adminPage.goto("/en/admin/credentials");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await adminPage.getByRole("link", { name: codeText! }).click();
    await adminPage.locator("textarea").fill("E2E revoke for verification test");
    await adminPage.getByRole("button", { name: /Revoke credential/i }).click();
    await expect(adminPage.getByText(/Credential updated/i)).toBeVisible({ timeout: 10_000 });

    await memberPage.goto(`/en/verify/${codeText}`);
    await expect(memberPage.getByRole("heading", { name: /not active|Revoked/i })).toBeVisible();
    await expect(memberPage.getByText(/^Revoked$/i).first()).toBeVisible();
    await expect(memberPage.getByRole("heading", { name: /Membership verified/i })).toHaveCount(0);
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "verification-revoked-en.png"),
      fullPage: true,
    });

    await memberContext.close();
    await adminContext.close();
  });
});
