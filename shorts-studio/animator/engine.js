// Pip & Quack animation engine.
// Builds the toy-style 3D cast and sets, draws bold captions, and renders any moment of a Short
// as a 1080x1920 frame. Every frame is calculated from the time alone, so renders are repeatable.
import * as THREE from "three";

export { THREE };
export const W = 1080, H = 1920, FPS = 30;

// ── maths helpers ───────────────────────────────────────────
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);
export const easeIn = (x) => x * x * x;
export const back = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const pop = (t, a, d = 0.35) => back(seg(t, a, a + d)); // 0 → overshoot → 1
export const wobble = (t, f = 1, a = 1) => Math.sin(t * f * Math.PI * 2) * a;
export function rand(seed) { // deterministic random
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const lerpV = (a, b, t) => new THREE.Vector3().lerpVectors(a, b, t);

// ── materials ───────────────────────────────────────────────
const matCache = {};
export function toy(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (matCache[key] && !o.unique) return matCache[key];
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: o.rough ?? 0.38, metalness: o.metal ?? 0, clearcoat: o.coat ?? 0.7, clearcoatRoughness: 0.25,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: o.opacity != null, opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
  });
  if (!o.unique) matCache[key] = m;
  return m;
}
export const gold = () => toy(0xf2c14e, { metal: 0.85, rough: 0.28, coat: 0.4 });

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m); return m;
}
const sphere = (r, ws = 32, hs = 24) => new THREE.SphereGeometry(r, ws, hs);
const ell = (rx, ry, rz, mat, x, y, z, parent) => { const m = mesh(sphere(1), mat, x, y, z, parent); m.scale.set(rx, ry, rz); return m; };

// ── eyes, mouth (shared by the cast) ────────────────────────
function makeEye(parent, x, y, z, r, o = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const ball = ell(r * 0.82, r, r * 0.55, toy(0x101114, { rough: 0.12, coat: 1 }), 0, 0, 0, g);
  const hi = mesh(sphere(r * 0.24, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), r * 0.28, r * 0.36, r * 0.48, g);
  const hi2 = mesh(sphere(r * 0.11, 10, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), -r * 0.22, -r * 0.3, r * 0.5, g);
  hi.castShadow = hi2.castShadow = false;
  if (o.lid) { // sleepy half-closed lid
    const lid = mesh(new THREE.SphereGeometry(r * 1.06, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toy(o.lid), 0, 0, 0, g);
    lid.scale.set(0.86, 1, 0.62); lid.rotation.x = o.lidAngle ?? 0.35; g.userData.lid = lid;
  }
  return g;
}
function makeMouth(parent, y, z, w, o = {}) {
  const g = new THREE.Group(); g.position.set(0, y, z); parent.add(g);
  const smile = mesh(new THREE.TorusGeometry(w, w * 0.22, 8, 20, Math.PI), toy(o.line ?? 0x3a1a12), 0, 0, 0, g);
  smile.rotation.z = Math.PI; if (o.flat) { smile.scale.y = 0.25; }
  const open = ell(w * 0.95, w * 0.8, w * 0.4, toy(0x2a0b0b, { rough: 0.5 }), 0, -w * 0.25, 0, g);
  const tongue = ell(w * 0.55, w * 0.3, w * 0.3, toy(0xff6b7a), 0, -w * 0.6, w * 0.12, g);
  open.add(tongue); tongue.position.set(0, -0.45, 0.35); tongue.scale.set(0.6, 0.38, 0.6);
  return { g, smile, open };
}

function makeShades(parent, x, y, z, w, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g); g.visible = false;
  [-1, 1].forEach((k) => ell(w * 0.42, w * 0.28, w * 0.1, toy(0x111111, { rough: 0.05 }), k * w * 0.5, 0, 0, g));
  mesh(new THREE.BoxGeometry(w * 1.3, w * 0.08, w * 0.06), toy(0x111111), 0, w * 0.15, 0, g);
  return g;
}
// Generic rig update. p = pose values for this frame.
export function pose(c, p = {}) {
  const r = c.root;
  if (p.pos) r.position.copy(p.pos);
  if (p.x != null) r.position.x = p.x; if (p.y != null) r.position.y = p.y; if (p.z != null) r.position.z = p.z;
  r.rotation.y = p.rotY ?? 0;
  r.rotation.z = p.tilt ?? 0;
  r.visible = p.visible ?? true;
  const walk = p.walk ?? 0, amt = p.walkAmt ?? 0;
  const sw = Math.sin(walk * Math.PI * 2);
  if (c.legL) { c.legL.rotation.x = sw * 0.75 * amt; c.legR.rotation.x = -sw * 0.75 * amt; }
  const bob = Math.abs(Math.cos(walk * Math.PI * 2)) * 0.07 * amt + (p.hop ?? 0);
  const sq = p.squash ?? 0;
  c.body.position.y = c.bodyY + bob;
  c.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
  c.body.rotation.x = (p.lean ?? 0) + amt * 0.12;
  c.body.rotation.z = p.sway ?? 0;
  if (c.armL) {
    c.armL.rotation.x = p.armLx ?? -sw * 0.8 * amt; c.armR.rotation.x = p.armRx ?? sw * 0.8 * amt;
    c.armL.rotation.z = p.armLz ?? c.armRest; c.armR.rotation.z = -(p.armRz ?? c.armRest);
  }
  if (c.head) { c.head.rotation.y = p.lookY ?? 0; c.head.rotation.x = p.lookX ?? 0; c.head.rotation.z = p.headTilt ?? 0; }
  const blink = p.blink ?? 0, eyeS = p.eyeScale ?? 1;
  c.eyes.forEach((e) => e.scale.set(eyeS, eyeS * Math.max(0.08, 1 - blink), eyeS));
  if (c.mouth) {
    const mo = clamp(p.mouth ?? 0, 0, 1.4);
    c.mouth.open.visible = mo > 0.08; c.mouth.smile.visible = mo <= 0.08;
    c.mouth.open.scale.y = c.mouth.openBaseY * (0.25 + mo);
    c.mouth.g.scale.setScalar(p.mouthSize ?? 1);
  }
  if (c.extra) c.extra(p);
}
// natural blinking from time + seed
export const blinkAt = (t, seed = 1) => { const x = (t * 0.45 + seed * 0.37) % 1; return x < 0.05 ? Math.sin((x / 0.05) * Math.PI) : 0; };

