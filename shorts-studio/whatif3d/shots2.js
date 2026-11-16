// Stick-man shots: a 2D stick man in a glossy 3D world. "What if you ate 1,000,000 chocolate bars in 1 week?"
import { THREE, Shot, lerp, seg, ease, easeOut, easeIn, back, rnd, clamp, canvasTex, mat } from "./engine.js";
import { Stick } from "./stick.js";

// ── chocolate bars (one instanced mesh = thousands of bars) ──
const BAR_TEX = canvasTex(256, 128, (x, w, h) => { // wrapper (tinted per bar) + bare chocolate end with squares
  x.fillStyle = "#f2f2f2"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffffff"; x.fillRect(0, 10, w, 14); x.fillStyle = "#ffd23a"; x.fillRect(0, h - 30, w, 12);
  x.fillStyle = "#ffffff"; x.font = "900 40px Montserrat, Arial"; x.fillText("CHOCO", 70, 80); x.fillStyle = "rgba(0,0,0,.25)"; for (let i = 0; i < w; i += 12) x.fillRect(i, 0, 2, 6);
  x.fillStyle = "#4a2410"; x.fillRect(0, 0, 58, h); x.fillStyle = "#6b3a1e"; for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) x.fillRect(5 + i * 26, 6 + j * 30, 22, 26);
  x.fillStyle = "rgba(255,255,255,.25)"; for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) x.fillRect(7 + i * 26, 8 + j * 30, 18, 4);
});
const BAR_GEO = new THREE.BoxGeometry(0.28, 0.05, 0.13);
const WRAP = ["#d62839", "#7b2cbf", "#1d4ed8", "#d62839", "#e85d04", "#c1121f", "#2a9d8f"];
function bars(S, n) {
  const m = new THREE.InstancedMesh(BAR_GEO, new THREE.MeshStandardMaterial({ map: BAR_TEX, roughness: 0.35 }), n); m.castShadow = true; m.receiveShadow = true;
  for (let i = 0; i < n; i++) m.setColorAt(i, new THREE.Color(WRAP[Math.floor(rnd(i * 2.71) * WRAP.length)]).lerp(new THREE.Color("#ffffff"), 0.1));
  S.scene.add(m); return m;
}
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(1, 1, 1);
function setBar(m, i, x, y, z, rx, ry, rz, s = 1, order = "XYZ") { Q.setFromEuler(E.set(rx, ry, rz, order)); S3.setScalar(s); m.setMatrixAt(i, M4.compose(P3.set(x, y, z), Q, S3)); }
// the inside of a pile is drawn as packed bars too (never brown mud)
const PACK_TEX = canvasTex(512, 256, (x, w, h) => { x.fillStyle = "#3a1c0c"; x.fillRect(0, 0, w, h);
  for (let r = 0; r < 10; r++) for (let c = -1; c < 8; c++) { const bx = c * 72 + (r % 2) * 36, by = r * 26; x.fillStyle = WRAP[(r * 3 + c + 9) % WRAP.length]; x.fillRect(bx + 2, by + 2, 68, 22); x.fillStyle = "#4a2410"; x.fillRect(bx + 2, by + 2, 16, 22); x.fillStyle = "#ffd23a"; x.fillRect(bx + 18, by + 16, 52, 3); } });
