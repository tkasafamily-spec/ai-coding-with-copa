// The animated 3D shots used by the What If scripts. Each shot builds a scene once and returns
// update(t, d): t = seconds into the shot, d = shot length. Everything moves: characters, props, camera.
import { THREE, Shot, lerp, seg, ease, easeOut, easeIn, back, rnd, lerp3, clamp, canvasTex, mat } from "./engine.js";

export const CAST = ["SalesRep", "ItEngineer", "OfficeIntern", "Accountant", "Receptionist", "SecurityGuard", "CompanyCeo", "Cashier", "Schoolkid", "GrandmaShopper",
  "StockClerk", "FoodCourier", "OfficeLady", "WhiteCoatDoctor", "WardNurse", "AirTraveller", "AirlineCaptain", "Lion", "Elephant", "Zebra", "Corgi", "Chihuahua", "Goose", "Eagle", "Fox"];
const GUY = "SalesRep";
const WALKERS = ["ItEngineer", "OfficeLady", "Accountant", "Receptionist", "GrandmaShopper", "Schoolkid", "FoodCourier", "AirTraveller", "OfficeIntern", "StockClerk"];
const COLORS = ["#f2c48d", "#9fc5e8", "#f4a6a6", "#b8e0c2", "#f7e3a1", "#c9b8e8", "#e8b89a", "#a8d8e8"];
const CAR_COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#ecf0f1", "#2ecc71", "#e67e22", "#9b59b6", "#34495e"];

// ── shared bits ─────────────────────────────────────────
function city(S, o = {}) {
  S.road(160, 9, { z: -50 });
  const b = [], cols = o.colors || COLORS;
  for (const s of [-1, 1]) for (let k = 0; k < 15; k++) {
    const z = 16 - k * 9, h = (o.h || 9) + rnd(k * 3 + s * 7) * (o.hv || 16);
    b.push(S.building(8, h, 8, cols[(k + (s > 0 ? 3 : 0)) % cols.length], { x: s * 12.6, z, seed: k * 2 + (s > 0 ? 1 : 0), lit: o.lit }));
  }
  if (o.lamps !== false) for (let k = 0; k < 8; k++) for (const s of [-1, 1]) S.lamp({ x: s * 5.0, z: 10 - k * 14, ry: s > 0 ? Math.PI : 0 });
  return b;
}
function cloud(S, p) { const g = S.group(p); const m = mat("#ffffff", { rough: 0.9 }); for (let k = 0; k < 5; k++) S.ball(1.4 + rnd(k + p.x) * 1.2, null, { material: m, x: (k - 2) * 1.6, y: rnd(k * 3 + p.x) * 0.8, z: rnd(k * 7) * 0.8, shadow: false }, g); return g; }
function walker(S, name, x, z0, z1, ry, t0 = 0, sp = 1.25) { const a = S.char(name, { x, z: z0, ry }); return (t) => { const tt = t + t0; const dz = (z1 - z0); const len = Math.abs(dz) / sp; const k = (tt % len) / len; a.root.position.z = z0 + dz * k; a.pose("Walk", tt); return a; }; }
function feed(x, w, h, t) { // a colorful video app on a phone
  x.fillStyle = "#101318"; x.fillRect(0, 0, w, h); const off = (t * 60) % 70;
  for (let k = -1; k < 5; k++) { const y = k * 70 - off + 20; x.fillStyle = ["#ff4d6d", "#4dabf7", "#ffd43b", "#69db7c", "#b197fc"][(k + 10) % 5]; x.fillRect(8, y, w - 16, 50); x.fillStyle = "#fff"; x.beginPath(); x.moveTo(w / 2 - 8, y + 15); x.lineTo(w / 2 + 10, y + 25); x.lineTo(w / 2 - 8, y + 35); x.fill(); }
}
function noSignal(x, w, h, t, glitch) {
  x.fillStyle = "#050507"; x.fillRect(0, 0, w, h);
  if (glitch) for (let k = 0; k < 8; k++) { x.fillStyle = ["#f00", "#0ff", "#fff"][k % 3]; x.fillRect(0, rnd(k + Math.floor(t * 20)) * h, w, 3 + rnd(k * 2) * 8); }
  x.strokeStyle = "#ff3b3b"; x.lineWidth = w * 0.06; x.lineCap = "round"; const cx = w / 2, cy = h * 0.42;
  for (let r = 1; r <= 3; r++) { x.beginPath(); x.arc(cx, cy + w * 0.15, w * 0.1 * r, Math.PI * 1.2, Math.PI * 1.8); x.stroke(); }
  x.beginPath(); x.moveTo(cx - w * 0.3, cy - w * 0.2); x.lineTo(cx + w * 0.3, cy + w * 0.3); x.stroke();
  x.fillStyle = "#ff3b3b"; x.font = `900 ${w * 0.13}px Montserrat, Arial`; x.textAlign = "center"; x.fillText("NO SIGNAL", cx, h * 0.7);
}
function billboard(S, p, w = 5, h = 3) { const fr = S.box(w + 0.3, h + 0.3, 0.3, "#20242b", { ...p, r: 0.08 }); const scr = S.screen(w, h, (x, W, H, t) => { const off = p.off ?? 0.5; if (t < off) { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, ["#ff4d6d", "#4dabf7", "#ffd43b"][p.c || 0]); g.addColorStop(1, "#7048e8"); x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = "#fff"; x.font = `900 ${H * 0.28}px Montserrat, Arial`; x.textAlign = "center"; x.fillText(p.text || "LIVE", W / 2, H * 0.62); } else noSignal(x, W, H, t, t < off + 0.4); }, { x: p.x, y: (p.y || 0) + (h + 0.3) / 2, z: (p.z || 0) + 0.16, ry: p.ry || 0, res: 256 }); return scr; }
function interior(S, w, d, wall = "#e9eef3", floor = "#d9dde2", h = 4.5) {
  S.groundMesh.material = mat(floor, { rough: 0.35 });
  S.box(w, h, 0.3, wall, { z: -d / 2, r: 0, shadow: false }); S.box(0.3, h, d, wall, { x: -w / 2, r: 0, shadow: false }); S.box(0.3, h, d, wall, { x: w / 2, r: 0, shadow: false });
}
function fire(S, p) { const g = S.group(p); const fl = []; for (let k = 0; k < 4; k++) fl.push(S.ball(0.35 - k * 0.06, k % 2 ? "#ffb703" : "#fb5607", { y: 0.3 + k * 0.25, emissive: k % 2 ? "#ffb703" : "#fb5607", ei: 2.5, shadow: false }, g)); const l = S.light("#ff8a3d", 25, 12, { y: 1 }); g.add(l); g.update = (t) => { fl.forEach((f, k) => { f.scale.setScalar(1 + 0.25 * Math.sin(t * 13 + k * 2)); f.position.y = 0.3 + k * 0.25 + 0.05 * Math.sin(t * 9 + k); }); l.intensity = 20 + 8 * Math.sin(t * 17); }; return g; }
function cityBlocks(S, o = {}) { // big skyline seen from above
  const bl = [];
  for (let i = -6; i <= 6; i++) for (let j = -9; j <= 3; j++) {
    if (rnd(i * 13 + j * 7) < 0.12) continue; const h = 6 + Math.pow(rnd(i * 5 + j * 11), 2) * 40 * (1 - Math.abs(i) / 9);
    const m = S.building(6, h, 6, COLORS[Math.abs(i * 3 + j) % COLORS.length], { x: i * 9, z: j * 9, seed: i * 7 + j, lit: o.lit ?? 1.6, roof: false }); m.delay = (j + 9) / 12 + rnd(i * 3 + j) * 0.25; bl.push(m);
  }
  return bl;
}

