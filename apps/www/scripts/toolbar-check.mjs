// Phone toolbar: no overlap between the search box and the menus; end-aligned header title stays visible on hover.
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://127.0.0.1:5400";
const browser = await chromium.launch();
const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await phone.goto(base + "/docs/data-grid/grouping/", { waitUntil: "networkidle" });
const boxes = await phone.evaluate(() => {
  const r = (el) => el?.getBoundingClientRect();
  const search = r(document.querySelector("[data-slot=data-grid-search]"));
  const group = r(
    [...document.querySelectorAll("[data-slot=data-grid-toolbar] button")].find((b) =>
      /Group/.test(b.textContent ?? ""),
    ),
  );
  return {
    search: search && [search.left, search.right, search.top, search.bottom].map(Math.round),
    group: group && [group.left, group.right, group.top, group.bottom].map(Math.round),
  };
});
const overlap =
  boxes.search &&
  boxes.group &&
  boxes.group[0] < boxes.search[1] &&
  boxes.group[2] < boxes.search[3];
console.log("phone toolbar", JSON.stringify(boxes), overlap ? "OVERLAP" : "ok");
const desk = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await desk.goto(base + "/dev/grid/", { waitUntil: "networkidle" });
const th = desk.locator("th[data-column-id=mrr]");
await th.hover();
await desk.waitForTimeout(300);
const vis = await th.evaluate((el) => {
  const title = el.querySelector("[data-slot=data-grid-header-title]").getBoundingClientRect();
  const overlay = [...el.querySelectorAll("div")]
    .find((d) => d.className.includes("absolute inset-y-0"))
    ?.getBoundingClientRect();
  const covered = overlay && !(overlay.right <= title.left || overlay.left >= title.right);
  return {
    title: [title.left, title.right].map(Math.round),
    overlay: overlay && [overlay.left, overlay.right].map(Math.round),
    covered,
  };
});
console.log("MRR header on hover", JSON.stringify(vis), vis.covered ? "COVERED" : "ok");
await browser.close();
