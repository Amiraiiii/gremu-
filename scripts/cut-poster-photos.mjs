/**
 * Cuts one product photo per part number out of the owner's GREMU PARTS posters (2026-11-24)
 * and writes public/products/<sku-slug>.webp (800×600, tight crop, Lanczos upscale + sharpen).
 *
 *   node scripts/cut-poster-photos.mjs <poster1.webp> <poster2.webp> [outDir]
 *
 * Poster 1 is an 8×6 grid (1502×1017). Poster 2 (1516×1002) is used only for the three numbers
 * that are not on poster 1. Boxes cover the photo part of each card, above the caption.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [p1, p2, outDir = "public/products"] = process.argv.slice(2);
if (!p1 || !p2) {
  console.error("Usage: node scripts/cut-poster-photos.mjs <poster1.webp> <poster2.webp> [outDir]");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

// Poster 1 grid: column x-ranges and the photo band (y-range) of each row.
const COLS = [
  [16, 198], [203, 387], [394, 571], [577, 753], [760, 938], [945, 1123], [1130, 1308], [1315, 1490],
];
const ROWS = [
  [158, 266], [316, 407], [454, 550], [592, 682], [724, 794], [831, 880],
];
const GRID = [
  ["51750-M6000", "51730-L1000", "23040-2E000", "23060-2E100", "21020-2E001", "21810-AA000", "21810-N9540", "54651-P2000"],
  ["54650-P2000", "55367-S1CB0", "35310-2S000", "35310-2S001", "35310-2S100", "21810-J9000", "54551-L1100", "24410-2JTA2"],
  ["55307-AA110", "56820-R0000", null, "54584-S1000", "18871-11075", "21830-N9620", "22441-3CGA1", "22442-3CGA2"], // col 3 repeats 56820-R0000
  ["39210-2J001", "27301-2M385", "21810-N9720", "31112-C9100", "56500AA000", "57770S8600", "56500-L1010", "56500N9000"],
  ["49500L2230", "49501L2230", "495L2L2200", "495R2L2250", "49501-AA100", "49500-AA100", "495L1-AA100", "495R1-AA100"],
  ["49500-N9160", "49501-N9160", "495L1-N9160", "495R1-N9160", "49500P2200", "49501P2250", "495R2P2250", "495L2P2200"],
];
// Poster 2, bottom row ("Прочие запчасти"): photo boxes for the 3 extra numbers.
const EXTRA = [
  ["31111-C9000", [1050, 814, 1200, 895]],
  ["56540-L1000", [1210, 818, 1360, 893]],
  ["56540-P2000", [1368, 818, 1505, 893]],
];

export const photoFile = (oem) => `${oem.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.webp`;

// Output: 4:3 canvas (matches the product card), part centred with a margin.
const W = 800;
const H = 600;
const MARGIN = 0.1;

/** Average colour of the four corners of a raw RGB crop — the card's background on the poster. */
function cornerColour(data, width, height, channels) {
  const pts = [
    [1, 1],
    [width - 2, 1],
    [1, height - 2],
    [width - 2, height - 2],
  ];
  const sum = [0, 0, 0];
  for (const [x, y] of pts) for (let c = 0; c < 3; c++) sum[c] += data[(y * width + x) * channels + c];
  return { r: Math.round(sum[0] / 4), g: Math.round(sum[1] / 4), b: Math.round(sum[2] / 4) };
}

async function cut(src, [x0, y0, x1, y1], oem) {
  const box = { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  const crop = await sharp(src).extract(box).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = cornerColour(crop.data, crop.info.width, crop.info.height, crop.info.channels);
  const rawOpts = { raw: { width: crop.info.width, height: crop.info.height, channels: crop.info.channels } };

  // 1. Find the part's bounding box (trim of the plain poster background).
  let obj = { x: 0, y: 0, w: crop.info.width, h: crop.info.height };
  try {
    const t = await sharp(crop.data, rawOpts).trim({ background: bg, threshold: 14 }).toBuffer({ resolveWithObject: true });
    if (t.info.width > 20 && t.info.height > 20) obj = { x: -(t.info.trimOffsetLeft ?? 0), y: -(t.info.trimOffsetTop ?? 0), w: t.info.width, h: t.info.height };
  } catch {
    // nothing to trim — keep the whole box
  }

  // 2. A 4:3 window around the part with a margin, cut from the real poster background (no seams).
  let rw = obj.w / (1 - 2 * MARGIN);
  let rh = obj.h / (1 - 2 * MARGIN);
  if (rw / rh > W / H) rh = (rw * H) / W;
  else rw = (rh * W) / H;
  const cx = obj.x + obj.w / 2;
  const cy = obj.y + obj.h / 2;
  // Where the window runs past the card, the crop is feathered into its own background colour
  // (repeating edge pixels would leave streaks; a hard paste would leave a visible rectangle).
  const PAD = 400;
  const { width: cw, height: ch } = crop.info;
  const F = 8; // feather width, px
  // RGBA copy of the crop whose alpha fades to 0 over the last F pixels at each edge.
  const k = crop.info.channels;
  const rgba = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const d = Math.min(x, y, cw - 1 - x, ch - 1 - y);
      const i = y * cw + x;
      rgba[i * 4] = crop.data[i * k];
      rgba[i * 4 + 1] = crop.data[i * k + 1];
      rgba[i * 4 + 2] = crop.data[i * k + 2];
      rgba[i * 4 + 3] = Math.round(255 * Math.min(1, d / F));
    }
  const feathered = await sharp(rgba, { raw: { width: cw, height: ch, channels: 4 } }).png().toBuffer();
  const canvas = await sharp({ create: { width: cw + 2 * PAD, height: ch + 2 * PAD, channels: 3, background: bg } })
    .composite([{ input: feathered, left: PAD, top: PAD }])
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const win = sharp(canvas.data, { raw: { width: canvas.info.width, height: canvas.info.height, channels: canvas.info.channels } }).extract({
    left: Math.round(cx - rw / 2 + PAD),
    top: Math.round(cy - rh / 2 + PAD),
    width: Math.round(rw),
    height: Math.round(rh),
  });

  // RAW=1: keep native poster pixels (lossless PNG) as input for an external AI upscaler.
  if (process.env.RAW === "1") {
    await win.png().toFile(path.join(outDir, photoFile(oem).replace(/\.webp$/, ".png")));
    return;
  }

  // 3. High-quality upscale (Lanczos) + gentle unsharp mask to recover edges softened in the poster.
  await win
    .resize(W, H, { fit: "fill", kernel: "lanczos3" })
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 2.5 })
    .webp({ quality: 92, effort: 6, smartSubsample: true })
    .toFile(path.join(outDir, photoFile(oem)));
}

let n = 0;
for (let r = 0; r < GRID.length; r++)
  for (let c = 0; c < 8; c++) {
    const oem = GRID[r][c];
    if (!oem) continue;
    // Per-card fixes: 23060-2E100 has a thin vertical line inside its card; the 54651-P2000 card
    // edge confuses the trim — keep both out of the box.
    const FIX = { "23060-2E100": [COLS[c][0], 722], "54651-P2000": [1335, 1470] };
    const [x0, x1] = FIX[oem] ?? COLS[c];
    await cut(p1, [x0, ROWS[r][0], x1, ROWS[r][1]], oem);
    n++;
  }
for (const [oem, box] of EXTRA) {
  await cut(p2, box, oem);
  n++;
}
console.log(`${n} photos → ${outDir}`);
