import { chromium, type Page } from "@playwright/test";
import path from "node:path";

const root = process.cwd();
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  headless: true,
});

async function capture(page: Page, url: string, filename: string, fullPage = true) {
  await page.goto(`http://127.0.0.1:3000${url}`, { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.screenshot({ path: path.join(root, "e2e", "screenshots", filename), fullPage });
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await capture(desktop, "/ar", "redesign-home-ar-desktop.png");
await capture(desktop, "/en", "redesign-home-en-desktop.png");
await capture(desktop, "/ar/login", "redesign-login-ar-desktop.png");
await capture(desktop, "/ar/membership", "redesign-membership.png");
await capture(desktop, "/ar/volunteer", "redesign-volunteer.png");
await desktop.goto("http://127.0.0.1:3000/ar", { waitUntil: "networkidle" });
await desktop.locator(".strategy-visual").screenshot({ path: path.join(root, "e2e", "screenshots", "redesign-3d-closeup.png") });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await capture(mobile, "/ar", "redesign-home-ar-mobile.png");
await capture(mobile, "/ar/login", "redesign-login-ar-mobile.png");
await browser.close();
