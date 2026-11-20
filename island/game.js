// Sunset Key: a small open-world island game. Everything is made in code, so nothing extra downloads.
import * as THREE from './three.module.min.js';

// ================================================================ helpers
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const wrapA = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
const angLerp = (a, b, t) => a + wrapA(b - a) * t;
let SEED = 91173;
const srnd = () => (SEED = (SEED * 16807) % 2147483647, (SEED - 1) / 2147483646);
const sr = (a, b) => a + srnd() * (b - a);
const spick = a => a[(srnd() * a.length) | 0];
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const d2 = (ax, az, bx, bz) => { const x = ax - bx, z = az - bz; return x * x + z * z; };
const fmt = n => '$' + Math.floor(n).toLocaleString('en-US');

// ================================================================ map layout
const NL = 9, SP = 66, GMIN = -264, GMAX = 264, HR = 7;
const LINES = Array.from({ length: NL }, (_, i) => GMIN + i * SP);
const SIDE_Y = 0.3, ROAD_Y = 0.1;
const RING_R = 400, RING_N = 48;
const grassR = t => 470 + 18 * Math.sin(3 * t + 1) + 12 * Math.sin(5 * t + 2) + 7 * Math.sin(9 * t + 0.5);
const sandR = t => grassR(t) + 30 + 6 * Math.sin(4 * t + 3);
const PX0 = 56, PX1 = 64;
const PZ0 = (() => { const t = Math.atan2(460, 60), g = grassR(t); return Math.sqrt(g * g - 3600) - 6; })();
const PZ1 = (() => { const t = Math.atan2(500, 60), s = sandR(t); return Math.sqrt(s * s - 3600) + 70; })();
const WORLD = 580;

// ================================================================ renderer / scene
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
const SKY = 0xbfe3ff;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 150, 480);
const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 1600);
scene.add(new THREE.HemisphereLight(0xe6f4ff, 0x7d9a62, 1.55));
const sunLight = new THREE.DirectionalLight(0xffe9cc, 2.1);
sunLight.position.set(0.6, 1, 0.3);
scene.add(sunLight);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// sky dome with a sunset-ish gradient
const sky = (() => {
  const g = new THREE.SphereGeometry(1300, 24, 12);
  const top = new THREE.Color(0x3d7fe0), mid = new THREE.Color(SKY), warm = new THREE.Color(0xffd0a8);
  const cols = [], p = g.attributes.position, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 1300;
    if (y > 0.05) c.copy(mid).lerp(top, Math.min(1, (y - 0.05) * 2.2));
    else c.copy(mid).lerp(warm, Math.min(1, (0.05 - y) * 6));
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -1;
  scene.add(m);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(60, 24), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false, depthWrite: false }));
  sunDisc.position.set(600, 700, 300).normalize().multiplyScalar(1200);
  sunDisc.lookAt(0, 0, 0);
  m.add(sunDisc);
  return m;
})();

// ================================================================ materials / colors
const colCache = {};
const C = hex => colCache[hex] || (colCache[hex] = new THREE.Color(hex));
const matCache = {};
const M = hex => matCache[hex] || (matCache[hex] = new THREE.MeshLambertMaterial({ color: hex }));
const matV = new THREE.MeshLambertMaterial({ vertexColors: true });
const matB = new THREE.MeshLambertMaterial({ vertexColors: true, map: makeWindowTex() });

function makeWindowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64);
  const g = x.createLinearGradient(0, 10, 0, 50);
  g.addColorStop(0, '#9cc0dc'); g.addColorStop(1, '#45627f');
  x.fillStyle = g; x.fillRect(12, 10, 40, 40);
  x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(15, 12, 8, 36);
  x.fillStyle = '#dedede'; x.fillRect(0, 56, 64, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 4, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2);
function addShadow(parent, w, l, y = 0.05) {
  const s = new THREE.Mesh(shadowGeo, shadowMat);
  s.scale.set(w, 1, l); s.position.y = y; s.renderOrder = 1;
  parent.add(s); return s;
}

// ================================================================ geometry builder (merges static stuff into few meshes)
const Z2 = [0, 0], UP = [0, 1, 0];
const ROOF = [[0.02, 0.5], [0.02, 0.5], [0.02, 0.5], [0.02, 0.5]];
class GB {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; }
  tri(a, b, c, col, ua = Z2, ub = Z2, uc = Z2) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.c.push(col.r, col.g, col.b, col.r, col.g, col.b, col.r, col.g, col.b);
    this.u.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  }
  quad(a, b, c, d, col, uv) {
    if (uv) { this.tri(a, b, c, col, uv[0], uv[1], uv[2]); this.tri(a, c, d, col, uv[0], uv[2], uv[3]); }
    else { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  }
  quadN(a, b, c, d, col, w) {
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (nx * w[0] + ny * w[1] + nz * w[2] < 0) this.quad(a, d, c, b, col); else this.quad(a, b, c, d, col);
  }
  triN(a, b, c, col, w) {
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (nx * w[0] + ny * w[1] + nz * w[2] < 0) this.tri(a, c, b, col); else this.tri(a, b, c, col);
  }
  flat(x0, z0, x1, z1, y, col) { this.quadN([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], col, UP); }
  strip(ax, az, bx, bz, w, y, col) { // flat rectangle along a segment
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
    this.quadN([ax + nx, y, az + nz], [bx + nx, y, bz + nz], [bx - nx, y, bz - nz], [ax - nx, y, az - nz], col, UP);
  }
  box(x0, y0, z0, x1, y1, z1, col, o = {}) {
    const top = o.top || col, ws = o.win;
    const uvw = (w, h) => ws ? [[0, 0], [w / ws, 0], [w / ws, h / ws], [0, h / ws]] : null;
    const W = x1 - x0, H = y1 - y0, D = z1 - z0;
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], top, ws ? ROOF : null);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, uvw(W, H));
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, uvw(W, H));
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, uvw(D, H));
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, uvw(D, H));
    if (o.bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col);
  }
  prism(cx, cz, r0, r1, y0, y1, n, col, top = true, a0 = 0) {
    for (let k = 0; k < n; k++) {
      const a = a0 + k / n * TAU, b = a0 + (k + 1) / n * TAU, m = (a + b) / 2;
      const p0 = [cx + Math.cos(a) * r0, y0, cz + Math.sin(a) * r0], p1 = [cx + Math.cos(b) * r0, y0, cz + Math.sin(b) * r0];
      const q0 = [cx + Math.cos(a) * r1, y1, cz + Math.sin(a) * r1], q1 = [cx + Math.cos(b) * r1, y1, cz + Math.sin(b) * r1];
      if (r1 > 0.001) this.quadN(p0, p1, q1, q0, col, [Math.cos(m), 0, Math.sin(m)]);
      else this.triN(p0, p1, q0, col, [Math.cos(m), 0.5, Math.sin(m)]);
      if (top && r1 > 0.001) this.triN([cx, y1, cz], q0, q1, col, UP);
    }
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere();
    return g;
  }
}

// ================================================================ collision grid
const CC = 16, cgrid = new Map(); let cstamp = 0;
const ckey = (i, j) => (i + 2048) * 4096 + (j + 2048);
function cAdd(o, x0, z0, x1, z1) {
  for (let i = Math.floor(x0 / CC); i <= Math.floor(x1 / CC); i++)
    for (let j = Math.floor(z0 / CC); j <= Math.floor(z1 / CC); j++) {
      const k = ckey(i, j); let cell = cgrid.get(k); if (!cell) cgrid.set(k, cell = []); cell.push(o);
    }
}
function addBox(x0, z0, x1, z1, h) { cAdd({ b: 1, x0, z0, x1, z1, h, s: 0 }, x0, z0, x1, z1); }
function addCirc(x, z, r, h = 8) { cAdd({ b: 0, x, z, r, h, s: 0 }, x - r, z - r, x + r, z + r); }
function resolve(o, r) {
  cstamp++; let res = null, best = 0;
  const i0 = Math.floor((o.x - r) / CC), i1 = Math.floor((o.x + r) / CC), j0 = Math.floor((o.z - r) / CC), j1 = Math.floor((o.z + r) / CC);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const cell = cgrid.get(ckey(i, j)); if (!cell) continue;
    for (const c of cell) {
      if (c.s === cstamp) continue; c.s = cstamp;
      let nx, nz, depth;
      if (c.b) {
        const px = clamp(o.x, c.x0, c.x1), pz = clamp(o.z, c.z0, c.z1), dx = o.x - px, dz = o.z - pz, dd = dx * dx + dz * dz;
        if (dd >= r * r) continue;
        if (dd > 1e-8) { const d = Math.sqrt(dd); nx = dx / d; nz = dz / d; depth = r - d; }
        else {
          const l = o.x - c.x0, rr = c.x1 - o.x, t = o.z - c.z0, b = c.z1 - o.z, m = Math.min(l, rr, t, b);
          if (m === l) { nx = -1; nz = 0; depth = l + r; } else if (m === rr) { nx = 1; nz = 0; depth = rr + r; }
          else if (m === t) { nx = 0; nz = -1; depth = t + r; } else { nx = 0; nz = 1; depth = b + r; }
        }
      } else {
        const dx = o.x - c.x, dz = o.z - c.z, dd = dx * dx + dz * dz, rr = r + c.r;
        if (dd >= rr * rr) continue;
        const d = Math.sqrt(dd) || 1e-4; nx = dx / d; nz = dz / d; depth = rr - d;
      }
      o.x += nx * depth; o.z += nz * depth;
      if (depth > best) { best = depth; res = { nx, nz }; }
    }
  }
  return res;
}
function solidAt(x, z, y) {
  const cell = cgrid.get(ckey(Math.floor(x / CC), Math.floor(z / CC))); if (!cell) return false;
  for (const c of cell) {
    if (c.h < y) continue;
    if (c.b) { if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true; }
    else if (d2(x, z, c.x, c.z) < c.r * c.r) return true;
  }
  return false;
}
function clearLine(ax, az, bx, bz) {
  const l = Math.hypot(bx - ax, bz - az), n = Math.ceil(l / 4);
  for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(lerp(ax, bx, t), lerp(az, bz, t), 2)) return false; }
  return true;
}
function boundary(o, m) {
  const r = Math.hypot(o.x, o.z); if (r < 420) return null;
  const t = Math.atan2(o.z, o.x), lim = sandR(t) - m;
  if (r <= lim) return null;
  if (o.x > PX0 - 1 && o.x < PX1 + 1 && o.z > PZ0) {
    const nx = clamp(o.x, PX0 + m * 0.4, PX1 - m * 0.4), nz = Math.min(o.z, PZ1 - m * 0.5);
    const res = (nx !== o.x || nz !== o.z) ? { nx: Math.sign(nx - o.x), nz: nz < o.z ? -1 : 0 } : null;
    o.x = nx; o.z = nz; return res;
  }
  o.x *= lim / r; o.z *= lim / r;
  return { nx: -o.x / lim, nz: -o.z / lim };
}

// ================================================================ road graph
const nodes = [];
function addNode(x, z, ring = false) { nodes.push({ x, z, adj: [], id: nodes.length, ring }); return nodes.length - 1; }
function link(a, b) { nodes[a].adj.push(b); nodes[b].adj.push(a); }
const gid = [];
for (let i = 0; i < NL; i++) { gid[i] = []; for (let j = 0; j < NL; j++) gid[i][j] = addNode(LINES[i], LINES[j]); }
for (let i = 0; i < NL; i++) for (let j = 0; j < NL; j++) { if (i < NL - 1) link(gid[i][j], gid[i + 1][j]); if (j < NL - 1) link(gid[i][j], gid[i][j + 1]); }
const rid = [];
for (let k = 0; k < RING_N; k++) { const a = k / RING_N * TAU; rid.push(addNode(Math.cos(a) * RING_R, Math.sin(a) * RING_R, true)); }
for (let k = 0; k < RING_N; k++) link(rid[k], rid[(k + 1) % RING_N]);
link(gid[8][4], rid[0]); link(gid[4][8], rid[12]); link(gid[0][4], rid[24]); link(gid[4][0], rid[36]);
const edges = [];
for (const n of nodes) for (const m of n.adj) if (m > n.id) edges.push([n.id, m]);
// next-hop table for cop routing
const NN = nodes.length, nextHop = new Int16Array(NN * NN).fill(-1);
for (let g = 0; g < NN; g++) {
  const q = [g], seen = new Uint8Array(NN); seen[g] = 1;
  while (q.length) { const a = q.shift(); for (const b of nodes[a].adj) if (!seen[b]) { seen[b] = 1; nextHop[b * NN + g] = a; q.push(b); } }
}
function nearestNode(x, z) { let best = 0, bd = 1e12; for (const n of nodes) { const d = d2(x, z, n.x, n.z); if (d < bd) { bd = d; best = n.id; } } return best; }

// ================================================================ blocks
const blocks = [];
for (let i = 0; i < NL - 1; i++) {
  blocks[i] = [];
  for (let j = 0; j < NL - 1; j++) blocks[i][j] = { i, j, x0: LINES[i] + HR, x1: LINES[i + 1] - HR, z0: LINES[j] + HR, z1: LINES[j + 1] - HR, type: 'city' };
}
function blockAt(x, z) {
  if (x < GMIN + HR || x > GMAX - HR || z < GMIN + HR || z > GMAX - HR) return null;
  const i = Math.floor((x - GMIN) / SP), j = Math.floor((z - GMIN) / SP);
  if (i < 0 || i > 7 || j < 0 || j > 7) return null;
  const b = blocks[i][j];
  return (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) ? b : null;
}
function groundY(x, z) {
  if (x >= PX0 && x <= PX1 && z >= PZ0) return 0.55;
  if (blockAt(x, z)) return SIDE_Y;
  const r = Math.hypot(x, z);
  if (r > 425) {
    const t = Math.atan2(z, x), g = grassR(t);
    if (r > g) { const s = sandR(t); return lerp(ROAD_Y, -0.12, clamp((r - g) / (s - g), 0, 1)); }
  }
  return ROAD_Y;
}
function nearRoad(x, z, m) {
  const ext = GMAX + HR + m;
  if (Math.abs(x) < ext && Math.abs(z) < ext) {
    for (const L of LINES) { if (Math.abs(x - L) < HR + m || Math.abs(z - L) < HR + m) return true; }
  }
  const r = Math.hypot(x, z);
  if (Math.abs(r - RING_R) < HR + m) return true;
  if (r < RING_R + 5 && ((Math.abs(x) < HR + m && Math.abs(z) > GMAX - 5) || (Math.abs(z) < HR + m && Math.abs(x) > GMAX - 5))) return true;
  return false;
}

// ================================================================ signs
function makeSign(text, w, h, bg, fg, font = 'bold') {
  const cw = 512, ch = Math.round(512 * h / w), c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, cw, ch);
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 10; x.strokeRect(5, 5, cw - 10, ch - 10);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = ch * 0.62;
  x.font = `900 ${fs}px "Avenir Next", Futura, Arial Black, sans-serif`;
  while (x.measureText(text).width > cw * 0.88 && fs > 10) { fs -= 4; x.font = `900 ${fs}px "Avenir Next", Futura, Arial Black, sans-serif`; }
  x.fillText(text, cw / 2, ch / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
}
function placeSign(text, x, y, z, w, h, bg, fg, rotY = PI) {
  const s = makeSign(text, w, h, bg, fg); s.position.set(x, y, z); s.rotation.y = rotY; scene.add(s); return s;
}

