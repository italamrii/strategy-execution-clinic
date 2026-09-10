import { test, expect } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const SCREENSHOT_DIR = path.join("docs", "review", "pr-6");

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

test.describe("private meeting restrictions", () => {
  test.beforeAll(async () => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
  });

  test("blocks live entry without a private JWT host and denies unauthorized browsers", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const hostEmail = `meet-host-${Date.now()}@clinic.test`;
    const strangerEmail = `meet-stranger-${Date.now()}@clinic.test`;

    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await login(hostPage, "en", hostEmail);
    const grant = await hostPage.request.post("/api/test/grant-role", {
      data: { email: hostEmail, role: "super_admin" },
    });
    expect(grant.ok(), await grant.text()).toBeTruthy();

    await hostPage.goto("/en/account/meetings");
    await expect(hostPage.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hostPage.getByText(/Start with camera off/i)).toBeVisible();
    await expect(hostPage.getByText("JITSI_JWT_APP_ID")).toBeVisible();
    await expect(hostPage.getByText("JITSI_OPERATOR_VERIFIED")).toBeVisible();

    const start = new Date(Date.now() + 3_600_000);
    const pad = (value: number) => String(value).padStart(2, "0");
    const startValue = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`;
    await hostPage.locator('input[name="title"]').fill("Confidential advisory room");
    await hostPage.locator('input[name="startsAt"]').evaluate((el, value) => {
      const input = el as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, startValue);
    await hostPage.getByRole("button", { name: /Create room|إنشاء الغرفة/i }).click();
    await expect(hostPage).toHaveURL(/\/en\/account\/meetings\/[0-9a-f-]+/i, { timeout: 20_000 });
    const meetingUrl = hostPage.url();

    await expect(hostPage.getByRole("heading", { name: /not available yet|غير متاح/i })).toBeVisible();
    await expect(hostPage.locator("iframe")).toHaveCount(0);
    await expect(hostPage.locator('iframe[src*="meet.jit.si"], iframe[src*="8x8.vc"]')).toHaveCount(0);
    await hostPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "meeting-setup-required-en.png"),
      fullPage: true,
    });

    await hostPage.goto("/ar/account/meetings/" + meetingUrl.split("/").pop());
    await expect(hostPage.getByRole("heading", { name: /غير متاح/i })).toBeVisible();
    await expect(hostPage.locator("iframe")).toHaveCount(0);
    await hostPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "meeting-setup-required-ar.png"),
      fullPage: true,
    });

    const strangerContext = await browser.newContext();
    const strangerPage = await strangerContext.newPage();
    await login(strangerPage, "en", strangerEmail);
    await strangerPage.goto(meetingUrl);
    await expect(strangerPage.locator('[data-access="denied"]')).toBeVisible({ timeout: 20_000 });
    await expect(strangerPage.locator("iframe")).toHaveCount(0);
    await strangerPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "meeting-unauthorized-en.png"),
      fullPage: true,
    });

    await strangerContext.close();
    await hostContext.close();
  });
});
