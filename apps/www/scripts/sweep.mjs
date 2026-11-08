// Full-page screenshots of pages in four modes, with overflow, console and text-contrast checks.
// The OS colour scheme is set to the OPPOSITE of the site theme, so a token that follows the OS
// instead of the site's own toggle shows up as a contrast failure.
// node scripts/sweep.mjs <outDir> <base> <path...>
import { chromium } from "@playwright/test";
import { join } from "node:path";
const [outDir, base, ...paths] = process.argv.slice(2);
const browser = await chromium.launch();
const modes = [
  { name: "desk-light", viewport: { width: 1440, height: 900 }, dark: false },
  { name: "desk-dark", viewport: { width: 1440, height: 900 }, dark: true },
  { name: "mobile-light", viewport: { width: 390, height: 844 }, dark: false, mobile: true },
  { name: "mobile-dark", viewport: { width: 390, height: 844 }, dark: true, mobile: true },
];
const only = process.env.MODES?.split(",");
for (const path of paths) {
  const slug = path.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home";
  for (const mode of modes) {
    if (only && !only.includes(mode.name)) continue;
    const context = await browser.newContext({
      viewport: mode.viewport,
      deviceScaleFactor: 1,
      isMobile: !!mode.mobile,
      hasTouch: !!mode.mobile,
      colorScheme: mode.dark ? "light" : "dark",
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
    const metrics = await page.evaluate((expectDark) => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      const rgba = (css) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      };
      const lum = ([r, g, b]) => {
        const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const over = (top, under) => {
        const a = top[3];
        return [0, 1, 2].map((i) => Math.round(top[i] * a + under[i] * (1 - a))).concat(1);
      };
      const ratio = (a, b) => {
        const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (l1 + 0.05) / (l2 + 0.05);
      };
      const bgOf = (el) => {
        // Composite backgrounds up the tree until an opaque one; a background-image is "unknown".
        const layers = [];
        for (let n = el; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.backgroundImage !== "none") return null;
          const c = rgba(cs.backgroundColor);
          if (c[3] > 0) layers.push(c);
          if (c[3] >= 1) break;
        }
        let acc = [255, 255, 255, 1];
        if (layers.length && layers[layers.length - 1][3] >= 1) acc = layers.pop();
        while (layers.length) acc = over(layers.pop(), acc);
        return acc;
      };
      const opacityOf = (el) => {
        let o = 1;
        for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
        return o;
      };
      const low = [];
      const seen = new Set();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        const el = node.parentElement;
        if (!el || seen.has(el)) continue;
        seen.add(el);
        if (el.closest("[aria-hidden='true'], script, style, noscript, [hidden], .sr-only"))
          continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        // Clipped away (e.g. sr-only) or scrolled out of a hidden panel.
        if (r.bottom < 0 || r.right < 0) continue;
        const bg = bgOf(el);
        if (!bg) continue;
        let fg = rgba(cs.color);
        fg[3] *= opacityOf(el);
        if (fg[3] < 0.05) continue; // deliberately invisible (e.g. an animating element)
        const eff = over(fg, bg);
        const rt = ratio(eff, bg);
        const size = parseFloat(cs.fontSize);
        const bold = Number(cs.fontWeight) >= 700;
        const large = size >= 24 || (size >= 18.66 && bold);
        const min = large ? 3 : 4.5;
        if (rt < min)
          low.push({
            ratio: Math.round(rt * 100) / 100,
            text: node.textContent.trim().slice(0, 50),
            el: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).split(/\s+/).slice(0, 4).join(".")}`,
            fg: cs.color,
            bg: `rgb(${bg.slice(0, 3).join(",")})`,
            op: Math.round(fg[3] * 100) / 100,
          });
      }
      low.sort((a, b) => a.ratio - b.ratio);
      const preview = document.querySelector(".demo-preview");
      return {
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
        h: document.documentElement.scrollHeight,
        title: document.title,
        theme: document.documentElement.dataset.theme,
        hasDarkClass: document.documentElement.classList.contains("dark"),
        themeOk: (document.documentElement.dataset.theme === "dark") === expectDark,
        previewWidth: preview ? preview.clientWidth : null,
        low: low.slice(0, 25),
        lowCount: low.length,
      };
    }, mode.dark);
    const file = join(outDir, `${slug}-${mode.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    const flags = [
      metrics.sw > metrics.iw ? "OVERFLOW sw=" + metrics.sw : "",
      metrics.themeOk ? "" : "THEME-MISMATCH theme=" + metrics.theme,
      metrics.lowCount ? `LOW-CONTRAST x${metrics.lowCount}` : "",
      errors.length ? "ERRORS: " + errors.join(" | ") : "",
    ].filter(Boolean);
    console.log(
      `${path.padEnd(34)} ${mode.name.padEnd(13)} h=${String(metrics.h).padEnd(6)} ${metrics.previewWidth ? "demo=" + metrics.previewWidth + " " : ""}${flags.join(" ") || "ok"}`,
    );
    for (const l of metrics.low)
      console.log(
        `    ${String(l.ratio).padEnd(5)} ${l.el.slice(0, 70).padEnd(70)} "${l.text}" fg=${l.fg} bg=${l.bg} op=${l.op}`,
      );
    await context.close();
  }
}
await browser.close();