// ================================================================ world build
const stores = [];         // robbable places
const markers = [];        // glowing rings to animate
const special = {};        // police/hospital/spray positions
const mm = { rects: [], houses: [], parks: [], spray: null };
const parkedSpots = [];    // where to put parked cars
const treeSpots = [], palmSpots = [];
const beachSpots = [];

const PALETTE = [0xeadbc8, 0xcfd8dc, 0xf3c7a2, 0xa9c8e8, 0xf5e3a3, 0xdcbbe4, 0xbde5c9, 0xf7f3ec, 0xe7ac93, 0xa3bccd, 0xf2a7b8, 0x9fd6d2];
const HOUSE_COLS = [0xffd1dc, 0xfff1b8, 0xc8f0e0, 0xbfe0ff, 0xffe0c2, 0xe6d4ff, 0xffffff];

function buildWorld() {
  const S = new GB(), B = new GB();
  // --- island ground
  const SEG = 160, grass = C(0x72be52), sand = C(0xf2dca2), wet = C(0xd8bf86), deep = C(0xb59a62);
  for (let k = 0; k < SEG; k++) {
    const t0 = k / SEG * TAU, t1 = (k + 1) / SEG * TAU;
    const g0 = grassR(t0), g1 = grassR(t1), s0 = sandR(t0), s1 = sandR(t1);
    const P = (r, t, y) => [Math.cos(t) * r, y, Math.sin(t) * r];
    S.triN([0, 0.02, 0], P(g1, t1, 0.02), P(g0, t0, 0.02), grass, UP);
    S.quadN(P(g0, t0, 0.02), P(g1, t1, 0.02), P(s1, t1, -0.12), P(s0, t0, -0.12), sand, UP);
    S.quadN(P(s0, t0, -0.12), P(s1, t1, -0.12), P(s1 + 8, t1, -0.6), P(s0 + 8, t0, -0.6), wet, UP);
    S.quadN(P(s0 + 8, t0, -0.6), P(s1 + 8, t1, -0.6), P(s1 + 40, t1, -3), P(s0 + 40, t0, -3), deep, UP);
  }
  // --- roads
  const asphalt = C(0x44474d), yellow = C(0xf3cf4a), white = C(0xeeeeee);
  for (const [a, b] of edges) {
    const A = nodes[a], Bn = nodes[b];
    S.strip(A.x, A.z, Bn.x, Bn.z, HR * 2, ROAD_Y, asphalt);
    const dx = Bn.x - A.x, dz = Bn.z - A.z, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
    for (let s = HR + 1; s + 3 < l - HR; s += 7) S.strip(A.x + ux * s, A.z + uz * s, A.x + ux * (s + 3), A.z + uz * (s + 3), 0.35, ROAD_Y + 0.02, yellow);
    if (A.ring || Bn.ring) {
      for (const side of [-1, 1]) {
        const ox = -uz * 6.2 * side, oz = ux * 6.2 * side;
        S.strip(A.x + ox + ux * (A.ring ? 0 : HR), A.z + oz + uz * (A.ring ? 0 : HR), Bn.x + ox, Bn.z + oz, 0.25, ROAD_Y + 0.02, white);
      }
    }
  }
  for (const n of nodes) {
    if (n.ring) S.prism(n.x, n.z, HR + 0.3, HR + 0.3, ROAD_Y - 0.001, ROAD_Y, 10, asphalt, true);
    else {
      S.flat(n.x - HR, n.z - HR, n.x + HR, n.z + HR, ROAD_Y, asphalt);
      for (const m of n.adj) { // zebra crossings
        const o = nodes[m]; if (o.ring) continue;
        const ux = Math.sign(o.x - n.x), uz = Math.sign(o.z - n.z);
        for (let w = -5.4; w <= 5.4; w += 1.8) {
          const cx = n.x + ux * 9.5 + uz * w, cz = n.z + uz * 9.5 + ux * w;
          S.strip(cx - ux * 1.5, cz - uz * 1.5, cx + ux * 1.5, cz + uz * 1.5, 0.9, ROAD_Y + 0.02, white);
        }
      }
    }
  }
  // --- blocks
  const SPECIAL = {
    '2,5': 'police', '5,2': 'hospital', '3,3': 'bank', '6,6': 'spray',
    '1,1': 'store:QUICK MART', '6,1': 'store:DONUT SHACK', '1,6': 'store:GAS & GO', '4,6': 'store:JEWELRY',
    '4,4': 'park', '0,3': 'park', '7,4': 'park', '3,7': 'park', '5,0': 'park'
  };
  const walk = C(0xcac4b6), curb = C(0x9e988c), lotGrass = C(0x6cba50), concrete = C(0xb3b0aa);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const b = blocks[i][j]; const sp = SPECIAL[i + ',' + j] || 'city';
    b.type = sp.split(':')[0];
    S.box(b.x0, 0, b.z0, b.x1, SIDE_Y, b.z1, curb, { top: walk });
    const lx0 = b.x0 + 4, lx1 = b.x1 - 4, lz0 = b.z0 + 4, lz1 = b.z1 - 4, cx = (lx0 + lx1) / 2;
    const dcen = Math.max(Math.abs(i - 3.5), Math.abs(j - 3.5));
    const hRange = dcen < 1 ? [42, 92] : dcen < 2 ? [24, 56] : dcen < 3 ? [12, 30] : [8, 18];
    const building = (x0, z0, x1, z1, h, col) => {
      const c = C(col);
      B.box(x0, SIDE_Y, z0, x1, h, z1, c, { win: 4.5, top: c.clone().multiplyScalar(0.82) });
      if (h > 14 && srnd() < 0.75) {
        const ax = lerp(x0, x1, sr(0.2, 0.5)), az = lerp(z0, z1, sr(0.2, 0.5));
        S.box(ax, h, az, ax + sr(3, 6), h + sr(1.5, 3), az + sr(3, 6), C(0x9a9a9a));
      }
      addBox(x0, z0, x1, z1, h); mm.rects.push([x0, z0, x1, z1]);
    };
    const regular = (x0, z0, x1, z1) => {
      if (dcen < 1.5 && srnd() < 0.5) { building(x0, z0, x1, z1, sr(...hRange), spick(PALETTE)); return; }
      if (x1 - x0 > 30 && srnd() < 0.6) {
        const m = lerp(x0, x1, sr(0.4, 0.6));
        building(x0, z0, m - 1, z1, sr(...hRange), spick(PALETTE)); building(m + 1, z0, x1, z1, sr(...hRange), spick(PALETTE));
      } else building(x0 + sr(0, 1.5), z0 + sr(0, 1.5), x1 - sr(0, 1.5), z1 - sr(0, 1.5), sr(...hRange), spick(PALETTE));
    };
    const quads = (skipFront) => {
      const mx = (lx0 + lx1) / 2, mz = (lz0 + lz1) / 2;
      if (!skipFront) { regular(lx0, lz0, mx - 1, mz - 1); regular(mx + 1, lz0, lx1, mz - 1); }
      regular(lx0, mz + 1, mx - 1, lz1); regular(mx + 1, mz + 1, lx1, lz1);
    };
    const front = b.z0 + 2.2; // ring position on the sidewalk in front of a special building
    if (b.type === 'city') quads(false);
    else if (b.type === 'park') {
      S.box(lx0 - 1, SIDE_Y, lz0 - 1, lx1 + 1, SIDE_Y + 0.06, lz1 + 1, lotGrass);
      mm.parks.push([lx0, lz0, lx1, lz1]);
      const fx = (lx0 + lx1) / 2, fz = (lz0 + lz1) / 2;
      S.prism(fx, fz, 4, 4, SIDE_Y, 1.1, 12, C(0xd8d2c4), false);
      S.prism(fx, fz, 3.6, 3.6, SIDE_Y, 0.95, 12, C(0x3fb6dd), true);
      S.prism(fx, fz, 0.6, 0.4, 0.9, 3.2, 8, C(0xd8d2c4), true);
      addCirc(fx, fz, 4.2, 1.2);
      for (let k = 0; k < 9; k++) {
        const tx = sr(lx0 + 3, lx1 - 3), tz = sr(lz0 + 3, lz1 - 3);
        if (d2(tx, tz, fx, fz) > 64) treeSpots.push([tx, tz, SIDE_Y]);
      }
    } else if (b.type === 'police') {
      building(lx0, lz0, lx1, lz0 + 20, 13, 0xe4ecf7);
      S.box(lx0 - 0.1, 9, lz0 - 0.1, lx1 + 0.1, 10.5, lz0 + 20.1, C(0x1f4fbf));
      placeSign('POLICE', cx, 7.2, lz0 - 0.06, 16, 3, '#1f4fbf', '#fff');
      quads(true);
      special.police = { x: cx, z: front, h: PI, name: 'Police' };
      parkedSpots.push({ x: lx0 + 8, z: b.z0 - 1.2, h: PI / 2, type: 'police' }, { x: lx1 - 8, z: b.z0 - 1.2, h: PI / 2, type: 'police' });
    } else if (b.type === 'hospital') {
      building(lx0, lz0, lx1, lz0 + 20, 16, 0xf6f6f6);
      placeSign('HOSPITAL', cx, 7, lz0 - 0.06, 18, 3, '#ffffff', '#e0233d');
      placeSign('+', cx, 12.5, lz0 - 0.06, 4, 4, '#e0233d', '#fff');
      quads(true);
      special.hospital = { x: cx, z: front, h: PI, name: 'Hospital' };
    } else if (b.type === 'bank') {
      building(lx0, lz0 + 2.5, lx1, lz0 + 20, 30, 0xe9e1cf);
      for (let x = lx0 + 2; x <= lx1 - 2; x += 5) S.prism(x, lz0 + 0.8, 0.7, 0.7, SIDE_Y, 9, 10, C(0xf7f2e6), false);
      S.box(lx0, 9, lz0 - 0.4, lx1, 11, lz0 + 2.5, C(0xf7f2e6));
      placeSign('BANK', cx, 10, lz0 - 0.46, 14, 1.8, '#f7f2e6', '#7a5a12');
      addBox(lx0, lz0, lx1, lz0 + 2.5, 11);
      quads(true);
      stores.push({ name: 'the BANK', x: cx, z: front, hold: 6, min: 2500, max: 6000, heat: 220, cool: 0, bank: true });
    } else if (b.type === 'store') {
      const name = sp.split(':')[1];
      const awn = { 'QUICK MART': [0xff5a3c, '#ff5a3c'], 'DONUT SHACK': [0xff7ac8, '#ff7ac8'], 'GAS & GO': [0x2fb36b, '#2fb36b'], 'JEWELRY': [0x8a5cff, '#8a5cff'] }[name];
      const sx0 = lx0, sx1 = lx0 + 21, scx = (sx0 + sx1) / 2;
      building(sx0, lz0, sx1, lz0 + 18, 7, 0xf4efe6);
      S.box(sx0 + 0.5, 4.1, lz0 - 2.6, sx1 - 0.5, 4.5, lz0, C(awn[0]));
      S.quadN([sx1 - 2, 0.5, lz0 - 0.03], [sx0 + 2, 0.5, lz0 - 0.03], [sx0 + 2, 3.7, lz0 - 0.03], [sx1 - 2, 3.7, lz0 - 0.03], C(0x2b3d52), [0, 0, -1]);
      placeSign(name, scx, 5.8, lz0 - 0.06, 17, 2.2, awn[1], '#fff');
      regular(lx0 + 23, lz0, lx1, (lz0 + lz1) / 2 - 1);
      regular(lx0, (lz0 + lz1) / 2 + 1, (lx0 + lx1) / 2 - 1, lz1); regular((lx0 + lx1) / 2 + 1, (lz0 + lz1) / 2 + 1, lx1, lz1);
      const jew = name === 'JEWELRY';
      stores.push({ name, x: scx, z: front, hold: jew ? 4 : 3, min: jew ? 800 : 250, max: jew ? 1800 : 700, heat: jew ? 120 : 70, cool: 0 });
    } else if (b.type === 'spray') {
      S.box(lx0 - 1, SIDE_Y, lz0 - 1, lx1 + 1, SIDE_Y + 0.02, lz1 + 1, concrete);
      building(lx0 + 4, lz0 + 24, lx1 - 4, lz1, 10, 0xff6fae);
      S.quadN([lx1 - 9, SIDE_Y, lz0 + 23.95], [lx0 + 9, SIDE_Y, lz0 + 23.95], [lx0 + 9, 7, lz0 + 23.95], [lx1 - 9, 7, lz0 + 23.95], C(0x221a2a), [0, 0, -1]);
      placeSign('SPRAY SHACK', cx, 8.5, lz0 + 23.9, 18, 2.4, '#1a0b2e', '#ff4fa0');
      const zx0 = cx - 7, zx1 = cx + 7, zz0 = lz0 + 3, zz1 = lz0 + 19;
      S.flat(zx0, zz0, zx1, zz1, SIDE_Y + 0.04, C(0xff4fa0));
      S.flat(zx0 + 1, zz0 + 1, zx1 - 1, zz1 - 1, SIDE_Y + 0.05, C(0x6b5a72));
      special.spray = { x0: zx0, z0: zz0, x1: zx1, z1: zz1, x: cx, z: (zz0 + zz1) / 2 };
      mm.spray = special.spray;
    }
    // parked cars along this block's front curb (some)
    if (srnd() < 0.2 && b.type !== 'police') parkedSpots.push({ x: sr(b.x0 + 8, b.x1 - 8), z: b.z0 - 1.2, h: srnd() < 0.5 ? PI / 2 : -PI / 2 });
    if (srnd() < 0.1) parkedSpots.push({ x: b.x1 + 1.2, z: sr(b.z0 + 8, b.z1 - 8), h: srnd() < 0.5 ? 0 : PI });
  }
  // --- country houses
  const houses = [];
  for (let a = 0; a < 400 && houses.length < 46; a++) {
    const t = sr(0, TAU), r = srnd() < 0.55 ? sr(296, 380) : sr(422, grassR(t) - 18);
    const x = Math.cos(t) * r, z = Math.sin(t) * r;
    const w = sr(9, 13), d = sr(8, 11);
    if (nearRoad(x, z, 9)) continue;
    if (Math.abs(x) < GMAX + 20 && Math.abs(z) < GMAX + 20) continue;
    if (x > PX0 - 20 && x < PX1 + 20 && z > 380) continue;
    if (houses.some(h => d2(h.x, h.z, x, z) < 26 * 26)) continue;
    houses.push({ x, z, w, d });
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, h = 4.6, col = C(spick(HOUSE_COLS));
    S.box(x0, 0, z0, x1, h, z1, col);
    const ox = 0.7, X0 = x0 - ox, X1 = x1 + ox, Z0 = z0 - ox, Z1 = z1 + ox, zc = z, yr = h + 3.2, roof = C(spick([0xc0563b, 0x5c6f8a, 0x8a5a44, 0x3f7a6a]));
    S.quadN([X0, h, Z0], [X1, h, Z0], [X1, yr, zc], [X0, yr, zc], roof, [0, 1, -1]);
    S.quadN([X1, h, Z1], [X0, h, Z1], [X0, yr, zc], [X1, yr, zc], roof, [0, 1, 1]);
    S.triN([x0, h, z0], [x0, h, z1], [x0, yr - 0.4, zc], col, [-1, 0, 0]);
    S.triN([x1, h, z0], [x1, h, z1], [x1, yr - 0.4, zc], col, [1, 0, 0]);
    S.box(x - 0.9, 0, z1, x + 0.9, 2.6, z1 + 0.1, C(0x6b4a2e));
    S.box(x0 + 1.2, 1.4, z1, x0 + 3.2, 3, z1 + 0.08, C(0x9cc0dc));
    S.box(x1 - 3.2, 1.4, z1, x1 - 1.2, 3, z1 + 0.08, C(0x9cc0dc));
    addBox(x0, z0, x1, z1, h + 2); mm.houses.push([x0, z0, x1, z1]);
    if (srnd() < 0.3) parkedSpots.push({ x: x1 + 3.5, z: z + sr(-1, 1), h: srnd() < 0.5 ? 0 : PI });
    for (let k = 0; k < 2; k++) treeSpots.push([x + sr(-14, 14), z1 + sr(5, 12), ROAD_Y]);
  }
  // --- pier + lighthouse + beach props
  const wood = C(0x9b7048), woodD = C(0x6f4e30);
  S.box(PX0, 0.2, PZ0, PX1, 0.55, PZ1, wood, { top: C(0xb08254) });
  for (let z = PZ0 + 6; z < PZ1; z += 7) { S.box(PX0 - 0.3, -2.5, z, PX0 + 0.5, 1.4, z + 0.8, woodD); S.box(PX1 - 0.5, -2.5, z, PX1 + 0.3, 1.4, z + 0.8, woodD); }
  S.box(PX0, 1.2, PZ0 + 8, PX0 + 0.25, 1.35, PZ1, woodD); S.box(PX1 - 0.25, 1.2, PZ0 + 8, PX1, 1.35, PZ1, woodD);
  placeSign('SUNSET PIER', (PX0 + PX1) / 2, 4.2, PZ0 + 2, 9, 1.6, '#ff4fa0', '#fff', 0);
  S.box(PX0 - 0.2, 0.5, PZ0 + 1.9, PX0 + 0.2, 4.2, PZ0 + 2.2, woodD); S.box(PX1 - 0.2, 0.5, PZ0 + 1.9, PX1 + 0.2, 4.2, PZ0 + 2.2, woodD);
  {
    const t = -2.35, r = grassR(t) + 12, lx = Math.cos(t) * r, lz = Math.sin(t) * r;
    for (let k = 0; k < 7; k++) S.prism(lx, lz, 4.2 - k * 0.22, 4.2 - (k + 1) * 0.22, k * 4, (k + 1) * 4, 14, C(k % 2 ? 0xe23b3b : 0xf7f7f7), false);
    S.prism(lx, lz, 3.4, 3.4, 28, 28.4, 14, C(0x333333), true);
    S.prism(lx, lz, 2.2, 2.2, 28.4, 31, 10, C(0xfff2a8), false);
    S.prism(lx, lz, 3, 0, 31, 34, 10, C(0xe23b3b), false);
    addCirc(lx, lz, 4.6, 30);
    special.lighthouse = { x: lx, z: lz };
  }
  for (let k = 0; k < 90; k++) {
    const t = sr(0, TAU), g = grassR(t), s = sandR(t), r = sr(g + 4, s - 5), x = Math.cos(t) * r, z = Math.sin(t) * r;
    if (x > PX0 - 10 && x < PX1 + 10 && z > 0) continue;
    if (Math.abs(x) < 12 || Math.abs(z) < 12) continue;
    if (k % 3 === 0) {
      beachSpots.push([x, z]);
      const col = C(spick([0xff4fa0, 0x19d3c5, 0xffd23f, 0xff7a3c, 0x7a5cff]));
      S.box(x - 0.08, 0, z - 0.08, x + 0.08, 3.2, z + 0.08, C(0xeeeeee));
      S.prism(x, z, 2.8, 0, 2.6, 3.6, 8, col, false);
      S.flat(x + 1, z - 0.8, x + 2.2, z + 1.4, 0.01, C(spick([0xff4fa0, 0x19d3c5, 0xffd23f, 0xffffff])));
    } else palmSpots.push([x, z, 0]);
  }
  // --- trees in the countryside
  for (let a = 0; a < 700; a++) {
    const t = sr(0, TAU), r = Math.sqrt(srnd()) * (grassR(t) - 6), x = Math.cos(t) * r, z = Math.sin(t) * r;
    if (Math.abs(x) < GMAX + 12 && Math.abs(z) < GMAX + 12) continue;
    if (nearRoad(x, z, 4)) continue;
    if (solidAt(x, z, 0)) continue;
    if (x > PX0 - 8 && x < PX1 + 8 && z > 380) continue;
    (srnd() < 0.45 ? palmSpots : treeSpots).push([x, z, ROAD_Y]);
  }
  // palms along the ring road
  for (let k = 0; k < RING_N * 2; k++) {
    const a = (k + 0.5) / (RING_N * 2) * TAU, r = RING_R + (k % 2 ? 11 : -11);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!nearRoad(x, z, 2) && !solidAt(x, z, 0)) palmSpots.push([x, z, ROAD_Y]);
  }
  const ms = new THREE.Mesh(S.geo(), matV); scene.add(ms);
  const mb = new THREE.Mesh(B.geo(), matB); scene.add(mb);
  buildTrees();
  // water
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000).rotateX(-PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x17a6d3, transparent: true, opacity: 0.82 }));
  water.position.y = -0.32; scene.add(water);
  // glowing markers
  const ringGeo = new THREE.RingGeometry(2.1, 2.9, 28).rotateX(-PI / 2);
  for (const s of stores) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthWrite: false }));
    m.position.set(s.x, SIDE_Y + 0.06, s.z); scene.add(m); s.marker = m; markers.push(m);
    const dollar = makeSign('$', 1.6, 1.6, '#ffd23f', '#1a0b2e'); dollar.position.set(s.x, 4.6, s.z); scene.add(dollar); s.icon = dollar;
  }
}

