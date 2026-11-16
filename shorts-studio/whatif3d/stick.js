// 2D stick man living in the 3D world: drawn fresh every frame on a canvas that always faces the camera.
// Poses are joint angles (0 = limb hanging straight down, + = toward the way he faces), so every move is animated.
import { THREE, canvasTex, lerp, clamp, rnd, CFG } from "./engine.js";

const PX = 200, CW = 640, CH = 640; // 200 px per metre, canvas covers 3.2 m x 3.2 m
const HIP = 0.92, THIGH = 0.46, SHIN = 0.46, TORSO = 0.55, UPPER = 0.36, FORE = 0.34, HEAD = 0.2;

export const POSES = {
  stand: () => ({}),
  idle: (t) => ({ la: [0.15 + 0.04 * Math.sin(t * 2), 0.2], ra: [0.15 + 0.04 * Math.sin(t * 2 + 1), 0.2], bob: 0.01 * Math.sin(t * 2) }),
  walk: (t) => { const s = Math.sin(t * 7); return { ll: [0.5 * s, s > 0 ? 0 : -0.5 * s], rl: [-0.5 * s, s < 0 ? 0 : 0.5 * s], la: [-0.45 * s, 0.3], ra: [0.45 * s, 0.3], bob: 0.03 * Math.abs(Math.cos(t * 7)), lean: 0.06 }; },
  run: (t) => { const s = Math.sin(t * 13); return { ll: [0.9 * s, s > 0 ? -0.2 : -1.3 * -s], rl: [-0.9 * s, s < 0 ? -0.2 : -1.3 * s], la: [-0.9 * s, 1.4], ra: [0.9 * s, 1.4], bob: 0.06 * Math.abs(Math.cos(t * 13)), lean: 0.3, face: { mouth: "open" } }; },
  sit: (t) => ({ ll: [1.55, -1.55], rl: [1.5, -1.5], sit: true, la: [0.5, 0.6], ra: [0.5, 0.6], bob: 0.005 * Math.sin(t * 2) }),
  eat: (t) => { const k = 0.5 - 0.5 * Math.cos(t * 6); return { ra: [lerp(0.5, 2.3, k), lerp(0.6, 2.2, k)], la: [0.5, 0.6], hold: "bar", face: { mouth: k > 0.8 ? "open" : "chew" } }; },
  shovel: (t) => { const a = 0.5 - 0.5 * Math.cos(t * 14), b = 0.5 - 0.5 * Math.cos(t * 14 + Math.PI); return { ra: [lerp(0.6, 2.3, a), lerp(0.8, 2.2, a)], la: [lerp(0.6, 2.3, b), lerp(0.8, 2.2, b)], hold: "both", face: { mouth: "chew", eyes: "wide" }, bob: 0.02 * Math.sin(t * 28) }; },
  shocked: (t) => ({ la: [2.6, 0.4], ra: [2.6, 0.4], face: { mouth: "O", eyes: "wide" }, bob: 0.02 * Math.abs(Math.sin(t * 20)) }),
  shake: (t) => ({ la: [0.4 + 0.2 * Math.sin(t * 40), 1.2], ra: [0.4 + 0.2 * Math.sin(t * 43), 1.2], jitter: 0.025, face: { eyes: "spiral", mouth: "grin" } }),
  sick: (t) => ({ la: [0.9, 1.6], ra: [0.2, 0.2], lean: 0.2 + 0.05 * Math.sin(t * 3), face: { mouth: "sick", eyes: "tired", green: true } }),
  lie: (t) => ({ rot: -Math.PI / 2, la: [3.0, 0], ra: [0.1, 0], ll: [0.1, 0], rl: [-0.1, 0], face: { eyes: "x", mouth: "frown" } }),
  phone: (t) => ({ ra: [0.75, 1.75], la: [0.6, 1.5], hold: "phone", face: { look: 0.5 } }),
  call: (t) => ({ ra: [2.3, 2.7], la: [0.2, 0.3], hold: "phone", face: { mouth: "chew", look: 0.4 } }),
  angry: (t) => ({ la: [2.3 + 0.35 * Math.sin(t * 13), 0.5], ra: [2.3 + 0.35 * Math.sin(t * 13 + 2), 0.5], jitter: 0.008, face: { eyes: "angry", mouth: "open" } }),
  shrug: (t) => ({ la: [0.75, 1.3], ra: [-0.75, -1.3], bob: 0.03 * Math.abs(Math.sin(t * 3)), face: { mouth: "frown", eyes: "open", look: 0 } }),
  think: (t) => ({ ra: [0.6, 2.4], la: [0.4, 1.6], face: { look: 0.6, mouth: "flat" } }),
  scratch: (t) => ({ ra: [2.8, 1.9 + 0.3 * Math.sin(t * 14)], la: [0.15, 0.2], face: { mouth: "frown", look: 0.2 } }),
  hit: (t) => ({ lean: -0.35, la: [2.2, 0.4], ra: [2.0, 0.6], face: { eyes: "wide", mouth: "O" } }),
  nope: (t) => ({ la: [0.2, 0.3], ra: [0.2, 0.3], face: { mouth: "frown", look: 0.7 * Math.sin(t * 12) } }),
  cheer: (t) => ({ la: [2.9 + 0.15 * Math.sin(t * 10), 0.2], ra: [2.9 + 0.15 * Math.sin(t * 10 + 1), 0.2], bob: 0.08 * Math.abs(Math.sin(t * 6)), face: { mouth: "grin" } }),
  talk: (t) => ({ ra: [0.9 + 0.3 * Math.sin(t * 5), 1.1], la: [0.2, 0.3], face: { mouth: "chew" } }),
  point: (t) => ({ ra: [1.6, 0], la: [0.2, 0.3], face: { mouth: "open" } }),
  fall: (t) => mix(POSES.hit(t), POSES.lie(t), clamp(t / 0.55)),
  wave: (t) => ({ ra: [2.7, 0.5 + 0.4 * Math.sin(t * 9)], la: [0.15, 0.2], face: { mouth: "smile" } }),
};
const lerpArr = (a, b, k) => (a && b ? [lerp(a[0], b[0], k), lerp(a[1], b[1], k)] : (k < 0.5 ? a : b));
function fill(p) { return { ll: [0.08, 0], rl: [-0.08, 0], la: [0.12, 0.15], ra: [0.12, 0.15], lean: 0, bob: 0, rot: 0, ...p, face: { eyes: "open", mouth: "smile", ...(p.face || {}) } }; }
export function mix(a, b, k) {
  a = fill(a); b = fill(b); const o = {};
  for (const key of ["ll", "rl", "la", "ra"]) o[key] = lerpArr(a[key], b[key], k);
  for (const key of ["lean", "bob", "rot", "jitter"]) o[key] = lerp(a[key] || 0, b[key] || 0, k);
  o.face = k < 0.5 ? a.face : b.face; o.hold = k < 0.5 ? a.hold : b.hold; o.sit = k < 0.5 ? a.sit : b.sit; return o;
}

