#!/usr/bin/env node
/**
 * The other examples in headless Chromium: virtualized scrolling, tree expanding, the server-side
 * loading state, the composed layout and URL state. `node scripts/browser-smoke-demos.mjs --out dir`
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--"))
      acc.push([a.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1]]);
    return acc;
  }, []),
);
const base = args.base ?? "http://127.0.0.1:5400";
const out = resolve(args.out ?? "./shots-demos");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const problems = [];
let shot = 0;

async function run(name, fn) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Outdated Optimize Dep"))
      problems.push(`[${name}] console.error ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => problems.push(`[${name}] pageerror ${e.message}`));
  const t0 = Date.now();
  try {
    await page.goto(`${base}/dev/${name}/`, { waitUntil: "networkidle" });
    await page.waitForSelector("tbody tr[data-row-id]", { timeout: 30000 });
    await fn(page);
    console.log(`ok   ${name} (${Date.now() - t0}ms)`);
  } catch (e) {
    problems.push(`[${name}] ${e.message.split("\n")[0]}`);
    console.log(`FAIL ${name}: ${e.message.split("\n")[0]}`);
  }
  shot++;
  await page.screenshot({ path: `${out}/${String(shot).padStart(2, "0")}-${name}.png` });
  await page.close();
}

await run("basic", async (page) => {
  const n = await page.locator("tbody tr[data-row-id]").count();
  if (n !== 10) throw new Error(`expected 10 rows, got ${n}`);
});

await run("virtualized", async (page) => {
  const rendered = await page.locator("tbody tr[data-row-id]").count();
  if (rendered > 60) throw new Error(`virtualization off: ${rendered} rows in the DOM`);
  const scroller = page.getByRole("grid");
  const t0 = Date.now();
  for (let i = 1; i <= 10; i++) {
    await scroller.evaluate((el, y) => (el.scrollTop = y), i * 40 * 2000);
    await page.waitForTimeout(60);
  }
  const lastIndex = await page.locator("tbody tr[data-row-id]").last().getAttribute("data-index");
  if (Number(lastIndex) < 10000)
    throw new Error(`did not reach deep rows: last index ${lastIndex}`);
  console.log(`     scrolled to row ${lastIndex} in ${Date.now() - t0}ms; ${rendered} rows in DOM`);
  await scroller.evaluate((el) => (el.scrollTop = 0));
  await page.locator("tbody tr[data-row-id] td").nth(3).click();
  await page.keyboard.press("End");
  await page.keyboard.press("ControlOrMeta+End");
  await page.waitForTimeout(300);
  const focused = await page.locator("td[data-focused]").count();
  if (focused !== 1) throw new Error(`expected a focused cell after Ctrl+End, got ${focused}`);
});

await run("tree", async (page) => {
  const before = await page.locator("tbody tr[data-row-id]").count();
  await page.locator('tr[data-row-id] button[aria-expanded="false"]').first().click();
  await page.waitForTimeout(200);
  const after = await page.locator("tbody tr[data-row-id]").count();
  if (after <= before) throw new Error(`expanding added no rows (${before} -> ${after})`);
  const child = page.locator('tr[aria-level="2"]').first();
  await child.waitFor();
  await page.locator("tbody [role=checkbox]").first().click();
  const selected = await page.locator("tr[data-state=selected]").count();
  if (selected < 2) throw new Error(`selecting a parent should select its children (${selected})`);
});

await run("server", async (page) => {
  await page.waitForSelector("[role=progressbar]", { state: "detached", timeout: 10000 });
  await page.getByRole("button", { name: "Go to next page" }).click();
  await page.waitForSelector("[role=progressbar]");
  await page.waitForSelector("[role=progressbar]", { state: "detached", timeout: 10000 });
  const text = await page.locator("[data-slot=data-grid-pagination]").innerText();
  if (!/Page 2 of/.test(text)) throw new Error(`pager text: ${text}`);
  await page.getByRole("columnheader", { name: /^MRR/ }).getByRole("button").first().click();
  await page.waitForSelector("[role=progressbar]", { state: "detached", timeout: 10000 });
});

await run("composed", async (page) => {
  await page.getByRole("searchbox").fill("design");
  await page.waitForTimeout(500);
  const text = await page.locator("tfoot").innerText();
  if (!text.includes("Σ")) throw new Error(`footer missing: ${text}`);
});

await run("url-state", async (page) => {
  await page.getByRole("searchbox").fill("an");
  await page.waitForTimeout(600);
  if (!page.url().includes("people.q=an")) throw new Error(`url not updated: ${page.url()}`);
  await page.getByRole("button", { name: "Go to next page" }).click();
  await page.waitForTimeout(300);
  if (!page.url().includes("people.page=2")) throw new Error(`page not in url: ${page.url()}`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("tbody tr[data-row-id]");
  const q = await page.getByRole("searchbox").inputValue();
  if (q !== "an") throw new Error(`search not restored from url: ${JSON.stringify(q)}`);
});

const unique = [...new Set(problems)];
console.log(`\n${unique.length} problem(s)`);
for (const p of unique) console.log(" -", p.slice(0, 400));
await browser.close();
process.exit(unique.length ? 1 : 0);