PACK_TEX.wrapS = PACK_TEX.wrapT = THREE.RepeatWrapping;
// a heap of bars: rows of bars wrapped neatly around a cone, two layers, bars tilted to the slope
function pile(S, o) {
  const s = o.s || 1, L = Math.hypot(o.r, o.h), phi = Math.atan2(o.r, o.h), seed = o.seed || 1, rowH = 0.12 * s, list = [];
  for (const layer of [0, 1]) { const rows = Math.ceil(L / rowH);
    for (let k = 0; k < rows; k++) { const u = (k + 0.5 + layer * 0.5) / rows; if (u > 1) continue; const y = o.h * u, rr = o.r * (1 - u) - layer * 0.04 * s; if (rr < 0.02) { list.push([0, y, 0, 0, rnd(k) * 6, 0]); continue; }
      const n = Math.max(1, Math.ceil((2 * Math.PI * rr) / (0.28 * s * 0.8))), off = rnd(k * 3.3 + seed + layer) * 6.28;
      for (let j = 0; j < n; j++) { const a = off + (j / n) * Math.PI * 2, q = k * 131 + j * 7 + layer * 977 + seed;
        list.push([Math.cos(a) * rr, y + (rnd(q) - 0.5) * 0.05 * s, Math.sin(a) * rr, -phi + (rnd(q * 1.3) - 0.5) * 0.5, -(a + Math.PI / 2) + (rnd(q * 2.1) - 0.5) * 0.6, (rnd(q * 3.7) - 0.5) * 0.35]); } } }
  const m = bars(S, list.length);
  list.forEach(([x, y, z, rx, ry, rz], i) => setBar(m, i, (o.x || 0) + x, (o.y || 0) + y, (o.z || 0) + z, rx, ry, rz, s, "YXZ"));
  m.instanceMatrix.needsUpdate = true;
  const tex = PACK_TEX.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, (2 * Math.PI * o.r) / (0.28 * s * 2.5)), Math.max(1, L / (0.12 * s * 10)));
  const c = new THREE.Mesh(new THREE.ConeGeometry(o.r * 0.94, o.h * 0.97, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); c.position.set(o.x || 0, (o.y || 0) + o.h * 0.485, o.z || 0); c.userData.noOutline = true; c.receiveShadow = true; S.scene.add(c);
  return m;
}
function kitchen(S, o = {}) {
  const tiles = canvasTex(256, 256, (x, w, h) => { x.fillStyle = "#f3efe8"; x.fillRect(0, 0, w, h); x.fillStyle = "#e4ddd2"; x.fillRect(0, 0, w / 2, h / 2); x.fillRect(w / 2, h / 2, w / 2, h / 2); x.strokeStyle = "#d2c8b9"; x.lineWidth = 3; x.strokeRect(0, 0, w, h); x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke(); });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(40, 40); S.groundMesh.material = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.3 });
  const wall = o.night ? "#cdd6e8" : "#fbfaf7", H = o.wallH || 40;
  S.box(14, H, 0.3, wall, { z: -4.2, r: 0, shadow: false }); S.box(0.3, H, 14, wall, { x: -6.5, z: 2, r: 0, shadow: false }); S.box(0.3, H, 14, wall, { x: 6.5, z: 2, r: 0, shadow: false });
  for (const [x, z, w, d] of [[0, -4.03, 13, 0.06], [-6.33, 2, 0.06, 13], [6.33, 2, 0.06, 13]]) S.box(w, 0.14, d, "#d9cfc0", { x, z, r: 0, shadow: false }); // skirting
  // subway-tile backsplash
  const sub = canvasTex(256, 128, (x, w, h) => { x.fillStyle = "#cfe3ea"; x.fillRect(0, 0, w, h); x.fillStyle = "#e8f3f6"; for (let r = 0; r < 4; r++) for (let c = -1; c < 5; c++) x.fillRect(c * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28); });
  sub.wrapS = sub.wrapT = THREE.RepeatWrapping; sub.repeat.set(9, 1); S.plane(9, 0.75, null, { x: -1, y: 1.33, z: -4.04, material: new THREE.MeshStandardMaterial({ map: sub, roughness: 0.2 }) });
  // lower cabinets with doors + handles, counter top
  S.box(9, 0.86, 0.7, "#f6f4ef", { x: -1, z: -3.7, r: 0.02 }); S.box(9.1, 0.06, 0.8, "#c7bba8", { x: -1, y: 0.86, z: -3.68, r: 0.02 });
  for (let k = 0; k < 9; k++) { const x = -5.25 + k * 1.0; S.box(0.94, 0.72, 0.03, "#ffffff", { x, y: 0.07, z: -3.34, r: 0.02, shadow: false }); S.box(0.04, 0.22, 0.04, "#8a96a3", { x: x + (k % 2 ? -0.36 : 0.36), y: 0.45, z: -3.31, r: 0.01, shadow: false }); }
  // upper cabinets
  for (let k = 0; k < 7; k++) { const x = -5 + k * 1.3 + (k > 2 ? 1.5 : 0); S.box(1.2, 0.8, 0.4, "#f6f4ef", { x, y: 1.8, z: -3.95, r: 0.03 }); S.box(0.04, 0.2, 0.04, "#8a96a3", { x: x + 0.45, y: 1.92, z: -3.74, r: 0.01, shadow: false }); }
  // sink + tap
  S.box(0.9, 0.04, 0.5, "#9aa5b1", { x: -3.2, y: 0.9, z: -3.62, r: 0.02, metal: 0.6, rough: 0.2 }); const tap = S.group({ x: -3.2, y: 0.92, z: -3.95 }); S.cyl(0.03, 0.03, 0.38, "#c9ced6", { metal: 0.8, rough: 0.2 }, tap); S.box(0.06, 0.05, 0.28, "#c9ced6", { y: 0.36, z: 0.12, metal: 0.8, rough: 0.2 }, tap);
  // stove with burners + oven window
  S.box(0.95, 0.05, 0.62, "#2d3035", { x: -1.4, y: 0.89, z: -3.68, r: 0.02 }); for (const [dx, dz] of [[-0.22, -0.13], [0.22, -0.13], [-0.22, 0.13], [0.22, 0.13]]) S.cyl(0.1, 0.1, 0.02, "#111", { x: -1.4 + dx, y: 0.94, z: -3.68 + dz, shadow: false });
  S.box(0.7, 0.4, 0.03, "#1f2b3a", { x: -1.4, y: 0.2, z: -3.32, r: 0.03, rough: 0.1 });
  // microwave, toaster, kettle, fruit bowl, utensil jar, cutting board
  S.box(0.6, 0.36, 0.4, "#e9ecef", { x: 0.6, y: 0.89, z: -3.78, r: 0.04 }); S.box(0.36, 0.24, 0.02, "#1f2b3a", { x: 0.55, y: 0.95, z: -3.57, r: 0.02 });
  S.box(0.3, 0.2, 0.18, "#e63946", { x: 1.5, y: 0.89, z: -3.7, r: 0.06 }); S.cyl(0.1, 0.12, 0.24, "#457b9d", { x: 2.1, y: 0.89, z: -3.7 });
  S.cyl(0.22, 0.14, 0.12, "#f4a261", { x: -2.4, y: 0.89, z: -3.65 }); for (let k = 0; k < 5; k++) S.ball(0.07, ["#e63946", "#ffd23a", "#2a9d8f", "#f77f00", "#e63946"][k], { x: -2.4 + (k - 2) * 0.07, y: 1.05 + (k % 2) * 0.05, z: -3.65 + (k % 3 - 1) * 0.05 });
  S.cyl(0.07, 0.07, 0.2, "#6d6875", { x: -0.6, y: 0.89, z: -3.8 }); for (let k = 0; k < 3; k++) S.cyl(0.012, 0.012, 0.28, "#c9ced6", { x: -0.62 + k * 0.03, y: 1.0, z: -3.8, rz: (k - 1) * 0.2 });
  S.box(0.5, 0.03, 0.32, "#d4a373", { x: -4.6, y: 0.89, z: -3.68, r: 0.01 });
  // big fridge with two doors, magnets and a note
  S.box(1.1, 2.3, 0.8, "#e9edf1", { x: 4.8, z: -3.6, r: 0.06, metal: 0.2, rough: 0.25 }); S.box(1.12, 0.03, 0.02, "#b8c2cc", { x: 4.8, y: 1.45, z: -3.19, r: 0 });
  for (const y of [0.9, 1.8]) S.box(0.05, 0.45, 0.05, "#8a96a3", { x: 4.35, y, z: -3.17, r: 0.02 }); S.box(0.22, 0.28, 0.01, "#fff3b0", { x: 4.95, y: 1.7, z: -3.19, r: 0, shadow: false }); for (const [x, y, c] of [[5.1, 1.1, "#e63946"], [4.7, 1.2, "#2a9d8f"], [5.0, 0.7, "#ffd23a"]]) S.cyl(0.04, 0.04, 0.02, c, { x, y, z: -3.19, rx: Math.PI / 2, shadow: false });
  // window with curtains + plant on the sill
  const win = S.screen(2.0, 1.3, (x, w, h, t) => { const g = x.createLinearGradient(0, 0, 0, h); if (o.night) { g.addColorStop(0, "#0b1430"); g.addColorStop(1, "#28406e"); } else { g.addColorStop(0, "#6ec6ff"); g.addColorStop(1, "#d7f1ff"); } x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (o.night) { x.fillStyle = "#f1f3f8"; x.beginPath(); x.arc(w * 0.7, h * 0.3, 18, 0, 7); x.fill(); x.fillStyle = "#fff"; for (let k = 0; k < 20; k++) x.fillRect(rnd(k) * w, rnd(k * 3) * h * 0.6, 2, 2); } else { x.fillStyle = "#7bd389"; x.beginPath(); x.ellipse(w * 0.3, h, 120, 50, 0, 0, 7); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.ellipse(w * 0.7, h * 0.25, 40, 14, 0, 0, 7); x.fill(); }
    x.fillStyle = "#fff"; x.fillRect(w / 2 - 4, 0, 8, h); x.fillRect(0, h / 2 - 4, w, 8); }, { x: 1.2, y: 1.95, z: -4.04, res: 256 });
  S.box(2.2, 0.1, 0.22, "#ffffff", { x: 1.2, y: 1.24, z: -3.98, r: 0.03 }); S.box(2.2, 0.08, 0.08, "#ffffff", { x: 1.2, y: 2.62, z: -4.0, r: 0.02 });
  for (const sx of [-1, 1]) S.box(0.45, 1.6, 0.06, "#f4a261", { x: 1.2 + sx * 1.25, y: 1.15, z: -3.98, r: 0.03 });
  S.cyl(0.1, 0.08, 0.14, "#bc6c25", { x: 1.8, y: 1.29, z: -3.96 }); for (let k = 0; k < 4; k++) S.ball(0.08, "#52b788", { x: 1.8 + (k - 1.5) * 0.06, y: 1.48 + (k % 2) * 0.06, z: -3.96, detail: 1, flat: true });
  // pictures on the wall
  for (const [x, c] of [[-4.6, "#e76f51"], [3.2, "#2a9d8f"]]) { S.box(0.8, 0.6, 0.04, "#6b4226", { x, y: 2.75, z: -4.02, r: 0.01 }); S.box(0.66, 0.46, 0.02, c, { x, y: 2.82, z: -4.0, r: 0, shadow: false }); S.ball(0.1, "#ffd23a", { x: x + 0.15, y: 3.15, z: -3.98, shadow: false }); }
  // big plant in the corner, rug, hanging lamps
  S.cyl(0.28, 0.22, 0.5, "#bc6c25", { x: -5.7, z: -3.0 }); for (let k = 0; k < 7; k++) S.ball(0.3, k % 2 ? "#40916c" : "#52b788", { x: -5.7 + Math.cos(k) * 0.25, y: 0.75 + (k % 3) * 0.25, z: -3.0 + Math.sin(k) * 0.25, detail: 1, flat: true });
  S.cyl(1.7, 1.7, 0.01, "#e9c46a", { y: 0.005, z: 0.1, shadow: false }).scale.set(1.3, 1, 0.9); S.cyl(1.5, 1.5, 0.012, "#e76f51", { y: 0.006, z: 0.1, shadow: false }).scale.set(1.3, 1, 0.9);
  for (const x of [-0.5, 0.6]) { S.cyl(0.01, 0.01, 1.2, "#333", { x, y: 2.6, z: 0, shadow: false }); S.cyl(0.08, 0.3, 0.28, "#264653", { x, y: 2.35, z: 0, shadow: false }); S.ball(0.08, "#fff6d8", { x, y: 2.33, z: 0, emissive: "#ffe9a8", ei: 1.5, shadow: false }); }
  // clock
  const clockG = S.group({ x: -2.4, y: 2.75, z: -4.03 }); S.cyl(0.32, 0.32, 0.06, "#ffffff", { rx: Math.PI / 2 }, clockG).position.set(0, 0, 0);
  const clock = S.screen(0.56, 0.56, (x, w, h, t) => { const hrs = o.clock ? o.clock(t) : 9; x.clearRect(0, 0, w, h); x.fillStyle = "#fff"; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = "#222"; x.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; x.lineWidth = 4; x.beginPath(); x.moveTo(w / 2 + Math.sin(a) * w * 0.4, h / 2 - Math.cos(a) * h * 0.4); x.lineTo(w / 2 + Math.sin(a) * w * 0.44, h / 2 - Math.cos(a) * h * 0.44); x.stroke(); }
    const hand = (a, l, lw) => { x.lineWidth = lw; x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2 + Math.sin(a) * l, h / 2 - Math.cos(a) * l); x.stroke(); }; hand(hrs / 12 * Math.PI * 2, w * 0.24, 8); hand((hrs % 1) * Math.PI * 2, w * 0.36, 5); }, { z: 0.035, res: 128 }, clockG);
  clock.material.transparent = true;
  // wrappers all over the floor
  const wr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.008, 0.1), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2 }), 160); wr.userData.noOutline = true;
  for (let i = 0; i < 160; i++) { const a = rnd(i * 3.1) * 6.28, r = 1.2 + rnd(i * 5.7) * 4.2; setBar(wr, i, Math.cos(a) * r * 1.2, 0.005, -0.6 + Math.sin(a) * r * 0.7, 0, rnd(i) * 6, (rnd(i * 2) - 0.5) * 0.3); wr.setColorAt(i, new THREE.Color(WRAP[i % WRAP.length])); }
  wr.instanceMatrix.needsUpdate = true; S.scene.add(wr);
  if (o.night) { S.hemi.intensity = 0.9; S.sun.intensity = 0.6; S.light("#ffd9a0", 30, 12, { x: 0, y: 2.3, z: 0.3 }); }
  return { clock, win };
}
function table(S, p = {}) { const g = S.group(p); S.box(2.0, 0.08, 1.1, "#c68b59", { y: 0.72, r: 0.03 }, g); for (const [x, z] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]]) S.box(0.08, 0.72, 0.08, "#a8723f", { x, z, r: 0.02 }, g);
  S.cyl(0.18, 0.16, 0.02, "#ffffff", { x: -0.62, y: 0.8, z: 0.28 }, g); S.cyl(0.05, 0.045, 0.16, "#f1faee", { x: -0.75, y: 0.8, z: -0.3, opacity: 0.85 }, g); S.box(0.16, 0.01, 0.16, "#ffd6e0", { x: -0.45, y: 0.8, z: 0.4, r: 0 }, g); return g; }
