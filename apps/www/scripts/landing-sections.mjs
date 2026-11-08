import { chromium } from "@playwright/test";
const [base, out, dark] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  colorScheme: dark ? "dark" : "light",
});
await context.addInitScript((d) => {
  try {
    localStorage.setItem("theme", d ? "dark" : "light");
  } catch {}
}, !!dark);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !/Outdated Optimize|dev-toolbar/.test(m.text()))
    errors.push(m.text().slice(0, 200));
});
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.addStyleTag({ content: "astro-dev-toolbar{display:none!important}" });
const hero = page.locator("[data-copy-command]").first();
await hero.screenshot({ path: out + "-hero.png" });
const ships = page.locator("section", { hasText: "How it ships" }).first();
await ships.screenshot({ path: out + "-ships.png" });
const typed = page.locator("section", { hasText: "Type safety" }).first();
await typed.screenshot({ path: out + "-typed.png" });
// Switch the package manager and copy, to make sure the highlighted forms swap.
await page.locator("[data-copy-command] [data-pm=bun]").first().click();
const shown = await page
  .locator("[data-copy-command] [data-form]:not([hidden])")
  .first()
  .innerText();
console.log(
  "after bun:",
  JSON.stringify(shown),
  "| errors:",
  errors.length ? errors.join(" | ") : "none",
);
await browser.close();
