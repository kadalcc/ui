import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 600)}`));
page.on("pageerror", (e) =>
  logs.push(`[pageerror] ${e.message}\n${(e.stack || "").split("\n").slice(0, 6).join("\n")}`),
);
page.on("requestfailed", (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
await page.goto(process.argv[2] ?? "http://127.0.0.1:5400/dev/grid/", { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
await page.screenshot({
  path: "/private/tmp/claude-501/-Users-apple-stack-hotfix-quickfix-bold-moves-full-story/97054f1d-51e8-4010-a5ec-6f82fec02b0d/scratchpad/probe.png",
});
console.log(logs.join("\n") || "(no console output)");
console.log(
  "rows:",
  await page.locator("tbody tr").count(),
  "html length:",
  (await page.content()).length,
);
await browser.close();
