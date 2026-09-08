import { test, expect } from "@playwright/test";

test("arabic home and design preview respond", async ({ page }) => {
  const home = await page.goto("/ar");
  expect(home?.ok()).toBeTruthy();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  const preview = await page.goto("/ar/design-preview");
  expect(preview?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("english home uses ltr", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});