// ── THE CAST ────────────────────────────────────────────────
function finish(c) { if (c.mouth) c.mouth.openBaseY = c.mouth.open.scale.y; c.root.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; }); return c; }

export function makePip() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const c = { name: "Pip", root, body, bodyY: 0.22, armRest: 0.35 };
  body.position.y = c.bodyY;
  const skin = toy(0xff8a2a);
  ell(0.4, 0.47, 0.37, skin, 0, 0.5, 0, body); // bean
  const shirt = ell(0.415, 0.27, 0.385, toy(0xf7f4ee, { rough: 0.6, coat: 0.2 }), 0, 0.3, 0, body);
  // lightning bolt
  const bolt = new THREE.Shape(); [[0.02, 0.12], [-0.06, -0.01], [0, -0.01], [-0.03, -0.12], [0.07, 0.03], [0.01, 0.03], [0.04, 0.12]].forEach(([x, y], i) => (i ? bolt.lineTo(x, y) : bolt.moveTo(x, y)));
  const bm = mesh(new THREE.ExtrudeGeometry(bolt, { depth: 0.02, bevelEnabled: false }), toy(0xffc83d, { emissive: 0x332200 }), 0, 0.32, 0.37, body);
  bm.rotation.x = -0.25;
  // eyes + mouth on the front of the bean
  const face = new THREE.Group(); body.add(face); c.head = face;
  c.eyes = [makeEye(face, -0.13, 0.66, 0.3, 0.1), makeEye(face, 0.13, 0.66, 0.3, 0.1)];
  c.mouth = makeMouth(face, 0.5, 0.36, 0.06);
  c.shades = makeShades(face, 0, 0.67, 0.4, 0.26);
  c.extra = (p) => { c.shades.visible = !!p.sunglasses; };
  ell(0.05, 0.03, 0.02, toy(0xff6a3d, { opacity: 0.55 }), -0.25, 0.55, 0.29, face); // cheeks
  ell(0.05, 0.03, 0.02, toy(0xff6a3d, { opacity: 0.55 }), 0.25, 0.55, 0.29, face);
  // backwards red cap
  const cap = new THREE.Group(); cap.position.set(0, 0.86, -0.02); cap.rotation.x = -0.12; face.add(cap);
  const capM = toy(0xe8302e);
  const dome = mesh(new THREE.SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, 0, 0, cap); dome.scale.set(1, 0.72, 1);
  const brim = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 32, 1, false, 0, Math.PI), capM, 0, 0.01, -0.22, cap); brim.rotation.y = Math.PI / 2; brim.scale.set(1, 1, 0.9);
  mesh(sphere(0.035), capM, 0, 0.22, 0, cap);
  // arms
  c.armL = new THREE.Group(); c.armL.position.set(-0.38, 0.36, 0); body.add(c.armL);
  c.armR = new THREE.Group(); c.armR.position.set(0.38, 0.36, 0); body.add(c.armR);
  [c.armL, c.armR].forEach((a) => { mesh(new THREE.CapsuleGeometry(0.055, 0.17, 6, 12), skin, 0, -0.12, 0, a); c[a === c.armL ? "handL" : "handR"] = mesh(sphere(0.07), skin, 0, -0.25, 0, a); });
  // legs + sneakers
  const mkLeg = (x) => { const g = new THREE.Group(); g.position.set(x, 0.1, 0); body.add(g);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12), skin, 0, -0.08, 0, g);
    const shoe = ell(0.1, 0.065, 0.14, toy(0xe8302e), 0, -0.19, 0.04, g);
    ell(0.105, 0.025, 0.145, toy(0xffffff), 0, -0.235, 0.04, g); return g; };
  c.legL = mkLeg(-0.15); c.legR = mkLeg(0.15);
  return finish(c);
}

