// Renders one 3D What If Short:  node whatif3d/render.js <id> [--stills 0.5,3,7 | --sheet]
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), { spawn, execFileSync } = require("child_process");
const id = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, ".."), HERE = __dirname, OUT = path.join(HERE, "out"); fs.mkdirSync(OUT, { recursive: true });
const FPS = 30;
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".glb": "model/gltf-binary" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(p).toLowerCase()] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, r));
  const { V3 } = require(path.join(HERE, "scripts.js"));
  const video = V3.find((f) => f.id === id);
  const voice = JSON.parse(fs.readFileSync(path.join(HERE, "voice", id + ".json")));
  const captions = JSON.parse(fs.readFileSync(path.join(HERE, "voice", id + "-captions.json")));
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (e) => console.error("PAGE ERROR", e.message)); page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error("PAGE", m.text().slice(0, 300)); });
  await page.goto(`http://localhost:${server.address().port}/whatif3d/player3.html`);
  await page.waitForFunction(() => window.ready);
  const t0 = Date.now();
  await page.evaluate((d) => window.init(d), { video, voice, captions });
  console.log("built shots", ((Date.now() - t0) / 1000).toFixed(1) + "s");
  const grab = async (t, q) => Buffer.from((await page.evaluate(([t, q]) => window.frame(t, q), [t, q])).split(",")[1], "base64");
  if (process.argv.includes("--sheet")) { // one frame from the middle (and late part) of every beat, tiled for review
    const dir = path.join(OUT, id + "-sheet"); fs.mkdirSync(dir, { recursive: true }); const files = [];
    for (let i = 0; i < voice.beats.length; i++) { const s = i ? voice.beats[i].start - 0.06 : 0, e = i + 1 < voice.beats.length ? voice.beats[i + 1].start - 0.06 : voice.duration;
      const f = path.join(dir, `${String(i).padStart(2, "0")}.jpg`); fs.writeFileSync(f, await grab(s + (e - s) * 0.6, 0.85)); files.push(f); }
    execFileSync("ffmpeg", ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", files.map((_, k) => `[${k}]scale=270:480[s${k}]`).join(";") + ";" + files.map((_, k) => `[s${k}]`).join("") + `xstack=inputs=${files.length}:layout=` + files.map((_, k) => `${(k % 6) * 270}_${Math.floor(k / 6) * 480}`).join("|") + ":fill=black", path.join(OUT, id + "-sheet.jpg")]);
    console.log("sheet", path.join(OUT, id + "-sheet.jpg"), ((Date.now() - t0) / 1000).toFixed(0) + "s"); await browser.close(); server.close(); return;
  }
  const stills = arg("--stills");
  if (stills) { for (const t of stills.split(",").map(Number)) fs.writeFileSync(path.join(OUT, `${id}-${t}.jpg`), await grab(t, 0.9)); console.log("stills written"); await browser.close(); server.close(); return; }
  // sound effects timed to the beats
  const ev = [], fx = (t, name, vol = 1) => ev.push({ t: +Math.max(0, t).toFixed(3), name, vol });
  fx(0, "impact", 0.8);
  voice.beats.forEach((vb, i) => {
    const st = i === 0 ? 0 : vb.start - 0.06; if (i > 0) fx(st - 0.05, "whoosh", 0.6);
    const b = video.beats[i], fxv = b.fx; if (fxv === "glitch") fx(st, "glitch", 0.8); if (fxv === "flicker") fx(st, "powerdown", 0.8);
    for (const [shot, at, name, vol] of [["trafficCrash", 1.05, "impact", 1], ["driverless", 1.2, "impact", 0.9], ["towerFall", 1.3, "impact", 1], ["robotsDie", 0.35, "powerdown", 0.7], ["poof", 0.15, "pop", 0.8], ["poof", 0.6, "pop", 0.6], ["poof", 1.0, "pop", 0.6], ["kidsOutside", 0.6, "swish", 0.6], ["chocPile", 0.45, "munch", 0.8], ["chocPile", 1.5, "whoosh", 0.8], ["chocNight", 0.2, "munch", 0.8], ["chocNight", 0.7, "munch", 0.8], ["chocNight", 1.2, "munch", 0.8], ["chocNight", 1.7, "munch", 0.8], ["chocTeeth", 0.3, "munch", 0.8], ["chocTeeth", 1.2, "boing", 0.5], ["chocSugar", 0.1, "boing", 0.6], ["chocLaps", 0.1, "zoom", 0.6], ["chocCrash", 1.1, "impact", 0.9], ["chocHouse", 0.2, "rumble", 0.7], ["chocLastBite", 1.6, "munch", 0.8], ["chocAmbulance", 0.0, "alarm", 0.5], ["chocRain", 0.3, "crumble", 0.6], ["chocRain", 1.2, "crumble", 0.6]]) if (b.shot === shot) fx(st + at, name, vol);
    const g = b.gfx; if (!g) return;
    if (g.type === "arrow") fx(st + 0.08, "swish", 0.7);
    if (g.type === "count") { fx(st + 0.1, "ticks", 0.6); }
    if (g.type === "year" || g.type === "title") fx(st + 0.02, "impact");
    if (g.type === "stamp") fx(st + 0.08, "stamp");
  });
  const evFile = path.join(OUT, id + "-sfx.json");
  fs.writeFileSync(evFile, JSON.stringify({ duration: voice.duration, events: ev, music: "doc" }));
  execFileSync("python3", ["-I", path.join(ROOT, "animator", "sound.py"), evFile, path.join(HERE, "voice", id + ".mp3"), path.join(OUT, id + "-mix.wav")], { stdio: "inherit" });
  const frames = Math.ceil(voice.duration * FPS), file = path.join(OUT, id + ".mp4");
  if (process.argv.includes("--audio-only")) { // swap in a fresh sound mix, keep the rendered picture
    const tmp = file.replace(".mp4", "-old.mp4"); fs.renameSync(file, tmp);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-i", path.join(OUT, id + "-mix.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", file]);
    fs.unlinkSync(tmp); console.log("audio replaced", file); await browser.close(); server.close(); return;
  }
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "-", "-i", path.join(OUT, id + "-mix.wav"),
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", file], { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = 0; f < frames; f++) {
    const buf = await grab(f / FPS, 0.92);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 150 === 0) console.log(`frame ${f}/${frames} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
  console.log("done", file, ((Date.now() - t0) / 1000).toFixed(0) + "s"); await browser.close(); server.close();
})();
