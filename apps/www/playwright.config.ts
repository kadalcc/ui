import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite for the data grid demos under /dev/<name>/ (see e2e/). The suite runs against
 * the production build served by `astro preview` on 5410, so what CI exercises is what ships;
 * locally an already-running server on that port is reused (`reuseExistingServer`). The dev server
 * on 5400 is left alone.
 *
 * `bun run build` also runs `play:build`, which needs scripts/build-playground.ts; until that
 * script lands the web server builds the site directly.
 */
const PORT = 5410;
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const desktop = { viewport: { width: 1400, height: 900 } };

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    ...desktop,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...desktop,
        // Only Chromium lets a test read the clipboard back; the clipboard specs skip elsewhere.
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"], ...desktop } },
    { name: "webkit", use: { ...devices["Desktop Safari"], ...desktop } },
    {
      // A small subset, tagged @mobile, on a phone-sized touch viewport.
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      grep: /@mobile/,
    },
  ],
  webServer: {
    // `--ignore-lock`: Astro 7 otherwise daemonises the preview (or refuses when another one holds
    // the lock); Playwright needs a foreground process it can stop.
    command: `node scripts/gen-examples.mjs && bunx astro build && bunx astro preview --port ${PORT} --host 127.0.0.1 --ignore-lock`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