function phoneScreen(S, guy, draw) { // screen laid over the phone the SalesRep model holds (pose Text @0.6)
  const g = S.group(); guy.root.add(g); g.position.set(-0.12, 0.88, 0.47);
  S.box(0.46, 0.32, 0.03, "#111318", { y: -0.16, z: -0.05, r: 0.025, rough: 0.2 }, g);
  const scr = S.screen(0.42, 0.28, draw, { res: 256 }, g); scr.position.z = -0.067; scr.rotation.y = Math.PI; g.lookAt(guy.root.position.x - 0.1, 1.35, guy.root.position.z - 0.3); g.rotateY(Math.PI);
  return scr;
}
const OTS = [[-0.75, 1.65, -0.45], [-0.12, 0.88, 0.5], 40]; // over-the-shoulder at the phone
// ── NO INTERNET ─────────────────────────────────────────
export const SHOTS = {
  phoneDies() {
    const S = new Shot({ shadow: 8 }); city(S);
    const guy = S.char(GUY, { z: 0 }); guy.pose("Text", 0.6);
    const scr = phoneScreen(S, guy, (x, w, h, t) => (t < 0.3 ? feed(x, w, h, t) : noSignal(x, w, h, t, t < 0.9)));
    const ws = [walker(S, "OfficeLady", 2.2, -14, 4, 0, 0), walker(S, "Accountant", -2.5, 2, -16, Math.PI, 3), walker(S, "Schoolkid", 3.2, -18, 2, 0, 6)];
    return { S, update(t, d) {
      scr.draw(t); scr.visible = t < 1.0;
      const angry = seg(t, 1.0, 1.2); guy.pose(t < 1.0 ? "Text" : "TalkAngry", t < 1.0 ? 0.6 : t - 1.0);
      ws.forEach((f) => f(t));
      if (t < 0.95) S.move(seg(t, 0, 0.95), [[-0.85, 1.75, -0.55], OTS[1], 40], [[-0.66, 1.55, -0.2], OTS[1], 37]);
      else S.move(seg(t, 0.95, 1.5), [[-0.62, 1.5, -0.12], OTS[1], 36], [[0.5, 1.25, 4.6], [0, 1.0, 0], 40], easeOut);
      if (t > 0.3 && t < 0.7) S.shake(t, 0.02);
    } };
  },
  streetPhonesDie() {
    const S = new Shot({ shadow: 16 }); city(S, { h: 12 });
    const bbs = [billboard(S, { x: -8.4, y: 8, z: -6, ry: Math.PI / 2, off: 0.3, text: "LIVE" }, 6, 3.5), billboard(S, { x: 8.4, y: 10, z: -14, ry: -Math.PI / 2, off: 0.55, text: "NEW", c: 1 }, 6, 3.5), billboard(S, { x: -8.4, y: 12, z: -26, ry: Math.PI / 2, off: 0.8, c: 2, text: "SALE" }, 6, 3.5)];
    const ppl = []; const names = ["SalesRep", "ItEngineer", "OfficeLady", "Accountant", "Receptionist", "SecurityGuard", "OfficeIntern", "CompanyCeo", "GrandmaShopper"];
    names.forEach((n, i) => { const a = S.char(n, { x: -3.5 + (i % 3) * 3.5 + rnd(i) * 0.8, z: -2 - Math.floor(i / 3) * 3.5 + rnd(i * 3), ry: (rnd(i * 7) - 0.5) * 1.5 }); a.off = 0.25 + i * 0.12; ppl.push(a); });
    const icons = ppl.map((a, i) => { const s = S.screen(0.9, 0.9, (x, w, h, t) => { const on = t < a.off; x.clearRect(0, 0, w, h); x.fillStyle = on ? "#4dabf7" : "#111"; x.beginPath(); x.roundRect(8, 8, w - 16, h - 16, 18); x.fill(); x.fillStyle = on ? "#fff" : "#ff3b3b"; x.font = `900 ${h * 0.45}px Montserrat, Arial`; x.textAlign = "center"; x.fillText(on ? "♥" : "✕", w / 2, h * 0.66); }, { res: 96 }); s.material.transparent = true; return s; });
    return { S, update(t, d) {
      ppl.forEach((a, i) => { const k = seg(t, a.off, a.off + 0.25); if (a.has("Text") && i === 0) a.pose("Text", t); else a.pose(a.has("Shrug") ? "Shrug" : "Hit", (t - a.off) * 1.2, { loop: false, to: undefined }); if (t < a.off) a.pose("Idle", t + i); const ic = icons[i]; ic.position.set(a.root.position.x, a.h + 0.7 + 0.08 * Math.sin(t * 4 + i), a.root.position.z); ic.quaternion.copy(S.cam.quaternion); ic.scale.setScalar(t < a.off ? 1 : back(seg(t, a.off, a.off + 0.3))); ic.draw(t); });
      bbs.forEach((b) => b.draw(t));
      S.move(t / d, [[0, 13, 12], [0, 1, -6], 42], [[0, 6, 7.5], [0, 1.5, -7], 42], easeOut);
    } };
  },
  shakePhone() {
    const S = new Shot({ shadow: 8 }); city(S);
    const guy = S.char(GUY, {}); let tt = 0; guy.pose("Text", 0.6);
    const draw = (x, w, h) => { x.fillStyle = "#0b0d12"; x.fillRect(0, 0, w, h); const i = Math.min(2, Math.floor(tt / 0.75)); const icons = ["▶", "⌖", "✉"]; x.font = `900 ${w * 0.5}px Arial`; x.textAlign = "center"; x.fillStyle = ["#ff4d6d", "#69db7c", "#4dabf7"][i]; x.fillText(icons[i], w / 2, h * 0.5); x.strokeStyle = "#ff3b3b"; x.lineWidth = w * 0.08; const k = seg(tt % 0.75, 0.1, 0.3); x.beginPath(); x.moveTo(w * 0.15, h * 0.3); x.lineTo(w * 0.15 + w * 0.7 * k, h * 0.3 + h * 0.3 * k); x.stroke(); x.beginPath(); x.moveTo(w * 0.85, h * 0.3); x.lineTo(w * 0.85 - w * 0.7 * k, h * 0.3 + h * 0.3 * k); x.stroke(); };
    const ph = { screen: phoneScreen(S, guy, draw) };
    const bys = [S.char("OfficeIntern", { x: -1.6, z: -2.5, ry: 0.5 }), S.char("Receptionist", { x: 1.8, z: -3, ry: -0.5 })];
    return { S, update(t, d) {
      tt = t; ph.screen.draw(t);
      const lt = t % 0.75;
      guy.pose("Text", 0.6); guy.root.rotation.z = 0.05 * Math.sin(t * 45) * (1 - seg(lt, 0, 0.4)); guy.root.position.x = 0.03 * Math.sin(t * 38) * (1 - seg(lt, 0, 0.4));
      bys[0].pose("Shrug", t * 0.8); bys[1].pose("Think", t);
      S.move(t / d, [[-0.95, 1.75, -0.7], OTS[1], 42], [[-0.7, 1.6, -0.35], OTS[1], 38]);
    } };
  },
  checkout() {
    const S = new Shot({ shadow: 8 }); interior(S, 16, 14, "#f6efe2", "#e9e4da");
    for (let k = 0; k < 3; k++) S.shelf(4, { x: -5 + k * 5, z: -5.5 }).fill(0.9, k);
    S.box(1.4, 1.0, 3.6, "#2d6cdf", { x: 0.9, z: 0, r: 0.08 }); S.box(1.5, 0.08, 3.7, "#dfe6ee", { x: 0.9, y: 1.0, r: 0.03 });
    const cashier = S.char("Cashier", { x: 2.2, z: 0.2, ry: -Math.PI / 2 });
    const term = S.box(0.35, 0.12, 0.5, "#22262c", { x: 0.55, y: 1.08, z: 0.6, r: 0.04 });
    const scr = S.screen(0.3, 0.4, (x, w, h, t) => { const no = t > 0.3; x.fillStyle = no ? "#c1121f" : "#1e6fd9"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; x.textAlign = "center"; x.font = `900 ${w * 0.22}px Montserrat, Arial`; if (no) { x.font = `900 ${w * 0.6}px Arial`; x.fillText("✕", w / 2, h * 0.55); x.font = `900 ${w * 0.15}px Montserrat, Arial`; x.fillText("DECLINED", w / 2, h * 0.85); } else x.fillText("PAY", w / 2, h * 0.55); }, { x: 0.55, y: 1.25, z: 0.6, rx: -0.6, ry: 0, res: 128 });
    scr.lookAt(3.4, 1.9, 2.8);
    const shopper = S.char("GrandmaShopper", { x: -0.5, z: 0.6, ry: Math.PI / 2 });
    const line = [S.char("Accountant", { x: -0.9, z: 2.0, ry: 1.9 }), S.char("Receptionist", { x: -1.0, z: 3.4, ry: 2.0 }), S.char("ItEngineer", { x: -1.1, z: 4.8, ry: 2.1 })];
    const cart = S.group({ x: -1.2, z: 1.3 }); S.box(0.8, 0.6, 1.0, "#c0c6cc", { y: 0.4, opacity: 0.6, metal: 0.6 }, cart);
    return { S, update(t, d) {
      scr.draw(t); cashier.pose(t < 0.4 ? "Idle" : "Special", t);
      shopper.pose(t < 0.35 ? "Idle" : "Attack", (t - 0.35) * 1.1, { loop: t < 0.35 });
      line.forEach((a, i) => a.pose(t > 0.6 + i * 0.15 ? "TalkAngry" : "Idle", t + i));
      S.move(t / d, [[4.6, 2.3, 4.6], [-0.2, 1.0, 1.2], 40], [[3.4, 1.9, 3.3], [-0.1, 1.05, 0.9], 40], easeOut);
    } };
  },
  trafficCrash() {
    const S = new Shot({ shadow: 18 }); city(S, { lamps: false });
    S.plane(160, 9, null, { rx: -Math.PI / 2, y: 0.012, material: mat("#3a3f47", { rough: 0.85 }) });
    for (let k = -3; k <= 3; k++) S.plane(0.8, 3.5, "#f5f5f0", { rx: -Math.PI / 2, y: 0.02, x: k * 1.2, z: 6.8 });
    const tl = [S.trafficLight({ x: -5.2, z: 5.3, ry: Math.PI }), S.trafficLight({ x: 5.2, z: -5.3 })];
    const A = S.car("#e74c3c", { z: -30 }), B = S.car("#3498db", { x: -30, ry: Math.PI / 2 });
    const others = [S.car("#f1c40f", { z: -40, x: 2.5 }), S.car("#ecf0f1", { x: 30, z: 2.5, ry: -Math.PI / 2 }), S.car("#2ecc71", { z: -50, x: -2.2 })];
    const debris = S.burst({ n: 40, at: [0, 0.8, 0], speed: 6, color: "#dfe6e9", size: 0.12, life: 2.5, floor: 0.06 });
    const glass = S.burst({ n: 30, at: [0, 1.2, 0], speed: 5, color: "#9bd3ff", size: 0.07, life: 2.5, floor: 0.04, seed: 9 });
    const smoke = S.burst({ n: 14, at: [0, 1, 0], speed: 0.8, up: 1.2, gravity: -0.5, color: "#b2bec3", round: true, size: 0.22, grow: 1.0, fade: true, life: 2.5, seed: 4 });
    const T = 1.05;
    return { S, update(t, d) {
      tl.forEach((l, i) => l.set(Math.floor(t * 9 + i) % 3));
      const ta = Math.min(t, T); A.position.z = -24 + 22 * (ta / T) + (t > T ? easeOut(seg(t, T, T + 0.6)) * 1.2 : 0); A.position.x = t > T ? -0.6 * easeOut(seg(t, T, T + 0.6)) : 0; A.rotation.y = t > T ? -0.5 * easeOut(seg(t, T, T + 0.8)) : 0;
      B.position.x = -24 + 22 * (ta / T) + (t > T ? 1.0 * easeOut(seg(t, T, T + 0.6)) : 0); B.position.z = t > T ? 1.4 * easeOut(seg(t, T, T + 0.7)) : 0; B.rotation.y = Math.PI / 2 + (t > T ? 1.2 * easeOut(seg(t, T, T + 0.9)) : 0);
      [A, B].forEach((c) => c.wheels.forEach((w) => (w.rotation.x = t * 12)));
      others[0].position.z = -36 + 26 * easeOut(seg(t, 0, T + 0.9)); others[1].position.x = 30 - 22 * easeOut(seg(t, 0.4, T + 1.4)); others[2].position.z = -46 + 30 * easeOut(seg(t, 0.2, T + 1.6));
      debris.update(t - T); glass.update(t - T); smoke.update(t - T - 0.1);
      S.move(t / d, [[9, 7, 12], [0, 0.5, 0], 40], [[7, 5.5, 9], [0, 0.6, 0], 40]);
      if (t > T && t < T + 0.5) S.shake(t, 0.25 * (1 - seg(t, T, T + 0.5)));
    } };
  },
  raid() {
    const S = new Shot({ shadow: 12 }); interior(S, 10, 40, "#f6efe2", "#ece7dc", 5);
    const sh = []; for (const x of [-2.4, 2.4]) for (let k = 0; k < 4; k++) { const s = S.shelf(4.4, { x, z: -k * 4.6, ry: x < 0 ? Math.PI / 2 : -Math.PI / 2 }); s.fill(0.85, k + x); sh.push(s); }
    for (let k = 0; k < 6; k++) S.box(1.6, 0.08, 0.5, "#fff", { y: 4.6, z: -k * 5, emissive: "#fff", ei: 1.5, shadow: false });
    const runners = ["GrandmaShopper", "Accountant", "OfficeLady", "ItEngineer", "Schoolkid", "FoodCourier", "Receptionist"].map((n, i) => ({ a: S.char(n, { x: (rnd(i) - 0.5) * 2.4 }), z0: -16 - i * 2.2, sp: 4.2 + rnd(i * 3) * 1.5 }));
    const drops = [0, 1, 2].map((k) => S.burst({ n: 10, at: [k % 2 ? 1.8 : -1.8, 1.6, -3 - k * 4], speed: 2, color: ["#e74c3c", "#f1c40f", "#3498db"][k], size: 0.18, life: 2, floor: 0.12, seed: k * 5 }));
    return { S, update(t, d) {
      runners.forEach(({ a, z0, sp }, i) => { a.root.position.z = z0 + sp * t; a.pose("Run", t + i * 0.2); });
      sh.forEach((s, i) => s.fill(0.85 - 0.5 * seg(t, 0.2 + i * 0.05, 1.5 + i * 0.05), i));
      drops.forEach((b, k) => b.update(t - 0.3 - k * 0.35));
      S.move(t / d, [[0.3, 0.9, 4], [0, 1.2, -6], 46], [[-0.3, 1.1, 2.6], [0, 1.0, -6], 46]); S.shake(t, 0.02);
    } };
  },
  emptyShelves() {
    const S = new Shot({ shadow: 12, night: true, exposure: 0.9 }); interior(S, 10, 40, "#d9d2c3", "#cfc9bd", 5); S.hemi.intensity = 0.5; S.sun.intensity = 0.4;
    for (const x of [-2.4, 2.4]) for (let k = 0; k < 4; k++) S.shelf(4.4, { x, z: -k * 4.6, ry: x < 0 ? Math.PI / 2 : -Math.PI / 2 }).fill(0.03, k + x * 3);
    const panels = []; for (let k = 0; k < 6; k++) panels.push(S.box(1.6, 0.08, 0.5, "#fff", { y: 4.6, z: -k * 5, emissive: "#e8f4ff", ei: 1.5, unique: true, shadow: false }));
    const bulbs = panels.map((p, k) => S.light("#e8f4ff", 6, 9, { y: 4.3, z: -k * 5 }));
    const can = S.cyl(0.12, 0.12, 0.26, "#e74c3c", { rz: Math.PI / 2, metal: 0.6, rough: 0.3 });
    return { S, update(t, d) {
      panels.forEach((p, k) => { const on = k === 1 ? (rnd(Math.floor(t * 12)) > 0.5 ? 1 : 0.05) : k < 3 ? 0.9 : 0.05; p.material.emissiveIntensity = on * 1.5; bulbs[k].intensity = on * 6; });
      can.position.set(-1.2 + t * 0.9, 0.12, -2.5); can.rotation.set(0, 0, Math.PI / 2); can.rotation.x = -t * 7.5;
      S.move(t / d, [[0, 1.4, 5], [0, 1.0, -8], 44], [[0, 1.2, 2.5], [0, 0.8, -8], 44]);
    } };
  },
  tradeWater() {
    const S = new Shot({ shadow: 8, sky: ["#d9894f", "#f5d6a1"], ground: "#b59a72", fogNear: 10, fogFar: 50 }); city(S, { colors: ["#c9a27c", "#b58e6a", "#d4b48f"], lamps: false });
    const guy = S.char(GUY, { x: -0.7, ry: Math.PI / 2 });
    const man = S.char("SecurityGuard", { x: 0.75, ry: -Math.PI / 2 });
    const bottle = S.group(); S.cyl(0.11, 0.11, 0.42, "#5ec8ff", { opacity: 0.75, rough: 0.05 }, bottle); S.cyl(0.06, 0.06, 0.08, "#1c7ed6", { y: 0.42 }, bottle); S.cyl(0.115, 0.115, 0.14, "#ffffff", { y: 0.14, shadow: false }, bottle);
    const dust = S.burst({ n: 40, at: [0, 0.5, 0], speed: 1.2, up: 0.2, spread: 0.3, gravity: -0.05, color: "#e9c9a0", round: true, size: 0.05, life: 6, fade: false, flat: true });
    return { S, update(t, d) {
      guy.pose(t < 0.6 ? "TalkAsk" : "Call", t);
      man.pose(t < 1.0 ? "Idle" : "Shake", t < 1 ? t : t - 1);
      const hb = 1.08 + 0.05 * Math.sin(t * 3); bottle.position.set(0.32, hb, 0.25); bottle.rotation.z = 0.1 * Math.sin(t * 2);
      dust.update(t + 1);
      S.move(t / d, [[0.3, 1.4, 6.4], [0.05, 1.0, 0], 40], [[0.2, 1.3, 5.2], [0.1, 1.0, 0], 40]);
    } };
  },
  kidsOutside() {
    const S = new Shot({ shadow: 14, ground: "#6cc24a" });
    for (let k = 0; k < 14; k++) S.tree({ x: (rnd(k) - 0.5) * 34, z: -6 - rnd(k * 3) * 22, size: 0.9 + rnd(k * 5) * 0.6 });
    for (let k = 0; k < 8; k++) S.bush({ x: (rnd(k * 9) - 0.5) * 20, z: -2 - rnd(k * 2) * 8 });
    S.cyl(2.5, 2.5, 0.06, "#c2a878", { z: -1, y: 0, shadow: false });
    const kids = [S.char("Schoolkid", { x: -1.4, z: 0, h: 1.3 }), S.char("Schoolkid", { x: 1.2, z: -1.2, h: 1.3, ry: -0.6 }), S.char("OfficeIntern", { x: 0.2, z: -2.5, h: 1.35 })];
    const goose = S.char("Goose", { x: 5, z: 0.5, ry: -Math.PI / 2 });
    const sun = S.ball(3, "#fff3b0", { x: -14, y: 22, z: -60, emissive: "#ffe066", ei: 2, shadow: false });
    for (let k = 0; k < 4; k++) cloud(S, { x: -20 + k * 13, y: 18 + rnd(k) * 6, z: -55 });
    return { S, update(t, d) {
      kids[0].pose("Idle", t); kids[0].root.rotation.y = 0.8 * Math.sin(t * 1.5);
      kids[2].pose("Shrug", t); kids[1].pose(t < 1.1 ? "Idle" : "Run", t);
      if (t > 1.1) { kids[1].root.rotation.y = -Math.PI / 2; kids[1].root.position.x = 1.2 - (t - 1.1) * 3.5; }
      const gx = 5 - Math.max(0, t - 0.6) * 3.6; goose.root.position.x = gx; goose.pose(t > 0.6 ? "attack" : "idle", t * 1.4);
      S.move(t / d, [[0, 1.6, 8], [0, 0.9, -1], 42], [[-0.8, 1.4, 6.5], [0, 0.9, -1], 42]);
    } };
  },
  cityBlackout() {
    const S = new Shot({ night: true, shadow: 40, fogNear: 60, fogFar: 200, sky: ["#060a1c", "#1b2b52"] }); S.groundMesh.material = mat("#1a1f29");
    const bl = cityBlocks(S); S.stars(500); const moon = S.ball(4, "#f1f3f8", { x: 40, y: 70, z: -150, emissive: "#dde6ff", ei: 1.2, shadow: false });
    return { S, update(t, d) {
      const k = t / d;
      bl.forEach((b) => { const off = b.delay * 1.1 + 0.25; const fl = t > off - 0.25 && t < off ? (rnd(Math.floor(t * 20) + b.id) > 0.5 ? 1 : 0.2) : 1; b.win.emissiveIntensity = t > off ? 0.0 : 1.6 * fl; });
      S.move(k, [[0, 36, 60], [0, 6, -30], 45], [[0, 44, 72], [0, 4, -30], 45]);
    } };
  },
  aloneCurb() {
    const S = new Shot({ night: true, shadow: 8, exposure: 1.15 }); city(S, { lit: 0.0 }); S.hemi.intensity = 0.8;
    const guy = S.char(GUY, { x: -4.5, y: 0.2, z: 0, ry: Math.PI / 2 - 0.25 });
    const f = fire(S, { x: 3.5, z: -12 });
    const l = S.light("#9bb4ff", 25, 10, { x: -2, y: 3, z: 1.5 });
    return { S, update(t, d) {
      guy.pose("Sit", 0.8 + t * 0.2); f.update(t);
      S.move(t / d, [[-0.6, 1.1, 1.6], [-4.4, 0.8, 0], 40], [[-1.6, 1.0, 0.9], [-4.4, 0.85, 0], 40]);
    } };
  },

  // ── AI OFF ────────────────────────────────────────────
  robotsDie() {
    const S = new Shot({ shadow: 14, sky: ["#56606c", "#8090a0"], fogNear: 25, fogFar: 80, exposure: 1.2 }); interior(S, 24, 30, "#8a96a3", "#5d656e", 9); S.hemi.intensity = 1.5;
    const belt = S.box(20, 0.8, 1.4, "#2d3436", { z: 1.6, r: 0.05 }); const boxes = []; for (let k = 0; k < 10; k++) boxes.push(S.box(0.7, 0.6, 0.7, "#c8a26b", { y: 0.8, z: 1.6, r: 0.04 }));
    const arms = [-6, -2, 2, 6].map((x) => S.robotArm("#f39c12", { x, z: -0.6 }));
    const reds = [-8, 0, 8].map((x) => S.ball(0.3, "#ff2020", { x, y: 7.5, z: -14.7, emissive: "#ff2020", ei: 0.1, unique: true, shadow: false }));
    const redL = S.light("#ff2020", 0, 40, { x: 0, y: 7, z: -6 });
    const sparks = arms.map((a, i) => S.burst({ n: 24, at: [a.position.x, 4.2, -0.2], speed: 4, color: "#ffd23a", glow: true, size: 0.05, life: 1.2, seed: i * 3 }));
    const T = 0.35;
    return { S, update(t, d) {
      const tt = Math.min(t, T);
      arms.forEach((a, i) => { const ph = tt * 3 + i; if (t < T) a.set(Math.sin(ph) * 0.8, -0.5 + 0.3 * Math.sin(ph * 1.3), -1.2 + 0.4 * Math.cos(ph), 0.5); else { const k = easeIn(seg(t, T + i * 0.15, T + 0.6 + i * 0.15)); a.set(Math.sin(T * 3 + i) * 0.8, -0.5 + 0.3 * Math.sin((T * 3 + i) * 1.3) - k * 0.9, -1.2 + 0.4 * Math.cos(T * 3 + i) - k * 0.5, 0.5 + k); }
        a.lamp.material.color.set(t < T ? "#2dff6a" : "#ff2020"); a.lamp.material.emissive.set(t < T ? "#2dff6a" : "#ff2020"); });
      boxes.forEach((b, k) => (b.position.x = -10 + ((k * 2 + tt * 2) % 20)));
      const pulse = t > T ? 0.5 + 0.5 * Math.sin(t * 14) : 0; reds.forEach((r) => (r.material.emissiveIntensity = 0.1 + 3 * pulse)); redL.intensity = 60 * pulse;
      sparks.forEach((s, i) => s.update(t - T - i * 0.12));
      S.move(t / d, [[3, 3.4, 13], [0, 2.0, -1], 44], [[-1.5, 2.9, 10.5], [0, 2.0, -1], 44], easeOut);
      if (t > T && t < T + 0.4) S.shake(t, 0.08);
    } };
  },
  carsFreeze() {
    const S = new Shot({ shadow: 30, ground: "#8bc06a" }); S.road(200, 16, { z: -60 });
    for (let k = -3; k <= 3; k++) if (k) S.plane(0.18, 200, "#f5f5f0", { rx: -Math.PI / 2, x: k * 2.3, y: 0.02, z: -60, material: mat("#f5f5f0") });
    for (let k = 0; k < 20; k++) S.tree({ x: (k % 2 ? 1 : -1) * (14 + rnd(k) * 10), z: 10 - k * 8, size: 1.2 });
    const cars = []; for (let lane = -3; lane <= 2; lane++) for (let k = 0; k < 5; k++) { const c = S.car(CAR_COLORS[(lane + 3 + k * 2) % 8], { x: lane * 2.3 + 1.15, z: -k * 9 - (lane % 2 ? 4 : 0) }); c.z0 = c.position.z; cars.push(c); }
    const ppl = [S.char("ItEngineer", { x: 2.6, z: -0.5, ry: 0.4 }), S.char("OfficeLady", { x: -3.2, z: -9.6, ry: -0.3 })];
    const T = 0.5;
    return { S, update(t, d) {
      cars.forEach((c, i) => { const v = 10; c.position.z = c.z0 + (t < T ? v * t : v * T + v * 0.12 * easeOut(seg(t, T, T + 0.3))); c.rotation.x = t > T ? 0.05 * Math.sin(seg(t, T, T + 0.5) * Math.PI) : 0; c.wheels.forEach((w) => (w.rotation.x = Math.min(t, T) * 20)); });
      ppl.forEach((p, i) => { p.root.visible = t > 0.9; p.pose(i ? "Shrug" : "TalkAsk", t); p.root.position.z = (i ? -9.6 : -0.5) + v0(); });
      function v0() { return 10 * T + 1.2; }
      S.move(t / d, [[10, 18, 26], [0, 0, -5], 40], [[7, 9, 18], [0, 0.5, -2], 40], easeOut);
    } };
  },
  surgery() {
    const S = new Shot({ shadow: 8, sky: ["#cfe8f0", "#eaf6fa"] }); interior(S, 10, 10, "#dff2f0", "#cfe3e0", 4.5);
    S.box(1.1, 0.9, 2.6, "#e9eef3", { z: 0, r: 0.08 }); S.box(1.2, 0.12, 2.7, "#63b3ed", { y: 0.9, r: 0.05 });
    const pat = S.char("OfficeIntern", { y: 1.15, z: 0.85 }); pat.root.rotation.x = -Math.PI / 2; pat.pose("Idle", 0);
    S.box(2.6, 0.12, 2.6, "#63b3ed", { y: 1.06, z: -0.1, r: 0.05 }).scale.set(0.42, 1, 0.55);
    const arm = S.robotArm("#f4f6f9", { x: -1.6, z: -1.2 }); arm.scale.setScalar(0.8);
    const doc = S.char("WhiteCoatDoctor", { x: 1.3, z: -0.4, ry: -Math.PI / 2 }), nurse = S.char("WardNurse", { x: 1.2, z: 1.2, ry: -Math.PI / 2 - 0.4 });
    const mon = S.box(1.0, 0.7, 0.15, "#2d3436", { x: -1.4, y: 1.6, z: 1.6, ry: 0.9, r: 0.05 });
    const ecg = S.screen(0.86, 0.56, (x, w, h, t) => { x.fillStyle = "#03140c"; x.fillRect(0, 0, w, h); x.strokeStyle = t > 0.5 ? "#ff3b3b" : "#2dff6a"; x.lineWidth = 4; x.beginPath(); for (let i = 0; i < w; i++) { const u = (i / w * 3 + t * 1.5) % 1; const y = t > 0.5 ? h / 2 + (rnd(i + Math.floor(t * 20)) - 0.5) * 6 : h / 2 - (u > 0.45 && u < 0.5 ? 80 * Math.sin((u - 0.45) * 62) : 0); i ? x.lineTo(i, y) : x.moveTo(i, y); } x.stroke(); if (t > 0.5) { x.fillStyle = "#ff3b3b"; x.font = `900 ${h * 0.16}px Montserrat, Arial`; x.textAlign = "center"; x.fillText("AI OFFLINE", w / 2, h * 0.25); } }, { x: -1.4 + Math.sin(0.9) * 0.08, y: 1.95, z: 1.6 + Math.cos(0.9) * 0.08, ry: 0.9, res: 256 });
    const lampL = S.light("#ffffff", 30, 8, { y: 3.4, z: 0 }); S.cyl(0.6, 0.4, 0.25, "#dfe6e9", { y: 3.6, emissive: "#fff", ei: 0.6 });
    return { S, update(t, d) {
      ecg.draw(t); const T = 0.45;
      if (t < T) arm.set(0.3 * Math.sin(t * 6), -0.6, -1.4 + 0.1 * Math.sin(t * 9), 0.6); else arm.set(0.3 * Math.sin(T * 6), -0.6, -1.4 + 0.1 * Math.sin(T * 9), 0.6);
      arm.lamp.material.color.set(t < T ? "#2dff6a" : "#ff2020"); arm.lamp.material.emissive.set(t < T ? "#2dff6a" : "#ff2020");
      doc.pose(t < T + 0.1 ? "Idle" : "Hit", t < T + 0.1 ? t : (t - T) * 0.7, { loop: t < T + 0.1 }); nurse.pose(t < T + 0.3 ? "Idle" : "Run", t);
      lampL.intensity = t > T && rnd(Math.floor(t * 12)) > 0.6 ? 4 : 30;
      S.move(t / d, [[4.4, 3.6, 6.2], [0, 1.4, 0.1], 42], [[3.6, 3.0, 5.0], [0, 1.4, 0.1], 42]);
    } };
  },
  marketCrash() {
    const S = new Shot({ shadow: 12, sky: ["#0d1b2a", "#1b263b"], fogNear: 12, fogFar: 40 }); interior(S, 18, 20, "#1b263b", "#2b2d42", 6); S.hemi.intensity = 0.9;
    const chart = (x, w, h, t, big) => { x.fillStyle = "#06101d"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(255,255,255,.08)"; for (let i = 0; i < w; i += w / 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
      const n = 60, k = clamp(t / 1.8); x.lineWidth = big ? 6 : 3; x.strokeStyle = "#ff3b3b"; x.beginPath(); for (let i = 0; i <= n * Math.max(0.6, k); i++) { const u = i / n; const y = u < 0.55 ? h * (0.3 + 0.08 * Math.sin(u * 30)) : h * (0.3 + (u - 0.55) * 1.6 + 0.05 * Math.sin(u * 50)); i ? x.lineTo(u * w, Math.min(h - 4, y)) : x.moveTo(0, y); } x.stroke();
      if (big) { x.fillStyle = "#ff3b3b"; x.font = `900 ${h * 0.14}px Montserrat, Arial`; x.textAlign = "right"; x.fillText("▼ " + Math.round(100 * (1 - easeIn(clamp(t / 2.2)))) + "%", w - 16, h * 0.18); } };
    const big = S.screen(12, 4.5, (x, w, h, t) => chart(x, w, h, t, true), { y: 3.4, z: -9.7, res: 512 });
    const desks = [], scrs = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const x = (c - 1) * 3.6, z = -1 - r * 3.6; S.box(2.8, 0.8, 1.1, "#e0e5ec", { x, z, r: 0.05 }); for (const dx of [-0.6, 0.6]) { S.box(1.0, 0.65, 0.08, "#1f2430", { x: x + dx, y: 0.9, z: z - 0.3, r: 0.03 }); scrs.push(S.screen(0.9, 0.55, (x2, w, h, t) => chart(x2, w, h, t + c * 0.2, false), { x: x + dx, y: 1.225, z: z - 0.25, res: 128 })); } desks.push([x, z]); }
    const traders = [["CompanyCeo", "Death"], ["Accountant", "TalkAngry"], ["SalesRep", "Hit"], ["ItEngineer", "Shake"], ["Receptionist", "TalkAngry"], ["OfficeIntern", "Shrug"]].map(([n, c], i) => { const [x, z] = desks[i]; const a = S.char(n, { x, z: z + 0.9, ry: Math.PI }); a.act = c; return a; });
    return { S, update(t, d) {
      big.draw(t); scrs.forEach((s) => s.draw(t));
      traders.forEach((a, i) => { const st = 0.4 + i * 0.1; a.root.rotation.y = t > st ? Math.PI + Math.PI * easeOut(seg(t, st, st + 0.3)) : Math.PI; a.pose(t < st ? "Idle" : a.act, t < st ? t : t - st, { loop: a.act !== "Death" && a.act !== "Hit" }); });
      S.move(t / d, [[0, 4.0, 9.6], [0, 2.4, -4], 46], [[0, 3.2, 7.6], [0, 2.1, -4], 46], easeOut);
    } };
  },
  planePanic() {
    const S = new Shot({ shadow: 30, ground: "#1f6fb2", sky: ["#3f8fd8", "#bfe3ff"], fogNear: 40, fogFar: 260 });
    S.groundMesh.material = mat("#2a7fd0", { rough: 0.2, metal: 0.1 }); S.groundMesh.position.y = -60;
    const clouds = []; for (let k = 0; k < 14; k++) clouds.push(cloud(S, { x: (rnd(k) - 0.5) * 120, y: -20 + rnd(k * 3) * 40, z: -30 - rnd(k * 5) * 120 }));
    const pl = S.airplane({ y: 0, z: 0 });
    const smoke = S.burst({ n: 18, at: [4.5, -1, -2.5], speed: 0.5, up: 0.3, gravity: -0.2, color: "#666", round: true, size: 0.3, grow: 0.8, fade: true, life: 2.5 });
    return { S, update(t, d) {
      const k = seg(t, 0.3, d); pl.position.set(0, -6 * easeIn(k) + 0.3 * Math.sin(t * 3), t * 6); pl.rotation.set(0.35 * easeIn(k) + 0.05 * Math.sin(t * 5), 0, 0.5 * Math.sin(t * 2.5) * k);
      clouds.forEach((c, i) => (c.position.z += 0));
      smoke.position.copy(pl.position); smoke.update(t % 2.5);
      S.view([16, pl.position.y + 3 - 2 * k, pl.position.z + 10], [0, pl.position.y, pl.position.z], 42); S.shake(t, 0.15 * k);
    } };
  },
  warehouse() {
    const S = new Shot({ shadow: 16, sky: ["#2a2f36", "#3a414a"], fogNear: 12, fogFar: 45 }); interior(S, 20, 40, "#5d6773", "#7b838c", 10); S.hemi.intensity = 1.0;
    for (const x of [-6, 6]) for (let k = 0; k < 5; k++) { const z = -k * 6; S.box(1.4, 6, 4.5, "#e67e22", { x, z, r: 0.03 }).scale.set(0.15, 1, 1); for (let lv = 0; lv < 3; lv++) for (let b = 0; b < 3; b++) S.box(1.0, 0.9, 1.0, "#c8a26b", { x: x + (x > 0 ? -0.6 : 0.6), y: lv * 2 + 0.1, z: z - 1.4 + b * 1.4, r: 0.04 }); }
    const bots = []; for (let k = 0; k < 6; k++) { const g = S.group({ x: (rnd(k) - 0.5) * 6, z: -2 - k * 4.5, ry: rnd(k * 3) * 6 }); S.box(1.0, 0.45, 1.0, "#ecf0f1", { r: 0.12 }, g); g.eye = S.box(0.5, 0.12, 0.05, "#2dff6a", { y: 0.3, z: 0.5, emissive: "#2dff6a", ei: 2, unique: true, shadow: false }, g); S.box(0.8, 0.5, 0.8, "#c8a26b", { y: 0.45, r: 0.04 }, g); bots.push(g); }
    for (let k = 0; k < 18; k++) S.box(0.8, 0.7, 0.8, "#c8a26b", { x: -1 + rnd(k) * 2, y: Math.floor(k / 6) * 0.7, z: 3 - (k % 6) * 0.82, ry: rnd(k * 9) * 0.6, r: 0.04 });
    const cour = S.char("FoodCourier", { x: 2.2, z: 2.5, ry: -0.5 });
    return { S, update(t, d) {
      const T = 0.3; bots.forEach((b, i) => { b.eye.material.color.set(t < T ? "#2dff6a" : "#ff2020"); b.eye.material.emissive.set(t < T ? "#2dff6a" : "#ff2020"); b.eye.material.emissiveIntensity = t < T ? 2 : rnd(Math.floor(t * 6) + i) > 0.5 ? 2 : 0.2; if (t < T) b.position.z += 0; });
      cour.pose(t < 0.8 ? "Idle" : "Attack", t < 0.8 ? t : t - 0.8);
      S.move(t / d, [[-2.5, 2.8, 10.5], [0.5, 1.0, -3], 44], [[-1.8, 2.3, 8], [0.8, 1.0, -2], 44]);
    } };
  },
  gridFail() {
    const S = new Shot({ night: true, shadow: 30, ground: "#34402a", fogNear: 40, fogFar: 160, exposure: 1.5 }); S.hemi.intensity = 1.3; S.sun.intensity = 1.6;
    const towers = []; for (let k = 0; k < 5; k++) { const g = S.group({ x: -4 + k * 2, z: -k * 18 }); const m = mat("#c8d0d8", { metal: 0.2, rough: 0.4 });
      for (const s of [-1, 1]) { const leg = S.box(0.25, 14, 0.25, null, { material: m, x: s * 1.2, r: 0 }, g); leg.rotation.z = s * 0.08; }
      for (let y = 2; y < 14; y += 2.5) S.box(2.4 - y * 0.1, 0.15, 0.2, null, { material: m, y, r: 0 }, g);
      S.box(7, 0.25, 0.25, null, { material: m, y: 13, r: 0 }, g); g.top = new THREE.Vector3(g.position.x, 13, g.position.z); towers.push(g); }
    const wires = []; for (let k = 0; k < 4; k++) for (const dx of [-3.3, 3.3]) { const a = towers[k].position, b = towers[k + 1].position; const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector3(lerp(a.x, b.x, u) + dx, 12.9 - Math.sin(u * Math.PI) * 1.5, lerp(a.z, b.z, u))); } const w = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.05, 6), mat("#222", { emissive: "#7fd4ff", ei: 0.4, unique: true })); S.add(w); wires.push(w); }
    const bl = []; for (let k = 0; k < 16; k++) bl.push(S.building(6, 8 + rnd(k) * 22, 6, COLORS[k % 8], { x: -45 + k * 6.5, z: -95, seed: k, lit: 1.6, roof: false }));
    const sparks = towers.map((tw, i) => S.burst({ n: 30, at: [tw.position.x + 3.3, 13, tw.position.z], speed: 5, color: "#9be7ff", glow: true, size: 0.08, life: 1.3, seed: i }));
    const flash = S.light("#9be7ff", 0, 60, { x: 0, y: 14, z: -10 });
    return { S, update(t, d) {
      sparks.forEach((s, i) => s.update(t - 0.2 - i * 0.25));
      wires.forEach((w, i) => (w.material.emissiveIntensity = t < 0.2 + Math.floor(i / 2) * 0.25 ? 0.4 + 0.6 * rnd(Math.floor(t * 30) + i) : 0));
      flash.intensity = rnd(Math.floor(t * 15)) > 0.7 ? 400 : 0;
      bl.forEach((b, i) => (b.win.emissiveIntensity = t < 0.9 + i * 0.05 ? 1.6 * (rnd(Math.floor(t * 18) + i) > 0.3 ? 1 : 0.3) : 0));
      S.move(t / d, [[9, 6, 12], [-1, 10, -14], 46], [[6, 8, 8], [-1, 10, -18], 46]);
    } };
  },
  homework() {
    const S = new Shot({ shadow: 8, sky: ["#ffe8cc", "#fff4e6"] }); interior(S, 8, 8, "#c5dcf5", "#d9b991", 4);
    S.box(2.2, 0.85, 1.1, "#a9744f", { z: -0.4, r: 0.04 }); const lap = S.box(0.9, 0.05, 0.6, "#2d3436", { y: 0.85, z: -0.5, x: -0.4 });
    const ls = S.screen(0.85, 0.5, (x, w, h, t) => { x.fillStyle = "#14161b"; x.fillRect(0, 0, w, h); x.fillStyle = "#ff3b3b"; x.font = `900 ${h * 0.2}px Montserrat, Arial`; x.textAlign = "center"; x.fillText("AI OFFLINE", w / 2, h * 0.58); }, { x: -0.4, y: 1.15, z: -0.78, rx: -0.15, res: 192 });
    const stack = S.group({ x: 0.5, y: 0.85, z: -0.45 }); const sheets = []; for (let k = 0; k < 40; k++) sheets.push(S.box(0.6, 0.06, 0.8, k % 5 ? "#ffffff" : "#ffd23a", { y: k * 0.065, ry: (rnd(k) - 0.5) * 0.2, r: 0.01 }, stack));
    const kid = S.char("Schoolkid", { x: -0.1, z: 0.9, ry: Math.PI, h: 1.3 });
    return { S, update(t, d) {
      ls.draw(t); const n = Math.floor(easeOut(seg(t, 0.2, d * 0.75)) * 40); sheets.forEach((s, k) => { s.visible = k < 4 + n; });
      kid.pose(t < 1.0 ? "Idle" : "Hit", t < 1 ? t : (t - 1) * 0.8, { loop: t < 1 }); kid.root.rotation.y = Math.PI + 0.4;
      const top = 0.85 + (4 + n) * 0.065;
      S.move(t / d, [[1.6, 1.3, 2.6], [0.2, 1.0, -0.4], 42], [[1.8, 1.9, 3.2], [0.3, Math.max(1.4, top * 0.75), -0.4], 46]);
    } };
  },
  paperMap() {
    const S = new Shot({ night: true, shadow: 8 }); city(S, { lit: 0.0 });
    const guy = S.char("ItEngineer", { ry: 0.2 });
    const map = canvasTex(256, 192, (x, w, h) => { x.fillStyle = "#f3e6c4"; x.fillRect(0, 0, w, h); x.strokeStyle = "#c0392b"; x.lineWidth = 6; x.beginPath(); x.moveTo(20, 150); x.bezierCurveTo(80, 40, 160, 160, 236, 40); x.stroke(); x.strokeStyle = "#7f8c8d"; x.lineWidth = 2; for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } x.fillStyle = "#3498db"; x.beginPath(); x.ellipse(80, 60, 30, 18, 0, 0, 7); x.fill(); x.fillStyle = "#c0392b"; x.font = "900 40px Arial"; x.fillText("✕", 200, 160); });
    const mp = S.plane(1.2, 0.9, null, { material: new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.8 }) });
    const sign = S.group({ x: 2.2, z: -1.5 }); S.cyl(0.07, 0.07, 3, "#7f8c8d", {}, sign); for (let k = 0; k < 4; k++) S.box(1.2, 0.3, 0.06, ["#27ae60", "#2980b9", "#c0392b", "#f39c12"][k], { y: 2.0 + k * 0.35, ry: k * 1.3 + 0.3, r: 0.03 }, sign);
    const flash = S.light("#fff4d6", 8, 6, { x: 0.3, y: 1.8, z: 1.4 });
    return { S, update(t, d) {
      guy.pose(t < 1.2 ? "Think" : "Scratch", t); const flip = easeOut(seg(t, 0.9, 1.3));
      mp.position.set(0.0, 0.75, 0.6); mp.rotation.set(-0.35, 0.15, Math.PI * flip + 0.05 * Math.sin(t * 3));
      S.move(t / d, [[2.0, 1.8, 5.6], [0, 1.0, 0], 40], [[-1.6, 1.7, 5.0], [0, 1.0, 0], 40]);
    } };
  },
  back1950() {
    const S = new Shot({ shadow: 8, sky: ["#d8c8a8", "#efe4cc"] }); interior(S, 9, 8, "#c8b28a", "#7a5a3a", 4);
    const tv = S.group({ x: 0, z: -2.6 }); S.box(1.4, 1.1, 0.9, "#6b4423", { y: 0.45, r: 0.1 }, tv); for (const x of [-0.5, 0.5]) S.box(0.08, 0.45, 0.08, "#3d2614", { x, r: 0 }, tv);
    const scr = S.screen(0.9, 0.7, (x, w, h, t) => { const d = x.createImageData(w, h); for (let i = 0; i < d.data.length; i += 4) { const v = rnd(i * 0.37 + Math.floor(t * 24) * 13.1) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); }, { x: 0, y: 1.0, z: -2.14, res: 96 });
    S.box(2.6, 0.5, 0.9, "#8e3b2e", { x: 0, z: 1.2, r: 0.2 }); S.box(2.6, 0.8, 0.25, "#8e3b2e", { x: 0, z: 1.6, r: 0.12 });
    const fam = [S.char("GrandmaShopper", { x: -0.8, y: 0.25, z: 1.25, ry: Math.PI }), S.char("Schoolkid", { x: 0.1, y: 0.25, z: 1.25, ry: Math.PI, h: 1.2 }), S.char(GUY, { x: 0.9, y: 0.0, z: 1.15, ry: Math.PI })];
    const radio = S.box(0.6, 0.4, 0.3, "#a0522d", { x: 2.6, y: 0.9, z: -2.6, r: 0.08 }); S.box(1.2, 0.9, 0.6, "#5c3a1e", { x: 2.6, z: -2.6, r: 0.05 });
    return { S, update(t, d) {
      scr.draw(t); fam[0].pose("Idle", t); fam[1].pose("Idle", t + 1); fam[2].pose("Sit", 0.8 + t * 0.1);
      S.move(t / d, [[3.7, 2.6, -3.3], [0, 0.9, 1.2], 44], [[2.6, 2.2, -3.5], [0, 0.9, 1.2], 44]);
      return { filter: "sepia(0.85) contrast(1.1) brightness(0.95)" };
    } };
  },
  candle() {
    const S = new Shot({ night: true, shadow: 6, exposure: 0.9 }); city(S, { lit: 0 }); S.hemi.intensity = 0.35; S.sun.intensity = 0.25;
    const guy = S.char(GUY, {});
    const c = S.group(); S.cyl(0.07, 0.07, 0.3, "#fdf6e3", {}, c); const flame = S.ball(0.05, "#ffb703", { y: 0.38, emissive: "#ffb703", ei: 4, shadow: false }, c); flame.scale.set(1, 1.8, 1);
    const L = S.light("#ffb066", 6, 6, { x: 0.3, y: 1.1, z: 1.0 });
    return { S, update(t, d) {
      guy.pose("Idle", t); c.position.set(0.3, 0.62, 0.72); flame.scale.set(1 + 0.15 * Math.sin(t * 19), 1.8 + 0.3 * Math.sin(t * 13), 1); L.intensity = 5 + 1.5 * Math.sin(t * 17) + rnd(Math.floor(t * 20));
      S.move(t / d, [[0.4, 1.35, 5.2], [0, 1.0, 0], 38], [[0.25, 1.3, 3.8], [0, 1.05, 0], 38]);
    } };
  },

  // ── HUMANS GONE ───────────────────────────────────────
  poof() {
    const S = new Shot({ shadow: 16 }); city(S);
    const names = ["SalesRep", "OfficeLady", "Accountant", "GrandmaShopper", "Schoolkid", "ItEngineer", "Receptionist", "FoodCourier", "OfficeIntern", "SecurityGuard", "AirTraveller", "CompanyCeo"];
    const ppl = names.map((n, i) => { const a = S.char(n, { x: -3.6 + (i % 4) * 2.4 + rnd(i) * 0.6, z: 1.2 - Math.floor(i / 4) * 3.5, ry: i % 2 ? Math.PI : 0 }); a.t0 = i === 0 ? 0.15 : 0.35 + rnd(i * 5) * 1.3; a.z0 = a.root.position.z; a.dir = i % 2 ? -1 : 1; a.puff = S.burst({ n: 16, at: [a.root.position.x, 0.9, 0], speed: 1.6, up: 0.3, gravity: -0.6, color: "#ffffff", round: true, size: 0.18, grow: 1.6, fade: true, life: 0.8, seed: i }); return a; });
    const cars = [S.car("#e74c3c", { x: 2.3, z: -12 }), S.car("#3498db", { x: -2.3, z: -20, ry: Math.PI })];
    return { S, update(t, d) {
      ppl.forEach((a, i) => { const z = a.z0 + a.dir * 1.2 * Math.min(t, a.t0); a.root.position.z = z; const k = seg(t, a.t0, a.t0 + 0.12); a.root.scale.setScalar(1 - easeIn(k) + 1e-4); a.root.visible = k < 1; a.pose("Walk", t + i * 0.3); a.puff.position.set(0, 0, z); a.puff.update(t - a.t0); });
      cars.forEach((c, i) => (c.position.z = (i ? -20 - 8 * Math.min(t, 0.8) : -12 + 8 * Math.min(t, 0.8))));
      S.move(seg(t, 0, d), [[0.5, 2.6, 8.5], [0, 1.0, -1.5], 40], [[0, 6.5, 14], [0, 0.5, -3], 42], easeOut);
    } };
  },
  driverless() {
    const S = new Shot({ shadow: 14 }); city(S, { lamps: false });
    const lamp = S.lamp({ x: 4.8, z: -2 }); const car = S.car("#e67e22", { x: 1.5, z: -18 }); const parked = S.car("#9b59b6", { x: 3.2, z: 4, ry: 0.1 });
    const debris = S.burst({ n: 30, at: [4.2, 0.9, -2], speed: 5, color: "#dfe6e9", size: 0.12, life: 2, floor: 0.06 });
    const T = 1.2;
    return { S, update(t, d) {
      const k = Math.min(t, T) / T; car.position.set(lerp(1.5, 3.8, easeIn(k)), 0, lerp(-18, -2.7, k)); car.rotation.y = 0.25 * easeIn(k) + (t > T ? 0.25 * easeOut(seg(t, T, T + 0.5)) : 0); car.wheels.forEach((w) => (w.rotation.x = Math.min(t, T) * 14));
      lamp.rotation.z = t > T ? -1.35 * easeIn(seg(t, T, T + 0.7)) : 0; debris.update(t - T);
      S.move(t / d, [[-4.5, 2.2, 10], [2, 1.0, -8], 42], [[-3.2, 2.0, 7.5], [3.5, 1.2, -3], 42]);
      if (t > T && t < T + 0.4) S.shake(t, 0.12);
    } };
  },
  ringing() {
    const S = new Shot({ shadow: 8 }); city(S, { lamps: false });
    let tt = 0; const ph = S.phone((x, w, h) => { x.fillStyle = "#0d6efd"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; x.textAlign = "center"; x.font = `900 ${w * 0.15}px Montserrat, Arial`; x.fillText("MOM", w / 2, h * 0.3); x.font = `800 ${w * 0.09}px Montserrat, Arial`; x.fillText("calling…", w / 2, h * 0.4); x.fillStyle = "#2ecc71"; x.beginPath(); x.arc(w * 0.3, h * 0.8, w * 0.12, 0, 7); x.fill(); x.fillStyle = "#e74c3c"; x.beginPath(); x.arc(w * 0.7, h * 0.8, w * 0.12, 0, 7); x.fill(); }, { x: 0, y: 0.03, z: 0, s: 2.6 });
    S.add(ph); ph.rotation.set(-Math.PI / 2, 0, 0.4);
    const bag = S.box(0.5, 0.6, 0.25, "#e17055", { x: 0.9, z: -0.6, ry: 0.4, rz: 0, r: 0.05 }); bag.rotation.z = 1.4; bag.position.y = 0.12;
    const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 8, 48), new THREE.MeshBasicMaterial({ color: "#7cc8ff", transparent: true })); m.rotation.x = -Math.PI / 2; m.position.y = 0.05; S.add(m); return m; });
    const glow = S.light("#5aa9ff", 3, 3, { y: 0.4 });
    return { S, update(t, d) {
      ph.screen.draw(t); const buzz = Math.sin(t * 9) > 0; ph.position.x = buzz ? 0.006 * Math.sin(t * 90) : 0;
      rings.forEach((r, i) => { const k = ((t * 0.9 + i / 3) % 1); r.scale.setScalar(1 + k * 3); r.material.opacity = 1 - k; });
      S.move(t / d, [[0.6, 0.55, 1.6], [0, 0.0, -0.1], 40], [[0.3, 0.9, 1.4], [0, 0.0, -0.2], 34]);
    } };
  },
  powerPlant() {
    const S = new Shot({ shadow: 10, sky: ["#1b1f27", "#2a303b"], fogNear: 12, fogFar: 40 }); interior(S, 14, 14, "#4c566a", "#3b4252", 5); S.hemi.intensity = 1.2; S.exposure = 1.3;
    const scr = []; for (let k = 0; k < 4; k++) { const x = (k - 1.5) * 2.8; S.box(2.4, 1.0, 1.0, "#4c566a", { x, z: -3, r: 0.06 }); scr.push(S.screen(2.2, 1.0, (c, w, h, t) => { const al = Math.sin(t * 10 + k) > 0; c.fillStyle = al ? "#a4161a" : "#2b0a0a"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.textAlign = "center"; c.font = `900 ${h * 0.2}px Montserrat, Arial`; c.fillText("⚠ NO OPERATOR", w / 2, h * 0.45); c.font = `800 ${h * 0.13}px Montserrat, Arial`; c.fillText("SHUTDOWN " + Math.max(0, 9 - Math.floor(t * 4)), w / 2, h * 0.72); }, { x, y: 1.9, z: -3.45, rx: 0, res: 256 })); S.box(2.3, 1.15, 0.1, "#2e3440", { x, y: 1.35, z: -3.52, r: 0.03 }); }
    const chairs = []; for (let k = 0; k < 3; k++) { const g = S.group({ x: (k - 1) * 2.8, z: -1.5 }); S.box(0.6, 0.1, 0.6, "#222", { y: 0.5 }, g); S.box(0.6, 0.8, 0.1, "#222", { y: 0.55, z: 0.28 }, g); S.cyl(0.04, 0.04, 0.5, "#888", {}, g); chairs.push(g); }
    const beacons = [-5, 5].map((x) => { const g = S.group({ x, y: 4.2, z: -6.5 }); S.cyl(0.25, 0.25, 0.3, "#ff2020", { emissive: "#ff2020", ei: 2, shadow: false }, g); const l = new THREE.SpotLight("#ff2020", 80, 25, 0.5, 0.5); l.position.set(0, 0.2, 0); g.add(l); g.add(l.target); l.target.position.set(0, -2, 4); return g; });
    return { S, update(t, d) {
      scr.forEach((s) => s.draw(t)); chairs[1].rotation.y = t * 0.8;
      beacons.forEach((b, i) => (b.rotation.y = t * 6 + i * Math.PI));
      S.move(t / d, [[-3.5, 2.8, 7.5], [0, 1.5, -3], 46], [[3, 2.6, 7], [0, 1.5, -3], 46]);
    } };
  },
  zooStreet() {
    const S = new Shot({ shadow: 16 }); city(S); [S.car("#3498db", { x: 2.2, z: -6, ry: 0.3 }), S.car("#ecf0f1", { x: -2.6, z: -14, ry: -0.2 }), S.car("#e74c3c", { x: 2.6, z: -22 })];
    const an = [["Lion", -0.3, -5, 1.2], ["Elephant", 1.0, -11, 0.9], ["Zebra", -2.6, -7, 1.3], ["Zebra", -1.6, -9, 1.3]].map(([n, x, z, sp], i) => { const a = S.char(n, { x, z }); a.z0 = z; a.sp = sp; return a; });
    return { S, update(t, d) {
      an.forEach((a, i) => { a.root.position.z = a.z0 + a.sp * t; a.pose("walk", t * 1.1 + i * 0.3); });
      S.move(t / d, [[1.4, 1.0, 7.5], [0, 1.4, -6], 44], [[0.8, 1.1, 6.0], [0, 1.4, -6], 44]);
    } };
  },
  dogPack() {
    const S = new Shot({ shadow: 12 }); city(S, { lamps: false });
    const dogs = []; for (let k = 0; k < 9; k++) { const n = k % 3 === 2 ? "Chihuahua" : k % 3 === 1 ? "Fox" : "Corgi"; const a = S.char(n, { x: (rnd(k) - 0.5) * 2.2, z: -2 - k * 0.8 - rnd(k * 3) }); a.z0 = a.root.position.z; dogs.push(a); }
    return { S, update(t, d) {
      dogs.forEach((a, i) => { a.root.position.z = a.z0 + 3.2 * t; a.pose("walk", t * 2.2 + i * 0.37); a.root.position.y = Math.abs(Math.sin(t * 9 + i)) * 0.05; });
      const cz = 3.2 * t; S.view([0.2, 0.7, 3.2 + cz], [0, 0.35, -3 + cz], 42);
    } };
  },
  trees() {
    const S = new Shot({ shadow: 18, sky: ["#6fb7e0", "#d7f0e0"] }); city(S, { colors: ["#9aa58f", "#8f9a8a", "#a5a08f"], lamps: false }); S.groundMesh.material = mat("#5f8f45");
    const tr = []; for (let k = 0; k < 10; k++) tr.push(S.tree({ x: (rnd(k) - 0.5) * 7, z: 2 - k * 4, size: 1.2 + rnd(k * 3) * 0.6, color: k % 2 ? "#3fae4a" : "#5cbf3c" }));
    const cracks = []; for (let k = 0; k < 10; k++) cracks.push(S.box(0.15, 0.03, 2.5, "#1e2329", { x: tr[k].position.x, z: tr[k].position.z, ry: rnd(k) * 3, r: 0, shadow: false }));
    const vines = []; for (let k = 0; k < 12; k++) { const s = k % 2 ? 1 : -1; vines.push(S.box(1.2, 14, 0.3, "#3d9a3a", { x: s * 8.4, z: 12 - k * 8, ry: Math.PI / 2, r: 0.1 })); }
    const bushes = []; for (let k = 0; k < 8; k++) bushes.push(S.bush({ x: (rnd(k * 5) - 0.5) * 8, z: -k * 5, size: 1.3 }));
    const cars = [S.car("#7f8c8d", { x: 2.4, z: -5 }), S.car("#95a5a6", { x: -2.2, z: -15, ry: 0.4 })];
    return { S, update(t, d) {
      tr.forEach((g, k) => g.scale.setScalar(Math.max(1e-3, back(seg(t, 0.05 + k * 0.1, 0.6 + k * 0.1)))));
      cracks.forEach((c, k) => c.scale.set(1, 1, Math.max(1e-3, seg(t, k * 0.1, 0.3 + k * 0.1))));
      vines.forEach((v, k) => { const s = Math.max(1e-3, easeOut(seg(t, 0.2 + k * 0.05, 1.6 + k * 0.05))); v.scale.y = s; v.position.y = 7 * s; });
      bushes.forEach((b, k) => b.scale.setScalar(Math.max(1e-3, back(seg(t, 0.3 + k * 0.08, 0.9 + k * 0.08)))));
      S.move(t / d, [[0, 1.5, 9], [0, 2, -10], 44], [[0, 5, 12], [0, 3, -10], 44]);
    } };
  },
  towerFall() {
    const S = new Shot({ shadow: 30, sky: ["#6fb7e0", "#d7f0e0"], ground: "#4f8f3a", fogNear: 40, fogFar: 140 });
    for (let k = 0; k < 40; k++) S.tree({ x: (rnd(k) - 0.5) * 70, z: -rnd(k * 3) * 50 + 5, size: 1.5 + rnd(k * 7) });
    for (let k = 0; k < 8; k++) S.building(8, 14 + rnd(k) * 20, 8, "#8f9a8a", { x: -30 + k * 9 + (k > 3 ? 9 : 0), z: -30 - rnd(k) * 10, seed: k, roof: false });
    const pivot = S.group({ x: 4, z: -12 }); const tw = new THREE.Group(); pivot.add(tw); const twm = S.building(7, 36, 7, "#9aa58f", { seed: 3, roof: false }); S.scene.remove(twm); tw.add(twm); twm.position.set(0, 18, -3.5);
    for (let k = 0; k < 5; k++) S.box(1.0, 10 + k * 3, 0.3, "#3d9a3a", { x: -2.6 + k * 1.3, y: 0, z: 0.1, r: 0.1 }, tw);
    const dust = S.burst({ n: 30, at: [4, 1, 12], speed: 6, up: 0.4, spread: 0.3, gravity: -0.3, color: "#c9b79c", round: true, size: 1.2, grow: 2, fade: true, life: 3, flat: true });
    const birds = S.burst({ n: 12, at: [-10, 25, -12], speed: 6, up: 0.6, spread: 0.2, gravity: -0.5, color: "#2d3436", size: 0.25, life: 3 });
    const T = 1.3;
    return { S, update(t, d) {
      const k = easeIn(seg(t, 0.15, T)); pivot.rotation.x = k * Math.PI / 2 * 0.98; dust.position.set(0, 0, 0); dust.update(t - T); birds.update(t - 0.2);
      S.move(t / d, [[26, 10, 44], [2, 10, -2], 46], [[24, 8, 40], [2, 6, 4], 46]);
      if (t > T && t < T + 0.6) S.shake(t, 0.5 * (1 - seg(t, T, T + 0.6)));
    } };
  },
  greenHills() {
    const S = new Shot({ shadow: 60, ground: "#4caf50", sky: ["#5aaee6", "#d4f1ff"], fogNear: 60, fogFar: 220 });
    for (let i = -6; i <= 6; i++) for (let j = -8; j <= 2; j++) { if (rnd(i * 3 + j * 17) < 0.2) continue; const h = 4 + rnd(i * 5 + j) * 12; const m = S.ball(5, rnd(i + j * 7) > 0.5 ? "#4caf50" : "#66bb6a", { x: i * 10, y: 0, z: j * 10, detail: 2, flat: true, rough: 0.7 }); m.scale.set(1, h / 5, 1); if (rnd(i * 9 + j) > 0.85) S.box(2, h + 2, 2, "#9aa58f", { x: i * 10 + 1, z: j * 10, r: 0.1 }); }
    for (let k = 0; k < 80; k++) S.tree({ x: (rnd(k) - 0.5) * 120, z: -rnd(k * 3) * 100 + 20, size: 1.5 + rnd(k * 7) });
    const river = S.plane(8, 200, null, { rx: -Math.PI / 2, y: 0.05, x: 5, z: -50, material: mat("#3d9be9", { rough: 0.1, metal: 0.2 }) }); river.rotation.z = 0.3;
    return { S, update(t, d) { S.move(t / d, [[0, 45, 60], [0, 0, -20], 45], [[10, 38, 40], [0, 0, -30], 45]); } };
  },
  pyramids() {
    const S = new Shot({ shadow: 40, ground: "#e3b778", sky: ["#f49e4c", "#ffe2b8"], sunPos: [-20, 8, -10], fogNear: 60, fogFar: 220 });
    const pm = mat("#d9a066", { rough: 0.85 });
    [[0, -30, 18], [-24, -44, 14], [22, -55, 11]].forEach(([x, z, s]) => { const p = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.3, 4), pm); p.position.set(x, s * 0.65, z); p.rotation.y = Math.PI / 4; p.castShadow = true; p.receiveShadow = true; S.add(p); });
    for (let k = 0; k < 14; k++) S.ball(8, "#e8bf86", { x: (rnd(k) - 0.5) * 140, y: -4, z: -rnd(k * 3) * 120 + 10, rough: 0.9 }).scale.set(2, 0.6, 1.2);
    const sun = S.ball(8, "#fff1c1", { x: -60, y: 22, z: -180, emissive: "#ffd27a", ei: 2, shadow: false });
    const eagle = S.char("Eagle", { y: 12, z: -10, ry: Math.PI / 2, h: 1.6 });
    return { S, update(t, d) {
      eagle.root.position.set(-20 + t * 9, 14 + Math.sin(t * 2), -12); eagle.pose("walk", t * 1.4);
      S.move(t / d, [[6, 5, 48], [0, 12, -35], 44], [[3, 6, 36], [0, 13, -35], 44]);
    } };
  },
  lonelyDog() {
    const S = new Shot({ shadow: 8, sky: ["#f08a5d", "#ffd59a"], sunPos: [-10, 6, 6] }); city(S, { colors: ["#9aa58f", "#8f9a8a", "#a5a08f"], lamps: false }); S.groundMesh.material = mat("#5f8f45");
    for (let k = 0; k < 10; k++) S.bush({ x: (rnd(k) - 0.5) * 8, z: -2 - k * 3, size: 1 + rnd(k) });
    for (let k = 0; k < 8; k++) S.tree({ x: (k % 2 ? 1 : -1) * (3 + rnd(k) * 2), z: -4 - k * 5, size: 1.4 });
    const dog = S.char("Corgi", { z: 0, h: 0.75 });
    return { S, update(t, d) {
      dog.pose("idle", t); dog.root.rotation.z = 0.12 * Math.sin(seg(t, 0.8, 1.4) * Math.PI);
      S.move(t / d, [[0, 0.7, 4], [0, 0.4, 0], 40], [[0, 0.55, 1.9], [0, 0.45, 0], 36]);
    } };
  },
};
