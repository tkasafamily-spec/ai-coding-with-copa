// Stick-man shots: a 2D stick man in a glossy 3D world. "What if you ate 1,000,000 chocolate bars in 1 week?"
import { THREE, Shot, lerp, seg, ease, easeOut, easeIn, back, rnd, clamp, canvasTex, mat } from "./engine.js";
import { Stick } from "./stick.js";

// ── chocolate bars (one instanced mesh = thousands of bars) ──
const BAR_TEX = canvasTex(128, 64, (x, w, h) => { x.fillStyle = "#5a2e14"; x.fillRect(0, 0, w, h); x.fillStyle = "#6e3a1b"; for (let i = 4; i < 56; i += 13) x.fillRect(i, 4, 10, h - 8); x.fillStyle = "#ffffff"; x.fillRect(56, 0, 72, h); x.fillStyle = "#ffd23a"; x.fillRect(56, 26, 72, 10); x.fillStyle = "#ffffff"; x.font = "900 16px Montserrat, Arial"; x.fillText("CHOCO", 68, 22); });
const BAR_GEO = new THREE.BoxGeometry(0.28, 0.05, 0.13);
const WRAP = ["#d62839", "#7b2cbf", "#1d4ed8", "#d62839", "#e85d04", "#d62839"];
function bars(S, n) {
  const m = new THREE.InstancedMesh(BAR_GEO, new THREE.MeshStandardMaterial({ map: BAR_TEX, roughness: 0.35 }), n); m.castShadow = true; m.receiveShadow = true;
  for (let i = 0; i < n; i++) m.setColorAt(i, new THREE.Color(WRAP[i % WRAP.length]).lerp(new THREE.Color("#ffffff"), 0.15));
  S.scene.add(m); return m;
}
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(1, 1, 1);
function setBar(m, i, x, y, z, rx, ry, rz, s = 1) { Q.setFromEuler(E.set(rx, ry, rz)); S3.setScalar(s); m.setMatrixAt(i, M4.compose(P3.set(x, y, z), Q, S3)); }
// a heap of bars shaped like a cone (bars on the surface so it looks solid)
function pile(S, o) {
  const n = o.n || 800, m = bars(S, n), seed = o.seed || 1;
  for (let i = 0; i < n; i++) { const u = rnd(i * 1.37 + seed), y = o.h * (1 - Math.sqrt(u)), rr = o.r * (1 - y / o.h) * (0.85 + 0.15 * rnd(i * 2.1 + seed)), a = rnd(i * 3.7 + seed) * Math.PI * 2;
    setBar(m, i, (o.x || 0) + Math.cos(a) * rr, (o.y || 0) + y, (o.z || 0) + Math.sin(a) * rr, (rnd(i * 5.3) - 0.5) * 1.6, rnd(i * 7.9) * 6.3, (rnd(i * 9.1) - 0.5) * 1.6, o.s || 1); }
  m.instanceMatrix.needsUpdate = true;
  if (o.solid !== false) { const c = new THREE.Mesh(new THREE.ConeGeometry(o.r * 0.9, o.h * 0.96, 28), CHOC); c.position.set(o.x || 0, (o.y || 0) + o.h * 0.48, o.z || 0); c.castShadow = true; c.receiveShadow = true; S.scene.add(c); }
  return m;
}
const CHOC = new THREE.MeshStandardMaterial({ color: "#4a2410", roughness: 0.45 });
function kitchen(S, o = {}) {
  const tiles = canvasTex(256, 256, (x, w, h) => { x.fillStyle = "#eef1f4"; x.fillRect(0, 0, w, h); x.fillStyle = "#dde3e9"; x.fillRect(0, 0, w / 2, h / 2); x.fillRect(w / 2, h / 2, w / 2, h / 2); });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(30, 30); S.groundMesh.material = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.3 });
  const wall = o.night ? "#c9d3e6" : "#ffffff", H = o.wallH || 40;
  S.box(14, H, 0.3, wall, { z: -4.2, r: 0, shadow: false }); S.box(0.3, H, 14, wall, { x: -6.5, z: 2, r: 0, shadow: false }); S.box(0.3, H, 14, wall, { x: 6.5, z: 2, r: 0, shadow: false });
  // counter + cabinets along the back
  S.box(9, 0.9, 0.7, "#f8f9fa", { x: -1, z: -3.7, r: 0.03 }); S.box(9.1, 0.06, 0.8, "#b8c2cc", { x: -1, y: 0.9, z: -3.68, r: 0.02 });
  for (let k = 0; k < 7; k++) { S.box(0.3, 0.04, 0.03, "#8a96a3", { x: -5 + k * 1.3, y: 0.75, z: -3.33, r: 0.01, shadow: false }); S.box(1.2, 0.8, 0.4, "#f8f9fa", { x: -5 + k * 1.3 + (k > 2 ? 1.5 : 0), y: 1.8, z: -3.95, r: 0.03 }); }
  S.box(1.1, 2.2, 0.8, "#e9edf1", { x: 4.8, z: -3.6, r: 0.06, metal: 0.2, rough: 0.25 }); S.box(0.05, 0.6, 0.05, "#8a96a3", { x: 4.35, y: 1.2, z: -3.18, r: 0.02 });
  const win = S.screen(2.0, 1.3, (x, w, h, t) => { const g = x.createLinearGradient(0, 0, 0, h); if (o.night) { g.addColorStop(0, "#0b1430"); g.addColorStop(1, "#28406e"); } else { g.addColorStop(0, "#6ec6ff"); g.addColorStop(1, "#d7f1ff"); } x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (o.night) { x.fillStyle = "#f1f3f8"; x.beginPath(); x.arc(w * 0.7, h * 0.3, 18, 0, 7); x.fill(); } else { x.fillStyle = "#7bd389"; x.beginPath(); x.ellipse(w * 0.3, h, 120, 50, 0, 0, 7); x.fill(); }
    x.fillStyle = "#fff"; x.fillRect(w / 2 - 4, 0, 8, h); x.fillRect(0, h / 2 - 4, w, 8); }, { x: 1.2, y: 1.95, z: -4.04, res: 256 });
  S.box(2.2, 0.12, 0.2, "#ffffff", { x: 1.2, y: 1.22, z: -4.0, r: 0.03 });
  const clockG = S.group({ x: -2.4, y: 2.6, z: -4.03 }); S.cyl(0.32, 0.32, 0.06, "#ffffff", { rx: Math.PI / 2 }, clockG).position.set(0, 0, 0);
  const clock = S.screen(0.56, 0.56, (x, w, h, t) => { const hrs = o.clock ? o.clock(t) : 9; x.clearRect(0, 0, w, h); x.fillStyle = "#fff"; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = "#222"; x.stroke();
    const hand = (a, l, lw) => { x.lineWidth = lw; x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2 + Math.sin(a) * l, h / 2 - Math.cos(a) * l); x.stroke(); }; hand(hrs / 12 * Math.PI * 2, w * 0.24, 8); hand((hrs % 1) * Math.PI * 2, w * 0.36, 5); }, { z: 0.035, res: 128 }, clockG);
  clock.material.transparent = true;
  if (o.night) { S.hemi.intensity = 0.9; S.sun.intensity = 0.6; const l = S.light("#ffd9a0", 30, 12, { x: 0, y: 3.2, z: 0.5 }); S.cyl(0.35, 0.2, 0.25, "#ffe9b0", { y: 3.3, z: 0.4, emissive: "#ffd27a", ei: 1.5, shadow: false }); }
  return { clock, win };
}
function table(S, p = {}) { const g = S.group(p); S.box(2.0, 0.08, 1.1, "#c68b59", { y: 0.72, r: 0.03 }, g); for (const [x, z] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]]) S.box(0.08, 0.72, 0.08, "#a8723f", { x, z, r: 0.02 }, g); return g; }
function chair(S, p = {}) { const g = S.group(p); S.box(0.5, 0.06, 0.5, "#e76f51", { y: 0.44, r: 0.02 }, g); S.box(0.06, 0.6, 0.5, "#e76f51", { x: -0.24, y: 0.47, r: 0.02 }, g); for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) S.box(0.05, 0.44, 0.05, "#c4553a", { x, z, r: 0.01 }, g); return g; }
function seatedMan(S, o = {}) { chair(S, { x: -1.25, z: 0 }); const man = new Stick(S, { x: -1.22, z: 0.02 }); return man; }
function house(S, p = {}) {
  const g = S.group(p); S.box(9, 5, 7, "#fdf0d5", { r: 0.05 }, g);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6.6, 3.2, 4, 1), mat("#c0392b", { rough: 0.5 })); roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.82); roof.position.y = 6.6; roof.castShadow = true; g.add(roof);
  S.box(1.2, 2.2, 0.1, "#8d5524", { z: 3.52, r: 0.03 }, g);
  for (const x of [-2.8, 2.8]) { S.box(1.6, 1.3, 0.08, "#9fd3f5", { x, y: 2.0, z: 3.52, r: 0.02, rough: 0.1 }, g); S.box(1.8, 0.12, 0.2, "#ffffff", { x, y: 1.95, z: 3.56, r: 0.02 }, g); }
  return g;
}
function ambulance(S, p = {}) {
  const g = S.group(p); S.box(2.3, 2.3, 4.2, "#ffffff", { y: 0.45, z: -0.6, r: 0.15 }, g); S.box(2.2, 1.5, 1.6, "#ffffff", { y: 0.45, z: 2.2, r: 0.2 }, g);
  S.box(2.24, 0.9, 1.2, "#1f2b3a", { y: 1.2, z: 2.3, r: 0.12, rough: 0.1, metal: 0.4 }, g); S.box(2.34, 0.3, 4.24, "#e3242b", { y: 1.0, z: -0.6, r: 0.05 }, g);
  for (const s of [-1, 1]) { const cross = S.group({ x: s * 1.17, y: 2.0, z: -0.6, ry: s * Math.PI / 2 }, g); S.box(0.9, 0.3, 0.02, "#e3242b", { r: 0 }, cross); S.box(0.3, 0.9, 0.02, "#e3242b", { y: -0.3, r: 0 }, cross); }
  for (const [x, z] of [[-1.05, 1.9], [1.05, 1.9], [-1.05, -1.8], [1.05, -1.8]]) { const w = S.cyl(0.42, 0.42, 0.3, "#1b1d22", { x, z, rz: Math.PI / 2, rough: 0.8 }, g); w.position.y = 0.42; }
  g.lights = [S.box(0.5, 0.2, 0.3, "#ff2020", { x: -0.5, y: 2.75, z: 0.8, emissive: "#ff2020", ei: 2, unique: true }, g), S.box(0.5, 0.2, 0.3, "#2050ff", { x: 0.5, y: 2.75, z: 0.8, emissive: "#2050ff", ei: 2, unique: true }, g)];
  g.pl = [S.light("#ff2020", 0, 14, { x: -0.6, y: 3.2, z: 1.2 }), S.light("#2050ff", 0, 14, { x: 0.6, y: 3.2, z: 1.2 })]; g.pl.forEach((l) => g.add(l));
  g.flash = (t) => { const a = Math.sin(t * 14) > 0; g.lights[0].material.emissiveIntensity = a ? 4 : 0.2; g.lights[1].material.emissiveIntensity = a ? 0.2 : 4; g.pl[0].intensity = a ? 40 : 0; g.pl[1].intensity = a ? 0 : 40; };
  return g;
}
function bigPiles(S, seed = 1) { // towers of chocolate going up and up behind him
  pile(S, { x: -4.4, z: -2.6, r: 1.9, h: 11, n: 1300, seed: seed, s: 1.5 });
  pile(S, { x: 4.3, z: -2.5, r: 2.0, h: 15, n: 1500, seed: seed + 2, s: 1.5 });
  pile(S, { x: 0.6, z: -3.1, r: 1.7, h: 24, n: 1800, seed: seed + 4, s: 1.5 });
  pile(S, { x: -5.6, z: 1.2, r: 1.1, h: 5, n: 500, seed: seed + 6, s: 1.4 });
  pile(S, { x: 5.6, z: 1.0, r: 1.1, h: 6, n: 500, seed: seed + 8, s: 1.4 });
}