function chair(S, p = {}) { const g = S.group(p); S.box(0.5, 0.06, 0.5, "#e76f51", { y: 0.44, r: 0.02 }, g); S.box(0.06, 0.6, 0.5, "#e76f51", { x: -0.24, y: 0.47, r: 0.02 }, g); for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) S.box(0.05, 0.44, 0.05, "#c4553a", { x, z, r: 0.01 }, g); return g; }
function seatedMan(S, o = {}) { chair(S, { x: -1.25, z: 0 }); const man = new Stick(S, { x: -1.22, z: 0.02 }); return man; }
function house(S, p = {}) {
  const g = S.group(p), wall = p.wall || "#fdf0d5", trim = "#ffffff", k = Math.abs(Math.round((p.x || 0) * 3 + (p.z || 0) * 7));
  S.box(9, 5, 7, wall, { r: 0.05 }, g); S.box(9.2, 0.35, 7.2, "#d9cfc0", { r: 0.02 }, g); // walls + foundation
  const lod = p.lod || 0;
  // siding lines
  if (lod === 0) for (let y = 0.7; y < 5; y += 0.55) S.box(9.04, 0.03, 7.04, "rgba(0,0,0,0)", { y, r: 0, color: undefined, material: mat(new THREE.Color(wall).multiplyScalar(0.9).getStyle()), shadow: false }, g);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6.6, 3.2, 4, 1), mat(p.roof || "#c0392b", { rough: 0.5 })); roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.82); roof.position.y = 6.6; roof.castShadow = true; g.add(roof);
  S.box(0.9, 2.2, 0.9, "#9c6644", { x: 2.6, y: 5.6, z: -1, r: 0.04 }, g); S.box(1.05, 0.2, 1.05, "#7f5539", { x: 2.6, y: 7.8, z: -1, r: 0.03 }, g); // chimney
  // door with frame, knob, steps, porch roof, lamp
  S.box(1.5, 2.5, 0.12, trim, { z: 3.52, r: 0.03 }, g); S.box(1.2, 2.2, 0.12, p.door || ["#8d5524", "#264653", "#9b2226", "#2a9d8f"][k % 4], { z: 3.58, r: 0.03 }, g); S.ball(0.07, "#ffd23a", { x: 0.42, y: 1.1, z: 3.67, metal: 0.6 }, g);
  S.box(1.2, 0.08, 0.22, "#fff8e0", { y: 1.75, z: 3.66, r: 0.01, shadow: false }, g);
  if (lod < 2) for (let s = 0; s < 2; s++) S.box(2.2 - s * 0.3, 0.18, 0.6 - s * 0.2, "#cfc6b8", { y: s * 0.18, z: 3.85 - s * 0.1, r: 0.02 }, g);
  if (lod < 2) { S.box(2.6, 0.12, 1.4, trim, { y: 2.75, z: 4.1, r: 0.03 }, g); for (const x of [-1.15, 1.15]) S.cyl(0.07, 0.07, 2.75, trim, { x, z: 4.7 }, g); }
  // windows: frame, glass, cross bars, shutters, flower box
  const winC = ["#9fd3f5", "#b9e1f7"][k % 2];
  for (const [x, y] of (lod === 2 ? [[-2.8, 1.9], [2.8, 1.9]] : [[-2.8, 1.9], [2.8, 1.9], [-2.8, 3.9], [2.8, 3.9], [0, 3.9]])) {
    if (lod === 2) { S.box(1.5, 1.2, 0.1, winC, { x, y: y - 0.6, z: 3.53, r: 0.02 }, g); continue; }
    S.box(1.7, 1.4, 0.1, trim, { x, y: y - 0.7, z: 3.52, r: 0.02 }, g); S.box(1.45, 1.15, 0.1, winC, { x, y: y - 0.57, z: 3.55, r: 0.01, rough: 0.1, metal: 0.2 }, g);
    S.box(0.06, 1.15, 0.12, trim, { x, y: y - 0.57, z: 3.6, r: 0, shadow: false }, g); S.box(1.45, 0.06, 0.12, trim, { x, y: y - 0.03, z: 3.6, r: 0, shadow: false }, g);
    for (const sx of [-1, 1]) S.box(0.35, 1.3, 0.06, p.roof || "#c0392b", { x: x + sx * 1.05, y: y - 0.65, z: 3.55, r: 0.02 }, g);
    if (y < 3 && lod === 0) { S.box(1.5, 0.25, 0.3, "#8d5524", { x, y: y - 0.95, z: 3.72, r: 0.03 }, g); for (let f = 0; f < 5; f++) S.ball(0.1, ["#e63946", "#ffd23a", "#f72585", "#ffffff", "#e63946"][(f + k) % 5], { x: x - 0.55 + f * 0.27, y: y - 0.62, z: 3.75, shadow: false }, g); }
  }
  if (lod === 2) return g;
  // garage on the side
  S.box(4, 3.2, 6, wall, { x: 6.5, z: 0.5, r: 0.04 }, g); S.box(4.3, 0.25, 6.3, p.roof || "#c0392b", { x: 6.5, y: 3.2, z: 0.5, r: 0.04 }, g);
  S.box(3.2, 2.5, 0.08, "#f1f1f1", { x: 6.5, z: 3.52, r: 0.02 }, g); for (let y = 0.5; y < 2.5; y += 0.5) S.box(3.2, 0.04, 0.1, "#d0d0d0", { x: 6.5, y, z: 3.55, r: 0, shadow: false }, g);
  if (lod === 1) return g;
  // path, bushes, mailbox, lawn
  S.box(1.3, 0.04, 4.0, "#d6ccc2", { z: 6.0, r: 0, shadow: false }, g); S.box(3.4, 0.04, 4.6, "#bdb5aa", { x: 6.5, z: 5.8, r: 0, shadow: false }, g);
  for (const x of [-3.6, -2.0, 2.0, 3.6]) { const b = S.bush({ x: 0, z: 0, size: 0.9 }); S.scene.remove(b); b.position.set(x, 0, 4.2); g.add(b); }
  const mb = S.group({ x: -2.2, z: 7.6 }, g); S.box(0.1, 1.0, 0.1, "#6b4226", { r: 0.01 }, mb); S.box(0.35, 0.3, 0.55, p.roof || "#2a9d8f", { y: 1.0, r: 0.1 }, mb);
  return g;
}
// rows and rows of houses with streets and trees around the main house (left empty at "keep")
function neighborhood(S, keep = [0, 0]) {
  const walls = ["#fdf0d5", "#dbe9f6", "#f6d6d6", "#e2f0d9", "#fff1b8", "#e8dcf5", "#f3e0c7"], roofs = ["#c0392b", "#34495e", "#8e5a3c", "#2e6f9e", "#6d4c41", "#a93226"];
  for (let i = -5; i <= 5; i++) for (let j = -6; j <= 3; j++) {
    const x = i * 14, z = j * 15; if (Math.abs(x - keep[0]) < 9 && z > keep[1] - 9) continue;
    const k = Math.abs(i * 7 + j * 3), sc = 0.75 + rnd(k) * 0.2;
    const dist = Math.hypot(x - keep[0], z - keep[1]); const g = house(S, { x, z, ry: j % 2 ? Math.PI : 0, wall: walls[k % walls.length], roof: roofs[(k * 5 + j) % roofs.length], lod: dist < 22 ? 0 : dist < 40 ? 1 : 2 }); g.scale.setScalar(sc);
    if (rnd(k * 3) > 0.4) S.tree({ x: x + 6, z: z + (rnd(k) - 0.5) * 6, size: 1 + rnd(k * 9) * 0.5 });
  }
  for (let j = -6; j <= 3; j++) S.plane(170, 4, "#9aa3ab", { rx: -Math.PI / 2, y: 0.02, z: j * 15 + 7.5, material: mat("#a9b1b8", { rough: 0.9 }) });
  for (let i = -5; i <= 5; i++) S.plane(4, 160, null, { rx: -Math.PI / 2, y: 0.021, x: i * 14 + 7, z: -20, material: mat("#a9b1b8", { rough: 0.9 }) });
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
    const man = new Stick(S, { x: -0.9, z: 1.0 }); man.dir = 1;
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
    house(S, { z: 0 }); pile(S, { x: 0.5, y: 4.5, z: 0, r: 5.0, h: 26, n: 2600, seed: 17, s: 2.2 }); neighborhood(S, [0, 0]);
    for (let k = 0; k < 12; k++) S.box(0.15, 1.0, 0.15, "#ffffff", { x: -9 + k * 1.6, z: 7, r: 0.03 });
    S.box(19, 0.12, 0.1, "#ffffff", { y: 0.75, z: 7, r: 0.02 });
    const man = new Stick(S, { x: 2.6, z: 5.2 });
    return { S, update(t, d) {
      man.pose("shocked", t, { face: { look: 0 } });
      S.move(t / d, [[3, 2.2, 14], [1, 5, 0], 44], [[10, 16, 44], [0, 9, -4], 50], ease);
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
    house(S, { z: -6 }); pile(S, { x: 0.5, y: 4.5, z: -6, r: 5.0, h: 22, n: 2000, seed: 21, s: 2.2 }); neighborhood(S, [0, -6]);
    S.road(80, 7, { z: 0, ry: Math.PI / 2 }).position.set(0, 0, 4);
    const amb = ambulance(S, { x: 3.2, z: 4, ry: -Math.PI / 2 });
    const docs = [new Stick(S, { x: -1.3, z: 1.6, badge: true, shirt: "#f4f4f2", coat: true, hair: "#2b2118" }), new Stick(S, { x: -0.3, z: 1.9, badge: true, shirt: "#f4f4f2", coat: true, hair: "#c8a165" })];
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