export function makeQuack(o = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const c = { name: "Quack", root, body, bodyY: 0 };
  const yel = toy(0xffd23a, { rough: 0.25, coat: 1 });
  ell(0.26, 0.2, 0.31, yel, 0, 0.2, 0, body);
  const tail = mesh(new THREE.ConeGeometry(0.09, 0.18, 16), yel, 0, 0.32, -0.27, body); tail.rotation.x = -0.9;
  ell(0.05, 0.13, 0.18, yel, -0.25, 0.22, -0.02, body).rotation.z = 0.3; // wings
  ell(0.05, 0.13, 0.18, yel, 0.25, 0.22, -0.02, body).rotation.z = -0.3;
  const head = new THREE.Group(); head.position.set(0, 0.42, 0.12); body.add(head); c.head = head;
  ell(0.19, 0.18, 0.18, yel, 0, 0, 0, head);
  c.beak = ell(0.1, 0.04, 0.11, toy(0xff7a1a), 0, -0.03, 0.17, head);
  ell(0.09, 0.025, 0.1, toy(0xff7a1a), 0, -0.07, 0.15, head);
  c.eyes = [makeEye(head, -0.08, 0.05, 0.14, 0.045), makeEye(head, 0.08, 0.05, 0.14, 0.045)];
  // snorkel mask pushed up on the head
  const mask = new THREE.Group(); mask.position.set(0, 0.15, 0.04); mask.rotation.x = -0.5; head.add(mask); mask.visible = o.mask !== false;
  const ring = mesh(new THREE.TorusGeometry(0.1, 0.025, 10, 24), toy(0x2f7df6), 0, 0, 0.08, mask); ring.scale.set(1.3, 0.8, 1);
  const glass = ell(0.12, 0.07, 0.01, toy(0xbfe8ff, { opacity: 0.5, rough: 0.05 }), 0, 0, 0.08, mask);
  const strap = mesh(new THREE.TorusGeometry(0.18, 0.015, 8, 30), toy(0x2f7df6), 0, 0, -0.04, mask); strap.rotation.x = Math.PI / 2;
  // sunglasses (hidden until needed)
  const sun = new THREE.Group(); sun.position.set(0, 0.04, 0.17); head.add(sun); sun.visible = false; c.sunglasses = sun;
  [-0.07, 0.07].forEach((x) => ell(0.06, 0.04, 0.015, toy(0x111111, { rough: 0.05 }), x, 0, 0, sun));
  mesh(new THREE.BoxGeometry(0.18, 0.012, 0.01), toy(0x111111), 0, 0.02, 0, sun);
  c.extra = (p) => { sun.visible = !!p.sunglasses; };
  return finish(c);
}

