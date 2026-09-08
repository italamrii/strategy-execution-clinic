import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const base = "http://127.0.0.1:3000";
const screenshots = path.join(process.cwd(), "e2e", "screenshots");
const capture = path.join(process.cwd(), ".data", "local-otp-capture.json");
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.goto(`${base}/ar`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(screenshots, "final-home-ar.png"), fullPage: true });
await page.goto(`${base}/ar/login`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(screenshots, "final-login-ar.png"), fullPage: true });

const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobilePage.goto(`${base}/ar/login`, { waitUntil: "networkidle" });
await mobilePage.screenshot({ path: path.join(screenshots, "final-login-mobile.png"), fullPage: true });
await mobilePage.close();

const email = `local-ui-${Date.now()}@clinic.test`;
await page.locator('input[name="email"]').fill(email);
await page.locator('button[type="submit"]').click();
await page.locator('input[name="code"]').waitFor();
let code = "";
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const value = JSON.parse(await readFile(capture, "utf8")) as { email: string; code: string };
    if (value.email === email) { code = value.code; break; }
  } catch { /* capture is written immediately after the console provider sends */ }
  await page.waitForTimeout(100);
}
if (!/^\d{6}$/.test(code)) throw new Error("Local OTP was not captured safely");
await page.locator('input[name="code"]').fill(code);
await page.locator('button[type="submit"]').click();
await page.waitForURL(/\/ar\/account$/, { timeout: 15_000 });
await page.screenshot({ path: path.join(screenshots, "final-login-success.png"), fullPage: true });

const englishPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await englishPage.goto(`${base}/en/login`, { waitUntil: "networkidle" });
const englishEmail = `local-ui-en-${Date.now()}@clinic.test`;
await englishPage.locator('input[name="email"]').fill(englishEmail);
await englishPage.locator('button[type="submit"]').click();
await englishPage.locator('input[name="code"]').waitFor();
let englishCode = "";
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const value = JSON.parse(await readFile(capture, "utf8")) as { email: string; code: string };
    if (value.email === englishEmail) { englishCode = value.code; break; }
  } catch { /* capture is written immediately after the console provider sends */ }
  await englishPage.waitForTimeout(100);
}
if (!/^\d{6}$/.test(englishCode)) throw new Error("English local OTP was not captured safely");
await englishPage.locator('input[name="code"]').fill(englishCode);
await englishPage.locator('button[type="submit"]').click();
await englishPage.waitForURL(/\/en\/account$/, { timeout: 15_000 });

console.log(JSON.stringify({
  ok: true,
  arabic: { redirectedTo: page.url(), sessionCookie: Boolean((await page.context().cookies()).find((cookie) => cookie.name === "clinic_session")) },
  english: { redirectedTo: englishPage.url(), sessionCookie: Boolean((await englishPage.context().cookies()).find((cookie) => cookie.name === "clinic_session")) },
}));
await browser.close();
