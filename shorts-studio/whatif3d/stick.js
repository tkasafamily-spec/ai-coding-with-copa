// 2D stick man living in the 3D world: drawn fresh every frame on a canvas that always faces the camera.
// Poses are joint angles (0 = limb hanging straight down, + = toward the way he faces), so every move is animated.
import { THREE, canvasTex, lerp, clamp, rnd } from "./engine.js";

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
    this.color = o.color || "#111"; this.badge = o.badge; this.dir = 1; this.scale = o.scale || 1;
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
    const body = [[0, 0], neck], W = 0.075 * PX;
    // white outline first so he pops off any background, then black
    for (const [w, c] of [[W + 10, "#fff"], [W, this.color]]) { [L[0], L[1], body, A[0], A[1]].forEach((p) => stroke(p, w, c)); }
    if (this.badge) { const m = pt(0, 0, Math.PI + lean, TORSO * 0.6); x.fillStyle = "#fff"; x.fillRect(m[0] - 16, m[1] - 16, 32, 32); x.fillStyle = "#e3242b"; x.fillRect(m[0] - 4, m[1] - 13, 8, 26); x.fillRect(m[0] - 13, m[1] - 4, 26, 8); }
    // things in hands
    const bar = (hp, ang) => { x.save(); x.translate(...hp); x.rotate(ang); x.fillStyle = "#5a2e14"; x.fillRect(-10, -26, 20, 52); x.fillStyle = "#c0262d"; x.fillRect(-11, -4, 22, 30); x.fillStyle = "#ffd23a"; x.fillRect(-11, 6, 22, 5); x.strokeStyle = "#fff"; x.lineWidth = 3; x.strokeRect(-11, -26, 22, 52); x.restore(); };
    if (P.hold === "bar" || P.hold === "both") bar(A[1][2], 0.4);
    if (P.hold === "both") bar(A[0][2], -0.3);
    // head
    const hr = HEAD * PX, f = P.face; x.save(); x.translate(...head);
    x.beginPath(); x.arc(0, 0, hr + 5, 0, 7); x.fillStyle = "#fff"; x.fill();
    x.beginPath(); x.arc(0, 0, hr - W / 2 + 2, 0, 7); x.fillStyle = f.green ? "#b8e986" : "#fff"; x.fill(); x.lineWidth = W; x.strokeStyle = this.color; x.stroke();
    const lx = (f.look ?? 0.35) * hr * 0.35, ey = -hr * 0.12, ex = hr * 0.36;
    x.fillStyle = this.color; x.strokeStyle = this.color; x.lineWidth = 6; x.lineCap = "round";
    for (const s of [-1, 1]) { const cx = s * ex + lx;
      if (f.eyes === "open") { x.beginPath(); x.ellipse(cx, ey, 7, 11, 0, 0, 7); x.fill(); }
      else if (f.eyes === "wide") { x.beginPath(); x.arc(cx, ey, 13, 0, 7); x.fillStyle = "#fff"; x.fill(); x.lineWidth = 4; x.stroke(); x.fillStyle = this.color; x.beginPath(); x.arc(cx + 2, ey, 6, 0, 7); x.fill(); }
      else if (f.eyes === "closed" || f.eyes === "tired") { x.beginPath(); x.arc(cx, ey + (f.eyes === "tired" ? 4 : 0), 9, f.eyes === "tired" ? Math.PI : 0.2, f.eyes === "tired" ? 2 * Math.PI : Math.PI - 0.2); x.stroke(); }
      else if (f.eyes === "x") { x.beginPath(); x.moveTo(cx - 8, ey - 8); x.lineTo(cx + 8, ey + 8); x.moveTo(cx + 8, ey - 8); x.lineTo(cx - 8, ey + 8); x.stroke(); }
      else if (f.eyes === "spiral") { x.beginPath(); for (let a = 0; a < 12; a += 0.3) x.lineTo(cx + Math.cos(a + t * 12) * a * 1.1, ey + Math.sin(a + t * 12) * a * 1.1); x.lineWidth = 3; x.stroke(); x.lineWidth = 6; } }
    const my = hr * 0.38, mx = lx * 0.6, brown = f.brown ? "#5a2e14" : this.color;
    x.strokeStyle = brown; x.fillStyle = brown; x.lineWidth = 6;
    if (f.mouth === "smile") { x.beginPath(); x.arc(mx, my - 10, 18, 0.3, Math.PI - 0.3); x.stroke(); }
    else if (f.mouth === "grin") { x.beginPath(); x.arc(mx, my - 14, 24, 0.1, Math.PI - 0.1); x.closePath(); x.fillStyle = "#fff"; x.fill(); x.stroke(); }
    else if (f.mouth === "frown") { x.beginPath(); x.arc(mx, my + 14, 16, Math.PI + 0.4, -0.4); x.stroke(); }
    else if (f.mouth === "O") { x.beginPath(); x.ellipse(mx, my, 11, 16, 0, 0, 7); x.fill(); }
    else if (f.mouth === "open") { x.beginPath(); x.ellipse(mx, my - 2, 16, 12, 0, 0, 7); x.fill(); }
    else if (f.mouth === "chew") { const o = 4 + 8 * Math.abs(Math.sin(t * 14)); x.beginPath(); x.ellipse(mx, my - 2, 15, o, 0, 0, 7); x.fill(); }
    else if (f.mouth === "sick") { x.beginPath(); for (let i = -18; i <= 18; i += 2) x.lineTo(mx + i, my + Math.sin(i * 0.5 + t * 6) * 4); x.stroke(); }
    if (f.sweat) { x.fillStyle = "#6ec6ff"; for (const s of [1]) { const yy = -hr * 0.4 + ((t * 0.8) % 1) * hr * 0.8; x.beginPath(); x.moveTo(s * hr * 0.9, yy - 10); x.quadraticCurveTo(s * hr * 0.9 + 9, yy + 6, s * hr * 0.9, yy + 8); x.quadraticCurveTo(s * hr * 0.9 - 9, yy + 6, s * hr * 0.9, yy - 10); x.fill(); } }
    x.restore(); x.restore();
    this.tex.needsUpdate = true;
  }
  sync(cam) { // face the camera (stays upright) + keep shadow under the feet
    const p = this.root.position; this.mesh.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z);
    this.shadow.position.set(p.x, p.y + 0.012, p.z); this.shadow.scale.setScalar(this.P && this.P.rot ? 2 : 1); this.shadow.visible = this.root.visible;
    this.draw();
  }
}
