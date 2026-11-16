// What If 3D engine: glossy cartoon 3D scenes with real animated characters (CC0 Gobkit models),
// procedural sets and props, deterministic animation (any frame can be drawn at any time).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
export { THREE };

export const GW = 720, GH = 1280;
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(GW, GH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

// ── helpers ─────────────────────────────────────────────
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);
export const easeIn = (x) => x * x * x;
export const back = (x) => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const V = (a) => new THREE.Vector3(...a);
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ── assets ──────────────────────────────────────────────
const GLTF = {};
const loader = new GLTFLoader();
export async function loadChars(names) {
  await Promise.all(names.filter((n) => !GLTF[n]).map((n) => new Promise((res, rej) => loader.load(`assets/${n}.glb`, (g) => {
    g.scene.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach((x) => { if (x.isMeshStandardMaterial) { x.roughness = 0.55; x.metalness = 0; } else if (x.color) { m.material = new THREE.MeshStandardMaterial({ map: x.map, color: x.color, roughness: 0.55 }); } }); } });
    GLTF[n] = g; res();
  }, undefined, rej))));
}
const ANIMAL_H = { Lion: 1.25, Elephant: 3.0, Zebra: 1.6, Fox: 0.55, Corgi: 0.6, Chihuahua: 0.42, Eagle: 0.7, Goose: 0.75 };

export class Actor {
  constructor(name, h) {
    const g = GLTF[name]; if (!g) throw new Error("not loaded: " + name);
    this.name = name; this.inner = SkeletonUtils.clone(g.scene); this.root = new THREE.Group(); this.root.add(this.inner);
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.inner), size = box.getSize(new THREE.Vector3());
    h = h || ANIMAL_H[name] || 1.7; const s = h / size.y;
    this.inner.scale.multiplyScalar(s); this.inner.position.y = -box.min.y * s;
    this.inner.position.x = -((box.min.x + box.max.x) / 2) * s; this.inner.position.z = -((box.min.z + box.max.z) / 2) * s;
    this.h = h; this.mixer = new THREE.AnimationMixer(this.inner); this.clips = {};
    g.animations.forEach((c) => (this.clips[c.name.toLowerCase()] = c));
  }
  has(c) { return !!this.clips[c.toLowerCase()]; }
  clip(c) { const k = c.toLowerCase(); return this.clips[k] || this.clips[{ idle: "idle", walk: "walk", run: "run", death: "dead", dead: "death" }[k]] || this.clips.idle; }
  // pose(clip, time) – or blend two clips: pose(a, ta, {to: b, tb, w})
  pose(c, t, o = {}) {
    this.mixer.stopAllAction();
    const set = (name, tt, w, loop) => { const cl = this.clip(name); const a = this.mixer.clipAction(cl); a.play(); a.setEffectiveWeight(w); a.time = loop ? ((tt % cl.duration) + cl.duration) % cl.duration : clamp(tt, 0, cl.duration - 0.001); };
    const loop = o.loop !== false, sp = o.speed || 1;
    if (o.to && o.w > 0) { set(c, t * sp, 1 - o.w, loop); set(o.to, (o.tb ?? t) * (o.speedB || 1), o.w, o.loopB !== false); } else set(c, t * sp, 1, loop);
    this.mixer.update(0); return this;
  }
  dur(c) { return this.clip(c).duration; }
  at(x, y, z, ry = 0) { this.root.position.set(x, y, z); this.root.rotation.y = ry; return this; }
  // attach a prop to the hand (side: 1 right, -1 left in the model's own space)
  hand(side = 1) {
    if (this._hands) return this._hands[side];
    this.inner.updateMatrixWorld(true); const bones = []; this.inner.traverse((b) => { if (b.isBone) bones.push(b); });
    const wp = (b) => b.getWorldPosition(new THREE.Vector3()).sub(this.root.position);
    const byX = bones.map((b) => [b, wp(b)]).filter(([, p]) => p.y > this.h * 0.2 && p.y < this.h * 0.75);
    byX.sort((a, b) => a[1].x - b[1].x);
    this._hands = { [-1]: byX[byX.length - 1]?.[0], 1: byX[0]?.[0] };
    return this._hands[side];
  }
  hold(prop, side = 1, off = [0, 0, 0], rot = [0, 0, 0], scale = 1) {
    const b = this.hand(side); if (!b) return;
    const ws = b.getWorldScale(new THREE.Vector3()).x / this.root.scale.x;
    const g = new THREE.Group(); g.add(prop); g.scale.setScalar(scale / ws); g.position.set(off[0] / ws, off[1] / ws, off[2] / ws); g.rotation.set(...rot); b.add(g); return g;
  }
}

