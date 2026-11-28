/**
 * Turns the owner's logo image (cream logo on a dark petrol background) into transparent PNGs:
 *   public/brand/gremu-logo.png       — cream logo, transparent background (full lockup)
 *   public/brand/gremu-logo-dark.png  — the same shape in petrol, for light backgrounds
 * Alpha comes from each pixel's distance to the background colour, so edges stay smooth.
 *   node scripts/logo-to-png.mjs <logo.png>
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const src = process.argv[2];
if (!src) {
  console.error("Usage: node scripts/logo-to-png.mjs <logo.png>");
  process.exit(2);
}
mkdirSync("public/brand", { recursive: true });

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: k } = info;
const px = (x, y) => [0, 1, 2].map((c) => data[(y * w + x) * k + c]);
// Background: average of the four corners.
const corners = [px(2, 2), px(w - 3, 2), px(2, h - 3), px(w - 3, h - 3)];
const bg = [0, 1, 2].map((c) => corners.reduce((s, p) => s + p[c], 0) / 4);
// Foreground (cream): the brightest pixel.
let fg = [0, 0, 0];
for (let i = 0; i < w * h; i++) {
  const p = [data[i * k], data[i * k + 1], data[i * k + 2]];
  if (p[0] + p[1] + p[2] > fg[0] + fg[1] + fg[2]) fg = p;
}
const full = Math.hypot(fg[0] - bg[0], fg[1] - bg[1], fg[2] - bg[2]);

const alpha = Buffer.alloc(w * h);
for (let i = 0; i < w * h; i++) {
  const d = Math.hypot(data[i * k] - bg[0], data[i * k + 1] - bg[1], data[i * k + 2] - bg[2]);
  // Below 12% of the fg/bg distance is background noise; above 85% is solid.
  alpha[i] = Math.round(255 * Math.min(1, Math.max(0, (d / full - 0.12) / 0.73)));
}

async function write(colour, file) {
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = colour[0];
    rgba[i * 4 + 1] = colour[1];
    rgba[i * 4 + 2] = colour[2];
    rgba[i * 4 + 3] = alpha[i];
  }
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toFile(file);
}

await write(fg, "public/brand/gremu-logo.png");
await write([19, 54, 70], "public/brand/gremu-logo-dark.png"); // brand petrol
const m = await sharp("public/brand/gremu-logo.png").metadata();
console.log(`bg rgb(${bg.map(Math.round)}), fg rgb(${fg}) → ${m.width}×${m.height}`);