export function makeMo() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const c = { name: "Mo", root, body, bodyY: 0.62, armRest: 0.12 };
  body.position.y = c.bodyY;
  const skin = toy(0x9ec9ff), hood = toy(0x8a8f99, { rough: 0.75, coat: 0.1 }), pants = toy(0x2d3140, { rough: 0.7, coat: 0.1 });
  mesh(new THREE.CapsuleGeometry(0.26, 0.55, 8, 20), hood, 0, 0.42, 0, body); // hoodie
  mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), toy(0x7c818b, { rough: 0.8, coat: 0 }), 0, 0.2, 0.25, body); // pocket
  const head = new THREE.Group(); head.position.set(0, 1.0, 0.02); body.add(head); c.head = head;
  ell(0.25, 0.28, 0.24, skin, 0, 0.05, 0, head);
  const hoodRing = mesh(new THREE.TorusGeometry(0.27, 0.07, 12, 30, Math.PI * 1.25), hood, 0, 0.05, -0.06, head); hoodRing.rotation.set(0.2, 0, -Math.PI * 0.125);
  const hair = toy(0x15161c, { rough: 0.6 });
  [[-0.12, 0.27, 0.05, 0.11], [0.02, 0.31, 0.02, 0.12], [0.14, 0.26, 0.04, 0.1], [-0.02, 0.27, 0.13, 0.09], [0.1, 0.22, 0.14, 0.07]].forEach(([x, y, z, r]) => mesh(sphere(r, 16, 12), hair, x, y, z, head));
  c.eyes = [makeEye(head, -0.09, 0.08, 0.2, 0.06, { lid: 0x8fbaf0, lidAngle: 0.2 }), makeEye(head, 0.09, 0.08, 0.2, 0.06, { lid: 0x8fbaf0, lidAngle: 0.2 })];
  c.mouth = makeMouth(head, -0.08, 0.22, 0.045, { flat: true });
  const phones = new THREE.Group(); head.add(phones); phones.visible = false; c.phones = phones;
  const band = mesh(new THREE.TorusGeometry(0.29, 0.03, 8, 30, Math.PI), toy(0x222228), 0, 0.06, 0, phones);
  const cupL = new THREE.Group(); cupL.position.set(-0.27, 0.04, 0); phones.add(cupL);
  const cupR = new THREE.Group(); cupR.position.set(0.27, 0.04, 0); phones.add(cupR);
  [cupL, cupR].forEach((g, k) => { const m = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 20), toy(0xe8302e), 0, 0, 0, g); m.rotation.z = Math.PI / 2; });
  c.extra = (p) => { phones.visible = !!p.headphones; cupR.position.x = 0.27 + (p.liftPhone ?? 0) * 0.12; cupR.position.y = 0.04 + (p.liftPhone ?? 0) * 0.1; };
  // arms go into the hoodie pocket
  c.armL = new THREE.Group(); c.armL.position.set(-0.27, 0.62, 0); body.add(c.armL);
  c.armR = new THREE.Group(); c.armR.position.set(0.27, 0.62, 0); body.add(c.armR);
  [c.armL, c.armR].forEach((a) => mesh(new THREE.CapsuleGeometry(0.075, 0.32, 6, 12), hood, 0, -0.2, 0, a));
  const mkLeg = (x) => { const g = new THREE.Group(); g.position.set(x, 0.05, 0); body.add(g);
    mesh(new THREE.CapsuleGeometry(0.08, 0.42, 6, 12), pants, 0, -0.3, 0, g);
    ell(0.1, 0.06, 0.15, toy(0xf2f2f2), 0, -0.6, 0.04, g); return g; };
  c.legL = mkLeg(-0.12); c.legR = mkLeg(0.12);
  return finish(c);
}

export function makeBucks() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const c = { name: "Mr. Bucks", root, body, bodyY: 0.28, armRest: 0.5 };
  body.position.y = c.bodyY;
  const suit = toy(0x6b2fb3, { rough: 0.55, coat: 0.3 }), skin = gold();
  ell(0.5, 0.48, 0.45, suit, 0, 0.45, 0, body);
  [0.55, 0.38, 0.22].forEach((y) => mesh(sphere(0.03, 12, 8), gold(), 0, y, 0.44, body));
  mesh(new THREE.ConeGeometry(0.09, 0.14, 4), toy(0xffffff), 0, 0.82, 0.3, body).rotation.x = Math.PI; // shirt collar
  const head = new THREE.Group(); head.position.set(0, 1.08, 0); body.add(head); c.head = head;
  ell(0.31, 0.3, 0.29, skin, 0, 0, 0, head);
  c.eyes = [makeEye(head, -0.11, 0.06, 0.24, 0.065), makeEye(head, 0.11, 0.06, 0.24, 0.065)];
  const mono = mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 24), gold(), 0.11, 0.06, 0.28, head);
  mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.35), gold(), 0.19, -0.1, 0.24, head).rotation.z = 0.3;
  const stache = toy(0xffffff, { rough: 0.6 });
  [-1, 1].forEach((s) => { const m = mesh(new THREE.TorusGeometry(0.08, 0.035, 10, 20, Math.PI * 1.3), stache, s * 0.08, -0.09, 0.27, head); m.rotation.z = s > 0 ? -0.2 : Math.PI + 0.2; m.rotation.y = s * -0.3; });
  c.mouth = makeMouth(head, -0.16, 0.26, 0.05);
  const hat = new THREE.Group(); hat.position.set(0, 0.24, 0); hat.rotation.z = -0.08; head.add(hat);
  const blk = toy(0x15151a, { rough: 0.4 });
  mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 32), blk, 0, 0, 0, hat);
  mesh(new THREE.CylinderGeometry(0.21, 0.2, 0.42, 32), blk, 0, 0.22, 0, hat);
  mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.08, 32), toy(0x8a3fe0), 0, 0.06, 0, hat);
  c.armL = new THREE.Group(); c.armL.position.set(-0.45, 0.62, 0); body.add(c.armL);
  c.armR = new THREE.Group(); c.armR.position.set(0.45, 0.62, 0); body.add(c.armR);
  [c.armL, c.armR].forEach((a) => { mesh(new THREE.CapsuleGeometry(0.09, 0.25, 6, 12), suit, 0, -0.18, 0, a); mesh(sphere(0.09), toy(0xffffff, { rough: 0.6 }), 0, -0.36, 0, a); });
  // gold cane in right hand
  const cane = new THREE.Group(); cane.position.set(0, -0.36, 0.05); c.armR.add(cane); c.cane = cane;
  mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.9, 12), gold(), 0, -0.42, 0, cane);
  mesh(sphere(0.06), gold(), 0, 0.04, 0, cane);
  const mkLeg = (x) => { const g = new THREE.Group(); g.position.set(x, 0.05, 0); body.add(g);
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12), suit, 0, -0.1, 0, g);
    ell(0.11, 0.06, 0.16, blk, 0, -0.22, 0.04, g); return g; };
  c.legL = mkLeg(-0.2); c.legR = mkLeg(0.2);
  return finish(c);
}