function buildTrees() {
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  // round trees
  const trunk = new THREE.CylinderGeometry(0.28, 0.4, 3.2, 6).translate(0, 1.6, 0);
  const crown = new THREE.IcosahedronGeometry(2.4, 0).translate(0, 4.4, 0);
  const tI = new THREE.InstancedMesh(trunk, M(0x7a5232), treeSpots.length);
  const cI = new THREE.InstancedMesh(crown, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), treeSpots.length);
  treeSpots.forEach(([x, z, y], i) => {
    const s = sr(0.8, 1.3);
    dummy.position.set(x, y, z); dummy.rotation.set(0, sr(0, TAU), 0); dummy.scale.set(s, s, s); dummy.updateMatrix();
    tI.setMatrixAt(i, dummy.matrix); cI.setMatrixAt(i, dummy.matrix);
    cI.setColorAt(i, col.setHSL(sr(0.25, 0.33), sr(0.45, 0.65), sr(0.32, 0.45)));
    addCirc(x, z, 0.55 * s, 7);
  });
  scene.add(tI, cI);
  // palms: leaning trunk + drooping leaves (two instanced meshes)
  const PT = new GB(), PL = new GB(), white = C(0xffffff);
  for (let k = 0; k < 5; k++) PT.prism(k * 0.18, 0, 0.36 - k * 0.04, 0.32 - k * 0.04, k * 1.6, (k + 1) * 1.6, 6, white, false);
  const pt = [0.9, 8, 0];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * TAU, ca = Math.cos(a), sa = Math.sin(a), px = -sa, pz = ca;
    const mid = [pt[0] + ca * 2, pt[1] + 0.4, pt[2] + sa * 2], tip = [pt[0] + ca * 4.2, pt[1] - 1.6, pt[2] + sa * 4.2];
    const l = [mid[0] + px * 0.8, mid[1], mid[2] + pz * 0.8], r = [mid[0] - px * 0.8, mid[1], mid[2] - pz * 0.8];
    PL.tri(pt, l, tip, white); PL.tri(pt, tip, r, white); PL.tri(pt, tip, l, white); PL.tri(pt, r, tip, white);
  }
  const ptI = new THREE.InstancedMesh(PT.geo(), M(0x8a6a44), palmSpots.length);
  const plI = new THREE.InstancedMesh(PL.geo(), new THREE.MeshLambertMaterial({ color: 0xffffff }), palmSpots.length);
  palmSpots.forEach(([x, z, y], i) => {
    const s = sr(0.8, 1.2);
    dummy.position.set(x, y, z); dummy.rotation.set(0, sr(0, TAU), 0); dummy.scale.set(s, s, s); dummy.updateMatrix();
    ptI.setMatrixAt(i, dummy.matrix); plI.setMatrixAt(i, dummy.matrix);
    plI.setColorAt(i, col.setHSL(sr(0.24, 0.32), 0.6, sr(0.34, 0.44)));
    addCirc(x, z, 0.45 * s, 8);
  });
  scene.add(ptI, plI);
}

// ================================================================ people
const PG = {
  leg: new THREE.BoxGeometry(0.3, 0.9, 0.3).translate(0, -0.45, 0),
  body: new THREE.BoxGeometry(0.72, 0.85, 0.42),
  head: new THREE.BoxGeometry(0.46, 0.48, 0.46),
  arm: new THREE.BoxGeometry(0.22, 0.82, 0.22).translate(0, -0.37, 0),
  hair: new THREE.BoxGeometry(0.5, 0.16, 0.5),
  hat: new THREE.BoxGeometry(0.54, 0.16, 0.6),
  shades: new THREE.BoxGeometry(0.48, 0.1, 0.06),
};
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0x6b4226];
const SHIRTS = [0xff5a5f, 0x3fa7ff, 0xffd23f, 0x7bd389, 0xff8ad8, 0xffffff, 0xa77bff, 0xff9a3c, 0x19d3c5, 0x333a44];
const PANTS = [0x2d3a5a, 0x3b3b3b, 0xc9b38a, 0x5a3b2a, 0x4a6b8a, 0xe8e2d0];
const HAIRS = [0x1b1209, 0x3a2412, 0x7a4a1c, 0xd8b45a, 0x111111, 0xb0441c];
function makePerson(o) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const mk = (geo, hex, x, y, z) => { const m = new THREE.Mesh(geo, M(hex)); m.position.set(x, y, z); g.add(m); return m; };
  const p = {
    g,
    legL: mk(PG.leg, o.pants, -0.18, 0.92, 0), legR: mk(PG.leg, o.pants, 0.18, 0.92, 0),
    body: mk(PG.body, o.shirt, 0, 1.33, 0), head: mk(PG.head, o.skin, 0, 2.0, 0),
    armL: mk(PG.arm, o.shirt, -0.48, 1.7, 0), armR: mk(PG.arm, o.shirt, 0.48, 1.7, 0),
  };
  if (o.hat) mk(PG.hat, o.hat, 0, 2.3, 0.04); else mk(PG.hair, o.hair, 0, 2.28, -0.02);
  if (o.shades) mk(PG.shades, 0x111111, 0, 2.05, 0.24);
  p.shadow = addShadow(g, 1.3, 1.3, 0.04);
  scene.add(g);
  return p;
}
function poseWalk(m, ph, amt) {
  const s = Math.sin(ph) * amt;
  m.legL.rotation.x = s; m.legR.rotation.x = -s; m.armL.rotation.x = -s * 0.8; m.armR.rotation.x = s * 0.8;
  m.armL.rotation.z = 0; m.armR.rotation.z = 0;
}
function poseHandsUp(m) { m.legL.rotation.x = m.legR.rotation.x = 0; m.armL.rotation.x = m.armR.rotation.x = PI; m.armL.rotation.z = -0.25; m.armR.rotation.z = 0.25; }

// ================================================================ cars
const CAR_TYPES = {
  sedan: { L: 4.6, W: 2.0, max: 34, acc: 15, turn: 2.2, mass: 1, hp: 100 },
  sports: { L: 4.4, W: 2.05, max: 50, acc: 25, turn: 2.5, mass: 0.9, hp: 80 },
  van: { L: 5.4, W: 2.3, max: 27, acc: 10, turn: 1.8, mass: 1.7, hp: 160 },
  taxi: { L: 4.6, W: 2.0, max: 36, acc: 16, turn: 2.3, mass: 1, hp: 100 },
  police: { L: 4.7, W: 2.05, max: 43, acc: 21, turn: 2.4, mass: 1.25, hp: 150 },
};
const CAR_COLS = [0xe63946, 0x1d6fe0, 0xf1f1f1, 0x222831, 0xffb703, 0x2a9d8f, 0x8338ec, 0xff6fae, 0x9aa5b1, 0x52b788, 0xfb5607];
const carGeoCache = {};
function carGeo(type, color) {
  const key = type + color; if (carGeoCache[key]) return carGeoCache[key];
  const T = CAR_TYPES[type], g = new GB(), L = T.L, W = T.W, hw = W / 2, hl = L / 2;
  const body = C(color), glass = C(0x1e2a38), dark = C(0x1a1a1a), light = C(0xfff3c2), tail = C(0xd61f2c), grey = C(0x777777);
  if (type === 'van') {
    g.box(-hw, 0.4, -hl, hw, 1.4, hl, body);
    g.box(-hw + 0.05, 1.4, -hl + 0.2, hw - 0.05, 2.35, hl - 1.1, glass, { top: body });
    g.box(-hw + 0.06, 1.4, -hl + 0.6, hw - 0.04, 2.36, hl - 1.6, body, { top: body });
    g.box(-hw + 0.1, 1.4, hl - 1.1, hw - 0.1, 1.9, hl - 0.6, glass);
  } else if (type === 'sports') {
    g.box(-hw, 0.32, -hl, hw, 0.85, hl, body);
    g.box(-hw + 0.2, 0.85, -hl + 1.3, hw - 0.2, 1.3, hl - 1.5, glass, { top: body });
    g.box(-hw + 0.1, 1.05, -hl, hw - 0.1, 1.12, -hl + 0.45, dark);
    g.box(-hw + 0.2, 0.85, -hl + 0.1, -hw + 0.35, 1.05, -hl + 0.3, dark); g.box(hw - 0.35, 0.85, -hl + 0.1, hw - 0.2, 1.05, -hl + 0.3, dark);
    g.box(-0.35, 0.851, -hl, 0.35, 0.86, hl, C(0xffffff));
  } else {
    g.box(-hw, 0.35, -hl, hw, 1.0, hl, body);
    g.box(-hw + 0.15, 1.0, -hl + 1.1, hw - 0.15, 1.62, hl - 1.4, glass, { top: body });
    if (type === 'police') {
      g.box(-hw - 0.01, 0.45, -0.9, hw + 0.01, 0.95, 0.9, C(0xf4f4f4));
      g.box(-hw + 0.3, 1.62, -0.5, hw - 0.3, 1.66, 0.1, dark);
    }
    if (type === 'taxi') g.box(-0.45, 1.62, -0.6, 0.45, 1.95, -0.2, C(0xffffff));
  }
  const wy = 0.72, wl = 0.74, wz = hl - 0.9;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.box(sx > 0 ? hw - 0.25 : -hw - 0.05, 0, sz * wz - wl / 2, sx > 0 ? hw + 0.05 : -hw + 0.25, wy, sz * wz + wl / 2, dark);
    g.box(sx > 0 ? hw + 0.05 : -hw - 0.07, 0.22, sz * wz - 0.18, sx > 0 ? hw + 0.07 : -hw - 0.05, 0.5, sz * wz + 0.18, grey);
  }
  g.box(-hw + 0.1, 0.25, hl - 0.05, hw - 0.1, 0.5, hl + 0.12, dark); g.box(-hw + 0.1, 0.25, -hl - 0.12, hw - 0.1, 0.5, -hl + 0.05, dark);
  g.box(-hw + 0.2, 0.6, hl, -hw + 0.65, 0.85, hl + 0.05, light); g.box(hw - 0.65, 0.6, hl, hw - 0.2, 0.85, hl + 0.05, light);
  g.box(-hw + 0.2, 0.62, -hl - 0.05, -hw + 0.6, 0.85, -hl, tail); g.box(hw - 0.6, 0.62, -hl - 0.05, hw - 0.2, 0.85, -hl, tail);
  return (carGeoCache[key] = g.geo());
}
const wreckMat = new THREE.MeshLambertMaterial({ color: 0x2a2626 });
const sirenR = new THREE.MeshBasicMaterial({ color: 0xff2030 }), sirenB = new THREE.MeshBasicMaterial({ color: 0x2060ff });
const sirenGeo = new THREE.BoxGeometry(0.5, 0.22, 0.32);

