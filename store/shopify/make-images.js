// Makes every Shopify image as a PNG in shopify/images/.
// Run from the store/shopify folder:  node make-images.js
// (Needs Playwright: npm install playwright, then npx playwright install chromium)
const { chromium } = require("playwright");
const path = require("path");
const http = require("http");
const fs = require("fs");

const ROOT = path.join(__dirname, ".."); // the store folder
const PRODUCTS = ["towel-bag", "cooling-mat", "sun-umbrella"];
const JOBS = [
  ...PRODUCTS.flatMap((p) => ["hero", "features", "size", "steps"].map((k) => ({ name: `${p}-${k}`, img: `${k}-${p}` }))),
  { name: "summer-pack-hero", img: "hero-bundle" },
  { name: "summer-pack-inside", img: "inside-bundle" },
  { name: "banner", img: "banner", w: 1600, h: 640 },
  { name: "logo", img: "logo", w: 1200, h: 360, transparent: true },
  { name: "logo-square", img: "logo-square" },
];

// tiny static server so the page can load the SVGs
const types = { ".html": "text/html", ".svg": "image/svg+xml", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch();
  for (const job of JOBS) {
    const page = await browser.newPage({ viewport: { width: job.w || 1024, height: job.h || 1024 }, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${port}/shopify/image-maker.html?img=${job.img}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(__dirname, "images", `${job.name}.png`);
    await page.screenshot({ path: file, omitBackground: !!job.transparent });
    console.log("made", path.relative(ROOT, file));
    await page.close();
  }
  await browser.close();
  server.close();
})();
