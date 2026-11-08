// Stores a view on the persistence page, reloads, and looks for React hydration errors.
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "https://ui.kadal.cc";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
await page.goto(base + "/docs/data-grid/persistence/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
// Change the density through the toolbar menu, which persists the view.
const grid = page.locator("[data-slot=data-grid]").first();
await grid.getByRole("button", { name: /Density/ }).click();
await page.getByRole("menuitemradio", { name: /Compact/ }).click();
await page.waitForTimeout(600);
const before = await grid.getAttribute("data-density");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const after = await page.locator("[data-slot=data-grid]").first().getAttribute("data-density");
const hydration = errors.filter((e) => /hydrat/i.test(e));
console.log("density before reload:", before, "| after:", after, "| hydration errors:", hydration.length, "| other errors:", errors.filter((e) => !/hydrat/i.test(e)).length);
await browser.close();
process.exit(after === "compact" && hydration.length === 0 ? 0 : 1);