const cars = [];
function spawnCar(type, x, z, h, color) {
  const T = CAR_TYPES[type];
  if (color == null) color = type === 'police' ? 0x15161a : type === 'taxi' ? 0xffc300 : pick(CAR_COLS);
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(carGeo(type, color), matV); g.add(mesh);
  addShadow(g, T.W + 1.2, T.L + 1.4, 0.04);
  const c = { g, mesh, type, T, color, x, z, h, y: groundY(x, z), speed: 0, steer: 0, hp: T.hp, driver: 'none', police: type === 'police',
    from: -1, to: -1, tgt: -1, route: 0, blockT: 0, stuckT: 0, revT: 0, fire: 0, wreck: false, smokeT: 0, lastHit: 0, copsInside: 0, perm: false };
  if (c.police) {
    c.lr = new THREE.Mesh(sirenGeo, sirenR); c.lr.position.set(-0.32, 1.78, -0.2);
    c.lb = new THREE.Mesh(sirenGeo, sirenB); c.lb.position.set(0.32, 1.78, -0.2);
    g.add(c.lr, c.lb);
  }
  scene.add(g); cars.push(c); syncCar(c);
  return c;
}
function removeCar(c) { scene.remove(c.g); const i = cars.indexOf(c); if (i >= 0) cars.splice(i, 1); }
function syncCar(c) { c.g.position.set(c.x, c.y, c.z); c.g.rotation.y = c.h; }
function carFwd(c) { return [Math.sin(c.h), Math.cos(c.h)]; }

function carPhysics(c, thr, str, dt, hb = false) {
  const T = c.T;
  if (c.wreck) { thr = 0; str = 0; }
  if (thr > 0) c.speed += (c.speed < -0.5 ? T.acc * 2.2 : T.acc * (1 - Math.max(0, c.speed) / T.max * 0.6)) * thr * dt;
  else if (thr < 0) c.speed += (c.speed > 0.5 ? T.acc * 2.4 : T.acc * 0.7) * thr * dt;
  c.speed -= c.speed * (thr === 0 ? 0.7 : 0.12) * dt;
  if (hb) c.speed -= c.speed * 1.6 * dt;
  if (thr === 0 && Math.abs(c.speed) < 0.3) c.speed = 0;
  c.speed = clamp(c.speed, -T.max * 0.35, T.max);
  c.steer += (str - c.steer) * Math.min(1, dt * 7);
  const turn = c.steer * T.turn * clamp(c.speed / 6, -1, 1) * (1 - 0.35 * Math.min(1, Math.abs(c.speed) / T.max)) * (hb ? 1.6 : 1);
  c.h = wrapA(c.h - turn * dt);
  const [fx, fz] = carFwd(c);
  c.x += fx * c.speed * dt; c.z += fz * c.speed * dt;
  carWorld(c);
  c.y = lerp(c.y, groundY(c.x, c.z), Math.min(1, dt * 12));
}
const tmpO = { x: 0, z: 0 };
function carWorld(c) {
  const [fx, fz] = carFwd(c), off = c.T.L / 2 - c.T.W / 2, r = c.T.W / 2 + 0.1;
  let hit = null;
  for (const s of [off, -off, 0]) {
    tmpO.x = c.x + fx * s; tmpO.z = c.z + fz * s;
    const ox = tmpO.x, oz = tmpO.z;
    const res = resolve(tmpO, r) || boundary(tmpO, 2.5);
    if (res) { c.x += tmpO.x - ox; c.z += tmpO.z - oz; hit = res; }
  }
  if (hit) {
    const dot = fx * hit.nx + fz * hit.nz, vin = -dot * c.speed;
    if (vin > 0) {
      c.speed *= 1 - 0.85 * Math.abs(dot);
      if (vin > 11) {
        damageCar(c, (vin - 11) * 1.3);
        if (performance.now() - c.lastHit > 300) {
          c.lastHit = performance.now();
          if (c.driver === 'player') { sfx('crash', Math.min(1, vin / 30)); shake = Math.min(1, vin / 25); }
          emit(c.x + fx * off, c.y + 0.8, c.z + fz * off, 0xffd23f, 6, { spd: 6, life: 0.4, size: 0.18 });
        }
      }
    }
  }
}
function damageCar(c, amt) {
  if (c.wreck) return;
  c.hp -= amt;
  if (c.hp <= 0 && !c.fire) { c.fire = 3.5; if (c.driver === 'player') toast('Your car is on fire! Get out! 🔥'); }
}

// ================================================================ particles + effects
const parts = [];
const partGeo = new THREE.BoxGeometry(1, 1, 1);
for (let i = 0; i < 90; i++) {
  const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
  m.visible = false; scene.add(m); parts.push({ m, life: 0 });
}
let partIdx = 0;
function emit(x, y, z, color, n, o = {}) {
  for (let k = 0; k < n; k++) {
    const p = parts[partIdx = (partIdx + 1) % parts.length];
    p.m.visible = true; p.m.material.color.setHex(color); p.m.material.opacity = 1;
    p.m.position.set(x, y, z);
    const sp = o.spd ?? 3;
    p.vx = R(-1, 1) * sp; p.vy = R(0.2, 1) * (o.up ?? sp); p.vz = R(-1, 1) * sp;
    p.life = p.max = (o.life ?? 0.8) * R(0.7, 1.2); p.size = o.size ?? 0.3; p.grow = o.grow ?? 0; p.grav = o.grav ?? 12;
    p.m.scale.setScalar(p.size);
  }
}
function updateParts(dt) {
  for (const p of parts) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.m.visible = false; continue; }
    p.vy -= p.grav * dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    if (p.m.position.y < 0.1) { p.m.position.y = 0.1; p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; }
    p.size += p.grow * dt; p.m.scale.setScalar(Math.max(0.01, p.size));
    p.m.material.opacity = Math.min(1, p.life / p.max * 1.6);
    p.m.rotation.x += dt * 3; p.m.rotation.y += dt * 2;
  }
}
const zaps = [];
for (let i = 0; i < 4; i++) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x7fd8ff })); l.visible = false; l.frustumCulled = false; scene.add(l);
  zaps.push({ l, t: 0 });
}
function zap(ax, ay, az, bx, by, bz) {
  const z = zaps.find(z => z.t <= 0) || zaps[0];
  const p = z.l.geometry.attributes.position; p.setXYZ(0, ax, ay, az); p.setXYZ(1, bx, by, bz); p.needsUpdate = true;
  z.l.visible = true; z.t = 0.15;
}
const pickups = [];
const cashGeo = new THREE.BoxGeometry(0.7, 0.4, 0.35), cashMat = new THREE.MeshBasicMaterial({ color: 0x4fdc5a });
function dropCash(x, z, amt) {
  const m = new THREE.Mesh(cashGeo, cashMat); m.position.set(x, groundY(x, z) + 0.6, z); scene.add(m);
  pickups.push({ m, x, z, amt, t: 30 });
}

// ================================================================ audio (all synthesized)
const AU = { ctx: null, on: true };
function audioInit() {
  if (AU.ctx) { AU.ctx.resume(); return; }
  try {
    const ctx = AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AU.master = ctx.createGain(); AU.master.gain.value = AU.on ? 0.55 : 0; AU.master.connect(ctx.destination);
    const len = ctx.sampleRate; AU.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = AU.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    AU.eng = ctx.createOscillator(); AU.eng.type = 'sawtooth'; AU.eng.frequency.value = 50;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    AU.engG = ctx.createGain(); AU.engG.gain.value = 0;
    AU.eng.connect(lp); lp.connect(AU.engG); AU.engG.connect(AU.master); AU.eng.start();
    AU.sir = ctx.createOscillator(); AU.sir.type = 'square'; AU.sir.frequency.value = 700;
    const sl = ctx.createBiquadFilter(); sl.type = 'lowpass'; sl.frequency.value = 1800;
    AU.sirG = ctx.createGain(); AU.sirG.gain.value = 0;
    AU.sir.connect(sl); sl.connect(AU.sirG); AU.sirG.connect(AU.master); AU.sir.start();
    ctx.resume();
  } catch (e) { AU.ctx = null; }
}
function sfx(kind, vol = 1) {
  const ctx = AU.ctx; if (!ctx || !AU.on) return;
  const t = ctx.currentTime, g = ctx.createGain(); g.connect(AU.master);
  const noise = (dur, freq) => { const s = ctx.createBufferSource(); s.buffer = AU.noise; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; s.connect(f); f.connect(g); s.start(t); s.stop(t + dur); };
  const tone = (type, f0, f1, dur, at = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + dur); o.connect(g); o.start(t + at); o.stop(t + at + dur); };
  if (kind === 'punch') { g.gain.setValueAtTime(0.9 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); noise(0.2, 900); tone('sine', 160, 60, 0.15); }
  else if (kind === 'cash') { g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45); tone('square', 988, 988, 0.08); tone('square', 1319, 1319, 0.3, 0.08); }
  else if (kind === 'crash') { g.gain.setValueAtTime(0.9 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); noise(0.5, 600); }
  else if (kind === 'boom') { g.gain.setValueAtTime(1.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4); noise(1.4, 260); tone('sine', 90, 30, 1.0); }
  else if (kind === 'zap') { g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); tone('sawtooth', 1600, 300, 0.25); }
  else if (kind === 'horn') { g.gain.setValueAtTime(0.25, t); g.gain.setValueAtTime(0.25, t + 0.35); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45); tone('square', 392, 392, 0.45); tone('square', 494, 494, 0.45); }
  else if (kind === 'door') { g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); noise(0.12, 1200); }
  else if (kind === 'star') { g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); tone('triangle', 660, 660, 0.12); tone('triangle', 880, 880, 0.2, 0.12); }
  else if (kind === 'bad') { g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2); tone('sawtooth', 300, 80, 1.1); }
  else if (kind === 'jump') { g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); tone('sine', 300, 600, 0.12); }
}
function setSound(on) { AU.on = on; if (AU.master) AU.master.gain.value = on ? 0.55 : 0; }

// ================================================================ game state
const SAVE_KEY = 'sunsetkey.v1';
let save = { money: 0, best: 0 };
try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }

const G = { mode: 'menu', paused: true, t: 0, heat: 0, stars: 0, unseen: 0, seen: false, arrest: 0, deadT: 0, copSpawnT: 0, sprayCool: 0, heli: null };
let shake = 0;
const HEAT_STEPS = [0, 1, 50, 120, 220, 350];
function starsFor(h) { let s = 0; for (let i = 1; i < 6; i++) if (h >= HEAT_STEPS[i]) s = i; return s; }
function crime(amount, minStars = 1) {
  G.heat = Math.max(G.heat + amount, HEAT_STEPS[minStars]);
  const s = starsFor(G.heat);
  if (s > G.stars) { G.stars = s; sfx('star'); }
  G.unseen = 0;
}
function addMoney(n) {
  save.money += n; save.best = Math.max(save.best, save.money); persist();
  const p = document.getElementById('pop'); p.textContent = (n >= 0 ? '+' : '-') + fmt(Math.abs(n));
  p.style.color = n >= 0 ? '' : '#ff6d7e';
  p.classList.remove('go'); void p.offsetWidth; p.classList.add('go');
  if (n > 0) sfx('cash');
}

// ---------------------------------------------------------------- player
const player = {
  x: 9, z: 9, y: SIDE_Y, vy: 0, h: PI, hp: 100, car: null, speed: 0, anim: 0, punchT: 0, downT: 0, onGround: true,
  m: makePerson({ shirt: 0x19c3b0, pants: 0xd9c49a, skin: 0xe0ac69, hat: 0xff4fa0, shades: true }),
};
function playerPos() { return player.car ? player.car : player; }

// ---------------------------------------------------------------- pedestrians
const peds = [];
const CORNER_X = [0, 1, 1, 0], CORNER_Z = [0, 0, 1, 1];
const CROSS = [[[-1, 0, 1], [0, -1, 3]], [[1, 0, 0], [0, -1, 2]], [[1, 0, 3], [0, 1, 1]], [[-1, 0, 2], [0, 1, 0]]];
function cornerPos(bi, bj, k) { const b = blocks[bi][bj]; return [CORNER_X[k] ? b.x1 - 2 : b.x0 + 2, CORNER_Z[k] ? b.z1 - 2 : b.z0 + 2]; }
function spawnPed(x, z, o = {}) {
  const cop = !!o.cop;
  const look = cop ? { shirt: 0x24408e, pants: 0x1b2440, skin: pick(SKINS), hat: 0x111827 }
    : { shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS), hair: pick(HAIRS), hat: Math.random() < 0.15 ? pick([0xffffff, 0xff4fa0, 0x222222, 0xffd23f]) : 0 };
  const p = { m: makePerson(look), x, z, y: groundY(x, z), h: R(0, TAU), vx: 0, vz: 0, vy: 0, air: false, state: cop ? 'chase' : 'walk', t: 0,
    mode: 'wander', bi: 0, bj: 0, k: 0, dir: Math.random() < 0.5 ? 1 : -1, tx: x, tz: z, homeX: x, homeZ: z, robbed: false, cop, anim: R(0, 6),
    walkSpd: R(1.5, 2.3), rich: Math.random() < 0.12, car: o.car || null, zapT: R(0, 1.5), hitT: 0 };
  peds.push(p);
  return p;
}
function removePed(p) { scene.remove(p.m.g); const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1); }
function setCityWalk(p, bi, bj, k) {
  p.mode = 'city'; p.bi = bi; p.bj = bj; p.k = k; const [x, z] = cornerPos(bi, bj, k); p.tx = x; p.tz = z; p.cross = null;
}
function resumeWalk(p) {
  p.state = 'walk';
  if (Math.abs(p.x) < GMAX && Math.abs(p.z) < GMAX) {
    const bi = clamp(Math.floor((p.x - GMIN) / SP), 0, 7), bj = clamp(Math.floor((p.z - GMIN) / SP), 0, 7);
    let best = 0, bd = 1e9;
    for (let k = 0; k < 4; k++) { const [x, z] = cornerPos(bi, bj, k); const d = d2(x, z, p.x, p.z); if (d < bd) { bd = d; best = k; } }
    setCityWalk(p, bi, bj, best);
  } else { p.mode = 'wander'; p.homeX = p.x; p.homeZ = p.z; p.tx = p.x; p.tz = p.z; }
}
function placePedNear(p, cx, cz, minD, maxD) {
  for (let a = 0; a < 20; a++) {
    if (Math.abs(cx) < GMAX + 120 && Math.abs(cz) < GMAX + 120 && Math.random() < 0.85) {
      const bi = (Math.random() * 8) | 0, bj = (Math.random() * 8) | 0, k = (Math.random() * 4) | 0;
      const [x, z] = cornerPos(bi, bj, k); const d = Math.sqrt(d2(x, z, cx, cz));
      if (d < minD || d > maxD) continue;
      p.x = x; p.z = z; setCityWalk(p, bi, bj, (k + p.dir + 4) % 4); return true;
    } else {
      const [x, z] = pick(beachSpots); const d = Math.sqrt(d2(x, z, cx, cz));
      if (d < minD || d > maxD) continue;
      p.x = x + R(-4, 4); p.z = z + R(-4, 4); p.mode = 'wander'; p.homeX = p.x; p.homeZ = p.z; p.tx = p.x; p.tz = p.z; return true;
    }
  }
  return false;
}
function panic(x, z, r) {
  for (const p of peds) if (!p.cop && p.state === 'walk' && d2(p.x, p.z, x, z) < r * r) { p.state = 'flee'; p.t = R(4, 7); }
}
function knockPed(p, vx, vz, power) {
  p.state = 'down'; p.air = true; p.vx = vx; p.vz = vz; p.vy = power; p.t = R(3.5, 5);
  p.m.g.rotation.x = -PI / 2;
}

