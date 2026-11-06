// Opens the playground, waits for LiveCodes to boot, and looks for a rendered grid inside its result frame.
import { chromium } from "@playwright/test";
const url = process.argv[2] ?? "http://127.0.0.1:5400/playground/?example=data-grid-basic";
const out =
  process.argv[3] ??
  "/private/tmp/claude-501/-Users-apple-stack-hotfix-quickfix-bold-moves-full-story/97054f1d-51e8-4010-a5ec-6f82fec02b0d/scratchpad/playground.png";
// Against a loopback dev server the LiveCodes sandbox (a public origin) is blocked by Chrome's
// local-network-access checks; the deployed site has no such problem. Off for the local check.
const browser = await chromium.launch({
  args: [
    "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,PrivateNetworkAccessForWorkers",
  ],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const logs = [];
page.on("console", (m) => {
  if (m.type() === "error") logs.push(`[console] ${m.text().slice(0, 300)}`);
});
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
page.on("response", (r) => {
  if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url().slice(0, 160)}`);
});
page.on("requestfailed", (r) =>
  logs.push(`[failed] ${r.url().slice(0, 160)} ${r.failure()?.errorText ?? ""}`),
);
await page.goto(url, { waitUntil: "load" });
let found = null;
for (let i = 0; i < 40 && !found; i++) {
  await page.waitForTimeout(1000);
  for (const f of page.frames()) {
    try {
      const n = await f
        .evaluate(() => document.querySelectorAll("table tbody tr").length)
        .catch(() => 0);
      if (n > 0) found = { url: f.url().slice(0, 80), rows: n };
    } catch {}
  }
}
await page.screenshot({ path: out });
console.log("frames:", page.frames().length, "grid in result:", JSON.stringify(found));
console.log("playground box:", JSON.stringify(await page.locator("#playground").boundingBox()));
for (const f of page.frames()) {
  const errs = await f.evaluate(() => window.__errors ?? []).catch(() => []);
  if (errs.length) console.log("frame errors", f.url().slice(0, 60), errs);
}
console.log(logs.join("\n") || "(no page errors)");
await browser.close();
process.exit(found ? 0 : 1);
