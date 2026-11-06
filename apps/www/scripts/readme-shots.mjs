// The README hero: the kitchen-sink grid after a few interactions, in light and dark, as webp.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";
const out = process.argv[2] ?? "../../.github/assets";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const scheme of ["light", "dark"]) {
  const page = await browser.newPage({
    viewport: { width: 1480, height: 860 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
  });
  await page.goto("http://127.0.0.1:5400/dev/grid/?rows=300", { waitUntil: "networkidle" });
  if (scheme === "dark") await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForSelector("tbody tr[data-row-id]");
  await page.getByRole("columnheader", { name: /^Name/ }).getByRole("button").first().click();
  await page
    .getByRole("columnheader", { name: /^Team/ })
    .getByRole("button")
    .first()
    .click({ modifiers: ["Shift"] });
  const status = page.getByRole("columnheader", { name: /^Status/ });
  await status.hover();
  await status.getByRole("button", { name: /^Filter: Status/ }).click();
  await page
    .getByRole("option", { name: /Active/ })
    .getByRole("checkbox")
    .click();
  await page.keyboard.press("Escape");
  const plan = page.getByRole("columnheader", { name: /^Plan/ });
  await plan.hover();
  await plan.getByRole("button", { name: /Row actions/ }).click();
  await page.getByRole("menuitem", { name: /Pin to start/ }).click();
  await page.locator("tbody [role=checkbox]").nth(1).click();
  await page
    .locator("tbody [role=checkbox]")
    .nth(3)
    .click({ modifiers: ["Shift"] });
  await page.locator('tbody tr[data-row-id] td[data-column-id="team"]').nth(4).click();
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(400);
  const grid = page.locator("[data-slot=data-grid]");
  const box = await grid.boundingBox();
  const png = await page.screenshot({
    clip: {
      x: box.x - 12,
      y: box.y - 12,
      width: box.width + 24,
      height: Math.min(box.height + 24, 820),
    },
  });
  await sharp(png)
    .webp({ quality: 88 })
    .toFile(`${out}/hero${scheme === "dark" ? "-dark" : ""}.webp`);
  console.log(`${out}/hero${scheme === "dark" ? "-dark" : ""}.webp`, box.width, box.height);
  await page.close();
}
await browser.close();