export class Stick {
  constructor(S, o = {}) {
    this.S = S; this.tex = canvasTex(CW, CH, () => {});
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(CW / PX, CH / PX), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, alphaTest: 0.02 }));
    this.mesh.renderOrder = 5; this.root = new THREE.Group(); this.root.add(this.mesh); this.mesh.position.y = CH / PX / 2 - 0.15; S.scene.add(this.root);
    const sh = canvasTex(128, 64, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); g.addColorStop(0, "rgba(0,0,0,.45)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false })); this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.012; S.scene.add(this.shadow);
    this.ink = o.ink || "#2b2118"; this.shirt = o.shirt || "#e8833a"; this.hair = o.hair === undefined ? "#6b4226" : o.hair; this.shoes = o.shoes || "#3a2a20"; this.coat = o.coat; this.badge = o.badge; this.dir = 1; this.scale = o.scale || 1;
    (S.sticks || (S.sticks = [])).push(this);
    this.at(o.x || 0, o.y || 0, o.z || 0); this.pose("idle", 0);
  }
  at(x, y, z) { this.root.position.set(x, y, z); return this; }
  // draw a pose: name + time, or a pose object; optional blend to another
  pose(p, t = 0, o = {}) {
    let P = typeof p === "string" ? POSES[p](t) : p;
    if (o.to) P = mix(P, typeof o.to === "string" ? POSES[o.to](o.tb ?? t) : o.to, o.w ?? 1); else P = fill(P);
    if (o.face) P.face = { ...P.face, ...o.face };
    this.P = P; this.t = t; return this;
  }
  draw() {
    const P = this.P, t = this.t, { x } = this.tex.userData; x.clearRect(0, 0, CW, CH);
    const sc = PX * this.scale; x.save(); x.translate(CW / 2, CH - 0.15 * PX); x.scale(this.dir * this.scale, this.scale);
    if (P.jitter) x.translate((rnd(Math.floor(t * 30)) - 0.5) * P.jitter * PX * 2, (rnd(Math.floor(t * 30) + 7) - 0.5) * P.jitter * PX);
    const hipY = -(P.sit ? HIP - 0.42 : HIP) * PX + (P.bob || 0) * -PX;
    x.translate(0, hipY); if (P.rot) { x.translate(0, -hipY - 0.12 * PX); x.rotate(P.rot); }
    const pt = (ox, oy, a, len) => [ox + Math.sin(a) * len * PX, oy + Math.cos(a) * len * PX];
    const lean = P.lean || 0, neck = pt(0, 0, Math.PI + lean, TORSO), head = pt(neck[0], neck[1], Math.PI + lean * 1.2, HEAD + 0.06);
    const limb = (base, A, l1, l2, back) => { const k = pt(base[0], base[1], A[0] + (back ? 0 : 0), l1); const e = pt(k[0], k[1], A[0] + A[1], l2); return [base, k, e]; };
    // legs bend knee backwards (negative second angle), arms bend elbow forwards
    const L = [limb([0, 0], P.ll, THIGH, SHIN), limb([0, 0], P.rl, THIGH, SHIN)];
    const sh = pt(0, 0, Math.PI + lean, TORSO - 0.08);
    const A = [limb(sh, [P.la[0] + lean, P.la[1]], UPPER, FORE), limb(sh, [P.ra[0] + lean, P.ra[1]], UPPER, FORE)];
    const stroke = (pts, w, c) => { x.beginPath(); x.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) x.lineTo(...pts[i]); x.lineWidth = w; x.strokeStyle = c; x.lineCap = "round"; x.lineJoin = "round"; x.stroke(); };
    const INK = this.ink, W = 0.042 * PX, SKIN = "#fbf6ea", shirt = this.shirt;
    const shoe = (l) => { const [, k, e] = l; const a = Math.atan2(e[1] - k[1], e[0] - k[0]) - Math.PI / 2; x.save(); x.translate(...e); x.rotate(a); x.beginPath(); x.ellipse(9, 2, 17, 9, 0, 0, 7); x.fillStyle = this.shoes; x.fill(); x.lineWidth = 4; x.strokeStyle = INK; x.stroke(); x.restore(); };
    const hand = (l) => { x.beginPath(); x.arc(...l[2], 9, 0, 7); x.fillStyle = SKIN; x.fill(); x.lineWidth = 4; x.strokeStyle = INK; x.stroke(); };
    const arm = (l) => { stroke(l, W, INK); const sl = [l[0], [lerp(l[0][0], l[1][0], 0.75), lerp(l[0][1], l[1][1], 0.75)]]; stroke(sl, 0.1 * PX + 8, INK); stroke(sl, 0.1 * PX, shirt); hand(l); };
    // back arm, legs, jacket, front arm
    arm(A[0]);
    for (const l of L) { stroke(l, W, INK); shoe(l); }
    const dx = Math.sin(Math.PI + lean), dy = Math.cos(Math.PI + lean), nx = -dy, ny = dx; // torso direction + its normal
    const top = [neck[0] - dx * 4, neck[1] - dy * 4], bot = [-dx * -0.1 * PX, -dy * -0.1 * PX], wt = 0.15 * PX, wb = 0.18 * PX;
    x.beginPath(); x.moveTo(top[0] + nx * wt, top[1] + ny * wt); x.quadraticCurveTo(top[0], top[1] - dy * 10, top[0] - nx * wt, top[1] - ny * wt); x.lineTo(bot[0] - nx * wb, bot[1] - ny * wb); x.quadraticCurveTo(bot[0] + dx * -8, bot[1] + dy * -8, bot[0] + nx * wb, bot[1] + ny * wb); x.closePath();
    x.fillStyle = shirt; x.fill(); x.lineWidth = 6; x.strokeStyle = INK; x.stroke();
    if (this.coat) { x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(bot[0], bot[1]); x.lineWidth = 4; x.stroke(); }
    if (this.badge) { const m = [lerp(top[0], bot[0], 0.35) + nx * 0.06 * PX, lerp(top[1], bot[1], 0.35) + ny * 0.06 * PX]; x.fillStyle = "#e3242b"; x.fillRect(m[0] - 4, m[1] - 12, 8, 24); x.fillRect(m[0] - 12, m[1] - 4, 24, 8); }
    arm(A[1]);
    // things in hands
    const bar = (hp, ang) => { x.save(); x.translate(...hp); x.rotate(ang); x.fillStyle = "#5a2e14"; x.fillRect(-10, -26, 20, 52); x.fillStyle = "#c0262d"; x.fillRect(-11, -4, 22, 30); x.fillStyle = "#ffd23a"; x.fillRect(-11, 6, 22, 5); x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(-11, -26, 22, 52); x.restore(); };
    if (P.hold === "bar" || P.hold === "both") bar(A[1][2], 0.4);
    if (P.hold === "both") bar(A[0][2], -0.3);
    if (P.hold === "phone") { x.save(); x.translate(...A[1][2]); x.rotate(-0.25); x.fillStyle = INK; x.beginPath(); x.roundRect(-11, -30, 22, 40, 5); x.fill(); x.fillStyle = this.screen || "#7fd3ff"; x.fillRect(-7, -26, 14, 30); x.restore(); }
    // head
    const hr = HEAD * PX * 1.25, f = P.face; x.save(); x.translate(head[0], head[1] - hr * 0.2);
    x.beginPath(); x.arc(0, 0, hr, 0, 7); x.fillStyle = f.green ? "#cfe8a9" : SKIN; x.fill(); x.lineWidth = 6; x.strokeStyle = INK; x.stroke();
    if (this.hair) { x.beginPath(); x.arc(0, 0, hr + 1, Math.PI * 1.02, Math.PI * 1.98); x.quadraticCurveTo(hr * 0.75, -hr * 0.15, hr * 0.15, -hr * 0.42); x.quadraticCurveTo(-hr * 0.5, -hr * 0.25, -hr * 1.0, -hr * 0.02); x.closePath(); x.fillStyle = this.hair; x.fill(); x.lineWidth = 5; x.stroke(); }
    const lx = (f.look ?? 0.35) * hr * 0.3, ey = hr * 0.02, ex = hr * 0.3;
    x.fillStyle = INK; x.strokeStyle = INK; x.lineWidth = 5; x.lineCap = "round";
    if (!f.green) { x.fillStyle = "rgba(255,140,140,.35)"; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * hr * 0.55 + lx, hr * 0.32, 10, 6, 0, 0, 7); x.fill(); } x.fillStyle = INK; }
    for (const s of [-1, 1]) { const cx = s * ex + lx;
      if (f.eyes === "open") { x.beginPath(); x.ellipse(cx, ey, 6, 8, 0, 0, 7); x.fill(); x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 9, ey - 17 - (s * 0)); x.lineTo(cx + 9, ey - 18); x.stroke(); }
      else if (f.eyes === "wide") { x.beginPath(); x.arc(cx, ey, 12, 0, 7); x.fillStyle = "#fff"; x.fill(); x.lineWidth = 4; x.stroke(); x.fillStyle = INK; x.beginPath(); x.arc(cx + 2, ey, 5, 0, 7); x.fill(); }
      else if (f.eyes === "closed" || f.eyes === "tired") { x.lineWidth = 4; x.beginPath(); x.arc(cx, ey + (f.eyes === "tired" ? 4 : -2), 8, f.eyes === "tired" ? Math.PI : 0.2, f.eyes === "tired" ? 2 * Math.PI : Math.PI - 0.2); x.stroke(); }
      else if (f.eyes === "angry") { x.beginPath(); x.ellipse(cx, ey + 2, 6, 7, 0, 0, 7); x.fill(); x.lineWidth = 5; x.beginPath(); x.moveTo(cx - s * 12, ey - 20); x.lineTo(cx + s * 8, ey - 9); x.stroke(); }
      else if (f.eyes === "x") { x.beginPath(); x.moveTo(cx - 7, ey - 7); x.lineTo(cx + 7, ey + 7); x.moveTo(cx + 7, ey - 7); x.lineTo(cx - 7, ey + 7); x.stroke(); }
      else if (f.eyes === "spiral") { x.beginPath(); for (let a = 0; a < 12; a += 0.3) x.lineTo(cx + Math.cos(a + t * 12) * a, ey + Math.sin(a + t * 12) * a); x.lineWidth = 3; x.stroke(); x.lineWidth = 5; } }
    const my = hr * 0.42, mx = lx * 0.7, brown = f.brown ? "#5a2e14" : INK;
    x.strokeStyle = brown; x.fillStyle = brown; x.lineWidth = 5;
    if (f.mouth === "smile") { x.beginPath(); x.arc(mx, my - 9, 12, 0.35, Math.PI - 0.35); x.stroke(); }
    else if (f.mouth === "grin") { x.beginPath(); x.arc(mx, my - 12, 18, 0.1, Math.PI - 0.1); x.closePath(); x.fillStyle = "#fff"; x.fill(); x.stroke(); }
    else if (f.mouth === "frown") { x.beginPath(); x.arc(mx, my + 10, 11, Math.PI + 0.45, -0.45); x.stroke(); }
    else if (f.mouth === "O") { x.beginPath(); x.ellipse(mx, my, 8, 12, 0, 0, 7); x.fill(); }
    else if (f.mouth === "open") { x.beginPath(); x.ellipse(mx, my - 2, 12, 9, 0, 0, 7); x.fill(); }
    else if (f.mouth === "chew") { const o = 3 + 6 * Math.abs(Math.sin(t * 14)); x.beginPath(); x.ellipse(mx, my - 2, 11, o, 0, 0, 7); x.fill(); if (f.brown) { x.beginPath(); x.ellipse(mx - 14, my + 4, 6, 4, 0, 0, 7); x.fill(); } }
    else if (f.mouth === "flat") { x.beginPath(); x.moveTo(mx - 9, my - 2); x.lineTo(mx + 9, my - 2); x.stroke(); }
    else if (f.mouth === "sick") { x.beginPath(); for (let i = -14; i <= 14; i += 2) x.lineTo(mx + i, my + Math.sin(i * 0.6 + t * 6) * 3); x.stroke(); }
    if (f.sweat) { x.fillStyle = "#6ec6ff"; for (const s of [1]) { const yy = -hr * 0.4 + ((t * 0.8) % 1) * hr * 0.8; x.beginPath(); x.moveTo(s * hr * 0.9, yy - 10); x.quadraticCurveTo(s * hr * 0.9 + 9, yy + 6, s * hr * 0.9, yy + 8); x.quadraticCurveTo(s * hr * 0.9 - 9, yy + 6, s * hr * 0.9, yy - 10); x.fill(); } }
    x.restore(); x.restore();
    this.tex.needsUpdate = true;
  }
  sync(cam) { // face the camera (stays upright) + keep shadow under the feet
    const p = this.root.position, face = Math.atan2(cam.position.x - p.x, cam.position.z - p.z); this.mesh.rotation.y = face - this.root.rotation.y;
    if (this.autoDir) { const ry = this.root.rotation.y, f = [Math.sin(ry), Math.cos(ry)], r = [Math.cos(face), -Math.sin(face)], d = f[0] * r[0] + f[1] * r[1]; if (Math.abs(d) > 0.2) this.dir = d > 0 ? 1 : -1; }
    this.shadow.position.set(p.x, p.y + 0.012, p.z); this.shadow.scale.setScalar(this.P && this.P.rot ? 2 : 1); this.shadow.visible = this.root.visible;
    this.draw();
  }
}

