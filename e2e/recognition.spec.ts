import { test, expect } from "@playwright/test";
import path from "node:path";
import { access, mkdir } from "node:fs/promises";

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

async function awardBadgeForE2E(
  page: import("@playwright/test").Page,
  actorEmail: string,
  targetEmail: string,
  badgeSlug: string,
) {
  const award = await page.request.post("/api/test/award-badge", {
    data: {
      actorEmail,
      targetEmail,
      badgeSlug,
      reason: "E2E authorized badge issuance for visual evidence",
    },
  });
  expect(award.ok(), await award.text()).toBeTruthy();
  const body = (await award.json()) as { publicCode: string };
  expect(body.publicCode).toBeTruthy();
  return body.publicCode;
}

async function applyAndApproveMembership(
  memberPage: import("@playwright/test").Page,
  adminPage: import("@playwright/test").Page,
  adminEmail: string,
) {
  await memberPage.goto("/en/membership/apply");
  await memberPage.locator('input[name="headline"]').fill("Recognition journey member");
  await memberPage.locator('textarea[name="summary"]').fill("Member for recognition phase five.");
  await memberPage.locator('textarea[name="motivation"]').fill("I want verified professional recognition.");
  await memberPage.locator('textarea[name="experience"]').fill("Strategy and community contribution.");
  await memberPage.locator('button[type="submit"]').click();
  await expect(memberPage).toHaveURL(/\/en\/account\/membership/, { timeout: 20_000 });

  await grantRole(adminPage, adminEmail, "membership_admin");
  await adminPage.goto("/en/admin/memberships/applications?status=submitted");
  await adminPage.getByRole("link", { name: /Open|فتح/i }).first().click();
  await adminPage.getByRole("button", { name: /Start review|بدء المراجعة/i }).click();
  await adminPage.getByRole("button", { name: /Approve|موافقة/i }).click();
  await expect(adminPage.getByText(/approved|موافق/i)).toBeVisible({ timeout: 20_000 });
}

