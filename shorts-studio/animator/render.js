// Renders one Short to an MP4.   node render.js <short-id> [--stills 1.2,5,9] [--fps 30]
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), { spawn, execFileSync } = require("child_process");
const id = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const STUDIO = path.resolve(__dirname, ".."), OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });
const FPS = +arg("--fps", 30);
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => {
  const p = path.join(__dirname, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(__dirname) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
function envelope(mp3) { // loudness of the voice per video frame, for lip flaps
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", mp3, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], { maxBuffer: 1 << 28 });
  const s = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), per = 16000 / FPS, env = [];
  for (let f = 0; f * per < s.length; f++) { let a = 0, n = 0; for (let i = Math.floor(f * per); i < Math.min(s.length, (f + 1) * per); i++) { a += (s[i] / 32768) ** 2; n++; } env.push(Math.sqrt(a / Math.max(1, n))); }
  const sorted = [...env].sort((a, b) => a - b), top = sorted[Math.floor(sorted.length * 0.97)] || 1;
  return env.map((v) => Math.min(1, v / top));
}
(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const VO = path.join(STUDIO, "voiceovers");
  const scripts = new Function(fs.readFileSync(path.join(STUDIO, "scripts.js"), "utf8") + ";return SCRIPTS;")();
  const script = scripts.find((s) => s.id === id);
  const data = {
    timings: JSON.parse(fs.readFileSync(path.join(VO, "timings.json")))[id],
    captions: JSON.parse(fs.readFileSync(path.join(VO, "captions.json")))[id],
    env: envelope(path.join(VO, id + ".mp3")), hook: script.hook,
  };
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
  page.on("console", (m) => m.type() === "error" && console.error("CONSOLE", m.text()));
  await page.goto(`http://localhost:${port}/render.html?short=${id}`);
  await page.waitForFunction(() => window.ready);
  const info = await page.evaluate((d) => window.init(d), data);
  const stills = arg("--stills");
  if (stills) {
    for (const t of stills.split(",").map(Number)) {
      const url = await page.evaluate((t) => window.frame(t, 0.9), t);
      fs.writeFileSync(path.join(OUT, `${id}-${t}.jpg`), Buffer.from(url.split(",")[1], "base64"));
    }
    console.log("stills written"); await browser.close(); server.close(); return;
  }
  // sound effects + music, mixed under the voice
  const dur = info.duration;
  fs.writeFileSync(path.join(OUT, id + "-sfx.json"), JSON.stringify({ duration: dur, events: info.sfx }));
  execFileSync("python3", ["-I", path.join(__dirname, "sound.py"), path.join(OUT, id + "-sfx.json"), path.join(VO, id + ".mp3"), path.join(OUT, id + "-mix.wav")], { stdio: "inherit" });
  const frames = Math.ceil(dur * FPS), file = path.join(OUT, id + ".mp4");
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "-",
    "-i", path.join(OUT, id + "-mix.wav"), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", file], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const url = await page.evaluate((t) => window.frame(t), f / FPS);
    const buf = Buffer.from(url.split(",")[1], "base64");
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
  console.log("done", file, ((Date.now() - t0) / 1000).toFixed(0) + "s");
  await browser.close(); server.close();
})();