// ── materials & geometry ───────────────────────────────
const MATS = {};
export function mat(color, o = {}) {
  const k = JSON.stringify([color, o]); if (MATS[k] && !o.unique) return MATS[k];
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.42, metalness: o.metal ?? 0, emissive: o.emissive || 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.opacity, opacity: o.opacity ?? 1, flatShading: !!o.flat, map: o.map || null, side: o.side || THREE.FrontSide });
  if (!o.unique) MATS[k] = m; return m;
}
const GEOS = {};
function rbox(w, h, d, r) { const k = [w, h, d, r].join(); return GEOS[k] || (GEOS[k] = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d)); }
export function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, x }; return t; }
function place(o, p = {}) { if (p.x !== undefined || p.y !== undefined || p.z !== undefined) o.position.set(p.x || 0, p.y || 0, p.z || 0); if (p.ry) o.rotation.y = p.ry; if (p.rx) o.rotation.x = p.rx; if (p.rz) o.rotation.z = p.rz; if (p.s) o.scale.setScalar(p.s); return o; }

const SKY = {};
function skyTex(top, bottom, stars) {
  const k = top + bottom + stars; if (SKY[k]) return SKY[k];
  return (SKY[k] = canvasTex(8, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom); x.fillStyle = g; x.fillRect(0, 0, w, h); }));
}
// window texture for buildings: base (walls+windows) and glow (lit windows only)
const WIN = {};
function windowTex(seed, kind) {
  const k = seed + kind; if (WIN[k]) return WIN[k];
  const cols = 6, rows = 12;
  const t = canvasTex(192, 384, (x, w, h) => {
    x.fillStyle = kind === "glow" ? "#000" : "#fff"; x.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const lit = rnd(seed * 100 + r * 13 + c * 7) > 0.45; const px = c * 32 + 7, py = r * 32 + 8;
      if (kind === "glow") { if (lit) { x.fillStyle = rnd(r * 5 + c + seed) > 0.3 ? "#ffd27a" : "#bfe6ff"; x.fillRect(px, py, 18, 18); } }
      else { x.fillStyle = "#3b4a5c"; x.fillRect(px, py, 18, 18); x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(px, py, 6, 18); }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return (WIN[k] = t);
}

// ── a shot (one scene + camera) ────────────────────────
export class Shot {
  constructor(o = {}) {
    const s = (this.scene = new THREE.Scene());
    this.night = !!o.night;
    const sky = o.sky || (o.night ? ["#0b1430", "#28406e"] : ["#5fb2ea", "#cfeeff"]);
    s.background = new THREE.Color(sky[1]);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: new THREE.Color(sky[0]) }, b: { value: new THREE.Color(sky[1]) } },
      vertexShader: "varying vec3 w; void main(){ w = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: "uniform vec3 a, b; varying vec3 w; void main(){ float k = smoothstep(-0.02, 0.45, w.y); gl_FragColor = vec4(mix(b, a, k), 1.); }" }));
    dome.renderOrder = -1; s.add(dome); this.dome = dome;
    if (o.fog !== false) s.fog = new THREE.Fog(o.fogColor || sky[1], o.fogNear ?? 25, o.fogFar ?? 90);
    this.hemi = new THREE.HemisphereLight(o.night ? 0x6a86c8 : 0xffffff, o.night ? 0x10141f : 0x5a6270, o.night ? 0.75 : 1.5); s.add(this.hemi);
    this.sun = new THREE.DirectionalLight(o.night ? 0x9bb4ff : 0xfff1dc, o.night ? 0.9 : 2.6);
    this.sun.position.set(...(o.sunPos || [8, 14, 9])); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sb = o.shadow || 14; Object.assign(this.sun.shadow.camera, { left: -sb, right: sb, top: sb, bottom: -sb, near: 0.5, far: 80 }); this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.02;
    s.add(this.sun); s.add(this.sun.target);
    if (o.sunTarget) this.sun.target.position.set(...o.sunTarget);
    this.cam = new THREE.PerspectiveCamera(o.fov || 40, GW / GH, 0.1, 400);
    if (o.ground !== false) { const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat(o.ground || "#8d969f", { rough: 0.95 })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; s.add(g); this.groundMesh = g; }
    this.exposure = o.exposure || 1.05;
  }
  add(o, p) { this.scene.add(place(o, p)); return o; }
  group(p, parent) { const g = new THREE.Group(); (parent || this.scene).add(place(g, p)); return g; }
  box(w, h, d, color, p = {}, parent) {
    const m = new THREE.Mesh(rbox(w, h, d, p.r ?? Math.min(w, h, d) * 0.15), p.material || mat(color, p)); m.castShadow = p.shadow !== false; m.receiveShadow = true;
    (parent || this.scene).add(place(m, { ...p, y: (p.y || 0) + h / 2 })); return m;
  }
  cyl(rt, rb, h, color, p = {}, parent) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, p.seg || 24), p.material || mat(color, p)); m.castShadow = p.shadow !== false; m.receiveShadow = true; (parent || this.scene).add(place(m, { ...p, y: (p.y || 0) + h / 2 })); return m; }
  ball(r, color, p = {}, parent) { const m = new THREE.Mesh(p.detail ? new THREE.IcosahedronGeometry(r, p.detail) : new THREE.SphereGeometry(r, 24, 16), p.material || mat(color, p)); m.castShadow = p.shadow !== false; m.receiveShadow = true; (parent || this.scene).add(place(m, p)); return m; }
  plane(w, h, color, p = {}, parent) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), p.material || mat(color, p)); m.receiveShadow = true; (parent || this.scene).add(place(m, p)); return m; }
  char(name, p = {}) { const a = new Actor(name, p.h); this.scene.add(a.root); a.at(p.x || 0, p.y || 0, p.z || 0, p.ry || 0); if (p.s) a.root.scale.setScalar(p.s); a.pose(p.clip || "idle", p.t || 0); return a; }
  light(color, intensity, dist, p) { const l = new THREE.PointLight(color, intensity, dist, 2); this.scene.add(place(l, p)); return l; }
  view(pos, look, fov) { this.cam.position.set(...pos); this.cam.lookAt(...look); if (fov) { this.cam.fov = fov; } this.cam.updateProjectionMatrix(); }
  // move camera between two framings
  move(p, a, b, f = ease) { const k = f(p); this.view(lerp3(a[0], b[0], k), lerp3(a[1], b[1], k), a[2] !== undefined ? lerp(a[2], b[2] ?? a[2], k) : undefined); }
  shake(t, amt) { this.cam.position.x += Math.sin(t * 53) * amt; this.cam.position.y += Math.cos(t * 47) * amt; this.cam.rotation.z += Math.sin(t * 37) * amt * 0.05; }
  render() { if (this.dome) this.dome.position.copy(this.cam.position); renderer.toneMappingExposure = this.exposure; renderer.render(this.scene, this.cam); return renderer.domElement; }

  // ── props ────────────────────────────────────────
  car(color, p = {}) {
    const g = this.group(p); const body = mat(color, { rough: 0.25, metal: 0.1 }); const glass = mat("#1f2b3a", { rough: 0.08, metal: 0.4 });
    this.box(1.9, 0.65, 4.0, null, { y: 0.3, r: 0.25, material: body }, g);
    this.box(1.62, 0.62, 2.0, null, { y: 0.88, z: -0.25, r: 0.24, material: body }, g);
    this.box(1.66, 0.46, 1.7, null, { y: 0.95, z: -0.25, r: 0.18, material: glass }, g);
    g.wheels = [];
    for (const [x, z] of [[-0.92, 1.25], [0.92, 1.25], [-0.92, -1.25], [0.92, -1.25]]) { const w = this.cyl(0.38, 0.38, 0.32, "#1b1d22", { x, y: 0.38, z, rz: Math.PI / 2, rough: 0.8 }, g); w.position.y = 0.38; g.wheels.push(w); this.cyl(0.2, 0.2, 0.34, "#c9ced6", { x, y: 0.38, z, rz: Math.PI / 2, metal: 0.6, rough: 0.3, shadow: false }, g).position.y = 0.38; }
    g.lights = [];
    for (const x of [-0.6, 0.6]) { g.lights.push(this.box(0.4, 0.16, 0.06, "#fff8d0", { x, y: 0.75, z: 2.0, emissive: "#fff3b0", ei: this.night ? 2 : 0.6, r: 0.03 }, g)); this.box(0.4, 0.14, 0.06, "#ff3030", { x, y: 0.75, z: -2.0, emissive: "#ff2020", ei: 1.2, r: 0.03 }, g); }
    return g;
  }
  building(w, h, d, color, p = {}) {
    const seed = p.seed ?? Math.round((p.x || 0) * 7 + (p.z || 0) * 3);
    const base = windowTex(seed % 5, "base").clone(), glow = windowTex(seed % 5, "glow").clone();
    for (const t of [base, glow]) { t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w / 3.2)) / 6 * 1, Math.max(1, Math.round(h / 3.2)) / 12); }
    const m = new THREE.MeshStandardMaterial({ color, map: base, emissive: "#ffffff", emissiveMap: glow, emissiveIntensity: p.lit ?? (this.night ? 1.4 : 0.0), roughness: 0.55 });
    const top = mat(color, { rough: 0.6 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [m, m, top, top, m, m]); mesh.castShadow = true; mesh.receiveShadow = true;
    this.scene.add(place(mesh, { ...p, y: h / 2 + (p.y || 0) })); mesh.win = m;
    if (p.roof !== false) this.box(w * 0.4, 1.2, d * 0.4, "#9aa3ad", { x: p.x, z: p.z, y: h + (p.y || 0), r: 0.1 });
    return mesh;
  }
  road(len, width = 9, p = {}) {
    const g = this.group(p);
    const lines = canvasTex(64, 512, (x, w, h) => { x.fillStyle = "#3a3f47"; x.fillRect(0, 0, w, h); x.fillStyle = "#f5f5f0"; for (let y = 0; y < h; y += 128) x.fillRect(28, y, 8, 64); });
    lines.wrapT = THREE.RepeatWrapping; lines.repeat.set(1, len / 8);
    const r = this.plane(width, len, null, { rx: -Math.PI / 2, y: 0.01, material: new THREE.MeshStandardMaterial({ map: lines, roughness: 0.85 }) }, g);
    for (const s of [-1, 1]) { this.box(3.5, 0.2, len, "#c7c9cc", { x: s * (width / 2 + 1.75), r: 0.04, rough: 0.8, shadow: false }, g); }
    return g;
  }
  lamp(p = {}) { const g = this.group(p); this.cyl(0.08, 0.1, 5, "#3a4250", { metal: 0.4 }, g); this.box(0.9, 0.12, 0.3, "#3a4250", { y: 5, x: 0.35, r: 0.04 }, g); g.bulb = this.box(0.5, 0.06, 0.22, "#fff6d8", { y: 4.94, x: 0.5, emissive: "#ffe9a8", ei: this.night ? 3 : 0.3, r: 0.02, shadow: false }, g); return g; }
  trafficLight(p = {}) {
    const g = this.group(p); this.cyl(0.09, 0.11, 4.2, "#2c333d", { metal: 0.3 }, g); this.box(0.55, 1.5, 0.45, "#22272e", { y: 3.3, r: 0.1 }, g);
    g.bulbs = ["#ff2d2d", "#ffc21a", "#2dff6a"].map((c, i) => this.ball(0.17, c, { y: 4.5 - i * 0.45, z: 0.25, emissive: c, ei: 0.05, unique: true, shadow: false }, g));
    g.set = (k) => g.bulbs.forEach((b, i) => (b.material.emissiveIntensity = i === k ? 3 : 0.05));
    return g;
  }
  tree(p = {}) { const g = this.group(p); const s = p.size || 1; this.cyl(0.14 * s, 0.2 * s, 1.6 * s, "#7a4b2a", { rough: 0.8 }, g); const c = p.color || "#3fae4a"; this.ball(1.0 * s, c, { y: 2.2 * s, detail: 1, flat: true, rough: 0.6 }, g); this.ball(0.75 * s, c, { y: 2.9 * s, x: 0.3 * s, detail: 1, flat: true, rough: 0.6 }, g); this.ball(0.7 * s, c, { y: 2.4 * s, x: -0.6 * s, z: 0.2, detail: 1, flat: true, rough: 0.6 }, g); return g; }
  bush(p = {}) { const g = this.group(p); const s = p.size || 1, c = p.color || "#4cb850"; for (let k = 0; k < 3; k++) this.ball(0.5 * s * (1 - k * 0.15), c, { x: (k - 1) * 0.45 * s, y: 0.35 * s, detail: 1, flat: true, rough: 0.6 }, g); return g; }
  // screen with live canvas texture; draw(ctx, w, h, t)
  screen(w, h, draw, p = {}, parent) {
    const tex = canvasTex(p.res || 256, Math.round((p.res || 256) * h / w), () => {});
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); (parent || this.scene).add(place(m, p));
    m.draw = (t) => { const { c, x } = tex.userData; draw(x, c.width, c.height, t); tex.needsUpdate = true; }; m.draw(0); return m;
  }
  phone(draw, p = {}) {
    const g = new THREE.Group(); this.box(0.09, 0.18, 0.014, "#15171c", { y: 0, r: 0.006, rough: 0.2 }, g).position.y = 0;
    g.screen = this.screen(0.08, 0.165, draw, { z: 0.0075, res: 128 }, g); place(g, p); return g;
  }
  shelf(len, p = {}) {
    const g = this.group(p); const wood = "#e9edf2";
    this.box(len, 2.2, 0.2, wood, { z: -0.35, r: 0.03 }, g);
    for (let k = 0; k < 4; k++) this.box(len, 0.06, 0.8, wood, { y: 0.15 + k * 0.6, r: 0.02, shadow: false }, g);
    const per = Math.floor(len / 0.32), n = per * 4; const geo = new THREE.BoxGeometry(0.26, 0.4, 0.3);
    const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.4 }), n); inst.castShadow = true; inst.receiveShadow = true;
    const cols = ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71", "#e67e22", "#9b59b6", "#ffffff", "#1abc9c"]; const M = new THREE.Matrix4(); g.items = [];
    for (let i = 0; i < n; i++) { const r = Math.floor(i / per), c = i % per; const pos = new THREE.Vector3(-len / 2 + 0.2 + c * 0.32, 0.4 + r * 0.6, 0); g.items.push(pos); M.makeTranslation(pos.x, pos.y, pos.z); inst.setMatrixAt(i, M); inst.setColorAt(i, new THREE.Color(cols[Math.floor(rnd(i * 3.1 + len) * cols.length)])); }
    g.add(inst); g.inst = inst;
    g.fill = (f, seed = 1) => { for (let i = 0; i < n; i++) { const on = rnd(i * 1.7 + seed) < f; const q = g.items[i]; M.makeScale(on ? 1 : 0.0001, on ? 1 : 0.0001, on ? 1 : 0.0001); M.setPosition(q.x, q.y, q.z); inst.setMatrixAt(i, M); } inst.instanceMatrix.needsUpdate = true; };
    return g;
  }
  robotArm(color = "#f39c12", p = {}) {
    const g = this.group(p); const c = mat(color, { rough: 0.3, metal: 0.2 }), dark = mat("#2d3436", { rough: 0.4 });
    this.cyl(0.6, 0.75, 0.5, null, { material: dark }, g);
    const j0 = this.group({ y: 0.5 }, g); this.cyl(0.42, 0.42, 0.5, null, { material: c }, j0);
    const j1 = this.group({ y: 0.6 }, j0); this.box(0.42, 2.0, 0.42, null, { material: c, r: 0.15 }, j1); this.ball(0.32, null, { material: dark }, j1);
    const j2 = this.group({ y: 2.0 }, j1); this.ball(0.3, null, { material: dark }, j2); this.box(0.34, 1.6, 0.34, null, { material: c, r: 0.12 }, j2);
    const j3 = this.group({ y: 1.6 }, j2); this.cyl(0.18, 0.25, 0.3, null, { material: dark }, j3);
    g.tip = this.box(0.12, 0.4, 0.12, "#bdc3c7", { y: 0.3, metal: 0.6, rough: 0.3 }, j3);
    g.lamp = this.ball(0.12, "#2dff6a", { y: 0.6, x: 0.32, emissive: "#2dff6a", ei: 2, unique: true, shadow: false }, j0);
    g.set = (yaw, a1, a2, a3 = 0) => { j0.rotation.y = yaw; j1.rotation.z = a1; j2.rotation.z = a2; j3.rotation.z = a3; };
    return g;
  }
  airplane(p = {}) {
    const g = this.group(p); const w = mat("#f4f6f9", { rough: 0.25 }), blue = mat("#2c6ed5", { rough: 0.3 });
    const f = this.cyl(1.1, 1.1, 14, null, { material: w, rx: Math.PI / 2, seg: 24 }, g); f.position.y = 0;
    this.ball(1.1, null, { material: w, z: 7 }, g).scale.set(1, 1, 1.6); this.ball(1.1, null, { material: w, z: -7 }, g).scale.set(1, 1, 2.2);
    this.box(18, 0.25, 3, null, { material: w, y: -0.4, z: 0.5, r: 0.1 }, g).position.y = -0.4;
    this.box(6, 0.2, 1.8, null, { material: w, y: 0.4, z: -8.2, r: 0.08 }, g).position.y = 0.4;
    this.box(0.25, 3.2, 2.2, null, { material: blue, y: 1.6, z: -8.6, r: 0.1 }, g).position.y = 1.8;
    for (const x of [-4.5, 4.5]) this.cyl(0.55, 0.55, 2.4, "#c8ced6", { x, y: -1.0, z: 1.5, rx: Math.PI / 2, metal: 0.5 }, g).position.y = -1.0;
    this.box(2.25, 0.25, 12, null, { material: blue, y: 0.2, r: 0.05, shadow: false }, g).position.set(0, 0.2, 0);
    const winTex = canvasTex(256, 32, (x, W, H) => { x.fillStyle = "#f4f6f9"; x.fillRect(0, 0, W, H); x.fillStyle = "#1f2b3a"; for (let i = 6; i < W; i += 14) x.fillRect(i, 10, 7, 12); });
    for (const s of [-1, 1]) { const pl = this.plane(10, 0.6, null, { x: s * 1.11, y: 0.45, ry: s * Math.PI / 2, material: new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.3 }) }, g); pl.position.set(s * 1.111, 0.45, 0); }
    return g;
  }
  globe(r, p = {}) {
    const land = (x, w, h, lights) => { x.fillStyle = lights ? "#000" : "#2a7fd4"; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 900; k++) { const u = rnd(k * 1.3), v = 0.15 + 0.7 * rnd(k * 2.7); const blob = Math.sin(u * 9) + Math.cos(v * 11) + Math.sin(u * 23 + v * 7); if (blob < 0.6) continue;
        if (lights) { if (rnd(k * 5.5) > 0.5) { x.fillStyle = "rgba(255,210,120,.9)"; x.fillRect(u * w, v * h, 3, 3); } } else { x.fillStyle = rnd(k) > 0.3 ? "#3fae4a" : "#d9c27a"; x.beginPath(); x.arc(u * w, v * h, 10 + 14 * rnd(k * 9), 0, 7); x.fill(); } } };
    const m = new THREE.MeshStandardMaterial({ map: canvasTex(1024, 512, (x, w, h) => land(x, w, h, false)), emissiveMap: canvasTex(1024, 512, (x, w, h) => land(x, w, h, true)), emissive: "#ffffff", emissiveIntensity: p.lights ?? 1, roughness: 0.5 });
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), m); this.scene.add(place(e, p));
    const atm = new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 48, 32), new THREE.MeshBasicMaterial({ color: "#7cc8ff", transparent: true, opacity: 0.18, side: THREE.BackSide })); e.add(atm);
    return e;
  }
  stars(n = 400) { const geo = new THREE.BufferGeometry(); const a = []; for (let i = 0; i < n; i++) { const u = rnd(i) * Math.PI * 2, v = rnd(i + 99) * 0.9 + 0.05, r = 150; a.push(Math.cos(u) * Math.sin(v * Math.PI) * r, Math.cos(v * Math.PI) * r * 0.6 + 40, Math.sin(u) * Math.sin(v * Math.PI) * r); } geo.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#fff", size: 0.7, fog: false })); this.scene.add(p); return p; }
  // particle burst, positioned by time (deterministic). returns update(t) where t = seconds since burst
  burst(o) {
    const n = o.n || 30, g = this.group(); const geo = o.round ? new THREE.SphereGeometry(1, 10, 8) : new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.MeshStandardMaterial({ color: o.color || "#ffd23a", emissive: o.glow ? o.color : "#000", emissiveIntensity: o.glow ? 2.5 : 0, transparent: !!o.fade, roughness: 0.5 });
    const parts = []; for (let i = 0; i < n; i++) { const p = new THREE.Mesh(geo, m); p.castShadow = !o.glow; g.add(p);
      const a = rnd(i * 3.3 + (o.seed || 0)) * Math.PI * 2, el = (o.up ?? 0.6) + rnd(i * 7.1 + (o.seed || 0)) * (o.spread ?? 0.8), sp = (o.speed || 4) * (0.5 + rnd(i * 1.9 + (o.seed || 0)));
      parts.push({ p, v: [Math.cos(a) * sp * (o.flat ? 1 : 0.7), el * sp, Math.sin(a) * sp * (o.flat ? 1 : 0.7)], s: (o.size || 0.08) * (0.6 + rnd(i * 4.4) * 0.8), r: rnd(i) * 6 }); }
    const org = o.at || [0, 0, 0];
    g.update = (t) => { g.visible = t >= 0 && t < (o.life || 2); if (!g.visible) return; const k = t / (o.life || 2);
      parts.forEach(({ p, v, s, r }) => { const grav = o.gravity ?? 9; p.position.set(org[0] + v[0] * t, Math.max(o.floor ?? -99, org[1] + v[1] * t - 0.5 * grav * t * t), org[2] + v[2] * t); p.rotation.set(r + t * 4, r * 2 + t * 3, 0); const sc = o.grow ? s * (1 + t * o.grow) : s * (o.fade ? 1 : 1 - k * 0.5); p.scale.setScalar(sc); });
      if (o.fade) m.opacity = 1 - k; };
    g.update(-1); return g;
  }
}
