import { test, expect } from "@playwright/test";

for (const locale of ["ar", "en"] as const) {
  test(`membership verification entry (${locale})`, async ({ page }) => {
    if (locale === "ar") await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}/verify`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const code = page.getByRole("textbox", { name: locale === "ar" ? "رمز العضوية" : "Membership code" });
    await code.fill("https://example.com");
    await page.getByRole("button", { name: locale === "ar" ? "التحقق من العضوية" : "Verify membership" }).click();
    await expect(page.locator("#code-error")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${locale}/verify$`));
    await code.fill(" sec-pro-2026-zzzzzz ");
    await expect(page.locator("#code-error")).toHaveCount(0);
    await page.screenshot({ path: `e2e/screenshots/verification-entry-${locale}.png`, fullPage: true });
    await page.getByRole("button", { name: locale === "ar" ? "التحقق من العضوية" : "Verify membership" }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/verify/SEC-PRO-2026-ZZZZZZ$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}
