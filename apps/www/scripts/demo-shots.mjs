// Element screenshots of every <Demo> on the docs, in dark on a desktop and light on a phone (the
// OS scheme set to the opposite, so the shots prove the site's own toggle drives the tokens), plus
// the open states of the menus on the overview page. node scripts/demo-shots.mjs <outDir> <base>
import { chromium } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const [outDir, base] = process.argv.slice(2);
const docsDir = "src/content/docs/docs";
const pages = [];
const walk = (dir, prefix) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (f.isDirectory()) walk(join(dir, f.name), `${prefix}${f.name}/`);
    else if (f.name.endsWith(".mdx") && readFileSync(join(dir, f.name), "utf8").includes("<Demo"))
      pages.push(`${prefix}${f.name === "index.mdx" ? "" : f.name.replace(/\.mdx$/, "") + "/"}`);
  }
};
walk(docsDir, "/docs/");
const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
const modes = [
  { name: "desk-dark", viewport: { width: 1440, height: 900 }, dark: true },
  { name: "mobile-light", viewport: { width: 390, height: 844 }, dark: false, mobile: true },
];
for (const mode of modes) {
  const context = await browser.newContext({
    viewport: mode.viewport,
    deviceScaleFactor: 1,
    isMobile: !!mode.mobile,
    hasTouch: !!mode.mobile,
    colorScheme: mode.dark ? "light" : "dark",
  });
  await context.addInitScript((dark) => {
    localStorage.setItem("theme", dark ? "dark" : "light");
    localStorage.setItem("starlight-theme", dark ? "dark" : "light");
  }, mode.dark);
  const page = await context.newPage();
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "astro-dev-toolbar{display:none!important}" });
    await page.waitForTimeout(600);
    const demos = page.locator("[data-demo]");
    const n = await demos.count();
    for (let i = 0; i < n; i++) {
      const d = demos.nth(i);
      const name = await d.getAttribute("data-demo");
      await d.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await d.screenshot({ path: join(outDir, `${name}${n > 1 ? "-" + i : ""}-${mode.name}.png`) });
    }
    console.log(mode.name, path, n, "demos");
  }
  // Open states on the overview grid.
  await page.goto(base + "/docs/data-grid/", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "astro-dev-toolbar{display:none!important}" });
  const demo = page.locator("[data-demo]").first();
  await demo.scrollIntoViewIfNeeded();
  const shot = async (label) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(outDir, `open-${label}-${mode.name}.png`) });
  };
  const click = async (sel) => {
    const el = demo.locator(sel).first();
    if (await el.count()) { await el.click(); return true; }
    return false;
  };
  if (await click("button:has-text('View')")) { await shot("view-menu"); await page.keyboard.press("Escape"); }
  if (await click("button[aria-label='Group']")) { await shot("group-menu"); await page.keyboard.press("Escape"); }
  if (await click("button[aria-label='Column menu']")) { await shot("column-menu"); await page.keyboard.press("Escape"); }
  if (await click("button[aria-label='Export']")) { await shot("export-menu"); await page.keyboard.press("Escape"); }
  if (await click("[data-slot=data-grid-pagination] button[role=combobox]")) { await shot("page-size"); await page.keyboard.press("Escape"); }
  const filterBtn = demo.locator("[data-slot=data-grid-toolbar] button").filter({ hasText: /Filter/ }).first();
  if (await filterBtn.count()) { await filterBtn.click(); await shot("filters"); await page.keyboard.press("Escape"); }
  await context.close();
}
await browser.close();
