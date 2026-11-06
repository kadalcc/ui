#!/usr/bin/env bun
/**
 * Renders the 1200×630 link-preview cards into public/og/ from one SVG template, with sharp (no
 * browser needed). Rerun after changing a title here: `bun run og`, or `bun scripts/og.ts sponsor`
 * for one card. The fonts are whatever the machine has; the template asks for Inter and falls back
 * to Helvetica/Arial, which is why titles are broken into lines by hand here.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import sharp from "sharp";

import { SITE } from "../src/data/site";
import { SPONSOR_URL } from "../src/data/sponsors";

const root = resolve(import.meta.dirname, "..");
const W = 1200;
const H = 630;

type Card = {
  file: string;
  eyebrow: string;
  /** One string per line: SVG has no line wrapping, so the breaks are chosen here. */
  title: string[];
  sub: string[];
  /** A command or address in a pill under the copy. */
  pill?: string;
};

const CARDS: Card[] = [
  {
    file: "home",
    eyebrow: "Open source · React",
    title: ["The data grid your", "power users keep", "asking for."],
    sub: ["Kadal UI · TanStack Table v9 · shadcn/ui · MIT"],
    pill: `$ ${SITE.install}`,
  },
  {
    file: "docs",
    eyebrow: "Docs",
    title: ["Every feature,", "documented."],
    sub: [
      "Install, columns, filters, virtualization, editing,",
      "keyboard, server-side data and the API.",
    ],
    pill: `$ ${SITE.install}`,
  },
  {
    file: "sponsor",
    eyebrow: "Sponsor",
    title: ["Keep it free", "and maintained."],
    sub: [
      "GitHub Sponsors · from $3 a month · your name",
      "or logo in the README and on ui.kadal.cc",
    ],
    pill: SPONSOR_URL.replace(/^https:\/\//, ""),
  },
  {
    file: "playground",
    eyebrow: "Playground",
    title: ["Try the grid in", "your browser."],
    sub: ["Edit an example, watch it run, copy the code.", "Nothing to install."],
    pill: `$ ${SITE.install}`,
  },
];

const SANS = "Inter, Helvetica, Arial, sans-serif";
const MONO = "JetBrains Mono, SF Mono, Menlo, Consolas, monospace";
const INK = "#ffffff";
const INK_2 = "#a9c6d6";
const TEAL = "#5eead4";
const SKY = "#7dd3fc";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const markHref = `data:image/svg+xml;base64,${readFileSync(join(root, "public/mark.svg")).toString("base64")}`;

/** A faint table on the right: header, seven rows, one selected. The product, not a picture of it. */
const gridArt = (x0: number, y0: number) => {
  const w = 404;
  const rowH = 40;
  const headH = 44;
  const rows = 7;
  const h = headH + rows * rowH;
  const cols = [
    { x: 56, w: 120 },
    { x: 190, w: 76 },
    { x: 284, w: 96 },
  ];
  const widths = [0.9, 0.6, 0.75, 0.5, 0.85, 0.65, 0.7];
  const parts: string[] = [];
  parts.push(
    `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="16" fill="rgba(255,255,255,0.035)" stroke="rgba(125,211,252,0.28)" stroke-width="1.5"/>`,
  );
  parts.push(
    `<line x1="${x0}" y1="${y0 + headH}" x2="${x0 + w}" y2="${y0 + headH}" stroke="rgba(125,211,252,0.28)" stroke-width="1.5"/>`,
  );
  // Header: a checkbox, three column labels, a sort arrow on the first.
  parts.push(
    `<rect x="${x0 + 20}" y="${y0 + 14}" width="16" height="16" rx="4" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>`,
  );
  for (const [i, c] of cols.entries()) {
    parts.push(
      `<rect x="${x0 + c.x}" y="${y0 + 16}" width="${Math.round(c.w * 0.55)}" height="12" rx="6" fill="rgba(255,255,255,${i === 0 ? 0.55 : 0.3})"/>`,
    );
  }
  parts.push(`<path d="M${x0 + 56 + 76} ${y0 + 27} l5 -8 l5 8z" fill="${TEAL}"/>`);
  for (let r = 0; r < rows; r++) {
    const y = y0 + headH + r * rowH;
    const selected = r === 2;
    if (selected) {
      parts.push(
        `<rect x="${x0 + 1}" y="${y}" width="${w - 2}" height="${rowH}" fill="rgba(94,234,212,0.12)"/>`,
      );
      parts.push(`<rect x="${x0 + 1}" y="${y}" width="3" height="${rowH}" fill="${TEAL}"/>`);
    }
    if (r > 0)
      parts.push(
        `<line x1="${x0}" y1="${y}" x2="${x0 + w}" y2="${y}" stroke="rgba(255,255,255,0.08)"/>`,
      );
    parts.push(
      selected
        ? `<rect x="${x0 + 20}" y="${y + 12}" width="16" height="16" rx="4" fill="${TEAL}"/><path d="M${x0 + 24} ${y + 20} l3 3 l6 -7" fill="none" stroke="#062338" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<rect x="${x0 + 20}" y="${y + 12}" width="16" height="16" rx="4" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>`,
    );
    const k = widths[r] ?? 0.7;
    parts.push(
      `<rect x="${x0 + cols[0]!.x}" y="${y + 14}" width="${Math.round(cols[0]!.w * k)}" height="12" rx="6" fill="rgba(255,255,255,${selected ? 0.75 : 0.42})"/>`,
    );
    parts.push(
      `<rect x="${x0 + cols[1]!.x}" y="${y + 14}" width="${Math.round(cols[1]!.w * (1.3 - k))}" height="12" rx="6" fill="rgba(255,255,255,0.28)"/>`,
    );
    // The third column is a status pill, teal every other row.
    const pillW = 54 + Math.round(20 * k);
    parts.push(
      `<rect x="${x0 + cols[2]!.x}" y="${y + 10}" width="${pillW}" height="20" rx="10" fill="${r % 2 ? "rgba(94,234,212,0.22)" : "rgba(125,211,252,0.18)"}"/>`,
    );
  }
  return `<g>${parts.join("")}</g>`;
};

const svg = (c: Card) => {
  const left = 76;
  let y = 176;
  const lines: string[] = [];
  lines.push(
    `<text x="${left}" y="${y}" font-family="${MONO}" font-size="18" font-weight="500" letter-spacing="2.2" fill="${TEAL}">${esc(c.eyebrow.toUpperCase())}</text>`,
  );
  y += 60;
  for (const t of c.title) {
    lines.push(
      `<text x="${left}" y="${y}" font-family="${SANS}" font-size="56" font-weight="700" letter-spacing="-1.4" fill="${INK}">${esc(t)}</text>`,
    );
    y += 64;
  }
  y -= 14;
  for (const s of c.sub) {
    lines.push(
      `<text x="${left}" y="${y}" font-family="${SANS}" font-size="24" font-weight="500" fill="${INK_2}">${esc(s)}</text>`,
    );
    y += 34;
  }
  if (c.pill) {
    y += 2;
    const pillW = Math.round(c.pill.length * 13.2) + 56;
    const isCmd = c.pill.startsWith("$ ");
    const text = isCmd
      ? `<tspan fill="${TEAL}">$</tspan><tspan fill="${INK}"> ${esc(c.pill.slice(2))}</tspan>`
      : `<tspan fill="${INK}">${esc(c.pill)}</tspan>`;
    lines.push(
      `<rect x="${left}" y="${y}" width="${pillW}" height="60" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(94,234,212,0.4)" stroke-width="1.5"/>`,
    );
    // xml:space keeps the space after the prompt's "$", which SVG would otherwise collapse.
    lines.push(
      `<text x="${left + 28}" y="${y + 38}" xml:space="preserve" font-family="${MONO}" font-size="22" font-weight="500">${text}</text>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#04121f"/><stop offset="0.55" stop-color="#062338"/><stop offset="1" stop-color="#073049"/>
    </linearGradient>
    <radialGradient id="glow-teal" cx="0.12" cy="1.1" r="0.7">
      <stop offset="0" stop-color="#2dd4bf" stop-opacity="0.28"/><stop offset="1" stop-color="#2dd4bf" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-sky" cx="0.95" cy="-0.15" r="0.65">
      <stop offset="0" stop-color="#38bdf8" stop-opacity="0.22"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow-teal)"/>
  <rect width="${W}" height="${H}" fill="url(#glow-sky)"/>
  <image href="${markHref}" xlink:href="${markHref}" x="${left}" y="64" width="48" height="48"/>
  <text x="${left + 62}" y="98" font-family="${SANS}" font-size="30" font-weight="700" letter-spacing="-0.6" fill="${INK}">Kadal <tspan font-weight="500" fill="${INK_2}">UI</tspan></text>
  ${lines.join("\n  ")}
  ${gridArt(720, 150)}
  <text x="${W - left}" y="592" text-anchor="end" font-family="${MONO}" font-size="20" font-weight="500" fill="${SKY}">ui.kadal.cc</text>
</svg>`;
};

const out = join(root, "public/og");
mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);
for (const c of CARDS.filter((card) => only.length === 0 || only.includes(card.file))) {
  const file = join(out, `${c.file}.png`);
  await sharp(Buffer.from(svg(c)))
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`og/${c.file}.png`);
}