export function makeGranny() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const c = { name: "Granny Volt", root, body, bodyY: 0.55, armRest: 0.4 };
  body.position.y = c.bodyY;
  // scooter (part of root, not body)
  const scooter = new THREE.Group(); root.add(scooter); c.scooter = scooter;
  const red = toy(0xe8302e), blk = toy(0x1a1a1f, { rough: 0.6 });
  mesh(new THREE.BoxGeometry(0.55, 0.12, 1.0), red, 0, 0.22, 0, scooter);
  mesh(new THREE.BoxGeometry(0.5, 0.12, 0.4), toy(0x222228, { rough: 0.7 }), 0, 0.5, -0.15, scooter); // seat
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), toy(0xcccccc, { metal: 0.8, rough: 0.3 }), 0, 0.5, 0.42, scooter).rotation.x = -0.3;
  mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), blk, 0, 0.8, 0.5, scooter);
  mesh(new THREE.BoxGeometry(0.3, 0.2, 0.22), toy(0xd8d8d8, { metal: 0.6, rough: 0.35 }), 0, 0.42, 0.6, scooter); // basket
  [[-0.3, 0.35], [0.3, 0.35], [-0.3, -0.35], [0.3, -0.35]].forEach(([x, z]) => { const w = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20), blk, x, 0.12, z, scooter); w.rotation.z = Math.PI / 2; });
  const rocket = mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.45, 20), toy(0xbfc3cc, { metal: 0.8, rough: 0.3 }), 0, 0.4, -0.55, scooter); rocket.rotation.x = Math.PI / 2;
  const flame = mesh(new THREE.ConeGeometry(0.13, 0.6, 16), new THREE.MeshBasicMaterial({ color: 0xffa133, transparent: true, opacity: 0.9 }), 0, 0.4, -1.05, scooter);
  flame.rotation.x = -Math.PI / 2; flame.castShadow = false; c.flame = flame;
  const inner = mesh(new THREE.ConeGeometry(0.07, 0.35, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }), 0, 0.08, 0, flame); inner.castShadow = false;
  // granny
  const cardi = toy(0x3fae5a, { rough: 0.8, coat: 0.1 }), skin = toy(0xffd7b8);
  ell(0.24, 0.28, 0.22, cardi, 0, 0.12, 0, body);
  const head = new THREE.Group(); head.position.set(0, 0.52, 0.02); body.add(head); c.head = head;
  ell(0.2, 0.21, 0.19, skin, 0, 0, 0, head);
  const hair = toy(0xf4f4f4, { rough: 0.8 });
  ell(0.21, 0.13, 0.2, hair, 0, 0.11, -0.02, head);
  mesh(sphere(0.1), hair, 0, 0.25, -0.08, head);
  c.eyes = [makeEye(head, -0.07, 0.03, 0.16, 0.035), makeEye(head, 0.07, 0.03, 0.16, 0.035)];
  [-0.07, 0.07].forEach((x) => mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 20), toy(0xff7fbf), x, 0.03, 0.19, head));
  c.mouth = makeMouth(head, -0.08, 0.18, 0.035);
  c.armL = new THREE.Group(); c.armL.position.set(-0.22, 0.25, 0); body.add(c.armL);
  c.armR = new THREE.Group(); c.armR.position.set(0.22, 0.25, 0); body.add(c.armR);
  [c.armL, c.armR].forEach((a) => { mesh(new THREE.CapsuleGeometry(0.05, 0.18, 6, 12), cardi, 0, -0.12, 0, a); mesh(sphere(0.05), skin, 0, -0.24, 0, a); });
  c.extra = (p) => { const f = p.flame ?? 0; c.flame.visible = f > 0.02; c.flame.scale.set(1, f * (0.85 + 0.15 * Math.sin(p.t * 60)), 1); };
  return finish(c);
}