export const SHOTS2 = {
  chocPile() {
    const S = new Shot({ shadow: 12, exposure: 1.1, fogNear: 30, fogFar: 120 }); kitchen(S); bigPiles(S);
    table(S); pile(S, { x: 0.15, y: 0.76, z: 0, r: 0.75, h: 0.9, n: 260, seed: 3 }); const man = seatedMan(S);
    return { S, update(t, d) {
      man.pose("sit", t, { to: "eat", w: 1 }); man.P.ll = [1.55, -1.55]; man.P.rl = [1.5, -1.5]; man.P.sit = true; man.P.hold = "bar";
      if (t < 0.9) S.move(seg(t, 0, 0.9), [[-0.6, 1.3, 3.2], [-0.9, 1.05, 0], 40], [[-0.4, 1.4, 4.2], [-0.6, 1.1, 0], 42]);
      else S.move(seg(t, 0.9, d), [[-0.4, 1.4, 4.2], [-0.6, 1.1, 0], 42], [[0.6, 21, 9], [0.4, 19, -3], 46], ease);
    } };
  },
  chocRain() {
    const S = new Shot({ shadow: 12, exposure: 1.1, fogNear: 30, fogFar: 120 }); kitchen(S); bigPiles(S, 11); table(S);
    const tp = pile(S, { x: 0.15, y: 0.76, z: 0, r: 0.75, h: 0.9, n: 260, seed: 5 });
    const man = new Stick(S, { x: -1.6, z: 0.4 }); man.dir = 1;
    const N = 220, rain = bars(S, N);
    return { S, update(t, d) {
      man.pose("shocked", t, { face: { look: 0.6 } });
      for (let i = 0; i < N; i++) { const t0 = rnd(i * 2.3) * (d - 0.3), dt = t - t0, x = (rnd(i * 4.1) - 0.5) * 7, z = -1.5 + (rnd(i * 6.7) - 0.5) * 4;
        const land = 0.03 + rnd(i * 8.8) * 0.4; const y = dt < 0 ? 99 : Math.max(land, 9 - 0.5 * 14 * dt * dt); const spin = y > land ? dt * 6 : 0;
        setBar(rain, i, x, y, z, rnd(i) * 3 + spin, rnd(i * 2) * 6, spin * 0.5); }
      rain.instanceMatrix.needsUpdate = true;
      S.move(t / d, [[0.4, 2.2, 8.2], [0, 1.8, -1], 46], [[0.2, 1.9, 6.8], [0, 1.7, -1], 46]);
    } };
  },
  chocNight() {
    const S = new Shot({ night: true, shadow: 10, exposure: 1.2, fogNear: 30, fogFar: 120, sky: ["#0b1430", "#28406e"] }); kitchen(S, { night: true, clock: (t) => 23 + t * 2.5 }); bigPiles(S, 21);
    table(S); pile(S, { x: 0.15, y: 0.76, z: 0, r: 0.75, h: 0.75, n: 240, seed: 7 }); const man = seatedMan(S);
    const wr = [0, 1, 2, 3, 4].map((k) => S.burst({ n: 8, at: [-0.6, 1.3, 0.1], speed: 2.2, up: 0.7, gravity: 6, color: ["#d62839", "#7b2cbf", "#ffd23a"][k % 3], size: 0.09, life: 1.2, floor: 0.02, seed: k * 4 }));
    return { S, update(t, d) {
      man.pose("shovel", t); man.P.ll = [1.55, -1.55]; man.P.rl = [1.5, -1.5]; man.P.sit = true;
      wr.forEach((b, k) => b.update(t - k * 0.45));
      S.move(t / d, [[1.4, 1.7, 5.2], [-0.7, 1.2, 0], 42], [[0.6, 1.6, 4.3], [-0.8, 1.2, 0], 42]);
    } };
  },
  chocTeeth() {
    const S = new Shot({ shadow: 8, exposure: 1.1, fogNear: 30, fogFar: 120 }); kitchen(S); bigPiles(S, 31); table(S); pile(S, { x: 0.15, y: 0.76, z: 0, r: 0.75, h: 0.7, n: 220, seed: 9 }); const man = seatedMan(S);
    return { S, update(t, d) {
      const ache = t > d * 0.45;
      man.pose("eat", t * 0.8, { face: { brown: true, eyes: ache ? "closed" : "open", mouth: ache ? "O" : "chew", sweat: ache } }); man.P.ll = [1.55, -1.55]; man.P.rl = [1.5, -1.5]; man.P.sit = true; man.P.jitter = ache ? 0.01 : 0;
      S.move(t / d, [[-1.0, 1.45, 2.0], [-1.1, 1.3, 0], 38], [[-1.1, 1.38, 1.45], [-1.15, 1.32, 0], 36]);
    } };
  },
  chocSugar() {
    const S = new Shot({ shadow: 10, exposure: 1.1, fogNear: 30, fogFar: 120 }); kitchen(S); bigPiles(S, 41); table(S, { x: 1.6, z: -0.8 });
    const man = new Stick(S, { x: 0, z: 0.5 });
    const cubes = []; for (let k = 0; k < 14; k++) cubes.push(S.box(0.16, 0.16, 0.16, "#ffffff", { r: 0.02, rough: 0.2, emissive: "#ffffff", ei: 0.25 }));
    return { S, update(t, d) {
      man.pose("shake", t);
      cubes.forEach((c, k) => { const a = t * (2 + k * 0.1) + k * 0.45, r = 0.8 + 0.15 * Math.sin(k); c.position.set(Math.cos(a) * r, 0.5 + (k % 7) * 0.2 + 0.1 * Math.sin(t * 3 + k), 0.5 + Math.sin(a) * r); c.rotation.set(t * 3 + k, t * 2, 0); });
      const a = t / d * 0.8 - 0.4; S.view([Math.sin(a) * 4.6, 1.5, 0.5 + Math.cos(a) * 4.6], [0, 1.0, 0.5], 42);
    } };
  },
  chocLaps() {
    const S = new Shot({ night: true, shadow: 12, exposure: 1.25, fogNear: 30, fogFar: 120, sky: ["#0b1430", "#28406e"] }); kitchen(S, { night: true, clock: () => 3 }); bigPiles(S, 51);
    S.box(2.0, 0.9, 1.2, "#f8f9fa", { z: -0.6, r: 0.04 }); S.box(2.1, 0.06, 1.3, "#b8c2cc", { y: 0.9, z: -0.6, r: 0.02 });
    pile(S, { x: 0, y: 0.95, z: -0.6, r: 0.5, h: 0.5, n: 120, seed: 13 });
    const man = new Stick(S, {}); let prevX = null;
    return { S, update(t, d) {
      const a = t * 3.6, R = 1.9; const x = Math.cos(a) * R * 1.3, z = -0.6 + Math.sin(a) * R * 0.85; man.at(x, 0, z);
      const vx = -Math.sin(a); man.dir = vx >= 0 ? 1 : -1; man.pose("run", t * 1.3, { face: { eyes: "wide", mouth: "grin" } });
      S.move(t / d, [[0, 3.4, 6.8], [0, 0.8, -0.6], 46], [[0.6, 3.0, 6.0], [0, 0.8, -0.6], 46]);
    } };
  },
  chocCrash() {
    const S = new Shot({ shadow: 10, exposure: 1.0, fogNear: 30, fogFar: 120, sky: ["#8090a8", "#c4cfdc"] }); kitchen(S); bigPiles(S, 61);
    const man = new Stick(S, { x: -2.2, z: 0.4 }); man.dir = 1;
    const spill = S.burst({ n: 14, at: [0.3, 0.9, 0.4], speed: 2.2, up: 0.5, gravity: 9, color: "#5a2e14", size: 0.1, life: 2, floor: 0.04, seed: 3 });
    return { S, update(t, d) {
      const T = 0.6;
      if (t < T) { man.at(-2.2 + t * 4, 0, 0.4); man.pose("run", t); }
      else { man.at(0.2 + easeOut(seg(t, T, T + 0.5)) * 0.4, 0, 0.4); const k = easeIn(seg(t, T + 0.1, T + 0.55)); man.pose("shake", t, { to: "lie", w: k }); if (k >= 1) man.P.face = { eyes: "x", mouth: "frown" }; }
      spill.update(t - T - 0.4);
      S.move(t / d, [[-0.4, 1.7, 5.4], [-0.3, 0.8, 0.4], 42], [[-0.4, 1.4, 4.4], [-0.4, 0.5, 0.4], 42]);
      if (t > T + 0.5 && t < T + 0.8) S.shake(t, 0.06);
    } };
  },
  chocSick() {
    const S = new Shot({ shadow: 10, exposure: 1.05, fogNear: 30, fogFar: 120, sky: ["#a7b5a0", "#d8e2d0"] }); kitchen(S); bigPiles(S, 71); table(S); pile(S, { x: 0.15, y: 0.76, z: 0, r: 0.75, h: 0.85, n: 260, seed: 15 });
    const man = seatedMan(S);
    return { S, update(t, d) {
      man.pose("sick", t); man.P.ll = [1.55, -1.55]; man.P.rl = [1.5, -1.5]; man.P.sit = true; man.P.lean = -0.25 - 0.1 * easeOut(seg(t, 0.3, 1)); man.P.face.look = -0.7;
      S.move(t / d, [[0.0, 1.5, 4.0], [-0.6, 1.0, 0], 40], [[-0.4, 1.35, 3.0], [-0.8, 1.05, 0], 40]);
    } };
  },
  chocHouse() {
    const S = new Shot({ shadow: 30, ground: "#6cc24a", fogNear: 60, fogFar: 200 });
    house(S, { z: 0 }); pile(S, { x: 0.5, y: 4.5, z: 0, r: 5.0, h: 26, n: 2600, seed: 17, s: 2.2 });
    for (let k = 0; k < 16; k++) S.tree({ x: (k % 2 ? 1 : -1) * (9 + rnd(k) * 12), z: -10 + rnd(k * 3) * 22, size: 1.2 + rnd(k * 5) * 0.6 });
    for (let k = 0; k < 12; k++) S.box(0.15, 1.0, 0.15, "#ffffff", { x: -9 + k * 1.6, z: 7, r: 0.03 });
    S.box(19, 0.12, 0.1, "#ffffff", { y: 0.75, z: 7, r: 0.02 });
    const man = new Stick(S, { x: 2.6, z: 5.2 });
    return { S, update(t, d) {
      man.pose("shocked", t, { face: { look: 0 } });
      S.move(t / d, [[3, 2.2, 14], [1, 5, 0], 44], [[8, 6, 32], [0, 12, 0], 48], ease);
    } };
  },
  chocLastBite() {
    const S = new Shot({ shadow: 8, exposure: 1.05, fogNear: 30, fogFar: 120, sky: ["#d9b38c", "#f2dcc2"] }); kitchen(S); bigPiles(S, 81); table(S); pile(S, { x: 0.15, y: 0.76, z: 0, r: 0.75, h: 0.6, n: 200, seed: 19 }); const man = seatedMan(S);
    return { S, update(t, d) {
      const k = easeOut(seg(t, 0.2, d * 0.85));
      man.pose({ ra: [lerp(0.5, 2.2, k), lerp(0.6, 2.2, k)], la: [0.5, 0.6], hold: "bar", jitter: 0.012, face: { eyes: "tired", mouth: k > 0.9 ? "O" : "frown", sweat: true, green: true, brown: true } }, t);
      man.P.ll = [1.55, -1.55]; man.P.rl = [1.5, -1.5]; man.P.sit = true;
      S.move(t / d, [[-0.5, 1.4, 3.0], [-1.0, 1.1, 0], 38], [[-0.9, 1.35, 2.0], [-1.1, 1.15, 0], 36]);
    } };
  },
  chocAmbulance() {
    const S = new Shot({ shadow: 20, ground: "#6cc24a", fogNear: 50, fogFar: 160, sky: ["#f49e4c", "#ffe2b8"], sunPos: [-12, 9, 8] });
    house(S, { z: -6 }); pile(S, { x: 0.5, y: 4.5, z: -6, r: 5.0, h: 22, n: 2000, seed: 21, s: 2.2 });
    S.road(80, 7, { z: 0, ry: Math.PI / 2 }).position.set(0, 0, 4);
    const amb = ambulance(S, { x: 3.2, z: 4, ry: -Math.PI / 2 });
    const docs = [new Stick(S, { x: -1.3, z: 1.6, badge: true }), new Stick(S, { x: -0.3, z: 1.9, badge: true })];
    return { S, update(t, d) {
      amb.flash(t); docs[0].pose("idle", t, { face: { mouth: "frown", look: -0.3 } }); docs[1].pose("idle", t + 1, { face: { mouth: "frown", look: -0.5 } }); docs[1].P.ra = [1.2 + 0.2 * Math.sin(t * 6), 1.6];
      S.move(t / d, [[3, 3.2, 17], [0, 2.2, 0], 46], [[1, 2.8, 14], [0, 2.2, 0], 46]);
    } };
  },
  chocEnd() {
    const S = new Shot({ shadow: 12, exposure: 1.1, fogNear: 30, fogFar: 120, sky: ["#f08a5d", "#ffd59a"] }); kitchen(S); bigPiles(S, 91);
    pile(S, { x: 0, z: 0, r: 2.2, h: 1.6, n: 700, seed: 23 });
    const man = new Stick(S, { x: 0.1, y: 1.55, z: 0.1 });
    return { S, update(t, d) {
      man.pose("lie", t, { face: { eyes: "tired", mouth: "smile", brown: true, look: 0 } }); man.P.la = [2.6 + 0.3 * Math.sin(t * 2), 0.3];
      S.move(t / d, [[0.4, 3.4, 8.5], [0.1, 1.5, 0], 42], [[0.2, 3.0, 6.8], [0.1, 1.6, 0], 42]);
    } };
  },
};
