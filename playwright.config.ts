import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

if (process.env.E2E_ORCHESTRATED !== "true") {
  console.error(
    [
      "Playwright must be started via the E2E orchestrator:",
      "  pnpm test:e2e",
      "  pnpm test:e2e:credentials",
      "Direct `playwright test` is disabled so the suite cannot hang on an unready app/DB.",
    ].join("\n"),
  );
  process.exit(1);
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/playwright-report" }]],
  outputDir: "e2e/test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          ...(executablePath ? { executablePath } : {}),
          args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
        },
      },
    },
  ],
});
