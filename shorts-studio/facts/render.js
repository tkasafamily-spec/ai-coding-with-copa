// Renders one fact Short:  node facts/render.js <fact-id> [--stills 1,5,9]
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), { spawn, execFileSync } = require("child_process");
const id = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, ".."), HERE = __dirname, OUT = path.join(HERE, "out"); fs.mkdirSync(OUT, { recursive: true });
const FPS = 30;
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (req.url.startsWith("/facts/testimgs/")) p = path.join(process.env.TESTIMGS || "/nonexistent", path.basename(req.url));
  if (!p.startsWith(ROOT) && !req.url.startsWith("/facts/testimgs/") || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(p).toLowerCase()] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, r));
  const { FACTS } = require(path.join(HERE, "facts.js"));
  const fact = FACTS.find((f) => f.id === id);
  const voice = JSON.parse(fs.readFileSync(path.join(HERE, "voice", id + ".json")));
  const captions = JSON.parse(fs.readFileSync(path.join(HERE, "voice", id + "-captions.json")));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
  await page.goto(`http://localhost:${server.address().port}/facts/player.html`);
  await page.waitForFunction(() => window.ready);
  await page.evaluate((d) => window.init(d), { fact, voice, captions, imgDir: arg("--imgdir", "images") });
  const stills = arg("--stills");
  if (stills) {
    for (const t of stills.split(",").map(Number)) fs.writeFileSync(path.join(OUT, `${id}-${t}.jpg`), Buffer.from((await page.evaluate((t) => window.frame(t, 0.9), t)).split(",")[1], "base64"));
    console.log("stills written"); await browser.close(); server.close(); return;
  }
  // sound effects timed to the beats
  const ev = [], fx = (t, name, vol = 1) => ev.push({ t: +Math.max(0, t).toFixed(3), name, vol });
  fx(0, "impact", 0.7);
  voice.beats.forEach((vb, i) => {
    const st = i === 0 ? 0 : vb.start - 0.06; if (i > 0) fx(st - 0.05, "whoosh", 0.7);
    const g = fact.beats[i].gfx; if (!g) return;
    if (g.type === "count") { fx(st + 0.1, "ticks", 0.6); fx(st + 1.2, "cash", 0.6); }
    if (g.type === "year") fx(st + 0.02, "impact");
    if (g.type === "stamp") fx(st + 0.08, "stamp");
    if (g.type === "tag") fx(st + 0.05, "swish", 0.6);
  });
  const evFile = path.join(OUT, id + "-sfx.json");
  fs.writeFileSync(evFile, JSON.stringify({ duration: voice.duration, events: ev, music: "doc" }));
  execFileSync("python3", ["-I", path.join(ROOT, "animator", "sound.py"), evFile, path.join(HERE, "voice", id + ".mp3"), path.join(OUT, id + "-mix.wav")], { stdio: "inherit" });
  const frames = Math.ceil(voice.duration * FPS), file = path.join(OUT, id + ".mp4");
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "-", "-i", path.join(OUT, id + "-mix.wav"),
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", file], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const buf = Buffer.from((await page.evaluate((t) => window.frame(t), f / FPS)).split(",")[1], "base64");
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 150 === 0) console.log(`frame ${f}/${frames} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
  console.log("done", file, ((Date.now() - t0) / 1000).toFixed(0) + "s"); await browser.close(); server.close();
})();
