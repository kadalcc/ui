#!/usr/bin/env node
/**
 * Drives the dev grid page in headless Chromium and reports console errors, page errors and
 * screenshots after each interaction. For a fast "does it actually work" loop while developing;
 * the Playwright suite in e2e/ is the real test.
 *
 *   node scripts/browser-smoke.mjs [--url http://127.0.0.1:5400/dev/grid/] [--out ./shots]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1]]);
    return acc;
  }, []),
);
const url = args.url ?? "http://127.0.0.1:5400/dev/grid/";
const out = resolve(args.out ?? "./shots");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") problems.push(`[console.${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));

let shot = 0;
const snap = async (name) => {
  shot++;
  const file = `${out}/${String(shot).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file });
  console.log(`shot ${file}`);
};
const step = async (name, fn) => {
  try {
    await fn();
    await page.waitForTimeout(250);
    await snap(name);
    console.log(`ok   ${name}`);
  } catch (e) {
    problems.push(`[step ${name}] ${e.message}`);
    await snap(`${name}-FAILED`);
    console.log(`FAIL ${name}: ${e.message.split("\n")[0]}`);
  }
};

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector("[data-slot=data-grid-table] tbody tr", { timeout: 20000 });
await snap("loaded");

const rowsVisible = async () => page.locator("[data-slot=data-grid-table] tbody tr[data-row-id]").count();
console.log("rows rendered:", await rowsVisible());

await step("sort-name", async () => {
  await page.getByRole("columnheader", { name: /^Name/ }).getByRole("button").first().click();
  await page.waitForSelector('[aria-sort="ascending"]');
});
await step("multi-sort-team-shift", async () => {
  await page.getByRole("columnheader", { name: /^Team/ }).getByRole("button").first().click({ modifiers: ["Shift"] });
});
await step("column-menu", async () => {
  const head = page.getByRole("columnheader", { name: /^Plan/ });
  await head.hover();
  await head.getByRole("button", { name: /Row actions/ }).click();
  await page.getByRole("menuitem", { name: /Pin to start/ }).waitFor();
});
await step("pin-plan-start", async () => {
  await page.getByRole("menuitem", { name: /Pin to start/ }).click();
  await page.waitForSelector('th[data-pinned="start"][data-column-id="plan"]');
});
await step("filter-status-open", async () => {
  const head = page.getByRole("columnheader", { name: /^Status/ });
  await head.hover();
  await head.getByRole("button", { name: /^Filter: Status/ }).click();
  await page.getByPlaceholder("Search values…").waitFor();
});
await step("filter-status-active", async () => {
  await page.getByRole("option", { name: /Active/ }).getByRole("checkbox").click();
  await page.waitForSelector("[data-slot=data-grid-filter-chips]");
  await page.keyboard.press("Escape");
});
await step("search", async () => {
  await page.getByRole("searchbox", { name: "Search…" }).fill("aarav");
  await page.waitForTimeout(400);
});
await step("search-clear", async () => {
  await page.getByRole("searchbox", { name: "Search…" }).fill("");
  await page.waitForTimeout(400);
});
await step("select-rows", async () => {
  const boxes = page.locator("tbody [role=checkbox]");
  await boxes.nth(0).click();
  await boxes.nth(3).click({ modifiers: ["Shift"] });
  await page.waitForSelector("[data-slot=data-grid-bulk-actions]");
});
await step("edit-cell", async () => {
  // Seats is editable and not part of the sort, so the edited row stays where it is.
  const row = page.locator("tbody tr[data-row-id]").first();
  const cell = row.locator('td[data-column-id="seats"]');
  await cell.dblclick();
  const input = page.locator("td[data-editing] input");
  await input.waitFor();
  await input.fill("77");
  await input.press("Enter");
  await page.waitForSelector("td[data-editing]", { state: "detached" });
  const text = await row.locator('td[data-column-id="seats"]').innerText();
  if (!text.includes("77")) throw new Error(`seats shows ${JSON.stringify(text)}`);
});
await step("keyboard-nav", async () => {
  const cell = page.locator('tbody tr[data-row-id] td[data-column-id="team"]').first();
  await cell.click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.up("Shift");
  await page.waitForSelector("td[data-selected]");
  const n = await page.locator("td[data-selected]").count();
  if (n < 4) throw new Error(`expected a 2x2 range, got ${n} selected cells`);
});
await step("copy-selection", async () => {
  await page.keyboard.press("ControlOrMeta+c");
});
await step("drag-reorder", async () => {
  const from = page.getByRole("columnheader", { name: /^Role/ }).getByRole("button").first();
  const to = page.getByRole("columnheader", { name: /^Team/ });
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2, { steps: 3 });
  await page.mouse.move(b.x + 10, b.y + b.height / 2, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const order = await page.locator("thead th[data-column-id]").evaluateAll((els) => els.map((e) => e.dataset.columnId));
  if (order.indexOf("role") > order.indexOf("team")) throw new Error(`order unchanged: ${order.join(",")}`);
});
await step("group-by-team", async () => {
  await page.getByRole("button", { name: /^Group/ }).click();
  await page.getByRole("menuitemcheckbox", { name: /^Team/ }).click();
  await page.keyboard.press("Escape");
  await page.waitForSelector("tr[data-grouped]");
});
await step("expand-group", async () => {
  await page.locator("tr[data-grouped] button[aria-expanded]").first().click();
});
await step("ungroup", async () => {
  await page.locator("[data-slot=data-grid-grouping-bar] button").first().click();
});
await step("density-compact", async () => {
  await page.getByRole("button", { name: "Density" }).click();
  await page.getByRole("menuitemradio", { name: /Compact/ }).click();
  await page.waitForSelector('[data-slot=data-grid][data-density="compact"]');
});
await step("columns-popover-hide-notes", async () => {
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("checkbox", { name: "Notes" }).click();
  await page.keyboard.press("Escape");
  await page.waitForSelector('th[data-column-id="notes"]', { state: "detached" });
});
await step("page-size-50", async () => {
  await page.getByRole("combobox", { name: "Rows per page" }).click();
  await page.getByRole("option", { name: "50" }).click();
  await page.waitForFunction(() => document.querySelectorAll("tbody tr[data-row-id]").length >= 40);
});
await step("next-page", async () => {
  await page.getByRole("button", { name: "Go to next page" }).click();
});
await step("export-menu", async () => {
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: /Copy to clipboard/ }).click();
});
await step("resize-column", async () => {
  const th = page.locator('th[data-column-id="country"]');
  const handle = th.getByRole("separator");
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  const before = (await th.boundingBox()).width;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  const after = (await th.boundingBox()).width;
  if (after <= before + 40) throw new Error(`width ${before} -> ${after}`);
});
await step("fullscreen", async () => {
  await page.getByRole("button", { name: "Fullscreen" }).click();
  await page.waitForSelector("[data-slot=data-grid][data-fullscreen]");
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-slot=data-grid][data-fullscreen]", { state: "detached" });
});

const unique = [...new Set(problems)];
writeFileSync(`${out}/report.json`, JSON.stringify({ url, problems: unique }, null, 2));
console.log(`\n${unique.length} problem(s)`);
for (const p of unique) console.log(" -", p.slice(0, 400));
await browser.close();
process.exit(unique.some((p) => p.startsWith("[pageerror]") || p.startsWith("[step")) ? 1 : 0);