// ── stand-in for the 3D characters: same calls (pose("Walk", t), root, at...), drawn as stick people ──
const OUTFIT = {
  SalesRep: { shirt: "#e8833a", hair: "#6b4226" }, ItEngineer: { shirt: "#4a90d9", hair: "#3b2a1e" }, OfficeIntern: { shirt: "#f1f1ee", hair: "#8a5a32" },
  Accountant: { shirt: "#7d8b6a", hair: "#d8d8d8" }, Receptionist: { shirt: "#c94f7c", hair: "#2b2118" }, SecurityGuard: { shirt: "#34495e", hair: "#2b2118" },
  CompanyCeo: { shirt: "#3d3d46", hair: "#e0e0e0" }, Cashier: { shirt: "#d62839", hair: "#5a3a22" }, Schoolkid: { shirt: "#2ecc71", hair: "#3b2a1e", scale: 0.72 },
  GrandmaShopper: { shirt: "#9b59b6", hair: "#e6e6e6" }, StockClerk: { shirt: "#27ae60", hair: "#6b4226" }, FoodCourier: { shirt: "#f1c40f", hair: "#2b2118" },
  OfficeLady: { shirt: "#1abc9c", hair: "#2b2118" }, WhiteCoatDoctor: { shirt: "#f4f4f2", coat: true, badge: true, hair: "#7a7a7a" }, WardNurse: { shirt: "#7ec8e3", badge: true, hair: "#c8a165" },
  Paramedic: { shirt: "#2e86de", badge: true }, AirTraveller: { shirt: "#e67e22", hair: "#c8a165" }, AirlineCaptain: { shirt: "#1f3a68", hair: "#3b2a1e" },
};
const CLIPS = { idle: "idle", walk: "walk", run: "run", text: "phone", call: "call", talkangry: "angry", attack: "angry", shrug: "shrug", think: "think", scratch: "scratch", sit: "sit",
  death: "fall", dead: "fall", hit: "hit", shake: "nope", cheer: "cheer", special: "wave", talkask: "talk", talk: "talk", point: "point", wave: "wave", type: "sit" };