// ── props ───────────────────────────────────────────────────
export function makeBucket() {
  const g = new THREE.Group();
  const red = toy(0xe23b2e, { side: THREE.DoubleSide });
  mesh(new THREE.CylinderGeometry(0.27, 0.2, 0.38, 32, 1, true), red, 0, 0.19, 0, g);
  const bottom = mesh(new THREE.RingGeometry(0.07, 0.2, 32), red, 0, 0.005, 0, g); bottom.rotation.x = -Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.27, 0.015, 8, 40), red, 0, 0.38, 0, g).rotation.x = Math.PI / 2;
  const handle = mesh(new THREE.TorusGeometry(0.26, 0.01, 6, 30, Math.PI), toy(0xcccccc, { metal: 0.8 }), 0, 0.38, 0, g);
  handle.rotation.y = Math.PI / 2;
  const water = mesh(new THREE.CircleGeometry(1, 32), toy(0x4fc3f7, { rough: 0.05, opacity: 0.85 }), 0, 0.02, 0, g);
  water.rotation.x = -Math.PI / 2; water.castShadow = false;
  g.userData.setWater = (lvl) => { water.visible = lvl > 0.01; water.position.y = 0.02 + 0.34 * lvl; water.scale.setScalar(lerp(0.2, 0.265, lvl)); };
  g.userData.setWater(0);
  return g;
}
export function makeBriefcase() {
  const g = new THREE.Group();
  const brown = toy(0x6b3a1f, { rough: 0.5 });
  mesh(new THREE.BoxGeometry(0.62, 0.08, 0.42), brown, 0, 0.04, 0, g);
  const lid = new THREE.Group(); lid.position.set(0, 0.08, -0.21); g.add(lid);
  mesh(new THREE.BoxGeometry(0.62, 0.42, 0.06), brown, 0, 0.21, -0.03, lid); lid.rotation.x = -0.3;
  const cash = toy(0x4caf50, { rough: 0.7, coat: 0.1 }), band = toy(0xf2e6b8, { rough: 0.7 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) {
    mesh(new THREE.BoxGeometry(0.18, 0.05, 0.17), cash, -0.19 + i * 0.19, 0.1 + k * 0.055, -0.09 + j * 0.18, g);
    mesh(new THREE.BoxGeometry(0.04, 0.052, 0.172), band, -0.19 + i * 0.19, 0.1 + k * 0.055, -0.09 + j * 0.18, g);
  }
  mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), gold(), 0, 0.06, 0.22, g);
  return g;
}
export function makeCup() {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.12, 20, 1, true), toy(0xffffff, { side: THREE.DoubleSide, rough: 0.6 }), 0, 0.06, 0, g);
  mesh(new THREE.CylinderGeometry(0.061, 0.061, 0.025, 20, 1, true), toy(0x45d6e5, { side: THREE.DoubleSide }), 0, 0.1, 0, g);
  return g;
}

// Text drawn onto a texture (signs, clocks)
export function textPanel(w, h, draw, o = {}) {
  const cv = document.createElement("canvas"); cv.width = o.px ?? 1024; cv.height = Math.round(cv.width * h / w);
  const ctx = cv.getContext("2d"); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: o.glow ?? 1, roughness: 0.4, transparent: !!o.transparent });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.redraw = (...a) => { ctx.clearRect(0, 0, cv.width, cv.height); draw(ctx, cv.width, cv.height, ...a); tex.needsUpdate = true; };
  m.userData.redraw();
  return m;
}

