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

test.describe("membership e2e", () => {
  test("arabic and english public membership pages", async ({ page }) => {
    await page.goto("/ar/membership");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/en/membership");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("founding membership is not publicly self-applicable", async ({ page }) => {
    const email = `e2e-founding-${Date.now()}@clinic.test`;
    await login(page, "en", email);
    await page.goto("/en/membership/apply");
    const options = page.locator('select[name="membershipTypeId"] option');
    const texts = await options.allTextContents();
    expect(texts.join(" ").toLowerCase()).not.toContain("founding");
  });

  test("member applies and admin reviews to active membership", async ({ browser }) => {
    const memberEmail = `e2e-member-${Date.now()}@clinic.test`;
    const adminEmail = `e2e-admin-${Date.now()}@clinic.test`;

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await login(memberPage, "en", memberEmail);
    await memberPage.goto("/en/membership/apply");
    await memberPage.locator('input[name="headline"]').fill("Professional practitioner");
    await memberPage.locator('textarea[name="summary"]').fill(
      "Experienced delivery leader across strategy and execution programs.",
    );
    await memberPage.locator('textarea[name="motivation"]').fill(
      "I want to join the Clinic as a Professional Member.",
    );
    await memberPage.locator('textarea[name="experience"]').fill(
      "Led multiple institutional excellence initiatives in the region.",
    );
    await memberPage.locator('button[type="submit"]').click();
    await expect(memberPage).toHaveURL(/\/en\/account\/membership/, { timeout: 20_000 });
    await expect(memberPage.getByText(/Submitted|مُرسل/i)).toBeVisible();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, "en", adminEmail);
    const grant = await adminPage.request.post("/api/test/grant-role", {
      data: { email: adminEmail, role: "membership_admin" },
    });
    expect(grant.ok(), await grant.text()).toBeTruthy();

    await adminPage.goto("/en/admin/memberships/applications?status=submitted");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible();
    await adminPage.getByRole("link", { name: /Open|فتح/i }).first().click();
    await expect(adminPage.getByText("Professional practitioner")).toBeVisible();
    await adminPage.getByRole("button", { name: /Start review|بدء المراجعة/i }).click();
    await expect(adminPage.getByRole("button", { name: /Approve|موافقة/i })).toBeVisible({
      timeout: 15_000,
    });
    await adminPage.getByRole("button", { name: /Approve|موافقة/i }).click();
    await expect(adminPage.getByText(/approved/i)).toBeVisible({ timeout: 15_000 });

    await memberPage.goto("/en/account/membership");
    await expect(memberPage.getByText(/Active Membership|عضوية فعالة/i)).toBeVisible({
      timeout: 15_000,
    });

    await memberContext.close();
    await adminContext.close();
  });

  test("unauthorized user cannot access admin review route", async ({ page }) => {
    const email = `e2e-unauth-${Date.now()}@clinic.test`;
    await login(page, "en", email);
    await page.goto("/en/admin/memberships/applications");
    await expect(page.getByRole("heading", { name: /Forbidden|ممنوع/i })).toBeVisible();
  });
});