test.describe("recognition e2e", () => {
  test.beforeAll(async () => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
  });

  test("contribution, badge, certificate, profile, and leader scope", async ({ browser }) => {
    test.setTimeout(180_000);
    const memberEmail = `rec-member-${Date.now()}@clinic.test`;
    const adminEmail = `rec-admin-${Date.now()}@clinic.test`;
    const leaderAEmail = `rec-leader-a-${Date.now()}@clinic.test`;
    const leaderBEmail = `rec-leader-b-${Date.now()}@clinic.test`;

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, "en", adminEmail);
    await grantRole(adminPage, adminEmail, "super_admin");

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await login(memberPage, "en", memberEmail);
    await applyAndApproveMembership(memberPage, adminPage, adminEmail);
    await grantRole(adminPage, adminEmail, "super_admin");

    await memberPage.goto("/en/account/contributions", { waitUntil: "domcontentloaded" });
    await memberPage.locator('input[name="titleAr"]').fill("مساهمة اختبار");
    await memberPage.locator('input[name="titleEn"]').fill("E2E Recognition Contribution");
    await memberPage.getByRole("button", { name: /Submit/i }).click();
    await expect(memberPage.getByText(/submitted for review/i)).toBeVisible({ timeout: 15_000 });

    await memberPage.goto("/en/admin/contributions");
    await expect(memberPage.locator('[data-access="denied"]')).toBeVisible();

    await adminPage.goto("/en/admin/contributions");
    await adminPage.getByRole("button", { name: /Approve/i }).first().click();
    await adminPage.waitForTimeout(2000);

    await memberPage.goto("/en/account/contributions");
    await expect(memberPage.getByText(/approved/i).first()).toBeVisible({ timeout: 15_000 });
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "contribution-portfolio.png"),
      fullPage: true,
    });
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "impact-timeline.png"),
      fullPage: true,
    });

    const pdfLink = memberPage.locator('a[href*="/api/certificates/"]').first();
    await expect(pdfLink).toBeVisible({ timeout: 15_000 });
    const pdfHref = await pdfLink.getAttribute("href");
    expect(pdfHref).toBeTruthy();
    const pdf = await memberPage.request.get(pdfHref!);
    expect(pdf.ok()).toBeTruthy();
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect((await pdf.body()).byteLength).toBeGreaterThan(500);
    const certId = pdfHref!.split("/api/certificates/")[1]!.split("/pdf")[0];

    const publicCode = await memberPage.locator("[data-certificate-code]").first().getAttribute("data-certificate-code");
    expect(publicCode).toBeTruthy();

    await memberPage.goto(`/en/certificate/${publicCode}`);
    await expect(memberPage.getByText(/ACTIVE/i)).toBeVisible();
    await expect(memberPage.locator("html")).toHaveAttribute("lang", "en");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "certificate-en.png"),
      fullPage: true,
    });

    await memberPage.goto(`/ar/certificate/${publicCode}`);
    await expect(memberPage.locator("html")).toHaveAttribute("lang", "ar");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "certificate-ar.png"),
      fullPage: true,
    });

    const share = await memberPage.request.get(
      `/api/recognition/share/certificate/${publicCode}?variant=square&locale=ar`,
    );
    expect(share.ok()).toBeTruthy();
    expect(share.headers()["content-type"]).toContain("image/png");
    expect((await share.body()).byteLength).toBeGreaterThan(1000);

    await memberPage.goto("/en/account/credential");
    const qr = memberPage.locator('img[src*="/api/verify/"]').first();
    await expect(qr).toBeVisible({ timeout: 15_000 });
    const src = await qr.getAttribute("src");
    const membershipCode = decodeURIComponent(src!.split("/api/verify/")[1]!.split("/")[0]);
    expect(membershipCode).toMatch(/^SEC-/);

    await memberPage.goto("/en/account/profile");
    await memberPage.locator("select").selectOption("public");
    if (await memberPage.locator('input[type="checkbox"]').count()) {
      await memberPage.locator('input[type="checkbox"]').last().check();
    }
    await memberPage.getByRole("button", { name: /Save|حفظ/i }).click();

    await memberPage.goto(`/en/members/${membershipCode}`);
    await expect(memberPage.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(memberPage.locator("html")).toHaveAttribute("dir", /ltr|rtl/);
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "member-public-profile-en.png"),
      fullPage: true,
    });
    await memberPage.setViewportSize({ width: 390, height: 844 });
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "member-public-profile-mobile.png"),
      fullPage: true,
    });
    await memberPage.setViewportSize({ width: 1280, height: 720 });

    await memberPage.goto(`/ar/members/${membershipCode}`);
    await expect(memberPage.locator("html")).toHaveAttribute("lang", "ar");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "member-public-profile-ar.png"),
      fullPage: true,
    });

    await memberPage.goto("/en/members");
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "member-directory.png"),
      fullPage: true,
    });

    const foundingCode = await awardBadgeForE2E(
      adminPage,
      adminEmail,
      memberEmail,
      "founding_member",
    );
    await memberPage.goto(`/en/badge/${foundingCode}`);
    await expect(memberPage.getByText(/ACTIVE/i)).toBeVisible();
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "badge-founding.png"),
      fullPage: true,
    });

    const volunteerCode = await awardBadgeForE2E(
      adminPage,
      adminEmail,
      memberEmail,
      "distinguished_volunteer",
    );
    await memberPage.goto(`/en/badge/${volunteerCode}`);
    await expect(memberPage.getByText(/ACTIVE/i)).toBeVisible();
    await memberPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "badge-volunteer.png"),
      fullPage: true,
    });
    await access(path.join(SCREENSHOT_DIR, "badge-founding.png"));
    await access(path.join(SCREENSHOT_DIR, "badge-volunteer.png"));

    await memberPage.goto("/en/admin/volunteers");
    await expect(memberPage.locator('[data-access="denied"]')).toBeVisible();

    await adminPage.goto("/en/admin/recognition/certificates");
    await adminPage.locator('input[name="certificateId"]').fill(certId);
    await adminPage.locator('input[name="reason"]').fill("E2E revocation of issued certificate");
    await adminPage.getByRole("button", { name: /Revoke/i }).click();
    await expect(adminPage.getByText(/revoked/i)).toBeVisible({ timeout: 15_000 });

    await memberPage.goto(`/en/certificate/${publicCode}`);
    await expect(memberPage.getByText("REVOKED")).toBeVisible();

    const leaderAContext = await browser.newContext();
    const leaderAPage = await leaderAContext.newPage();
    await login(leaderAPage, "en", leaderAEmail);
    await applyAndApproveMembership(leaderAPage, adminPage, adminEmail);
    await grantRole(adminPage, adminEmail, "super_admin");
    await grantRole(adminPage, leaderAEmail, "volunteer_leader");

    const leaderBContext = await browser.newContext();
    const leaderBPage = await leaderBContext.newPage();
    await login(leaderBPage, "en", leaderBEmail);
    await applyAndApproveMembership(leaderBPage, adminPage, adminEmail);
    await grantRole(adminPage, adminEmail, "super_admin");
    await grantRole(adminPage, leaderBEmail, "volunteer_leader");

    await memberPage.goto("/en/account/volunteer");
    const activate = memberPage.getByRole("button", { name: /Activate profile/i });
    if (await activate.count()) {
      await Promise.all([
        memberPage.waitForLoadState("networkidle"),
        activate.click(),
      ]);
    }

    await leaderBPage.goto("/en/admin/volunteers/opportunities");
    await leaderBPage.locator('input[name="titleAr"]').fill("فرصة القائد ب");
    await leaderBPage.locator('input[name="titleEn"]').fill("Leader B scoped opportunity");
    await leaderBPage.locator('textarea[name="descriptionAr"]').fill("وصف فرصة القائد ب للتحقق من النطاق.");
    await leaderBPage.locator('textarea[name="descriptionEn"]').fill("Leader B opportunity used to prove object-level volunteer scope.");
    await leaderBPage.getByRole("button", { name: /Create and publish/i }).click();
    await expect(leaderBPage.getByText(/Opportunity published|published/i)).toBeVisible({ timeout: 15_000 });

    await memberPage.goto("/en/volunteer/opportunities");
    await memberPage.getByRole("heading", { name: "Leader B scoped opportunity" }).first().locator("..").getByRole("link").click();
    await memberPage.locator('textarea[name="motivation"]').fill(
      "Applying to leader B opportunity for e2e scope isolation.",
    );
    await memberPage.getByRole("button", { name: /Submit application/i }).click();
    await expect(memberPage.getByText(/Application submitted/i)).toBeVisible({ timeout: 15_000 });

    await leaderAPage.goto("/en/admin/volunteers/applications");
    await expect(leaderAPage.getByText(/e2e scope isolation/i)).toHaveCount(0);

    await leaderAContext.close();
    await leaderBContext.close();
    await memberContext.close();
    await adminContext.close();
  });
});