// Confetti burst: positions are worked out from time, so it's repeatable
export function makeConfetti(n = 420, seed = 7, colors = [0xffd23a, 0xffffff, 0xe8302e, 0x45d6e5, 0x7ee08a, 0xff8ad8]) {
  const geo = new THREE.PlaneGeometry(0.07, 0.11);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 }), n);
  const R = rand(seed), P = [];
  for (let i = 0; i < n; i++) { P.push({ v: v3((R() - 0.5) * 6, 3 + R() * 5, (R() - 0.5) * 4), w: v3(R() * 12, R() * 12, R() * 12), d: R() * 0.25, flutter: R() * 6 }); m.setColorAt(i, new THREE.Color(colors[i % colors.length])); }
  const o = new THREE.Object3D();
  m.userData.at = (t, origin = v3(0, 0, 0)) => { // t = seconds since burst
    m.visible = t >= 0 && t < 6;
    for (let i = 0; i < n; i++) {
      const p = P[i], tt = Math.max(0, t - p.d);
      const drag = 1 - Math.exp(-tt * 1.6);
      o.position.set(origin.x + p.v.x * drag / 1.6 + Math.sin(tt * p.flutter) * 0.15, origin.y + p.v.y * drag / 1.6 - 0.9 * tt * tt * 0.5 - tt * 0.6, origin.z + p.v.z * drag / 1.6);
      o.rotation.set(p.w.x * tt, p.w.y * tt, p.w.z * tt); o.scale.setScalar(t < p.d ? 0.001 : 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  m.frustumCulled = false; m.userData.at(-1);
  return m;
}
// Water droplets (spray, streams)
export function makeDrops(n = 260, seed = 3) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 8, 6), toy(0x6fd3ff, { rough: 0.05, coat: 1, opacity: 0.85 }), n);
  m.frustumCulled = false; const R = rand(seed), P = [];
  for (let i = 0; i < n; i++) P.push({ a: R(), b: R(), c: R(), ph: R() });
  const o = new THREE.Object3D();
  // spray(t, origin, dir, spread, speed, rate) — continuous stream of drops
  m.userData.spray = (t, origin, dir, { spread = 0.4, speed = 2.2, life = 0.7, on = true, gravity = 9 } = {}) => {
    m.visible = on;
    for (let i = 0; i < n; i++) {
      const p = P[i], age = ((t / life + p.ph) % 1) * life;
      const vx = dir.x * speed + (p.a - 0.5) * spread * speed, vy = dir.y * speed + (p.b - 0.5) * spread * speed, vz = dir.z * speed + (p.c - 0.5) * spread * speed;
      o.position.set(origin.x + vx * age, origin.y + vy * age - gravity * age * age / 2, origin.z + vz * age);
      o.scale.set(on ? 0.7 + p.a * 0.8 : 0.001, on ? (0.7 + p.a * 0.8) * 1.6 : 0.001, on ? 0.7 + p.a * 0.8 : 0.001); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  m.userData.spray(0, v3(0, -50, 0), v3(0, 1, 0), { on: false });
  return m;
}

// ── world: renderer, lights, camera ─────────────────────────
export function makeWorld({ bg = 0x1a0f2e, fog = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x3a2050, 0.9));
  const key = new THREE.DirectionalLight(0xfff0dd, 2.4); key.position.set(4, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 40 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key); scene.add(key.target);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.4); rim.position.set(-5, 5, -7); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffc6e8, 0.5); fill.position.set(-6, 3, 6); scene.add(fill);
  const world = { renderer, scene, camera, key };
  world.zoomOut = 1.18; world.fovAdd = 8; // portrait frames need more room than a wide screen
  world.cam = (pos, target, fov = 40, roll = 0, o = {}) => {
    const d = new THREE.Vector3().subVectors(pos, target), len = d.length();
    camera.position.copy(pos);
    if (!o.raw) camera.position.addScaledVector(d.normalize(), Math.min(len * (world.zoomOut - 1), 1.0));
    camera.fov = fov + (o.raw ? 0 : world.fovAdd); camera.updateProjectionMatrix(); camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(target);
  };
  world.shake = (amt, t) => { camera.position.x += Math.sin(t * 71) * amt; camera.position.y += Math.sin(t * 53 + 1) * amt; };
  return world;
}

