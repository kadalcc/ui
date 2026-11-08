// Full-page screenshots of pages in three modes, with overflow + console checks.
// node scripts/sweep.mjs <outDir> <base> <path...>
import { chromium } from "@playwright/test";
import { join } from "node:path";
const [outDir, base, ...paths] = process.argv.slice(2);
const browser = await chromium.launch();
const modes = [
  { name: "desk-light", viewport: { width: 1280, height: 900 }, dark: false },
  { name: "desk-dark", viewport: { width: 1280, height: 900 }, dark: true },
  { name: "mobile-light", viewport: { width: 390, height: 844 }, dark: false, mobile: true },
];
for (const path of paths) {
  const slug = path.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home";
  for (const mode of modes) {
    const context = await browser.newContext({
      viewport: mode.viewport,
      deviceScaleFactor: 1,
      isMobile: !!mode.mobile,
      hasTouch: !!mode.mobile,
      colorScheme: mode.dark ? "dark" : "light",
    });
    await context.addInitScript((dark) => {
      try {
        localStorage.setItem("theme", dark ? "dark" : "light");
        localStorage.setItem("starlight-theme", dark ? "dark" : "light");
      } catch {}
    }, mode.dark);
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !/Outdated Optimize Dep|dev-toolbar/.test(m.text()))
        errors.push(m.text().slice(0, 160));
    });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
    await page
      .goto(base + path, { waitUntil: "networkidle" })
      .catch((e) => errors.push("goto: " + e.message));
    await page.waitForTimeout(1500);
    const metrics = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      h: document.documentElement.scrollHeight,
      title: document.title,
    }));
    const file = join(outDir, `${slug}-${mode.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(
      `${path.padEnd(16)} ${mode.name.padEnd(13)} h=${metrics.h} ${metrics.sw > metrics.iw ? "OVERFLOW sw=" + metrics.sw : "ok"} ${errors.length ? "ERRORS: " + errors.join(" | ") : ""}`,
    );
    await context.close();
  }
}
await browser.close();