class StickActor {
  constructor(S, name, p) {
    const o = OUTFIT[name] || {}; this.stick = new Stick(S, { ...o, x: p.x, y: p.y, z: p.z }); this.stick.scale = (o.scale || 0.9) * (p.h && p.h < 1.5 && !o.scale ? 0.8 : 1); this.stick.autoDir = true; this.root = this.stick.root; this.root.rotation.y = p.ry || 0; this.h = 1.7 * this.stick.scale; this.name = name;
    this.pose(p.clip || "idle", p.t || 0);
  }
  has() { return true; } dur() { return 1.2; } hand() { return null; } hold() { return null; }
  at(x, y, z, ry = 0) { this.root.position.set(x, y, z); this.root.rotation.y = ry; return this; }
  pose(c, t, o = {}) {
    const k = CLIPS[c.toLowerCase()] || "idle", kb = o.to ? CLIPS[o.to.toLowerCase()] || "idle" : null;
    const lying = Math.abs(this.root.rotation.x) > 0.5; if (lying) { this.root.rotation.x = 0; this.stick.pose("lie", t, { face: { eyes: "closed", mouth: "flat" } }); return this; }
    if (kb && o.w > 0) this.stick.pose(k, t * (o.speed || 1), { to: kb, tb: o.tb ?? t, w: o.w }); else this.stick.pose(k, t * (o.speed || 1));
    return this;
  }
}
CFG.makeStick = (S, name, p) => new StickActor(S, name, p);
