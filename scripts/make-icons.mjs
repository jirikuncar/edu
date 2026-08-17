// Renders the PWA icon set from one inline SVG. Run: pnpm icons
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const dir = new URL("../public/icons/", import.meta.url);
await mkdir(dir, { recursive: true });

/** @param {number} inset fraction of the canvas kept clear at the edges */
const rose = (inset) => {
  const s = 512;
  const c = s / 2;
  const r = c * (1 - inset);
  const arm = r * 0.34;
  const point = (angle, len) => {
    const a = (angle * Math.PI) / 180;
    return [c + len * Math.cos(a), c + len * Math.sin(a)].map((n) => n.toFixed(1)).join(" ");
  };
  const star = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((angle, i) => `${i ? "L" : "M"}${point(angle - 90, i % 2 ? arm : r)}`)
    .join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="sea" cx="50%" cy="12%" r="105%">
      <stop offset="0%" stop-color="#123A54"/>
      <stop offset="45%" stop-color="#0C2439"/>
      <stop offset="100%" stop-color="#061626"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#sea)"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.96}" fill="none" stroke="#F2B441" stroke-width="${r * 0.055}" opacity=".55"/>
  <path d="${star} Z" fill="#F2B441"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.15}" fill="#061626"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.07}" fill="#79E3C0"/>
</svg>`;
};

const standard = Buffer.from(rose(0.12));
const maskable = Buffer.from(rose(0.28)); // safe zone for Android's mask

const png = (svg, size, name) =>
  sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(new URL(name, dir).pathname);

await Promise.all([
  png(standard, 192, "icon-192.png"),
  png(standard, 512, "icon-512.png"),
  png(maskable, 512, "maskable-512.png"),
  // iOS ignores transparency and rounds the corners itself
  png(standard, 180, "apple-touch-icon.png"),
]);

await writeFile(new URL("../public/favicon.svg", import.meta.url), rose(0.06));

console.log("icons written to public/icons/");
