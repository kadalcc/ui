// Split full-page screenshots into tiles a reviewer can actually read. node scripts/tile.mjs <dir> [tileHeight]
import sharp from "sharp";
import { readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const [dir, hArg] = process.argv.slice(2);
const H = Number(hArg ?? 1100);
const out = join(dir, "tiles");
mkdirSync(out, { recursive: true });
for (const f of readdirSync(dir).filter((f) => f.endsWith(".png"))) {
  const img = sharp(join(dir, f));
  const { width, height } = await img.metadata();
  const n = Math.ceil(height / H);
  for (let i = 0; i < n; i++) {
    const top = i * H;
    const h = Math.min(H, height - top);
    await sharp(join(dir, f)).extract({ left: 0, top, width, height: h }).toFile(join(out, f.replace(/\.png$/, `-${String(i + 1).padStart(2, "0")}.png`)));
  }
}
console.log("tiled");