// ================================================================ input
const input = { jx: 0, jy: 0, jid: null, bx: 0, by: 0, lid: null, lx: 0, ly: 0, lastLook: -9, keys: {}, rob: false, hornT: 0 };
const cam = { yaw: PI, pitch: 0.3, x: 0, y: 0, z: 0, fov: 62 };
const $ = id => document.getElementById(id);
const stickEl = $('stick'), knobEl = $('knob'), hintEl = $('stickhint');
const touchEl = $('touch');
touchEl.addEventListener('pointerdown', e => {
  if (G.paused) return;
  e.preventDefault();
  if (e.clientX < innerWidth * 0.45 && input.jid === null) {
    input.jid = e.pointerId; input.bx = e.clientX; input.by = e.clientY; input.jx = input.jy = 0;
    stickEl.style.display = 'block'; stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px';
    knobEl.style.transform = ''; hintEl.style.display = 'none';
  } else if (input.lid === null) { input.lid = e.pointerId; input.lx = e.clientX; input.ly = e.clientY; }
  try { touchEl.setPointerCapture(e.pointerId); } catch (_) { }
});
touchEl.addEventListener('pointermove', e => {
  if (e.pointerId === input.jid) {
    let dx = e.clientX - input.bx, dy = e.clientY - input.by; const l = Math.hypot(dx, dy), R0 = 62;
    if (l > R0) { dx *= R0 / l; dy *= R0 / l; }
    input.jx = dx / R0; input.jy = -dy / R0;
    knobEl.style.transform = `translate(${dx}px,${dy}px)`;
  } else if (e.pointerId === input.lid) {
    const dx = e.clientX - input.lx, dy = e.clientY - input.ly; input.lx = e.clientX; input.ly = e.clientY;
    cam.yaw = wrapA(cam.yaw - dx * 0.0065); cam.pitch = clamp(cam.pitch + dy * 0.004, 0.05, 1.2);
    input.lastLook = G.t;
  }
});
const endPtr = e => {
  if (e.pointerId === input.jid) { input.jid = null; input.jx = input.jy = 0; stickEl.style.display = 'none'; }
  if (e.pointerId === input.lid) input.lid = null;
};
touchEl.addEventListener('pointerup', endPtr); touchEl.addEventListener('pointercancel', endPtr);
document.addEventListener('touchmove', e => { if (!e.target.closest || !e.target.closest('.card')) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

function btn(id, down, up) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); audioInit(); down && down(); });
  const u = e => { el.classList.remove('down'); up && up(); };
  el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('pointerleave', u);
}
btn('bRob', () => { input.rob = true; robPress(); }, () => { input.rob = false; });
btn('bCar', () => toggleCar());
btn('bJump', () => jump());
btn('bHorn', () => horn());
$('bPause').addEventListener('click', () => openMenu(true));

addEventListener('keydown', e => {
  input.keys[e.code] = true;
  if (G.paused) { if (e.code === 'Enter' && G.mode !== 'menu') closeMenu(); return; }
  if (e.repeat) return;
  if (e.code === 'KeyE' || e.code === 'KeyF') toggleCar();
  if (e.code === 'KeyR' || e.code === 'KeyQ') { input.rob = true; robPress(); }
  if (e.code === 'Space') { if (!player.car) jump(); }
  if (e.code === 'KeyH') horn();
  if (e.code === 'Escape' || e.code === 'KeyP') openMenu(true);
});
addEventListener('keyup', e => { input.keys[e.code] = false; if (e.code === 'KeyR' || e.code === 'KeyQ') input.rob = false; });
let mouseDrag = false;
canvas.addEventListener('mousedown', () => { mouseDrag = true; });
addEventListener('mouseup', () => { mouseDrag = false; });
function moveInput() {
  const k = input.keys;
  let x = input.jx, y = input.jy;
  const kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), ky = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
  if (kx || ky) { x = kx; y = ky; const l = Math.hypot(x, y); x /= l; y /= l; if (!k.ShiftLeft && !k.ShiftRight && !player.car) { x *= 0.6; y *= 0.6; } }
  return [x, y];
}

// ================================================================ actions
function nearestCar(maxD) {
  let best = null, bd = 1e9;
  for (const c of cars) {
    if (c.wreck || c.driver === 'player') continue;
    const [fx, fz] = carFwd(c), dx = player.x - c.x, dz = player.z - c.z;
    const along = clamp(dx * fx + dz * fz, -c.T.L / 2 + 0.8, c.T.L / 2 - 0.8);
    const d = Math.hypot(dx - fx * along, dz - fz * along) - c.T.W / 2 - (c.driver === 'none' ? 0 : 1);
    if (d < maxD && d < bd) { bd = d; best = c; }
  }
  return best;
}
function nearestPed(maxD, filter) {
  let best = null, bd = maxD * maxD;
  for (const p of peds) { if (p.state === 'down' || (filter && !filter(p))) continue; const d = d2(p.x, p.z, player.x, player.z); if (d < bd) { bd = d; best = p; } }
  return best;
}
function nearStore() {
  for (const s of stores) if (d2(s.x, s.z, player.x, player.z) < 3.2 * 3.2) return s;
  return null;
}
function toggleCar() {
  if (G.mode !== 'play' || player.downT > 0) return;
  if (player.car) { exitCar(); return; }
  const c = nearestCar(1.8);
  if (!c) return;
  if (c.driver === 'ai' || c.driver === 'cop') {
    const lx = c.x + Math.cos(c.h) * 1.9, lz = c.z - Math.sin(c.h) * 1.9;
    const p = spawnPed(lx, lz, { cop: c.driver === 'cop', car: c.driver === 'cop' ? c : null });
    p.y = groundY(lx, lz);
    if (c.driver === 'cop') { crime(60, 2); toast('You stole a police car! 🚓'); }
    else { p.state = 'down'; p.t = 1.2; p.m.g.rotation.x = -PI / 2; crime(22, 1); toast('Car stolen! 🚗'); }
    panic(c.x, c.z, 20);
  } else if (c.police) toast('Police car! Sirens are on you 🚨');
  c.driver = 'player'; c.speed *= 0.3; player.car = c;
  player.m.g.visible = false;
  sfx('door');
}
function exitCar() {
  const c = player.car; if (!c) return;
  const sx = Math.cos(c.h), sz = -Math.sin(c.h);
  let placed = false;
  for (const side of [1, -1]) {
    const x = c.x + sx * (c.T.W / 2 + 1) * side, z = c.z + sz * (c.T.W / 2 + 1) * side;
    if (!solidAt(x, z, 1)) { player.x = x; player.z = z; placed = true; break; }
  }
  if (!placed) { player.x = c.x; player.z = c.z; }
  player.y = groundY(player.x, player.z); player.h = c.h; player.vy = 0;
  c.driver = 'none'; player.car = null; player.m.g.visible = true;
  sfx('door');
}
function robPress() {
  if (G.mode !== 'play' || player.car || player.downT > 0) return;
  if (nearStore()) return; // holding handled in update
  player.punchT = 0.3;
  const p = nearestPed(2.4);
  if (!p) { sfx('punch', 0.3); return; }
  p.h = Math.atan2(player.x - p.x, player.z - p.z);
  if (p.cop) {
    sfx('punch'); knockPed(p, Math.sin(player.h) * 4, Math.cos(player.h) * 4, 4); p.t = 2.5; crime(70, 2); return;
  }
  if (!p.robbed && p.state !== 'flee') {
    p.robbed = true; p.state = 'handsup'; p.t = 1.3;
    const amt = Math.round(p.rich ? R(150, 400) : R(15, 120));
    addMoney(amt); crime(26, 1);
    toast(p.rich ? `Rich tourist! +${fmt(amt)} 💰` : `Robbed! +${fmt(amt)}`);
    panic(p.x, p.z, 14);
  } else {
    sfx('punch'); knockPed(p, Math.sin(player.h) * 5, Math.cos(player.h) * 5, 4.5); crime(12, 1);
    if (Math.random() < 0.5) dropCash(p.x, p.z, Math.round(R(5, 40)));
    panic(p.x, p.z, 14);
  }
}
function jump() {
  if (G.mode !== 'play' || player.car || !player.onGround || player.downT > 0) return;
  player.vy = 7.5; player.onGround = false; sfx('jump');
}
function horn() {
  if (!player.car) return; sfx('horn');
  const c = player.car;
  for (const p of peds) if (!p.cop && p.state === 'walk' && d2(p.x, p.z, c.x, c.z) < 15 * 15) { p.state = 'flee'; p.t = 3; }
}

// ================================================================ HUD helpers
let toastT = 0, bannerT = 0;
function toast(t) { const m = $('msg'); m.textContent = t; m.classList.add('show'); toastT = 2.4; }
function banner(text, color, sub = '') { const b = $('banner'); b.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); b.style.color = color; b.classList.add('show'); bannerT = 3; }

// ================================================================ world population
function spawnTrafficCar(near) {
  for (let a = 0; a < 30; a++) {
    const [ai, bi] = pick(edges); const A = nodes[ai], B = nodes[bi];
    const t = R(0.2, 0.8); let x = lerp(A.x, B.x, t), z = lerp(A.z, B.z, t);
    if (near) { const d = Math.sqrt(d2(x, z, near.x, near.z)); if (d < 110 || d > 240) continue; }
    const rev = Math.random() < 0.5, from = rev ? bi : ai, to = rev ? ai : bi;
    const F = nodes[from], T2 = nodes[to], dx = T2.x - F.x, dz = T2.z - F.z, l = Math.hypot(dx, dz);
    x += -dz / l * 3.5; z += dx / l * 3.5;
    if (cars.some(c => d2(c.x, c.z, x, z) < 15 * 15)) continue;
    const type = pick(['sedan', 'sedan', 'sedan', 'taxi', 'van', 'sports']);
    const c = spawnCar(type, x, z, Math.atan2(dx, dz)); c.driver = 'ai'; c.from = from; c.to = to; c.speed = 8;
    return c;
  }
  return null;
}
function relocateTraffic(c) {
  for (let a = 0; a < 20; a++) {
    const [ai, bi] = pick(edges); const A = nodes[ai], B = nodes[bi];
    const t = R(0.2, 0.8); let x = lerp(A.x, B.x, t), z = lerp(A.z, B.z, t);
    const P = playerPos(), d = Math.sqrt(d2(x, z, P.x, P.z));
    if (d < 120 || d > 240) continue;
    const rev = Math.random() < 0.5, from = rev ? bi : ai, to = rev ? ai : bi;
    const F = nodes[from], T2 = nodes[to], dx = T2.x - F.x, dz = T2.z - F.z, l = Math.hypot(dx, dz);
    x += -dz / l * 3.5; z += dx / l * 3.5;
    if (cars.some(o => o !== c && d2(o.x, o.z, x, z) < 15 * 15)) continue;
    c.x = x; c.z = z; c.h = Math.atan2(dx, dz); c.from = from; c.to = to; c.speed = 8; c.y = groundY(x, z);
    return true;
  }
  return false;
}
function populate() {
  buildWorld();
  buildMinimap();
  for (const s of parkedSpots) {
    const type = s.type || pick(['sedan', 'sedan', 'sports', 'van', 'taxi', 'sedan']);
    const c = spawnCar(type, s.x, s.z, s.h); c.perm = true;
  }
  const hero = spawnCar('sports', 22, 5.8, PI / 2, 0xff4fa0); hero.perm = true;
  const p0 = PI * 0.62, pr = grassR(p0) + 10; spawnCar('sports', Math.cos(p0) * pr, Math.sin(p0) * pr, 0, 0xffd23f).perm = true;
  for (let i = 0; i < 16; i++) spawnTrafficCar(null);
  for (let i = 0; i < 2; i++) { const c = spawnTrafficCar(null); if (c) { removeCar(c); const cc = spawnCar('police', c.x, c.z, c.h); cc.driver = 'ai'; cc.from = c.from; cc.to = c.to; cc.patrol = true; } }
  for (let i = 0; i < 34; i++) {
    const bi = (srnd() * 8) | 0, bj = (srnd() * 8) | 0, k = (srnd() * 4) | 0;
    const [x, z] = cornerPos(bi, bj, k); const p = spawnPed(x, z); setCityWalk(p, bi, bj, (k + 1) % 4);
  }
  for (let i = 0; i < 10; i++) { const [x, z] = beachSpots[i % beachSpots.length]; spawnPed(x + 3, z + 3); }
}

