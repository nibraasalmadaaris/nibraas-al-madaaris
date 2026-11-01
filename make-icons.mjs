// Usage:  npm i -D sharp   then   node scripts/make-icons.mjs "src/assets/Astaanta Waxbarashada Nibraas Dahab iyo Cagaar-2.png"
// Writes real PNGs (correct pixel sizes) into public/icons and public/favicon.png
import sharp from "sharp";
import fs from "node:fs";

const src = process.argv[2];
if (!src || !fs.existsSync(src)) { console.error("Give the logo path as the first argument."); process.exit(1); }
const BG = { r: 247, g: 243, b: 234, alpha: 1 }; // #F7F3EA, same as manifest background_color
fs.mkdirSync("public/icons", { recursive: true });

// Whole logo is kept (fit: contain) and never cropped; `pad` is the share of empty border.
async function make(file, size, pad) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(src).trim({ threshold: 5 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png().toFile(file);
  console.log("wrote", file, `${size}x${size}`);
}
await make("public/icons/icon-192.png", 192, 0.08);
await make("public/icons/icon-512.png", 512, 0.08);
// maskable: Android may cut up to ~20% from each side, so keep the logo inside the central 60%.
await make("public/icons/icon-maskable-192.png", 192, 0.2);
await make("public/icons/icon-maskable-512.png", 512, 0.2);
await make("public/icons/apple-touch-icon.png", 180, 0.1);
await make("public/favicon.png", 64, 0.04);
