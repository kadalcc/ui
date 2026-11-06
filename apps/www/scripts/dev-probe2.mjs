import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const logs = [];
page.on("console", (m) => {
  if (m.type() === "error") logs.push(`[error] ${m.text().slice(0, 300)}`);
});
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto("http://127.0.0.1:5400/dev/grid/", { waitUntil: "networkidle" });
await page.waitForSelector("tbody tr[data-row-id]");
const state = (k) => page.evaluate((k) => JSON.stringify(window.__grid.table.store.state[k]), k);
console.log(
  "viewport height:",
  await page
    .locator("[data-slot=data-grid-viewport]")
    .evaluate((e) => e.getBoundingClientRect().height),
);
const box = page.locator("tbody [role=checkbox]").first();
console.log(
  "checkbox tag:",
  await box.evaluate((e) => e.tagName + " aria-checked=" + e.getAttribute("aria-checked")),
);
await box.click();
await page.waitForTimeout(200);
console.log(
  "rowSelection after click:",
  await state("rowSelection"),
  "selected rows:",
  await page.locator("tr[data-state=selected]").count(),
);
console.log("bulk bar:", await page.locator("[data-slot=data-grid-bulk-actions]").count());
await page
  .locator("tbody [role=checkbox]")
  .nth(3)
  .click({ modifiers: ["Shift"] });
await page.waitForTimeout(200);
console.log("rowSelection after shift:", await state("rowSelection"));
// resize
const th = page.locator('th[data-column-id="country"]');
const handle = th.getByRole("separator");
const hb = await handle.boundingBox();
console.log("handle box:", JSON.stringify(hb), "th width:", (await th.boundingBox()).width);
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
await page.mouse.down();
await page.waitForTimeout(50);
console.log("columnResizing after down:", await state("columnResizing"));
await page.mouse.move(hb.x + 40, hb.y + hb.height / 2, { steps: 4 });
await page.waitForTimeout(100);
console.log("columnResizing after move:", await state("columnResizing"));
console.log("columnSizing after move:", await state("columnSizing"));
await page.mouse.up();
await page.waitForTimeout(100);
console.log("th width after:", (await th.boundingBox()).width);
console.log(logs.join("\n") || "(no errors)");
await browser.close();
