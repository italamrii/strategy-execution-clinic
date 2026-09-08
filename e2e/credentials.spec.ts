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

    await memberPage.goto("/en/account/membership");
    await expect(memberPage.getByText(/Active Membership|عضوية فعالة/i)).toBeVisible({
      timeout: 20_000,
    });

    await memberPage.goto("/en/account/credential");
    await expect(memberPage.getByTestId("public-code")).toBeVisible({ timeout: 20_000 });
    await expect(memberPage.getByTestId("credential-qr")).toBeVisible();
    await expect(memberPage.getByTestId("membership-card")).toBeVisible();
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
