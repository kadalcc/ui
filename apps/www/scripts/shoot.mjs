// Full-page screenshot of a URL: node scripts/shoot.mjs <url> <out.png> [width] [dark]
import { chromium } from "@playwright/test";
const [url, out, width = "1400", dark] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: 900 },
  colorScheme: dark ? "dark" : "light",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url, { waitUntil: "networkidle" });
if (dark)
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
  });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
console.log(out, errors.length ? `page errors: ${errors.join(" | ")}` : "no page errors");
await browser.close();