// ================================================================ minimap
const MM = { img: null, s: 1024 / (WORLD * 2) };
function buildMinimap() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d'), s = MM.s, W = v => (v + WORLD) * s;
  x.fillStyle = '#1aa2cf'; x.fillRect(0, 0, 1024, 1024);
  const poly = (fn, col) => { x.beginPath(); for (let k = 0; k <= 180; k++) { const t = k / 180 * TAU, r = fn(t); x.lineTo(W(Math.cos(t) * r), W(Math.sin(t) * r)); } x.fillStyle = col; x.fill(); };
  poly(sandR, '#f2dca2'); poly(grassR, '#6fb653');
  x.fillStyle = '#d9d2c2'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const b = blocks[i][j]; x.fillRect(W(b.x0), W(b.z0), (b.x1 - b.x0) * s, (b.z1 - b.z0) * s); }
  x.fillStyle = '#5fae48'; for (const r of mm.parks) x.fillRect(W(r[0]), W(r[1]), (r[2] - r[0]) * s, (r[3] - r[1]) * s);
  x.strokeStyle = '#545861'; x.lineWidth = HR * 2 * s; x.lineCap = 'round';
  for (const [a, b] of edges) { x.beginPath(); x.moveTo(W(nodes[a].x), W(nodes[a].z)); x.lineTo(W(nodes[b].x), W(nodes[b].z)); x.stroke(); }
  x.fillStyle = '#9a9488'; for (const r of mm.rects) x.fillRect(W(r[0]), W(r[1]), (r[2] - r[0]) * s, (r[3] - r[1]) * s);
  x.fillStyle = '#e3a07a'; for (const r of mm.houses) x.fillRect(W(r[0]), W(r[1]), (r[2] - r[0]) * s, (r[3] - r[1]) * s);
  x.fillStyle = '#9b7048'; x.fillRect(W(PX0), W(PZ0), (PX1 - PX0) * s, (PZ1 - PZ0) * s);
  if (mm.spray) { x.fillStyle = '#ff4fa0'; const r = mm.spray; x.fillRect(W(r.x0), W(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s); }
  MM.img = c;
}
const mmCanvas = $('minimap'), mmx = mmCanvas.getContext('2d');
function sizeMinimap() { const r = mmCanvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); mmCanvas.width = Math.max(1, r.width * d); mmCanvas.height = Math.max(1, r.height * d); }
addEventListener('resize', sizeMinimap);
function drawMinimap() {
  const w = mmCanvas.width, h = mmCanvas.height, P = playerPos(), x = mmx;
  const range = player.car ? 190 : 120, z = (w / 2) / range; // pixels per world unit
  const rot = -PI / 2 - Math.atan2(Math.cos(cam.yaw), Math.sin(cam.yaw));
  x.save(); x.fillStyle = '#1aa2cf'; x.fillRect(0, 0, w, h);
  x.translate(w / 2, h / 2); x.rotate(rot);
  x.save(); x.scale(z / MM.s, z / MM.s); x.drawImage(MM.img, -(P.x + WORLD) * MM.s, -(P.z + WORLD) * MM.s); x.restore();
  const rad = w / 2 - 8 * (w / 168);
  const blip = (wx, wz, col, size, clampEdge, glyph) => {
    let dx = (wx - P.x) * z, dz = (wz - P.z) * z; const l = Math.hypot(dx, dz);
    if (l > rad) { if (!clampEdge) return; dx *= rad / l; dz *= rad / l; }
    x.save(); x.translate(dx, dz); x.rotate(-rot);
    if (glyph) { x.font = `900 ${size * 2.2}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = size * 0.6; x.strokeStyle = '#000'; x.strokeText(glyph, 0, 1); x.fillStyle = col; x.fillText(glyph, 0, 1); }
    else { x.beginPath(); x.arc(0, 0, size, 0, TAU); x.fillStyle = col; x.fill(); x.lineWidth = size * 0.35; x.strokeStyle = '#000'; x.stroke(); }
    x.restore();
  };
  const u = w / 168;
  for (const s of stores) blip(s.x, s.z, s.cool > 0 ? '#888' : '#7dff7a', 6 * u, true, s.bank ? '$$' : '$');
  if (special.spray) blip(special.spray.x, special.spray.z, '#ff4fa0', 6 * u, G.stars > 0, 'S');
  if (special.hospital) blip(special.hospital.x, special.hospital.z, '#ff3b4f', 6 * u, false, '+');
  if (special.police) blip(special.police.x, special.police.z, '#5aa0ff', 6 * u, false, '★');
  const flash = (G.t * 4 | 0) % 2;
  for (const c of cars) if (c.police && (c.driver === 'cop' || c.chase)) blip(c.x, c.z, flash ? '#ff3b4f' : '#4d8dff', 4.5 * u, false);
  for (const p of peds) if (p.cop) blip(p.x, p.z, flash ? '#4d8dff' : '#ff3b4f', 3.5 * u, false);
  if (G.heli) blip(G.heli.x, G.heli.z, '#ffffff', 4.5 * u, false);
  // player arrow
  const ph = player.car ? player.car.h : player.h;
  x.save(); x.rotate(-ph + PI);
  x.beginPath(); x.moveTo(0, -9 * u); x.lineTo(6.5 * u, 7 * u); x.lineTo(0, 3.5 * u); x.lineTo(-6.5 * u, 7 * u); x.closePath();
  x.fillStyle = '#fff'; x.fill(); x.lineWidth = 2 * u; x.strokeStyle = '#000'; x.stroke(); x.restore();
  x.restore();
}

// ================================================================ update: player
function updatePlayer(dt) {
  const [mx, my] = moveInput();
  if (player.car) { driveCar(player.car, mx, my, dt); return; }
  const p = player;
  if (p.downT > 0) {
    p.downT -= dt;
    if (p.downT <= 0) { p.m.g.rotation.x = 0; }
  }
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -Math.cos(cam.yaw), rz = Math.sin(cam.yaw);
  let dx = fx * my + rx * mx, dz = fz * my + rz * mx;
  const mag = Math.min(1, Math.hypot(mx, my));
  let spd = 0;
  if (mag > 0.08 && p.downT <= 0) {
    const run = mag > 0.82;
    spd = run ? 10 : 2.5 + mag * 4;
    const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    p.h = angLerp(p.h, Math.atan2(dx, dz), Math.min(1, dt * 12));
    p.x += dx * spd * dt; p.z += dz * spd * dt;
  }
  p.speed = spd;
  resolve(p, 0.45); boundary(p, 1);
  // cars push the player
  for (const c of cars) {
    if (d2(c.x, c.z, p.x, p.z) > 16) continue;
    const [cfx, cfz] = carFwd(c), ox = p.x - c.x, oz = p.z - c.z;
    const lz = ox * cfx + oz * cfz, lx = ox * cfz - oz * cfx, hw = c.T.W / 2 + 0.45, hl = c.T.L / 2 + 0.45;
    if (Math.abs(lx) < hw && Math.abs(lz) < hl && p.y < c.y + 1.6) {
      if (Math.abs(c.speed) > 6 && p.downT <= 0) {
        p.downT = 1.6; p.m.g.rotation.x = -PI / 2; p.hp -= Math.abs(c.speed) * 1.1; sfx('punch'); shake = 0.5;
        p.vy = 4; p.onGround = false;
      }
      const px = hw - Math.abs(lx), pz = hl - Math.abs(lz);
      if (px < pz) { const s = Math.sign(lx) * px; p.x += cfz * s; p.z += -cfx * s; }
      else { const s = Math.sign(lz) * pz; p.x += cfx * s; p.z += cfz * s; }
    }
  }
  // vertical
  const gy = groundY(p.x, p.z);
  if (!p.onGround) { p.vy -= 22 * dt; p.y += p.vy * dt; if (p.y <= gy) { p.y = gy; p.vy = 0; p.onGround = true; } }
  else p.y = lerp(p.y, gy, Math.min(1, dt * 15));
  // anim
  const m = p.m;
  m.g.position.set(p.x, p.y + (p.downT > 0 ? 0.25 : 0), p.z); m.g.rotation.y = p.h;
  if (p.downT > 0) { poseWalk(m, 0, 0); }
  else {
    p.anim += dt * (spd > 6 ? 13 : 9);
    poseWalk(m, p.anim, spd > 0.1 ? (spd > 6 ? 1 : 0.6) : 0);
    if (!p.onGround) { m.legL.rotation.x = -0.6; m.legR.rotation.x = 0.4; }
  }
  if (p.punchT > 0) { p.punchT -= dt; m.armR.rotation.x = -PI / 2 * Math.sin(Math.max(0, p.punchT) / 0.3 * PI); }
  // pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    const k = pickups[i];
    if (d2(k.x, k.z, p.x, p.z) < 2.2) { addMoney(k.amt); scene.remove(k.m); pickups.splice(i, 1); }
  }
}
function driveCar(c, mx, my, dt) {
  const hb = !!input.keys.Space;
  carPhysics(c, c.fire ? 0 : my, mx, dt, hb);
  syncCar(c);
  player.x = c.x; player.z = c.z; player.y = c.y;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const k = pickups[i];
    if (d2(k.x, k.z, c.x, c.z) < 9) { addMoney(k.amt); scene.remove(k.m); pickups.splice(i, 1); }
  }
  // spray shack
  const s = special.spray;
  if (s && G.sprayCool <= 0 && c.x > s.x0 && c.x < s.x1 && c.z > s.z0 && c.z < s.z1 && Math.abs(c.speed) < 12) {
    G.sprayCool = 6;
    if (G.stars > 0 || c.hp < c.T.hp) {
      const cost = G.stars > 0 ? 200 : 50;
      if (save.money >= cost || G.stars === 0) {
        if (save.money >= cost) addMoney(-cost);
        G.stars = 0; G.heat = 0; c.hp = c.T.hp; c.fire = 0;
        const col = pick(CAR_COLS.filter(k => k !== c.color)); if (!c.police) { c.color = col; c.mesh.geometry = carGeo(c.type, col); }
        banner('FRESH PAINT', '#ff4fa0', G.stars === 0 ? 'Cops lost your trail. Car fixed!' : '');
        sfx('cash'); emit(c.x, c.y + 2, c.z, 0xff4fa0, 14, { spd: 5, life: 1, size: 0.4, grow: 1 });
      } else toast(`You need ${fmt(cost)} for a paint job`);
    }
  }
}

// ================================================================ update: cars
function trafficAI(c, dt) {
  if (c.to < 0) { c.to = nearestNode(c.x, c.z); c.from = c.to; }
  const F = nodes[c.from], T2 = nodes[c.to];
  let dx = T2.x - F.x, dz = T2.z - F.z, l = Math.hypot(dx, dz) || 1;
  const tx = T2.x - dz / l * 3.5, tz = T2.z + dx / l * 3.5;
  if (d2(c.x, c.z, tx, tz) < 64 || (c.from === c.to)) {
    const opts = T2.adj.filter(n => n !== c.from);
    const nxt = opts.length ? pick(opts) : c.from;
    c.from = c.to; c.to = nxt;
  }
  const des = Math.atan2(tx - c.x, tz - c.z), diff = wrapA(des - c.h);
  const ring = F.ring || T2.ring;
  let target = (ring ? 22 : 15) * (Math.abs(diff) > 0.5 ? 0.6 : 1);
  // look ahead for obstacles
  const [fx, fz] = carFwd(c), look = 3 + c.T.L / 2 + Math.max(0, c.speed) * 0.55;
  const ahead = (x, z, w) => { const ox = x - c.x, oz = z - c.z, al = ox * fx + oz * fz; return al > 0 && al < look && Math.abs(ox * fz - oz * fx) < w; };
  let blocked = false;
  for (const o of cars) if (o !== c && d2(o.x, o.z, c.x, c.z) < 900 && ahead(o.x, o.z, 2.0)) { blocked = true; break; }
  if (!blocked && !player.car && ahead(player.x, player.z, 1.8)) blocked = true;
  if (!blocked) for (const p of peds) if (p.state !== 'down' && d2(p.x, p.z, c.x, c.z) < 900 && ahead(p.x, p.z, 1.6)) { blocked = true; break; }
  if (blocked) { c.blockT += dt; if (c.blockT < 4) target = 0; }
  else c.blockT = 0;
  if (c.blockT > 6) c.blockT = 0;
  const thr = target === 0 ? (c.speed > 0.5 ? -1 : 0) : clamp((target - c.speed) * 0.25, -1, 1);
  carPhysics(c, thr, clamp(-diff * 2.2, -1, 1), dt);
}
function copCarAI(c, dt) {
  if (G.stars === 0 || G.mode !== 'play') { c.chase = false; if (c.patrol) { trafficAI(c, dt); return; } carPhysics(c, -0.3, 0, dt); return; }
  c.chase = true;
  const P = playerPos(), dist = Math.sqrt(d2(P.x, P.z, c.x, c.z));
  let tx, tz;
  const direct = dist < 70 && clearLine(c.x, c.z, P.x, P.z);
  if (direct) {
    tx = P.x; tz = P.z;
    if (player.car) { const [pfx, pfz] = carFwd(player.car); tx += pfx * player.car.speed * 0.4; tz += pfz * player.car.speed * 0.4; }
    c.tgt = -1;
  } else {
    if (c.tgt < 0) c.tgt = nearestNode(c.x, c.z);
    const goal = nearestNode(P.x, P.z);
    if (d2(c.x, c.z, nodes[c.tgt].x, nodes[c.tgt].z) < 100) { const nh = nextHop[c.tgt * NN + goal]; c.tgt = nh >= 0 ? nh : goal; }
    tx = nodes[c.tgt].x; tz = nodes[c.tgt].z;
  }
  const des = Math.atan2(tx - c.x, tz - c.z), diff = wrapA(des - c.h);
  let thr = 1, str = clamp(-diff * 2.5, -1, 1);
  if (Math.abs(diff) > 1.1 && c.speed > 14) thr = -0.6;
  if (!player.car && dist < 13) thr = c.speed > 1 ? -1 : 0;
  // stuck: back up
  if (c.revT > 0) { c.revT -= dt; thr = -1; str = -str; }
  else if (thr > 0 && Math.abs(c.speed) < 1.5) { c.stuckT += dt; if (c.stuckT > 1.2) { c.revT = 1.1; c.stuckT = 0; } }
  else c.stuckT = 0;
  carPhysics(c, thr, str, dt);
  // get out and chase on foot
  if (!player.car && dist < 16 && Math.abs(c.speed) < 2.5) {
    const n = G.stars >= 2 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const side = k ? -1 : 1, x = c.x + Math.cos(c.h) * 1.9 * side, z = c.z - Math.sin(c.h) * 1.9 * side;
      const p = spawnPed(x, z, { cop: true, car: c }); p.h = c.h;
    }
    c.driver = 'none'; c.copsInside = n; c.chase = false;
  }
}
function carCollisions(dt) {
  const n = cars.length;
  for (let i = 0; i < n; i++) {
    const a = cars[i];
    for (let j = i + 1; j < n; j++) {
      const b = cars[j];
      const dd = d2(a.x, a.z, b.x, b.z); if (dd > 49) continue;
      const [afx, afz] = carFwd(a), [bfx, bfz] = carFwd(b);
      const ao = a.T.L / 2 - a.T.W / 2, bo = b.T.L / 2 - b.T.W / 2, rr = a.T.W / 2 + b.T.W / 2;
      for (const sa of [ao, -ao]) for (const sb of [bo, -bo]) {
        const ax = a.x + afx * sa, az = a.z + afz * sa, bx = b.x + bfx * sb, bz = b.z + bfz * sb;
        const ddx = ax - bx, ddz = az - bz, d = Math.hypot(ddx, ddz);
        if (d >= rr || d < 1e-4) continue;
        const nx = ddx / d, nz = ddz / d, pen = rr - d, ma = a.T.mass, mb = b.T.mass, tot = ma + mb;
        const aStatic = a.driver === 'none' && !a.speed, bStatic = b.driver === 'none' && !b.speed;
        const ka = aStatic && !bStatic ? 0.25 : mb / tot, kb = bStatic && !aStatic ? 0.25 : ma / tot;
        a.x += nx * pen * ka; a.z += nz * pen * ka; b.x -= nx * pen * kb; b.z -= nz * pen * kb;
        const vax = afx * a.speed, vaz = afz * a.speed, vbx = bfx * b.speed, vbz = bfz * b.speed;
        const rel = (vax - vbx) * nx + (vaz - vbz) * nz;
        if (rel < 0) {
          const J = -(1.25) * rel / (1 / ma + 1 / mb);
          const nvax = vax + J / ma * nx, nvaz = vaz + J / ma * nz, nvbx = vbx - J / mb * nx, nvbz = vbz - J / mb * nz;
          a.speed = nvax * afx + nvaz * afz; b.speed = nvbx * bfx + nvbz * bfz;
          const imp = -rel;
          if (imp > 7) {
            damageCar(a, (imp - 8) * 1.1 / ma); damageCar(b, (imp - 8) * 1.1 / mb);
            const pl = a.driver === 'player' ? a : b.driver === 'player' ? b : null;
            if (pl && performance.now() - pl.lastHit > 300) {
              pl.lastHit = performance.now(); sfx('crash', Math.min(1, imp / 25)); shake = Math.min(1, imp / 22);
              emit((ax + bx) / 2, 1, (az + bz) / 2, 0xffd23f, 8, { spd: 6, life: 0.4, size: 0.18 });
              const other = pl === a ? b : a;
              if (other.police && other.driver === 'cop' && G.stars < 2) crime(30, 1);
            }
          }
        }
      }
    }
  }
  // cars vs pedestrians
  for (const c of cars) {
    const spd = Math.abs(c.speed);
    for (const p of peds) {
      if (p.state === 'down' && p.air) continue;
      if (d2(c.x, c.z, p.x, p.z) > 16) continue;
      const [fx, fz] = carFwd(c), ox = p.x - c.x, oz = p.z - c.z;
      const lz = ox * fx + oz * fz, lx = ox * fz - oz * fx, hw = c.T.W / 2 + 0.4, hl = c.T.L / 2 + 0.4;
      if (Math.abs(lx) >= hw || Math.abs(lz) >= hl) continue;
      if (spd > 6 && p.state !== 'down') {
        knockPed(p, fx * c.speed * 0.5 + R(-2, 2), fz * c.speed * 0.5 + R(-2, 2), 3 + spd * 0.15);
        if (c.driver === 'player') { crime(p.cop ? 70 : 14, p.cop ? 2 : 1); sfx('punch'); shake = 0.3; if (Math.random() < 0.4) dropCash(p.x, p.z, Math.round(R(5, 50))); panic(p.x, p.z, 20); }
      } else {
        const px = hw - Math.abs(lx), pz = hl - Math.abs(lz);
        if (px < pz) { const s = Math.sign(lx) * px; p.x += fz * s; p.z += -fx * s; } else { const s = Math.sign(lz) * pz; p.x += fx * s; p.z += fz * s; }
      }
    }
  }
}
function updateCars(dt) {
  const P = playerPos();
  for (const c of [...cars]) {
    const dd = d2(c.x, c.z, P.x, P.z);
    c.g.visible = dd < 340 * 340;
    if (c.driver === 'ai') {
      if (dd > 290 * 290 && !c.police) { if (!relocateTraffic(c)) continue; }
      else if (dd > 300 * 300) continue;
      trafficAI(c, dt);
    } else if (c.driver === 'cop') copCarAI(c, dt);
    else if (c.driver === 'none') {
      if (c.speed !== 0) carPhysics(c, 0, 0, dt);
      if (!c.perm && dd > 260 * 260) { removeCar(c); continue; }
    }
    if (c.driver !== 'player') syncCar(c);
    // fire + smoke
    if (!c.wreck && c.hp < c.T.hp * 0.35 && c.g.visible) {
      c.smokeT -= dt;
      if (c.smokeT <= 0) { c.smokeT = c.fire ? 0.05 : 0.18; const [fx, fz] = carFwd(c); emit(c.x + fx * c.T.L * 0.35, c.y + 1.2, c.z + fz * c.T.L * 0.35, c.fire ? pick([0xff7a1a, 0xffc21a, 0x555555]) : 0x666666, 1, { spd: 0.6, up: 2.5, grav: -1, life: 1.1, size: 0.4, grow: 0.6 }); }
    }
    if (c.fire > 0) { c.fire -= dt; if (c.fire <= 0) explode(c); }
    if (c.police && c.lr) {
      const on = c.driver === 'cop' || c.chase || (c.driver === 'player') || c.copsInside;
      const f = on && ((G.t * 6) | 0) % 2;
      c.lr.material = on ? (f ? sirenR : wreckMat) : sirenR; c.lb.material = on ? (f ? wreckMat : sirenB) : sirenB;
    }
  }
  carCollisions(dt);
}
function explode(c) {
  c.wreck = true; c.fire = 0; c.speed = 0; c.mesh.material = wreckMat; c.perm = false;
  if (c.lr) { c.lr.visible = c.lb.visible = false; }
  emit(c.x, c.y + 1, c.z, 0xff7a1a, 16, { spd: 8, up: 9, life: 0.8, size: 0.6, grow: 0.8 });
  emit(c.x, c.y + 1, c.z, 0xffd23f, 10, { spd: 10, up: 8, life: 0.5, size: 0.3 });
  emit(c.x, c.y + 1, c.z, 0x444444, 10, { spd: 3, up: 5, grav: -2, life: 1.8, size: 0.6, grow: 0.7 });
  const pd = d2(c.x, c.z, player.x, player.z);
  if (pd < 400) { sfx('boom'); shake = 1; }
  if (c.driver === 'player') { exitCar(); player.hp -= 45; player.downT = 1.5; player.m.g.rotation.x = -PI / 2; }
  else if (pd < 49 && !player.car) { player.hp -= 25; player.downT = 1.2; player.m.g.rotation.x = -PI / 2; }
  if (c.driver === 'ai' || c.driver === 'cop') c.driver = 'none';
  for (const p of peds) { const d = d2(p.x, p.z, c.x, c.z); if (d < 100 && p.state !== 'down') { const l = Math.sqrt(d) || 1; knockPed(p, (p.x - c.x) / l * 8, (p.z - c.z) / l * 8, 7); } }
  for (const o of cars) if (o !== c && !o.wreck && d2(o.x, o.z, c.x, c.z) < 64) damageCar(o, 40);
  panic(c.x, c.z, 40);
}

// ================================================================ update: pedestrians
function updatePeds(dt) {
  const P = playerPos();
  if (peds.length > 52) { // too many: drop the farthest normal person
    let far = null, fd = 0; for (const p of peds) { if (p.cop) continue; const d = d2(p.x, p.z, P.x, P.z); if (d > fd) { fd = d; far = p; } }
    if (far) removePed(far);
  }
  for (const p of [...peds]) {
    const dd = d2(p.x, p.z, P.x, P.z);
    const vis = dd < 170 * 170; p.m.g.visible = vis;
    if (p.cop) { if (copPed(p, dt, dd)) continue; }
    else if (dd > 210 * 210 && p.state !== 'down') { if (!placePedNear(p, P.x, P.z, 90, 180)) continue; p.state = 'walk'; p.robbed = false; p.m.g.rotation.x = 0; }
    else if (dd > 120 * 120 && (G.t * 10 | 0) % 3) { if (vis) syncPed(p); continue; }
    pedStep(p, dt);
  }
}
function pedStep(p, dt) {
  const m = p.m;
  if (p.state === 'down') {
    if (p.air) {
      p.vy -= 25 * dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
      resolve(p, 0.4); boundary(p, 1);
      const gy = groundY(p.x, p.z); if (p.y <= gy) { p.y = gy; p.air = false; p.vx = p.vz = 0; }
    }
    p.t -= dt;
    if (p.t <= 0) { m.g.rotation.x = 0; if (p.cop) p.state = 'chase'; else { p.state = 'flee'; p.t = R(4, 7); } }
    poseWalk(m, 0, 0); syncPed(p, 0.25); return;
  }
  let tx = p.tx, tz = p.tz, spd = 0;
  if (p.state === 'walk') {
    spd = p.walkSpd;
    if (d2(p.x, p.z, tx, tz) < 0.5) {
      if (p.mode === 'city') {
        if (p.cross) { p.bi = p.cross[0]; p.bj = p.cross[1]; p.k = p.cross[2]; p.cross = null; }
        if (Math.random() < 0.2) {
          const opts = CROSS[p.k].filter(([di, dj]) => p.bi + di >= 0 && p.bi + di < 8 && p.bj + dj >= 0 && p.bj + dj < 8);
          if (opts.length) { const [di, dj, nk] = pick(opts); p.cross = [p.bi + di, p.bj + dj, nk]; [p.tx, p.tz] = cornerPos(p.bi + di, p.bj + dj, nk); }
        }
        if (!p.cross) { p.k = (p.k + p.dir + 4) % 4; [p.tx, p.tz] = cornerPos(p.bi, p.bj, p.k); }
      } else {
        for (let a = 0; a < 6; a++) {
          const x = p.homeX + R(-18, 18), z = p.homeZ + R(-18, 18), r = Math.hypot(x, z), t = Math.atan2(z, x);
          if (r < sandR(t) - 6 && !solidAt(x, z, 1)) { p.tx = x; p.tz = z; break; }
        }
        if (Math.random() < 0.3) { p.t = R(1, 4); p.state = 'idle'; }
      }
      tx = p.tx; tz = p.tz;
    }
  } else if (p.state === 'idle') {
    p.t -= dt; if (p.t <= 0) p.state = 'walk';
  } else if (p.state === 'flee') {
    spd = 6.2; const P = playerPos(), dx = p.x - P.x, dz = p.z - P.z, l = Math.hypot(dx, dz) || 1;
    tx = p.x + dx / l * 10; tz = p.z + dz / l * 10;
    p.t -= dt; if (p.t <= 0) resumeWalk(p);
  } else if (p.state === 'handsup') {
    p.t -= dt; poseHandsUp(m); syncPed(p);
    if (p.t <= 0) { p.state = 'flee'; p.t = R(5, 8); }
    return;
  }
  if (spd > 0) {
    const dx = tx - p.x, dz = tz - p.z, l = Math.hypot(dx, dz);
    if (l > 0.05) {
      p.h = angLerp(p.h, Math.atan2(dx, dz), Math.min(1, dt * 8));
      const step = Math.min(l, spd * dt); p.x += dx / l * step; p.z += dz / l * step;
    }
    resolve(p, 0.4); boundary(p, 1);
  }
  // keep a little space from the player
  if (!player.car && d2(p.x, p.z, player.x, player.z) < 0.81) {
    const dx = p.x - player.x, dz = p.z - player.z, l = Math.hypot(dx, dz) || 1;
    p.x = player.x + dx / l * 0.9; p.z = player.z + dz / l * 0.9;
  }
  p.y = lerp(p.y, groundY(p.x, p.z), Math.min(1, dt * 12));
  p.anim += dt * (spd > 4 ? 13 : 8);
  poseWalk(m, p.anim, spd > 0 ? (spd > 4 ? 1 : 0.55) : 0);
  syncPed(p);
}
function syncPed(p, lift = 0) { p.m.g.position.set(p.x, p.y + lift, p.z); p.m.g.rotation.y = p.h; }
function copPed(p, dt, dd) {
  if (p.state === 'down') { pedStep(p, dt); return true; }
  const P = playerPos(), dist = Math.sqrt(dd);
  if (G.stars === 0 || G.mode !== 'play') {
    // go back to the car or just leave
    if (dist > 70 || p.t > 25) { removePed(p); return true; }
    p.t += dt; p.state = 'walk'; p.tx = p.x + Math.sin(p.h) * 5; p.tz = p.z + Math.cos(p.h) * 5;
    if (p.car && p.car.driver === 'none' && !p.car.wreck) { p.tx = p.car.x; p.tz = p.car.z; if (d2(p.x, p.z, p.car.x, p.car.z) < 9) { p.car.copsInside = 0; removePed(p); return true; } }
    pedStep(p, dt); return true;
  }
  if (dist > 110) { removePed(p); return true; }
  // player drove off: go back to own car
  if (player.car && dist > 28 && p.car && p.car.driver === 'none' && !p.car.wreck && d2(p.x, p.z, p.car.x, p.car.z) < 50 * 50) {
    p.tx = p.car.x; p.tz = p.car.z;
    if (d2(p.x, p.z, p.car.x, p.car.z) < 9) {
      p.car.driver = 'cop'; p.car.copsInside = 0; p.car.tgt = -1;
      for (const o of [...peds]) if (o !== p && o.cop && o.car === p.car && d2(o.x, o.z, p.car.x, p.car.z) < 400) removePed(o);
      removePed(p); return true;
    }
  } else { p.tx = P.x; p.tz = P.z; }
  const dx = p.tx - p.x, dz = p.tz - p.z, l = Math.hypot(dx, dz);
  const spd = dist < 1.4 && p.tx === P.x ? 0 : 8.4;
  if (l > 0.05 && spd) { p.h = angLerp(p.h, Math.atan2(dx, dz), Math.min(1, dt * 10)); const s = Math.min(l, spd * dt); p.x += dx / l * s; p.z += dz / l * s; }
  else if (l > 0.05) p.h = Math.atan2(dx, dz);
  resolve(p, 0.4); boundary(p, 1);
  p.y = lerp(p.y, groundY(p.x, p.z), Math.min(1, dt * 12));
  p.anim += dt * 13; poseWalk(p.m, p.anim, spd ? 1 : 0);
  // arresting
  if (G.mode === 'play') {
    if (!player.car && dist < 1.7 && player.downT <= 0) { G.arrest += dt * 0.42; p.m.armR.rotation.x = -PI / 2; p.m.armL.rotation.x = -PI / 2; }
    else if (player.car && dist < 3.4 && Math.abs(player.car.speed) < 2) { G.arrest += dt * 0.35; p.m.armR.rotation.x = -PI / 2; }
    p.zapT -= dt;
    if (G.stars >= 3 && !player.car && dist > 2.5 && dist < 12 && p.zapT <= 0 && clearLine(p.x, p.z, P.x, P.z)) {
      p.zapT = R(2, 3);
      zap(p.x, p.y + 1.6, p.z, player.x, player.y + 1.2, player.z); sfx('zap');
      player.hp -= 7; shake = 0.3;
      if (Math.random() < 0.3 && player.downT <= 0) { player.downT = 0.9; player.m.g.rotation.x = -PI / 2; }
    }
  }
  syncPed(p);
  return true;
}

// ================================================================ wanted / police manager
function updateWanted(dt) {
  if (G.mode !== 'play') return;
  const P = playerPos();
  let seen = false;
  for (const c of cars) if (c.police && (c.driver === 'cop') && d2(c.x, c.z, P.x, P.z) < 75 * 75) { seen = true; break; }
  if (!seen) for (const p of peds) if (p.cop && p.state !== 'down' && d2(p.x, p.z, P.x, P.z) < 50 * 50) { seen = true; break; }
  if (G.heli) seen = true;
  G.seen = seen;
  if (G.stars > 0) {
    if (seen) G.unseen = 0; else G.unseen += dt;
    const need = 9 + G.stars * 1.5;
    if (G.unseen > need) {
      G.unseen = 0; G.stars--; G.heat = G.stars ? HEAT_STEPS[G.stars] : 0;
      if (G.stars === 0) { banner('LOST THEM', '#7dff7a', 'The cops gave up.'); sfx('star'); }
    }
  } else { G.arrest = Math.max(0, G.arrest - dt); player.hp = Math.min(100, player.hp + dt * 4); }
  // spawn police cars
  const want = [0, 1, 2, 4, 5, 7][G.stars];
  const active = cars.filter(c => c.police && c.driver === 'cop').length + Math.ceil(peds.filter(p => p.cop).length / 2);
  G.copSpawnT -= dt;
  if (G.stars > 0 && active < want && G.copSpawnT <= 0) {
    G.copSpawnT = 2.2;
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    let best = null;
    for (let a = 0; a < 30; a++) {
      const n = nodes[(Math.random() * NN) | 0], dx = n.x - P.x, dz = n.z - P.z, d = Math.hypot(dx, dz);
      if (d < 100 || d > 210) continue;
      best = n; if ((dx * fx + dz * fz) / d < 0.3) break;
    }
    if (best) { const c = spawnCar('police', best.x, best.z, Math.atan2(P.x - best.x, P.z - best.z)); c.driver = 'cop'; c.tgt = best.id; c.speed = 10; }
  }
  // remove extra cops when calm
  if (G.stars === 0) for (const c of [...cars]) if (c.police && !c.patrol && !c.perm && c.driver !== 'player' && d2(c.x, c.z, P.x, P.z) > 140 * 140) removeCar(c);
  // arrest meter
  if (G.arrest >= 1) busted();
  else if (G.arrest > 0) G.arrest = Math.max(0, G.arrest - dt * 0.12);
  if (player.hp <= 0) wasted();
  // helicopter
  if (G.stars >= 4 && !G.heli) spawnHeli();
  if (G.heli) updateHeli(dt);
}
function spawnHeli() {
  const g = new THREE.Group(), body = new GB();
  body.box(-1.4, -1, -2.5, 1.4, 1.2, 2.2, C(0x15161a)); body.box(-1.2, -0.6, 1.4, 1.2, 1, 2.6, C(0x1e2a38));
  body.box(-0.3, 0, -7, 0.3, 0.6, -2.5, C(0x15161a)); body.box(-0.1, 0, -7.4, 0.1, 2, -6.6, C(0x15161a));
  body.box(-1.5, -1.6, -1.8, -1.3, -1.4, 1.8, C(0x333333)); body.box(1.3, -1.6, -1.8, 1.5, -1.4, 1.8, C(0x333333));
  body.box(-1.41, -0.2, -1.5, 1.41, 0.5, 0.5, C(0xf4f4f4));
  g.add(new THREE.Mesh(body.geo(), matV));
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(13, 0.1, 0.5), M(0x222222)); rotor.position.y = 1.5; g.add(rotor);
  const rotor2 = new THREE.Mesh(new THREE.BoxGeometry(13, 0.1, 0.5), M(0x222222)); rotor2.position.y = 1.5; rotor2.rotation.y = PI / 2; g.add(rotor2);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 1, 18, 1, true).translate(0, -0.5, 0),
    new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  scene.add(beam);
  const P = playerPos();
  G.heli = { g, rotor, rotor2, beam, x: P.x + 150, z: P.z + 80, y: 60, leaving: false };
  g.position.set(G.heli.x, G.heli.y, G.heli.z);
  scene.add(g);
  toast('Police helicopter! 🚁');
}
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), DOWN = new THREE.Vector3(0, -1, 0);
function updateHeli(dt) {
  const H = G.heli, P = playerPos();
  if (G.stars < 4 || G.mode !== 'play') H.leaving = true;
  let tx, ty, tz;
  if (H.leaving) { tx = H.x + 50; tz = H.z + 50; ty = H.y + 30; }
  else { tx = P.x + Math.cos(G.t * 0.35) * 22; tz = P.z + Math.sin(G.t * 0.35) * 22; ty = 36; }
  const k = Math.min(1, dt * 0.9);
  const vx = (tx - H.x) * k, vz = (tz - H.z) * k;
  H.x += vx; H.z += vz; H.y = lerp(H.y, ty, k);
  H.g.position.set(H.x, H.y, H.z);
  H.g.rotation.y = Math.atan2(P.x - H.x, P.z - H.z);
  H.rotor.rotation.y += dt * 25; H.rotor2.rotation.y = H.rotor.rotation.y + PI / 2;
  if (H.leaving) {
    H.beam.visible = false;
    if (H.y > 120) { scene.remove(H.g); scene.remove(H.beam); G.heli = null; }
    return;
  }
  H.beam.visible = true;
  _v.set(P.x - H.x, (P.y || 0) - H.y + 0.2, P.z - H.z); const L = _v.length(); _v.normalize();
  _q.setFromUnitVectors(DOWN, _v);
  H.beam.position.set(H.x, H.y - 1, H.z); H.beam.quaternion.copy(_q); H.beam.scale.set(1, L, 1);
}
function clearCops() {
  for (const p of [...peds]) if (p.cop) removePed(p);
  for (const c of [...cars]) if (c.police && !c.patrol && !c.perm && c.driver !== 'player') removeCar(c);
  if (G.heli) { scene.remove(G.heli.g); scene.remove(G.heli.beam); G.heli = null; }
  G.stars = 0; G.heat = 0; G.arrest = 0; G.unseen = 0;
}
function busted() {
  if (G.mode !== 'play') return;
  G.mode = 'dead'; G.deadT = 3.2; G.deadKind = 'busted';
  const fine = Math.min(save.money, 150 * Math.max(1, G.stars) + Math.floor(save.money * 0.05));
  banner('BUSTED', '#4d8dff', fine ? `You paid ${fmt(fine)} bail` : 'The cops let you off this time');
  if (fine) addMoney(-fine);
  sfx('bad');
  if (player.car) exitCar();
  poseHandsUp(player.m);
}
function wasted() {
  if (G.mode !== 'play') return;
  G.mode = 'dead'; G.deadT = 3.2; G.deadKind = 'wasted';
  const bill = Math.min(save.money, 100);
  banner('WASTED', '#ff3b4f', bill ? `Hospital bill: ${fmt(bill)}` : 'Patched up for free');
  if (bill) addMoney(-bill);
  sfx('bad');
  if (player.car) exitCar();
  player.downT = 3; player.m.g.rotation.x = -PI / 2;
}
function respawn() {
  const sp = G.deadKind === 'busted' ? special.police : special.hospital;
  clearCops();
  player.x = sp.x; player.z = sp.z; player.y = SIDE_Y; player.h = sp.h; player.hp = 100; player.downT = 0;
  player.m.g.rotation.x = 0; player.m.g.visible = true; player.car = null;
  cam.yaw = sp.h; G.mode = 'play';
}

// ================================================================ camera
function updateCamera(dt) {
  let tx, ty, tz, dist, pitch = cam.pitch, ahead = 0;
  if (G.mode === 'menu') {
    const a = G.t * 0.05; tx = 0; tz = 0; ty = 10;
    camera.position.set(Math.cos(a) * 260, 110, Math.sin(a) * 260); camera.lookAt(tx, ty, tz); return;
  }
  if (player.car) {
    const c = player.car;
    tx = c.x; tz = c.z; ty = c.y + 1.7;
    if (G.t - input.lastLook > 1.3) {
      const back = c.speed < -3 ? wrapA(c.h + PI) : c.h;
      cam.yaw = angLerp(cam.yaw, back, Math.min(1, dt * (Math.abs(c.speed) > 2 ? 3 : 0.8)));
      cam.pitch = lerp(cam.pitch, 0.24, Math.min(1, dt));
    }
    dist = 10.5 + Math.abs(c.speed) * 0.06; ahead = 3;
    cam.fov = lerp(cam.fov, 62 + Math.min(14, Math.abs(c.speed) * 0.3), Math.min(1, dt * 2));
  } else {
    tx = player.x; tz = player.z; ty = player.y + 1.9; dist = 6.8;
    cam.fov = lerp(cam.fov, 62, Math.min(1, dt * 2));
    const mag = Math.hypot(input.jx, input.jy);
    if (G.t - input.lastLook > 2 && mag > 0.3 && input.jy > Math.abs(input.jx)) cam.yaw = angLerp(cam.yaw, player.h, Math.min(1, dt * 0.9));
  }
  const dead = G.mode === 'dead';
  if (dead) { dist = 18; pitch = 1.2; cam.yaw += dt * 0.3; }
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), hd = dist * Math.cos(pitch), vd = dist * Math.sin(pitch);
  let k = 1;
  if (!dead) for (let s = 1; s <= 10; s++) { const t = s / 10; if (solidAt(tx - fx * hd * t, tz - fz * hd * t, ty + vd * t)) { k = Math.max(0.12, (s - 1.5) / 10); break; } }
  let cx = tx - fx * hd * k, cy = ty + vd * k, cz = tz - fz * hd * k;
  if (shake > 0) { cx += R(-1, 1) * shake * 0.4; cy += R(-1, 1) * shake * 0.4; cz += R(-1, 1) * shake * 0.4; shake = Math.max(0, shake - dt * 2.5); }
  camera.position.set(cx, Math.max(cy, groundY(cx, cz) + 0.6), cz);
  camera.lookAt(tx + fx * ahead, ty, tz + fz * ahead);
  if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
}

// ================================================================ HUD
let hudT = 0, robbing = null;
const hud = { money: $('money'), stars: $('stars'), hp: $('hpbar').firstElementChild, carbar: $('carbar'), carI: $('carbar').firstElementChild,
  prompt: $('prompt'), prog: $('prog'), progI: $('prog').firstElementChild, arrest: $('arrest'), arrestI: $('arrest').querySelector('i'),
  bRob: $('bRob'), bCar: $('bCar'), bJump: $('bJump'), bHorn: $('bHorn') };
let lastStars = -1, lastFlash = null, lastMoney = -1;
function updateHUD(dt) {
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('msg').classList.remove('show'); }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  hudT -= dt; if (hudT > 0) return; hudT = 0.1;
  if (save.money !== lastMoney) { hud.money.textContent = fmt(save.money); lastMoney = save.money; }
  if (G.stars !== lastStars) { [...hud.stars.children].forEach((s, i) => s.classList.toggle('on', i < G.stars)); lastStars = G.stars; }
  const fl = G.stars > 0 && !G.seen; if (fl !== lastFlash) { hud.stars.classList.toggle('flash', fl); lastFlash = fl; }
  hud.hp.style.width = clamp(player.hp, 0, 100) + '%';
  if (player.car) { hud.carbar.style.display = ''; hud.carI.style.width = clamp(player.car.hp / player.car.T.hp * 100, 0, 100) + '%'; }
  else hud.carbar.style.display = 'none';
  hud.arrest.style.display = G.arrest > 0.02 && G.mode === 'play' ? 'block' : 'none'; hud.arrestI.style.width = clamp(G.arrest * 100, 0, 100) + '%';
  // prompt + button states
  let prompt = '';
  let robReady = false, carReady = false;
  if (G.mode === 'play') {
    if (player.car) {
      carReady = true;
      if (special.spray && G.stars > 0) prompt = 'Lose the cops: drive into the pink Spray Shack (S on the map)';
      if (player.car.fire) prompt = 'Car on fire! Tap 🚗 to jump out!';
    } else {
      const s = nearStore();
      const c = nearestCar(1.8), p = nearestPed(2.4);
      if (s) { robReady = s.cool <= 0; prompt = s.cool > 0 ? `${s.name} is empty. Come back in ${Math.ceil(s.cool)}s` : `Hold 👊 to rob ${s.name}`; }
      else if (c) { carReady = true; prompt = c.driver === 'ai' ? 'Tap 🚗 to steal this car' : c.driver === 'cop' ? 'Tap 🚗 to steal the cop car!' : 'Tap 🚗 to get in'; }
      else if (p) { robReady = true; prompt = p.cop ? 'Tap 👊 to punch the cop (bad idea!)' : p.robbed ? 'Tap 👊 to punch' : 'Tap 👊 to rob'; }
    }
  }
  if (robbing) prompt = `Robbing ${robbing.name}… keep holding!`;
  hud.prompt.style.display = prompt ? 'block' : 'none'; if (prompt) hud.prompt.textContent = prompt;
  hud.bRob.classList.toggle('ready', robReady); hud.bCar.classList.toggle('ready', carReady);
  hud.bRob.classList.toggle('dim', !!player.car); hud.bJump.style.display = player.car ? 'none' : ''; hud.bHorn.style.display = player.car ? '' : 'none';
}
function updateRobbery(dt) {
  const s = (!player.car && G.mode === 'play') ? nearStore() : null;
  if (s && input.rob && s.cool <= 0) {
    if (robbing !== s) { robbing = s; s.prog = 0; panic(s.x, s.z, 25); }
    s.prog += dt;
    player.punchT = 0.3; player.h = 0;
    hud.prog.style.display = 'block'; hud.progI.style.width = clamp(s.prog / s.hold * 100, 0, 100) + '%';
    if (Math.random() < dt * 3) crime(0, s.bank ? 2 : 1);
    if (s.prog >= s.hold) {
      const amt = Math.round(R(s.min, s.max)); addMoney(amt);
      crime(s.heat, s.bank ? 3 : 2); s.cool = s.bank ? 180 : 90; robbing = null; hud.prog.style.display = 'none';
      banner(fmt(amt), '#7dff7a', s.bank ? 'BANK HEIST! Get out of here!' : `You robbed ${s.name}!`);
      emit(s.x, 2, s.z, 0x4fdc5a, 16, { spd: 5, up: 7, life: 1.2, size: 0.35 });
    }
  } else if (robbing) { robbing = null; hud.prog.style.display = 'none'; }
  for (const st of stores) {
    if (st.cool > 0) st.cool -= dt;
    const on = st.cool <= 0;
    st.marker.visible = on; st.icon.visible = on && st !== s;
    if (on) { st.marker.material.opacity = 0.55 + Math.sin(G.t * 5) * 0.3; st.icon.position.y = 4.6 + Math.sin(G.t * 2.5) * 0.25; st.icon.rotation.y = G.t * 1.5; }
  }
}

// ================================================================ audio update
function updateAudio() {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime;
  const c = player.car;
  AU.engG.gain.setTargetAtTime(c && G.mode === 'play' ? 0.07 : 0, t, 0.1);
  if (c) AU.eng.frequency.setTargetAtTime(45 + Math.abs(c.speed) * 3.2, t, 0.08);
  let near = 1e9; const P = playerPos();
  if (G.stars > 0) for (const k of cars) if (k.police && k.driver === 'cop') near = Math.min(near, d2(k.x, k.z, P.x, P.z));
  if (c && c.police) near = 0;
  const v = near < 1e8 ? Math.max(0, 1 - Math.sqrt(near) / 130) * (c && c.police ? 0.025 : 0.05) : 0;
  AU.sirG.gain.setTargetAtTime(v, t, 0.2);
  AU.sir.frequency.setTargetAtTime(((G.t * 2.2) | 0) % 2 ? 720 : 960, t, 0.03);
}

// ================================================================ main loop
let last = performance.now(), saveT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (document.hidden) return;
  G.t += dt;
  if (!G.paused) {
    if (G.mode === 'play') updatePlayer(dt);
    else if (G.mode === 'dead') { G.deadT -= dt; if (G.deadT <= 0) respawn(); }
    updateCars(dt);
    updatePeds(dt);
    updateWanted(dt);
    updateRobbery(dt);
    if (G.sprayCool > 0) G.sprayCool -= dt;
    for (const k of pickups) { k.m.rotation.y += dt * 3; k.t -= dt; }
    for (let i = pickups.length - 1; i >= 0; i--) if (pickups[i].t <= 0) { scene.remove(pickups[i].m); pickups.splice(i, 1); }
    updateParts(dt);
    for (const z of zaps) if (z.t > 0) { z.t -= dt; if (z.t <= 0) z.l.visible = false; }
    updateHUD(dt);
    if ((G.t * 30 | 0) % 2 === 0) drawMinimap();
    updateAudio();
    saveT += dt; if (saveT > 5) { saveT = 0; persist(); }
  } else if (G.mode === 'menu') { updateCars(dt); updatePeds(dt); }
  updateCamera(dt);
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
}

// ================================================================ menus
const menu = $('menu');
function openMenu(pause) {
  if (G.mode === 'menu') return;
  G.paused = true; menu.classList.remove('hide');
  $('play').textContent = 'RESUME'; $('pauseBtns').style.display = 'block';
  if (AU.ctx) AU.ctx.suspend();
  input.jid = input.lid = null; input.jx = input.jy = 0; stickEl.style.display = 'none';
}
function closeMenu() {
  menu.classList.add('hide'); $('hud').classList.remove('off');
  audioInit();
  if (G.mode === 'menu') {
    G.mode = 'play';
    cam.yaw = player.h;
    toast('Find a car, rob a store, and get rich! 🌴');
  }
  G.paused = false; last = performance.now();
  requestAnimationFrame(sizeMinimap);
}
$('play').addEventListener('click', closeMenu);
$('sound').addEventListener('click', () => { setSound(!AU.on); $('sound').textContent = AU.on ? '🔊 Sound: ON' : '🔇 Sound: OFF'; });
$('reset').addEventListener('click', () => {
  if (!confirm('Start over with $0?')) return;
  save.money = 0; persist(); clearCops(); G.mode = 'dead'; G.deadKind = 'wasted'; respawn(); closeMenu();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode !== 'menu') openMenu(true); });

// ================================================================ start
populate();
player.m.g.position.set(player.x, player.y, player.z); player.m.g.rotation.y = player.h;
$('loading').remove();
sizeMinimap();
requestAnimationFrame(frame);
window.__game = { renderer, G, player, cars, peds, stores, special, save, crime, toggleCar, robPress, input, cam, nodes, closeMenu, addMoney };