// ── bold captions ───────────────────────────────────────────
// Plain bold white text with a thick black outline, 2–3 words at a time. The word being said pops in.
export function drawCaptions(ctx, t, chunks, o = {}) {
  const c = chunks.find((x) => t >= x.s && t < x.e); if (!c) return;
  const y = o.y ?? H * 0.73, size = o.size ?? 92;
  ctx.save(); ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.miterLimit = 2;
  ctx.font = `900 ${size}px Montserrat, "Arial Black", sans-serif`;
  const words = c.words.map((w) => ({ ...w, text: w.w.toUpperCase() }));
  const space = size * 0.28; const widths = words.map((w) => ctx.measureText(w.text).width);
  // wrap into lines that fit 900px
  const lines = [[]]; let lw = 0;
  words.forEach((w, i) => { if (lw + widths[i] > 920 && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(i); lw += widths[i] + space; });
  const lh = size * 1.12; const top = y - ((lines.length - 1) * lh) / 2;
  const chunkIn = back(seg(t, c.s, c.s + 0.12));
  lines.forEach((ln, li) => {
    const total = ln.reduce((a, i) => a + widths[i], 0) + space * (ln.length - 1);
    let x = W / 2 - total / 2;
    ln.forEach((i) => {
      const w = words[i]; const said = t >= w.s - 0.02;
      const p = back(seg(t, w.s - 0.02, w.s + 0.12));
      const sc = (said ? lerp(0.85, 1, p) : 0.85) * lerp(0.6, 1, chunkIn);
      const cx = x + widths[i] / 2, cy = top + li * lh;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.globalAlpha = said ? 1 : 0.0;
      ctx.lineWidth = size * 0.2; ctx.strokeStyle = "#000"; ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
      ctx.strokeText(w.text, -widths[i] / 2, 0);
      ctx.shadowColor = "transparent"; ctx.fillStyle = "#fff"; ctx.fillText(w.text, -widths[i] / 2, 0);
      ctx.restore(); x += widths[i] + space;
    });
  });
  ctx.restore();
}
// Hook title at the top for the first scene
export function drawHook(ctx, t, text, until) {
  if (t > until) return;
  const a = clamp(seg(t, 0, 0.15)) * (1 - seg(t, until - 0.2, until));
  const sc = back(seg(t, 0, 0.3));
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 250); ctx.scale(sc, sc);
  ctx.font = `900 74px Montserrat, "Arial Black", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  const lines = text.length > 18 ? splitHalf(text) : [text];
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 80, bh = lines.length * 86 + 44;
  ctx.fillStyle = "rgba(0,0,0,.72)"; roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 28); ctx.fill();
  lines.forEach((l, i) => { const yy = (i - (lines.length - 1) / 2) * 86;
    ctx.lineWidth = 16; ctx.strokeStyle = "#000"; ctx.strokeText(l, 0, yy); ctx.fillStyle = "#FFD23A"; ctx.fillText(l, 0, yy); });
  ctx.restore();
}
function splitHalf(s) { const w = s.split(" "); let best = 1, bd = 1e9; for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(" ").length - w.slice(i).join(" ").length); if (d < bd) { bd = d; best = i; } } return [w.slice(0, best).join(" "), w.slice(best).join(" ")]; }

// ── talk helper: mouth amount for a character at time t ─────
export function talker(data) {
  const lines = data.timings.flatMap((s) => s.lines);
  return (name, t) => {
    const l = lines.find((x) => x.who === name && t >= x.start - 0.02 && t <= x.end + 0.05);
    if (!l) return 0;
    const f = Math.min(data.env.length - 1, Math.max(0, Math.round(t * FPS)));
    return clamp(data.env[f] * 1.25 + 0.05, 0, 1.2);
  };
}
export const sceneOf = (data, t) => { const s = data.timings; let i = s.length - 1; while (i > 0 && t < s[i].start) i--; return { i, lt: t - s[i].start, s: s[i] }; };
// place(obj, {position, rotation, castShadow, receiveShadow}) — safe Object.assign for 3D objects
export function place(o, p = {}) {
  if (p.position) o.position.copy(p.position);
  if (p.rotation) o.rotation.copy(p.rotation);
  if (p.castShadow != null) o.castShadow = p.castShadow;
  if (p.receiveShadow != null) o.receiveShadow = p.receiveShadow;
  return o;
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// sets: move the shadow light to wherever the action is
export function lightAt(world, c) { world.key.target.position.copy(c); world.key.position.set(c.x + 4, c.y + 9, c.z + 6); world.key.target.updateMatrixWorld(); }

// background townspeople (simple beans)
export function makeBean(color = 0x7ee08a, seed = 1) {
  const R = rand(seed); const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const h = 0.8 + R() * 0.5;
  ell(0.28, h / 2, 0.26, toy(color), 0, h / 2, 0, body);
  [-1, 1].forEach((k) => { const e = ell(0.045, 0.06, 0.03, toy(0x101114, { rough: 0.1 }), k * 0.09, h * 0.7, 0.24, body); });
  const c = { root: g, body, bodyY: 0, eyes: [] }; return c;
}
export function makePalm(seed = 1) {
  const R = rand(seed); const g = new THREE.Group();
  const trunkM = toy(0x9c6b3c, { rough: 0.8, coat: 0 });
  for (let i = 0; i < 7; i++) mesh(new THREE.CylinderGeometry(0.13 - i * 0.008, 0.15 - i * 0.008, 0.45, 10), trunkM, Math.sin(i * 0.3) * 0.1 * i * 0.3, 0.22 + i * 0.42, 0, g);
  const leaf = toy(0x2fbf55, { rough: 0.6 });
  for (let k = 0; k < 7; k++) { const l = ell(0.18, 0.05, 1.1, leaf, 0, 3.0, 0, g); l.rotation.y = (k / 7) * Math.PI * 2 + R(); l.rotation.x = 0.5; l.translateZ(0.7); }
  return g;
}
export function makeHouse(color = 0xffb3a7, seed = 1) {
  const R = rand(seed); const g = new THREE.Group(); const w = 2 + R(), h = 2.2 + R() * 1.5;
  mesh(new THREE.BoxGeometry(w, h, 2), toy(color, { rough: 0.7, coat: 0.1 }), 0, h / 2, 0, g);
  const roof = mesh(new THREE.ConeGeometry(w * 0.8, 1.1, 4), toy(0xc0504d, { rough: 0.6 }), 0, h + 0.55, 0, g); roof.rotation.y = Math.PI / 4;
  [[-0.45, h * 0.62], [0.45, h * 0.62]].forEach(([x, y]) => mesh(new THREE.BoxGeometry(0.4, 0.45, 0.05), toy(0x9fd8ff, { emissive: 0x224466, ei: 0.4 }), x * w * 0.6, y, 1.01, g));
  mesh(new THREE.BoxGeometry(0.5, 0.9, 0.05), toy(0x6b3a1f), 0, 0.45, 1.01, g);
  return g;
}
