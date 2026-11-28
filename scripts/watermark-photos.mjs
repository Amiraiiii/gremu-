/**
 * Puts the GREMU logo on product photos as a watermark.
 *   node scripts/watermark-photos.mjs [srcDir=data/photos-original] [outDir=public/products] [opacity=0.14]
 * Always reads the clean originals (srcDir), so running it again never stacks watermarks.
 * New photos: put the clean file in data/photos-original/ and run this script.
 */
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const [srcDir = "data/photos-original", outDir = "public/products", opacityArg = "0.14"] = process.argv.slice(2);
const opacity = Math.min(1, Math.max(0, Number(opacityArg)));
const LOGO = "public/brand/gremu-logo-dark.png";
mkdirSync(outDir, { recursive: true });

async function logoAt(width) {
  const { data, info } = await sharp(LOGO).resize({ width }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * opacity);
  return { buf: await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(), w: info.width, h: info.height };
}

let n = 0;
for (const f of readdirSync(srcDir).filter((x) => /\.(webp|png|jpe?g)$/i.test(x))) {
  const img = sharp(path.join(srcDir, f));
  const { width = 1200, height = 900 } = await img.metadata();
  // Centred, 58% of the width, slightly below the middle — visible but the part stays readable.
  const mark = await logoAt(Math.round(width * 0.58));
  await img
    .composite([{ input: mark.buf, left: Math.round((width - mark.w) / 2), top: Math.round(height * 0.56 - mark.h / 2) }])
    .webp({ quality: 90, effort: 6 })
    .toFile(path.join(outDir, f.replace(/\.(png|jpe?g)$/i, ".webp")));
  n++;
}
console.log(`watermarked ${n} photos → ${outDir} (opacity ${opacity})`);
