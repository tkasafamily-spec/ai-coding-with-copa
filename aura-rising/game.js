// Aura Rising — 3D anime story action game (game module)
// All art is built from primitives in code. three.js pinned from jsdelivr.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

export const CHAPTERS = [
  { id: 1, name: 'The Spark', place: 'Academy Courtyard', power: { id: 'punch', name: 'Aura Punch', desc: 'Tap ATTACK for a 4-hit combo. The last hit launches enemies into the air!' }, boss: { id: 'kaze', name: 'Instructor Kaze', title: 'The Gale Blade' } },
  { id: 2, name: 'Neon Night', place: 'Neon Rooftops', power: { id: 'dash', name: 'Aura Dash', desc: 'Press POWER to burst forward as a streak of light, striking everything in your path.' }, boss: { id: 'twin', name: 'The Masked Twin', title: 'Two Faces, One Shadow' } },
  { id: 3, name: 'Crimson Pages', place: 'Forest Shrine', power: { id: 'grimoire', name: 'Grimoire: Crimson Pages', desc: 'A floating spellbook fires homing blades of fire. Press POWER to cast.' }, boss: { id: 'warden', name: 'Thorn Warden', title: 'Guardian of the Old Roots' } },
  { id: 4, name: 'Infinite Sanctum', place: 'Sky Gate', power: { id: 'domain', name: 'Domain: Infinite Sanctum', desc: 'When your aura is full, press ULTIMATE. Time slows and everything inside your Domain feels your power.' }, boss: { id: 'null', name: 'Sovereign Null', title: 'The Empty Crown' } },
  // part 2: the road to the Hollow Capital. Each chapter's power is a passive upgrade (see PASSIVE in createGame).
  { id: 5, name: 'Buried Kingdom', place: 'Desert Ruins', power: { id: 'focus', name: 'Grimoire Focus', desc: 'Every grimoire you own recharges 30% faster. Swap books (G) between casts to chain spells!' }, boss: { id: 'dune', name: 'Dune Tyrant Sabulo', title: 'King Beneath the Sand' } },
  { id: 6, name: 'White Silence', place: 'Frozen Peak Village', power: { id: 'armor', name: 'Aura Armor', desc: 'Your aura flows around you like a coat. You take 20% less damage from every hit.' }, boss: { id: 'frost', name: 'Frost Empress Fubuki', title: 'The Endless Blizzard' } },
  { id: 7, name: 'Heart of Light', place: 'Crystal Caverns', power: { id: 'overflow', name: 'Aura Overflow', desc: 'Your aura fills 35% faster, so your Domain is ready sooner.' }, boss: { id: 'prism', name: 'The Prism Colossus', title: 'Guardian of the Heart' } },
  { id: 8, name: 'Kakusei', place: 'The Hollow Capital', power: { id: 'kakusei', name: 'Kakusei: Awakening', desc: 'Ren\'s true awakening. Every attack deals 25% more damage and your aura burns gold.' }, boss: { id: 'vael', name: 'Hollow Emperor Vael', title: 'The Last Darkness' } },
];

// ---------- grimoires (data-driven: Part 2 adds an entry here + a SPELLS[kind] function for each new boss) ----------
// from: boss id that drops it (null = Ren's own). spell: kind picks the behaviour in SPELLS; the rest are its tuning.
export const GRIMOIRES = [
  { id: 'crimson', name: 'Crimson Pages', color: '#ff5a2a', icon: 'flame', from: null, desc: 'Ren\'s own fire grimoire. Five homing blades of fire seek out enemies.', spell: { kind: 'fire', cd: 3.5, dmg: 11, count: 5 } },
  { id: 'gale', name: 'Gale Grimoire', color: '#5cf2c8', icon: 'wind', from: 'kaze', desc: 'Three wide wind slashes that pierce through every enemy in their path.', spell: { kind: 'gale', cd: 3.2, dmg: 14, count: 3, speed: 24, range: 22 } },
  { id: 'shadow', name: 'Shadow Grimoire', color: '#9a5aff', icon: 'mask', from: 'twin', desc: 'Summons two shadow clones of Ren that fight beside you for 6 seconds.', spell: { kind: 'shadow', cd: 10, dmg: 6, count: 2, life: 6 } },
  { id: 'thorn', name: 'Thorn Grimoire', color: '#6ad04a', icon: 'leaf', from: 'warden', desc: 'Old roots burst from the ground and trap nearby enemies in place.', spell: { kind: 'thorn', cd: 7, dmg: 10, radius: 10, root: 2.8, bossRoot: 1.4 } },
  { id: 'void', name: 'Void Grimoire', color: '#c86aff', icon: 'orb', from: 'null', desc: 'A void orb that drags enemies in, then bursts with crushing force.', spell: { kind: 'void', cd: 8, dmg: 28, tick: 3, pull: 8.5, radius: 5, hold: 1.6 } },
  { id: 'dune', name: 'Dune Grimoire', color: '#e8a83a', icon: 'dune', from: 'dune', desc: 'A roaring sandstorm rolls forward, sweeping enemies up and grinding them down.', spell: { kind: 'dune', cd: 7, dmg: 4, tick: 0.22, speed: 8, life: 2.4, radius: 3.2, finish: 16 } },
  { id: 'frost', name: 'Frost Grimoire', color: '#8fe8ff', icon: 'snow', from: 'frost', desc: 'Ice pillars race out in three lines and freeze every enemy they touch solid.', spell: { kind: 'frost', cd: 6.5, dmg: 15, lines: 3, steps: 7, gap: 1.9, freeze: 2.4, bossFreeze: 1.1 } },
  { id: 'prism', name: 'Prism Grimoire', color: '#ff7ae0', icon: 'gem', from: 'prism', desc: 'A beam of rainbow light that bounces from enemy to enemy, up to six times.', spell: { kind: 'prism', cd: 4.5, dmg: 17, bounces: 6, range: 15, hop: 10 } },
  { id: 'eclipse', name: 'Eclipse Grimoire', color: '#ff3a6a', icon: 'sun', from: 'vael', desc: 'A black sun rises over you and rains crescent blades on every enemy nearby.', spell: { kind: 'eclipse', cd: 12, dmg: 9, life: 3.2, rate: 0.16, range: 18 } },
];
// difficulty multipliers (the old balance was roughly 'easy': all 1)
export const DIFFICULTY = {
  easy: { eHp: 1, dmg: 1, bHp: 1, poise: 1, aura: 1, atkCd: 1, tokens: 2, gap: 0, wind: 1, bossCd: 1, react: 0.3, guardHits: 99, chain: 0, ranged: 0.5 },
  normal: { eHp: 1.45, dmg: 1.3, bHp: 1.6, poise: 2.2, aura: 0.7, atkCd: 0.8, tokens: 2, gap: 0.45, wind: 1, bossCd: 0.85, react: 1, guardHits: 6, chain: 0, ranged: 1 },
  hard: { eHp: 1.8, dmg: 1.75, bHp: 2.1, poise: 3, aura: 0.55, atkCd: 0.65, tokens: 3, gap: 0.22, wind: 0.86, bossCd: 0.68, react: 1.6, guardHits: 4, chain: 1, ranged: 1.3 },
};

const TAU = Math.PI * 2;
const clamp =(v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// ---------- themes ----------
const THEMES = {
  1: { sky: [0x3f9bff, 0xbfe6ff, 0xfff4e6], fog: 0xd8ecff, fogNear: 70, fogFar: 340, sun: 0xffe7c4, sunI: 2.5, hemi: [0xd6ebff, 0x9a8466, 1.55], ground: ['#d9cbb2', '#c8b796', '#b9a684'], edge: 0xf3ead8, side: 0x9c8a70, wall: 0xf4f0e6, accent: 0xd8343f, music: 'academy', stars: 0, petals: 0xffb7d5 },
  2: { sky: [0x0b0626, 0x3a1460, 0xff4fa3], fog: 0x241040, sun: 0xb7a8ff, sunI: 1.6, hemi: [0x8a7cff, 0x301040, 1.6], ground: ['#4a4a5e', '#3f3f52', '#55556a'], edge: 0x2ef2ff, side: 0x2a2840, wall: 0x35335a, accent: 0xff3fb4, music: 'rooftops', stars: 1, petals: 0x7cf8ff },
  3: { sky: [0x5a2a7a, 0xff7a4a, 0xffd27a], fog: 0xf0a070, fogNear: 55, fogFar: 300, sun: 0xffb070, sunI: 2.3, hemi: [0xffc8a0, 0x3a5a30, 1.4], ground: ['#7f7764', '#9a917c', '#8a8270'], edge: 0xc9b48a, side: 0x5a4632, wall: 0x6a7a5a, accent: 0xe8333f, music: 'forest', stars: 0, petals: 0xffe27a },
  4: { sky: [0x101a3a, 0x3a3a7a, 0x8a7acc], fog: 0x3a3a6a, sun: 0xd8d0ff, sunI: 2.0, hemi: [0xb0b8ff, 0x302850, 1.6], ground: ['#8a90b8', '#7a80a8', '#9aa0c8'], edge: 0x7cf8ff, side: 0x4a4068, wall: 0x5a5a8a, accent: 0x7cf8ff, music: 'storm', stars: 0.4, petals: 0xaef0ff },
  5: { rim: 0xd8b070, sky: [0x2a7ad8, 0x8cc8f0, 0xffe2a8], fog: 0xf2dcae, fogNear: 70, fogFar: 340, sun: 0xfff0c8, sunI: 2.8, hemi: [0xfff0d0, 0xa07848, 1.5], ground: ['#e2c48c', '#d6b27c', '#caa670'], edge: 0xf2dfae, side: 0xa8844e, wall: 0xd8b880, accent: 0xffb347, music: 'desert', stars: 0, petals: 0xf0d090 },
  6: { rim: 0xc8d8ec, sky: [0x5a7ab8, 0xb8d0f0, 0xf2f7ff], fog: 0xdce8f8, fogNear: 50, fogFar: 260, sun: 0xf0f4ff, sunI: 2.2, hemi: [0xe0ecff, 0x7a8aa8, 1.6], ground: ['#e2eaf4', '#ccd8e6', '#bccadc'], edge: 0xffffff, side: 0x8a9ab8, wall: 0xc8d8ec, accent: 0x7fe8ff, music: 'frost', stars: 0, petals: 0xffffff },
  7: { rim: 0x5a4a8a, sky: [0x05030f, 0x140a30, 0x2a1050], fog: 0x1c1240, fogNear: 34, fogFar: 200, sun: 0xd0b0ff, sunI: 1.5, hemi: [0xb090ff, 0x281450, 1.45], ground: ['#544a78', '#463e6a', '#5e5686'], edge: 0xc77dff, side: 0x2a2448, wall: 0x3a3060, accent: 0xc77dff, music: 'cavern', stars: 0, petals: 0xd0a8ff, glowEdge: 1 },
  8: { rim: 0x3a2a40, sky: [0x0a0410, 0x3a0a2a, 0xff4a3a], fog: 0x2e0c1e, fogNear: 55, fogFar: 290, sun: 0xff9a7a, sunI: 1.9, hemi: [0xd8a0b8, 0x2a0a20, 1.55], ground: ['#4a3e52', '#3e3448', '#56485e'], edge: 0xff3355, side: 0x1a1220, wall: 0x2a2030, accent: 0xff3355, music: 'capital', stars: 0.5, petals: 0xff7a5a, glowEdge: 1 },
  0: { sky: [0x1a0a3a, 0x8a2a8a, 0xff9a5a], fog: 0x6a2a6a, sun: 0xffc0a0, sunI: 2.2, hemi: [0xc0a0ff, 0x402040, 1.5], ground: ['#4a3a6a', '#3e3060', '#56467a'], edge: 0xb48cff, side: 0x2a2040, wall: 0x3a2a5a, accent: 0xb48cff, music: 'title', stars: 0.6, petals: 0xffb7d5 },
};

export function createGame(canvas, opts = {}) {
  const listeners = {};
  const emit = (ev, data) => { (listeners[ev] || []).slice().forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); };

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let quality = opts.quality || 'auto';
  let pixelRatio = quality === 'high' ? Math.min(devicePixelRatio || 1, 2) : quality === 'low' ? 0.8 : Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  let W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
  renderer.setSize(W, H, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 900);
  scene.add(camera);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5); sun.position.set(30, 60, 20); scene.add(sun); scene.add(sun.target);
  scene.fog = new THREE.Fog(0xffffff, 50, 260);

  // ---------- materials ----------
  const gradData = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  const GRAD = new THREE.DataTexture(gradData, 3, 1, THREE.RGBAFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;
  const matCache = new Map();
  function toon(color, o = {}) {
    const key = color + '|' + (o.em || 0) + '|' + (o.ei || 0) + '|' + (o.map ? o.map.uuid : '') + '|' + (o.side || 0) + (o.t || '');
    let m = matCache.get(key);
    if (!m) {
      m = new THREE.MeshToonMaterial({ color, gradientMap: GRAD, emissive: o.em || 0, emissiveIntensity: o.ei || 1, map: o.map || null, side: o.side || THREE.FrontSide, transparent: !!o.t, alphaTest: o.at || 0 });
      matCache.set(key, m);
    }
    return m;
  }
  function makeOutlineMat(thick, color) {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { thick: { value: thick }, ocol: { value: new THREE.Color(color) } }]),
      vertexShader: `attribute vec3 onormal; uniform float thick;
        #include <fog_pars_vertex>
        void main(){ vec4 mvPosition = modelViewMatrix*vec4(position,1.0); vec3 n = normalize(normalMatrix*onormal);
        float d = clamp(-mvPosition.z,1.0,40.0); mvPosition.xyz += n*thick*(0.5+d*0.09); gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform vec3 ocol;
        #include <fog_pars_fragment>
        void main(){ gl_FragColor = vec4(ocol,1.0);
        #include <fog_fragment>
        }`,
      side: THREE.BackSide, fog: true,
    });
  }
  const OUT = makeOutlineMat(0.012, 0x140c22);
  const OUT_PROP = makeOutlineMat(0.022, 0x1a1028);
  const OUT_AURA = makeOutlineMat(0.02, 0x8a6cff);
  function outlineNormals(geo) {
    if (geo.attributes.onormal) return;
    const p = geo.attributes.position, n = geo.attributes.normal, map = new Map(), arr = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const k = Math.round(p.getX(i) * 500) + ',' + Math.round(p.getY(i) * 500) + ',' + Math.round(p.getZ(i) * 500);
      let a = map.get(k); if (!a) { a = [0, 0, 0, []]; map.set(k, a); }
      a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); a[3].push(i);
    }
    map.forEach((a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; a[3].forEach((i) => { arr[i * 3] = a[0] / l; arr[i * 3 + 1] = a[1] / l; arr[i * 3 + 2] = a[2] / l; }); });
    geo.setAttribute('onormal', new THREE.BufferAttribute(arr, 3));
  }
  function addOutline(mesh, mat = OUT) { outlineNormals(mesh.geometry); const o = new THREE.Mesh(mesh.geometry, mat); o.userData.outline = true; o.raycast = () => {}; mesh.add(o); return o; }

  // shared geometries
  const G = {
    sphere: new THREE.SphereGeometry(1, 18, 14), box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
    cone: new THREE.ConeGeometry(1, 1, 6), cone12: new THREE.ConeGeometry(1, 1, 12), oct: new THREE.OctahedronGeometry(1, 0), torus: new THREE.TorusGeometry(1, 0.25, 8, 24),
    plane: new THREE.PlaneGeometry(1, 1),
  };
  const capCache = new Map();
  function capsule(r, len) { const k = r.toFixed(3) + '|' + len.toFixed(3); let g = capCache.get(k); if (!g) { g = new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 10); capCache.set(k, g); } return g; }
  function part(parent, geo, mat, pos, scl, rot, outline = OUT) {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (scl) { if (typeof scl === 'number') m.scale.setScalar(scl); else m.scale.set(scl[0], scl[1], scl[2]); }
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(m); if (outline) addOutline(m, outline); return m;
  }

  // ---------- textures ----------
  function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function ctex(c, rep) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } t.anisotropy = 4; return t; }
  const glowTex = (() => { const [c, x] = cvs(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const starTex = (() => { const [c, x] = cvs(128, 128); x.translate(64, 64); x.fillStyle = '#fff'; for (let k = 0; k < 2; k++) { x.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + k * 0.4, r = i % 2 ? 10 : 62 - k * 20; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.globalAlpha = k ? 0.6 : 1; x.fill(); } return new THREE.CanvasTexture(c); })();
  // floor texture: one 8x8 m tile of irregular flagstones (or metal panels for the rooftops), made once per level
  function groundTex(cols, style) {
    const S = 512, [c, x] = cvs(S, S), sh = (h, k, a = 1) => { const v = parseInt(h.slice(1), 16); return `rgba(${clamp(((v >> 16) & 255) * k, 0, 255) | 0},${clamp(((v >> 8) & 255) * k, 0, 255) | 0},${clamp((v & 255) * k, 0, 255) | 0},${a})`; };
    if (style === 2) {
      x.fillStyle = sh(cols[0], 0.7); x.fillRect(0, 0, S, S);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const g = x.createLinearGradient(0, j * 128, 0, j * 128 + 128); g.addColorStop(0, sh(cols[(i + j) % 2 ? 1 : 2], 1.12)); g.addColorStop(1, sh(cols[(i + j) % 2 ? 1 : 2], 0.9));
        x.fillStyle = g; x.fillRect(i * 128 + 3, j * 128 + 3, 122, 122);
        x.fillStyle = 'rgba(0,0,0,0.35)'; for (const [u, v] of [[10, 10], [116, 10], [10, 116], [116, 116]]) { x.beginPath(); x.arc(i * 128 + u, j * 128 + v, 3, 0, TAU); x.fill(); }
        x.strokeStyle = 'rgba(255,255,255,0.06)'; x.lineWidth = 2; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(i * 128 + 20, j * 128 + 24 + k * 20); x.lineTo(i * 128 + 108, j * 128 + 24 + k * 20); x.stroke(); }
      }
      x.strokeStyle = 'rgba(46,242,255,0.35)'; x.lineWidth = 3; x.strokeRect(40, 40, S - 80, S - 80);
      return ctex(c, [1, 1]);
    }
    x.fillStyle = style === 4 ? '#3a4a8a' : sh(cols[0], 0.72); x.fillRect(0, 0, S, S);
    const rows = [56, 72, 64, 48, 80, 64, 64, 64]; let y = 0;
    rows.forEach((rh, ri) => {
      let xx = -rand(10, 60);
      while (xx < S) {
        const w = rand(58, 124), col = cols[1 + ((ri + Math.round(xx / 60)) & 1)], k = rand(0.9, 1.08);
        for (const X of xx + w > S ? [xx, xx - S] : xx < 0 ? [xx, xx + S] : [xx]) {
          const g = x.createLinearGradient(0, y, 0, y + rh); g.addColorStop(0, sh(col, k * 1.06)); g.addColorStop(1, sh(col, k * 0.94));
          x.fillStyle = g; x.beginPath(); x.roundRect ? x.roundRect(X + 3, y + 3, w - 6, rh - 6, 7) : x.rect(X + 3, y + 3, w - 6, rh - 6); x.fill();
          x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(X + 6, y + 4, w - 14, 3);
        }
        for (let i = 0; i < 6; i++) { x.fillStyle = sh(col, rand(0.8, 1.15), 0.4); x.beginPath(); x.arc(xx + rand(8, w - 8), y + rand(8, rh - 8), rand(1, 3), 0, TAU); x.fill(); }
        if (Math.random() < 0.12) { x.strokeStyle = 'rgba(60,40,30,0.35)'; x.lineWidth = 1.5; x.beginPath(); let cx = xx + rand(10, w - 10), cy = y + 6; x.moveTo(cx, cy); for (let k2 = 0; k2 < 4; k2++) { cx += rand(-8, 8); cy += rh / 5; x.lineTo(cx, cy); } x.stroke(); }
        if ((style === 3 || style === 1) && Math.random() < (style === 3 ? 0.35 : 0.08)) { x.fillStyle = 'rgba(70,130,50,0.45)'; for (let k2 = 0; k2 < 5; k2++) { x.beginPath(); x.arc(xx + rand(0, w), y + (Math.random() < 0.5 ? 2 : rh - 2), rand(3, 8), 0, TAU); x.fill(); } }
        xx += w;
      }
      y += rh;
    });
    if (style === 4) { x.strokeStyle = 'rgba(124,248,255,0.5)'; x.lineWidth = 2; x.strokeRect(1, 1, S - 2, S - 2); }
    return ctex(c, [1, 1]);
  }

  // ---------- anime faces ----------
  // Face decal is projected flat from the front: canvas x 0..256 <-> head x -0.12..0.12, canvas y 0..256 <-> head y 0.2..-0.04.
  const faceCache = new Map();
  function faceTexture(f, emo) {
    const key = f.id + '|' + emo; if (faceCache.has(key)) return faceCache.get(key);
    const [c, x] = cvs(256, 256); drawFace(x, f, emo);
    const t = ctex(c); faceCache.set(key, t); return t;
  }
  function drawFace(x, f, emo) {
    const ink = '#1a1020', cx = 128;
    if (f.type === 'mask') { drawMask(x, f, emo); return; }
    const ey = 114, hs = (f.eyeH || 20) / 20;
    x.lineJoin = 'round'; x.lineCap = 'round';
    if (!f.male && (emo === 'smile' || emo === 'shocked')) { x.fillStyle = 'rgba(255,110,140,0.32)'; x.beginPath(); x.ellipse(cx - 52, ey + 30, 15, 6, 0, 0, TAU); x.ellipse(cx + 52, ey + 30, 15, 6, 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(220,70,100,0.5)'; x.lineWidth = 1.5; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(cx + s * (44 + i * 6), ey + 27); x.lineTo(cx + s * (41 + i * 6), ey + 33); x.stroke(); } }
    for (const s of [-1, 1]) {
      const ex = cx + s * 49;
      // strong angular brows
      const M = !!f.male, bi = { angry: 14, determined: 8, shocked: -9, smile: -5, hurt: 5 }[emo] || (M ? 3 : 0), bo = { angry: -5, determined: -2, shocked: -12, smile: -7, hurt: -9 }[emo] || 0, by = ey - (M ? 31 : 37);
      x.fillStyle = f.brow || ink; x.beginPath();
      if (M) { // thick, straight, low brows
        x.moveTo(ex - s * 25, by + bi + 9); x.lineTo(ex - s * 24, by + bi - 5);
        x.quadraticCurveTo(ex + s * 4, by + (bi + bo) / 2 - 10, ex + s * 33, by + bo - 2);
        x.quadraticCurveTo(ex + s * 6, by + (bi + bo) / 2 + 5, ex - s * 25, by + bi + 9); x.fill();
      } else {
        x.moveTo(ex - s * 23, by + bi + 5); x.lineTo(ex - s * 21, by + bi - 4);
        x.quadraticCurveTo(ex + s * 4, by + (bi + bo) / 2 - 10, ex + s * 31, by + bo - 3);
        x.quadraticCurveTo(ex + s * 6, by + (bi + bo) / 2 - 1, ex - s * 23, by + bi + 5); x.fill();
      }
      const es = M ? 1.12 : 1.24;
      x.strokeStyle = ink; x.fillStyle = ink; x.save(); x.translate(ex, ey); x.scale(es, es); x.translate(-ex, -ey);
      if (emo === 'blink') { x.lineWidth = 6; x.beginPath(); x.moveTo(ex - s * 22, ey + 3); x.quadraticCurveTo(ex, ey + 10, ex + s * 27, ey - 1); x.stroke(); }
      else if (emo === 'smile') { x.lineWidth = 7; x.beginPath(); x.moveTo(ex - s * 21, ey + 7); x.quadraticCurveTo(ex, ey - 14, ex + s * 24, ey + 4); x.stroke(); }
      else if (emo === 'hurt') { x.lineWidth = 6; x.beginPath(); x.moveTo(ex - s * 18, ey - 11); x.lineTo(ex + s * 14, ey); x.lineTo(ex - s * 18, ey + 11); x.stroke(); }
      else {
        const top = (emo === 'shocked' ? 22 : emo === 'angry' ? 11 : emo === 'determined' ? 14 : 17) * hs, bot = (emo === 'shocked' ? 16 : 12) * hs;
        const drop = emo === 'angry' ? 7 : emo === 'determined' ? 4 : M ? 2 : 0, ir = (emo === 'shocked' ? 0.6 : 1) * (M ? 0.86 : 1);
        const lid = () => { x.moveTo(ex - s * 22, ey + 2 + drop); x.quadraticCurveTo(ex - s * 6, ey - top - 2 + drop * 0.6, ex + s * 17, ey - top * 0.92); x.lineTo(ex + s * 26, ey - 3); };
        x.save(); x.beginPath(); lid(); x.quadraticCurveTo(ex + s * 9, ey + bot + 2, ex - s * 22, ey + 2 + drop); x.closePath();
        x.fillStyle = '#ffffff'; x.fill(); x.clip();
        const g = x.createLinearGradient(0, ey - 15, 0, ey + 16); g.addColorStop(0, f.eyeDark || '#241a5a'); g.addColorStop(0.55, f.eye || '#8a7cff'); g.addColorStop(1, f.eyeLight || '#d8d0ff');
        x.fillStyle = g; x.beginPath(); x.ellipse(ex + s * 1, ey + 1, 12.5 * ir, 15.5 * ir, 0, 0, TAU); x.fill();
        x.lineWidth = 2; x.strokeStyle = f.eyeDark || '#241a5a'; x.stroke();
        x.fillStyle = '#100818'; x.beginPath(); x.ellipse(ex + s * 1, ey + 2, 5.5 * ir, 8.5 * ir, 0, 0, TAU); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.28)'; x.beginPath(); x.ellipse(ex, ey - top + 4, 30, 8, 0, 0, TAU); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.ellipse(ex - 5, ey - 6, 4.5, 5.5, -0.4, 0, TAU); x.fill(); x.beginPath(); x.arc(ex + 5, ey + 8, 2.2, 0, TAU); x.fill();
        x.restore();
        // sharp upper lash line with a flick, thin lower lid
        if (M) { // firm upper lid, no lash flick; short lower lid
          x.strokeStyle = ink; x.lineWidth = 6; x.beginPath(); lid(); x.lineTo(ex + s * 28, ey - 1); x.stroke();
          x.lineWidth = 2; x.beginPath(); x.moveTo(ex + s * 20, ey + bot - 2); x.quadraticCurveTo(ex + s * 6, ey + bot + 2, ex - s * 6, ey + bot - 1); x.stroke();
        } else {
          x.strokeStyle = ink; x.lineWidth = 7; x.beginPath(); lid(); x.lineTo(ex + s * 32, ey - 9); x.stroke();
          x.lineWidth = 2.5; x.beginPath(); x.moveTo(ex + s * 24, ey); x.quadraticCurveTo(ex + s * 8, ey + bot + 3, ex - s * 10, ey + bot - 3); x.stroke();
        }
      }
      x.restore();
    }
    // nose
    if (f.male) { x.strokeStyle = 'rgba(110,60,45,0.8)'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx + 3, 136); x.lineTo(cx - 5, 160); x.lineTo(cx + 5, 163); x.stroke(); }
    else { x.strokeStyle = 'rgba(150,70,70,0.75)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx + 2, 148); x.lineTo(cx - 4, 162); x.lineTo(cx + 3, 164); x.stroke(); }
    x.lineWidth = 3; x.strokeStyle = ink; x.fillStyle = f.male ? '#3a1416' : '#6a1424'; const my = 190;
    if (emo === 'smile') { x.beginPath(); x.moveTo(cx - 17, my - 3); x.quadraticCurveTo(cx, my + 1, cx + 17, my - 3); x.quadraticCurveTo(cx + 2, my + 22, cx - 17, my - 3); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.fillRect(cx - 11, my - 2, 22, 4); }
    else if (emo === 'shocked') { x.beginPath(); x.ellipse(cx, my + 4, 7, 10, 0, 0, TAU); x.fill(); x.stroke(); }
    else if (emo === 'angry') { x.beginPath(); x.moveTo(cx - 17, my - 4); x.lineTo(cx + 17, my - 4); x.lineTo(cx + 11, my + 11); x.lineTo(cx - 11, my + 11); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.fillRect(cx - 15, my - 3, 30, 5); x.beginPath(); x.moveTo(cx - 13, my - 4); x.lineTo(cx - 9, my + 3); x.lineTo(cx - 6, my - 4); x.moveTo(cx + 13, my - 4); x.lineTo(cx + 9, my + 3); x.lineTo(cx + 6, my - 4); x.fill(); }
    else if (emo === 'hurt') { x.fillStyle = '#fff'; x.beginPath(); x.rect(cx - 14, my - 3, 28, 9); x.fill(); x.stroke(); x.beginPath(); x.moveTo(cx - 14, my + 1.5); x.lineTo(cx + 14, my + 1.5); for (let i = -1; i <= 1; i++) { x.moveTo(cx + i * 7, my - 3); x.lineTo(cx + i * 7, my + 6); } x.stroke(); }
    else if (emo === 'determined') { x.beginPath(); x.moveTo(cx - 15, my + 1); x.quadraticCurveTo(cx + 2, my + 3, cx + 16, my - 5); x.stroke(); }
    else if (f.male) { x.beginPath(); x.moveTo(cx - 14, my); x.lineTo(cx + 14, my - 1); x.stroke(); }
    else { x.beginPath(); x.moveTo(cx - 10, my); x.quadraticCurveTo(cx, my + 3, cx + 10, my - 1); x.stroke(); }
  }
  function drawMask(x, f, emo) {
    const cx = 128;
    x.fillStyle = f.mask || '#f4f0ff'; x.beginPath(); x.ellipse(cx, 130, 92, 112, 0, 0, TAU); x.fill();
    if (f.half) { x.save(); x.beginPath(); x.rect(cx, 0, 128, 256); x.clip(); x.fillStyle = f.half; x.beginPath(); x.ellipse(cx, 130, 92, 112, 0, 0, TAU); x.fill(); x.restore(); }
    x.strokeStyle = '#1a1020'; x.lineWidth = 4; x.beginPath(); x.ellipse(cx, 130, 92, 112, 0, 0, TAU); x.stroke();
    x.fillStyle = '#0a0410';
    for (const s of [-1, 1]) {
      x.beginPath(); x.moveTo(cx + s * 12, 112); x.lineTo(cx + s * 58, 92 + (emo === 'angry' ? -6 : 0)); x.lineTo(cx + s * 50, 126); x.closePath(); x.fill();
      x.fillStyle = f.glow || '#ff2a4a'; x.beginPath(); x.arc(cx + s * 38, 110, 5, 0, TAU); x.fill(); x.fillStyle = '#0a0410';
      x.strokeStyle = f.lines || '#d81a3a'; x.lineWidth = 5; x.beginPath(); x.moveTo(cx + s * 34, 134); x.lineTo(cx + s * 30, 176); x.stroke();
    }
    x.fillStyle = '#0a0410'; x.beginPath(); x.moveTo(cx - 26, 196); for (let i = 0; i <= 6; i++) x.lineTo(cx - 26 + i * 52 / 6, 196 + (i % 2 ? 10 : 0)); x.lineTo(cx + 26, 204); x.lineTo(cx - 26, 204); x.fill();
  }

  // ---------- sculpted geometry toolkit ----------
  // loft(): a smooth tube around +Y built from rings [y, rx, rz, cz=0, n=2, cx=0] (n>2 = boxier superellipse; y may be fn(theta, k)).
  // List rings so the OUTER surface runs bottom -> top; that gives outward normals. Shared seam vertices keep normals smooth.
  const geoCache = new Map();
  function cachedGeo(key, fn) { let g = geoCache.get(key); if (!g) { g = fn(); geoCache.set(key, g); } return g; }
  function loft(rings, seg = 14, o = {}) {
    const a0 = o.a0 || 0, al = o.al || TAU, full = !o.al, cols = full ? seg : seg + 1, pos = [], uv = [], idx = [];
    rings.forEach((r, i) => {
      const [y, rx, rz, cz = 0, n = 2, cx = 0] = r, e = 2 / n;
      for (let k = 0; k < cols; k++) {
        const th = a0 + al * k / seg, s = Math.sin(th), c = Math.cos(th);
        pos.push(cx + rx * Math.sign(s) * Math.abs(s) ** e, typeof y === 'function' ? y(th, k) : y, cz + rz * Math.sign(c) * Math.abs(c) ** e);
        uv.push(k / seg, i / (rings.length - 1));
      }
    });
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < seg; k++) {
      const k2 = full ? (k + 1) % seg : k + 1, a = i * cols + k, b = i * cols + k2, c = (i + 1) * cols + k, d = (i + 1) * cols + k2;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals(); return g;
  }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function xf(p, r, s) { _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); _q.setFromEuler(_e); return new THREE.Matrix4().compose(new THREE.Vector3(p ? p[0] : 0, p ? p[1] : 0, p ? p[2] : 0), _q, typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(s ? s[0] : 1, s ? s[1] : 1, s ? s[2] : 1)); }
  // basis: local +Y along dir, local +Z bent towards curl
  function orient(p, dir, curl) {
    const Y = new THREE.Vector3(...dir).normalize(), c = new THREE.Vector3(...curl);
    const Z = c.addScaledVector(Y, -c.dot(Y)); if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1).addScaledVector(Y, -Y.z); Z.normalize();
    const X = new THREE.Vector3().crossVectors(Y, Z);
    return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(p[0], p[1], p[2]);
  }
  function mergeGeos(list) {
    let nv = 0, ni = 0;
    for (const [g] of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    const hasUV = list.every(([g]) => g.attributes.uv), UV = hasUV ? new Float32Array(nv * 2) : null;
    let vo = 0, io = 0; const v = new THREE.Vector3(), nm = new THREE.Matrix3();
    for (const [g, m] of list) {
      const p = g.attributes.position, n = g.attributes.normal; if (m) nm.getNormalMatrix(m);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); if (m) v.applyMatrix4(m); P[(vo + i) * 3] = v.x; P[(vo + i) * 3 + 1] = v.y; P[(vo + i) * 3 + 2] = v.z;
        v.fromBufferAttribute(n, i); if (m) v.applyMatrix3(nm).normalize(); N[(vo + i) * 3] = v.x; N[(vo + i) * 3 + 1] = v.y; N[(vo + i) * 3 + 2] = v.z;
      }
      if (hasUV) { const u = g.attributes.uv; for (let i = 0; i < p.count; i++) { UV[(vo + i) * 2] = u.getX(i); UV[(vo + i) * 2 + 1] = u.getY(i); } }
      if (g.index) for (let i = 0; i < g.index.count; i++) I[io++] = g.index.getX(i) + vo; else for (let i = 0; i < p.count; i++) I[io++] = i + vo;
      vo += p.count;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setIndex(new THREE.BufferAttribute(I, 1));
    if (hasUV) g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
    return g;
  }
  // a curved, flattened hair spike / blade along +Y that bends towards +Z
  function spikeGeo(len, w, th = 0.62, bend = 0.35) {
    return cachedGeo('spk' + [len, w, th, bend].map((v) => v.toFixed(3)).join(','), () => {
      const g = loft([[-0.035, w * 0.75, w * th * 0.75], [0, w, w * th], [len * 0.28, w * 0.86, w * th * 0.86], [len * 0.6, w * 0.52, w * th * 0.52], [len * 0.85, w * 0.2, w * th * 0.22], [len, 0.002, 0.002]], 7);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = Math.max(0, p.getY(i) / len); p.setZ(i, p.getZ(i) + bend * len * t * t); }
      g.computeVertexNormals(); return g;
    });
  }
  // anime head: rounded skull, cheeks tapering to a slightly pointed chin. [y, rx, rz, cz]
  const HEAD = [[-0.04, 0.004, 0.004, 0.07], [-0.032, 0.02, 0.016, 0.066], [-0.014, 0.046, 0.038, 0.052], [0.012, 0.074, 0.07, 0.03], [0.045, 0.097, 0.095, 0.013], [0.085, 0.11, 0.11, 0.003], [0.13, 0.115, 0.118, -0.006], [0.17, 0.11, 0.115, -0.01], [0.205, 0.088, 0.095, -0.014], [0.228, 0.052, 0.06, -0.016], [0.24, 0.004, 0.004, -0.016]];
  function headAt(y) { for (let i = 1; i < HEAD.length; i++) if (y <= HEAD[i][0] || i === HEAD.length - 1) { const a = HEAD[i - 1], b = HEAD[i], t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1); return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)]; } }
  // hair cap hugging the skull; hairline low at the back, high at the front
  function hairCapGeo(front = 0.168, back = 0.03, pad = 0.014) {
    return cachedGeo('cap' + front + back + pad, () => {
      const seg = 20, rows = 8, pos = [], idx = [];
      for (let r = 0; r <= rows; r++) for (let k = 0; k < seg; k++) {
        const th = k / seg * TAU, yb = back + (front - back) * ((1 + Math.cos(th)) / 2) ** 0.6, y = lerp(yb, 0.24 + pad, Math.sin(r / rows * Math.PI / 2));
        const [rx, rz, cz] = headAt(Math.min(y, 0.239)), sc = r === rows ? 0 : 1;
        pos.push((rx + pad) * Math.sin(th) * sc, y, cz + (rz + pad) * Math.cos(th) * sc);
      }
      for (let r = 0; r < rows; r++) for (let k = 0; k < seg; k++) { const a = r * seg + k, b = r * seg + (k + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, c, b, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    });
  }
  function meshOf(parent, geo, mat, outline = OUT) { const m = new THREE.Mesh(geo, mat); parent.add(m); if (outline) addOutline(m, outline); return m; }
  function hairCap(J, mat, front, back) { return meshOf(J.head, hairCapGeo(front, back), mat); }
  // spikes: [az deg (0 = front, 90 = character's left), el deg, len, w, kind]. kind 0 swept back+up, 1 fringe (down over the face), 2 side lock, 3 straight out/back
  const HC = [0, 0.125, -0.02];
  function hairSpikes(J, mat, arr, key) {
    const build = () => {
      const list = [];
      for (const [az0, el0, len, w, kind = 0, sw = 1] of arr) {
        const az = az0 * Math.PI / 180, el = el0 * Math.PI / 180, r = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
        let dir, curl, root, bend = 0.35;
        if (kind === 1) { root = [HC[0] + r[0] * 0.11, 0.222 - Math.abs(r[0]) * 0.03, HC[2] + r[2] * 0.1]; dir = [r[0] * 0.5, -1, 0.42]; curl = [r[0], 0, 1]; bend = 0.3; }
        else if (kind === 2) { root = [HC[0] + r[0] * 0.11, 0.15, HC[2] + r[2] * 0.11]; dir = [r[0] * 0.25, -1, 0.12]; curl = [r[0], 0, 0.3]; bend = 0.25; }
        else if (kind === 4) { root = [HC[0] + r[0] * 0.088, HC[1] + r[1] * 0.088, HC[2] + r[2] * 0.088]; dir = [r[0] * 0.75, 0.42 + r[1] * 0.45, -0.9 + r[2] * 0.25]; curl = [0, 1, 0.2]; bend = 0.3; }
        else { root = [HC[0] + r[0] * 0.085, HC[1] + r[1] * 0.085, HC[2] + r[2] * 0.085]; const s = kind === 3 ? 0.35 : 0.9 * sw; dir = [r[0], r[1] + 0.55 * s, r[2] - 0.85 * s]; curl = [0, 1, 0.2]; }
        list.push([spikeGeo(len, w, kind === 1 ? 0.5 : 0.62, bend), orient(root, dir, curl)]);
      }
      return mergeGeos(list);
    };
    return meshOf(J.head, key ? cachedGeo('hair' + key, build) : build(), mat);
  }

  // ---------- character rig ----------
  const JN = ['hips', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'hipL', 'knL', 'ftL', 'hipR', 'knR', 'ftR'];
  function buildRig(cfg) {
    const s = cfg.scale || 1, bw = cfg.bulk || 1, lr = cfg.limb || 1;
    const root = new THREE.Group(), pivot = new THREE.Group(), model = new THREE.Group();
    root.add(pivot); pivot.position.y = 1.0; pivot.add(model); model.position.y = -1.0; root.scale.setScalar(s);
    const J = {}; const j = (n, p, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); J[n] = o; return o; };
    const C = cfg.colors; const skin = toon(C.skin || 0xffe0cc), top = toon(C.top), bot = toon(C.bottom), shoe = toon(C.shoe || 0x222233), acc = toon(C.accent || 0xf2c14e);
    const hipY = 0.94;
    j('hips', model, 0, hipY, 0); j('spine', J.hips, 0, 0.1, 0); j('chest', J.spine, 0, 0.14, 0);
    j('neck', J.chest, 0, 0.3, 0); j('head', J.neck, 0, 0.07, 0);
    const shw = cfg.shoulders || 1, shx = 0.19 * bw * shw, HD = cfg.headShape || HEAD, fl = cfg.flatChest ? 0.9 : 1;
    j('shL', J.chest, shx, 0.24, 0); j('elL', J.shL, 0, -0.27, 0); j('haL', J.elL, 0, -0.25, 0);
    j('shR', J.chest, -shx, 0.24, 0); j('elR', J.shR, 0, -0.27, 0); j('haR', J.elR, 0, -0.25, 0);
    j('hipL', J.hips, 0.095 * bw, -0.04, 0); j('knL', J.hipL, 0, -0.43, 0); j('ftL', J.knL, 0, -0.43, 0);
    j('hipR', J.hips, -0.095 * bw, -0.04, 0); j('knR', J.hipR, 0, -0.43, 0); j('ftR', J.knR, 0, -0.43, 0);
    // Body parts are collected per joint + material, then merged into one mesh each (few draw calls).
    const bag = new Map();
    const put = (jn, mat, geo, m, outline = true) => { const k = jn + '|' + mat.uuid + '|' + (outline ? 1 : 0); if (!bag.has(k)) bag.set(k, { jn, mat, outline, list: [] }); bag.get(k).list.push([geo, m || null]); };
    const a = lr * bw, L = lr * bw;
    // hips / trousers seat + belt + flared jacket hem
    put('hips', bot, loft([[-0.135, 0.09 * bw, 0.075, 0.0], [-0.11, 0.14 * bw, 0.098], [-0.03, 0.155 * bw, 0.105], [0.05, 0.142 * bw, 0.096], [0.1, 0.13 * bw, 0.088]], 16));
    put('hips', toon(cfg.belt || 0x2a1e2a), loft([[0.025, 0.16 * bw, 0.109, 0, 2.3], [0.065, 0.153 * bw, 0.104, 0, 2.3]], 16));
    if (cfg.trim) put('hips', acc, loft([[0.028, 0.03, 0.012, 0.11, 3], [0.062, 0.03, 0.012, 0.106, 3]], 8), null, false);
    if (cfg.hem !== false) {
      const hm = toon(cfg.hemColor || C.top, { side: THREE.DoubleSide }), hl = cfg.hemLen || 0.2;
      put('hips', hm, loft([[0.08, 0.142 * bw, 0.097], [-hl, 0.18 * bw, 0.13, -0.008], [-hl - 0.016, 0.188 * bw, 0.137, -0.008], [-hl, 0.196 * bw, 0.144, -0.008], [0.09, 0.15 * bw, 0.104]], 18, { a0: 0.42, al: TAU - 0.84 }));
    }
    // abdomen
    put('spine', top, loft([[-0.09, 0.13 * bw, 0.088], [0.0, 0.128 * bw, 0.09, 0.005], [0.08, 0.137 * bw, 0.096, 0.009], [0.17, 0.15 * bw, 0.1, 0.012]], 16));
    // V-shaped chest: broad shoulders, narrow waist
    put('chest', top, loft([[-0.06, 0.135 * bw, 0.092, 0.008, 2.2], [0.05, 0.156 * bw * (1 + (shw - 1) * 0.4), 0.104 * fl, 0.014 * fl, 2.3], [0.14, 0.184 * bw * shw, 0.114 * fl, 0.016 * fl, 2.5], [0.21, 0.202 * bw * shw, 0.112 * fl, 0.01, 2.8], [0.26, 0.19 * bw * shw, 0.1, 0, 2.8], [0.295, 0.14 * bw * shw, 0.085, -0.005, 2.4], [0.315, 0.07, 0.055, 0], [0.325, 0.02, 0.02]], 18));
    // open collar: inner shirt V + lapels
    const vneck = cfg.vneck ?? !!cfg.collar;
    if (vneck) {
      const tilt = [-0.3, 0, 0];
      const vs = new THREE.Shape([new THREE.Vector2(-0.062, 0.16), new THREE.Vector2(0.062, 0.16), new THREE.Vector2(0, 0)]);
      put('chest', toon(cfg.collar || 0xf4f4ff), new THREE.ExtrudeGeometry(vs, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }), xf([0, 0.135, 0.118], tilt));
      for (const sd of [-1, 1]) {
        const ls = new THREE.Shape([new THREE.Vector2(0, -0.012), new THREE.Vector2(sd * 0.072, 0.168), new THREE.Vector2(sd * 0.118, 0.15), new THREE.Vector2(sd * 0.034, -0.018)]);
        put('chest', toon(cfg.lapel || C.top), new THREE.ExtrudeGeometry(ls, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }), xf([0, 0.135, 0.124], tilt));
      }
      if (cfg.trim) put('chest', acc, loft([[-0.06, 0.012, 0.01, 0.1, 3], [0.135, 0.012, 0.01, 0.124, 3]], 8), null, false);
    } else if (cfg.trim) put('chest', acc, loft([[-0.06, 0.014, 0.01, 0.1, 3], [0.2, 0.014, 0.01, 0.124, 3]], 8), null, false);
    if (cfg.collar && !vneck) put('chest', toon(cfg.collar), loft([[0.27, 0.085, 0.075], [0.345, 0.07, 0.062]], 14));
    // neck + head
    put('neck', skin, loft([[-0.07, 0.048, 0.046, -0.004], [0.03, 0.041, 0.04, -0.008], [0.11, 0.04, 0.038, -0.014]], 12));
    put('head', skin, loft(HD, 24));
    for (const sd of [-1, 1]) put('head', skin, loft([[-0.028, 0.006, 0.01], [-0.016, 0.011, 0.019], [0.012, 0.012, 0.021, -0.003], [0.034, 0.006, 0.012, -0.01], [0.042, 0.002, 0.002, -0.013]], 8), xf([sd * 0.106, 0.078, -0.004], [0, 0, -sd * 0.12]));
    const fgeo = cachedGeo('facedecal' + (cfg.headShape ? cfg.face.id : ''), () => {
      const step = TAU / 24, g = loft(HD.map((r) => [r[0], r[1] + 0.0018, r[2] + 0.0018, r[3]]), 10, { a0: -5 * step, al: 10 * step });
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 0.12) / 0.24, (p.getY(i) + 0.04) / 0.24);
      return g;
    });
    const fmat = new THREE.MeshToonMaterial({ gradientMap: GRAD, map: faceTexture(cfg.face, 'neutral'), transparent: true, alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const faceM = new THREE.Mesh(fgeo, fmat); J.head.add(faceM);
    // arms: deltoid-capped upper arm, sleeved forearm with cuff, mitt hand with thumb
    const sleeve = cfg.sleeve === false ? skin : top, hand = toon(C.hand || C.skin || 0xffe0cc);
    for (const [sh, el, ha, sd] of [['shL', 'elL', 'haL', 1], ['shR', 'elR', 'haR', -1]]) {
      put(sh, top, cachedGeo('uarm' + a, () => loft([[-0.295, 0.004, 0.004], [-0.29, 0.04 * a, 0.042 * a], [-0.24, 0.046 * a, 0.048 * a], [-0.14, 0.053 * a, 0.055 * a, 0.003], [-0.04, 0.061 * a, 0.062 * a], [0.02, 0.068 * a, 0.066 * a], [0.055, 0.058 * a, 0.056 * a], [0.08, 0.03 * a, 0.03 * a], [0.088, 0.004, 0.004]], 14)));
      put(el, sleeve, cachedGeo('farm' + a, () => loft([[-0.215, 0.004, 0.004], [-0.212, 0.054 * a, 0.05 * a], [-0.19, 0.055 * a, 0.051 * a], [-0.12, 0.049 * a, 0.048 * a, 0.004], [-0.02, 0.047 * a, 0.046 * a], [0.03, 0.04 * a, 0.04 * a], [0.045, 0.004, 0.004]], 14)));
      if (cfg.cuff) put(el, toon(cfg.cuff), cachedGeo('cuff' + a, () => loft([[-0.222, 0.05 * a, 0.047 * a], [-0.218, 0.059 * a, 0.055 * a], [-0.175, 0.058 * a, 0.054 * a], [-0.17, 0.05 * a, 0.047 * a]], 14)));
      put(el, skin, cachedGeo('wrist' + a, () => loft([[-0.26, 0.026 * a, 0.03 * a], [-0.2, 0.03 * a, 0.034 * a]], 10)), null, false);
      put(ha, hand, cachedGeo('mitt' + a + sd, () => loft([[-0.112, 0.004, 0.004, 0.004, 2, -sd * 0.01], [-0.105, 0.014 * a, 0.024 * a, 0.004, 2.6, -sd * 0.01], [-0.085, 0.021 * a, 0.037 * a, 0.002, 3, -sd * 0.005], [-0.05, 0.024 * a, 0.041 * a, 0, 3], [-0.015, 0.024 * a, 0.038 * a, 0, 3], [0.005, 0.021 * a, 0.03 * a], [0.03, 0.019 * a, 0.024 * a], [0.04, 0.004, 0.004]], 12)));
      put(ha, hand, cachedGeo('thumb' + a, () => loft([[-0.004, 0.012 * a, 0.012 * a], [0.03 * a, 0.011 * a, 0.01 * a], [0.045 * a, 0.006, 0.006], [0.05 * a, 0.002, 0.002]], 8)), orient([-sd * 0.006, -0.03, 0.026 * a], [-sd * 0.3, -0.55, 0.8], [-sd, 0, 0]));
    }
    // legs: tapered thighs, calves, chunky boots
    const bootTop = cfg.boots ? -0.04 : -0.2;
    for (const [hp, kn, ft] of [['hipL', 'knL', 'ftL'], ['hipR', 'knR', 'ftR']]) {
      put(hp, bot, cachedGeo('thigh' + L, () => loft([[-0.47, 0.004, 0.004], [-0.46, 0.056 * L, 0.058 * L, 0.004], [-0.38, 0.063 * L, 0.066 * L, 0.008], [-0.2, 0.077 * L, 0.082 * L, 0.01], [-0.05, 0.087 * L, 0.09 * L, 0.006], [0.03, 0.085 * L, 0.085 * L], [0.07, 0.05, 0.05], [0.08, 0.004, 0.004]], 14)));
      put(kn, bot, cachedGeo('shin' + L, () => loft([[-0.3, 0.05 * L, 0.052 * L], [-0.13, 0.058 * L, 0.064 * L, -0.008], [0.0, 0.058 * L, 0.06 * L], [0.04, 0.045 * L, 0.045 * L], [0.05, 0.004, 0.004]], 14)));
      put(kn, shoe, cachedGeo('boot' + L + bootTop, () => loft([[-0.445, 0.058 * L, 0.062 * L, 0.004], [-0.33, 0.062 * L, 0.068 * L, -0.004], [bootTop - 0.02, 0.066 * L, 0.071 * L, -0.002], [bootTop, 0.072 * L, 0.077 * L, 0.002], [bootTop + 0.008, 0.07 * L, 0.075 * L, 0.002], [bootTop + 0.004, 0.05 * L, 0.05 * L]], 14)));
      const bootR = [[-0.08, 0.04, 0.035, 0.032], [-0.065, 0.05, 0.05, 0.018], [0.0, 0.056, 0.058, 0.01], [0.06, 0.058, 0.044, 0.022], [0.13, 0.055, 0.035, 0.032], [0.165, 0.046, 0.03, 0.037], [0.18, 0.022, 0.02, 0.045], [0.186, 0.004, 0.004, 0.06]];
      put(ft, shoe, cachedGeo('foot' + bw, () => loft(bootR.map(([f, rx, h, c]) => [f, rx * bw, h, c, 3]), 14).rotateX(Math.PI / 2)));
      if (cfg.sole) put(ft, toon(cfg.sole), cachedGeo('sole' + bw, () => loft([[-0.082, 0.04 * bw, 0.01, 0.062, 3], [-0.07, 0.054 * bw, 0.012, 0.062, 3], [0.13, 0.06 * bw, 0.012, 0.062, 3], [0.18, 0.04 * bw, 0.012, 0.06, 3], [0.19, 0.01, 0.006, 0.06, 3]], 12).rotateX(Math.PI / 2)), null, false);
    }
    for (const b of bag.values()) {
      const geo = cachedGeo('rig|' + cfg.face.id + '|' + b.jn + '|' + b.mat.uuid + '|' + b.outline, () => mergeGeos(b.list));
      meshOf(J[b.jn], geo, b.mat, b.outline ? OUT : null);
    }
    const rig = { root, pivot, model, J, cfg, face: faceM, emo: 'neutral', baseEmo: 'neutral', blinkT: rand(1, 3), tails: [], anim: 'idle', animT: 0, spin: 0, flip: 0, t: rand(0, 10), speed: 0, fwdSpeed: 0, vy: 0, fight: false, blend: 16, T: {}, hy: 0 };
    for (const n of JN) rig.T[n] = [0, 0, 0];
    if (cfg.hair) cfg.hair(rig, J, part);
    if (cfg.extra) cfg.extra(rig, J, part);
    return rig;
  }
  // Short cape / half-robe on the chest joint. Bent on the CPU each frame by a spring (see animate()).
  function addCape(rig, mat, o = {}) {
    const bw = (rig.cfg.bulk || 1) * (rig.cfg.shoulders || 1), a0 = 0.38 * Math.PI, al = 1.24 * Math.PI, seg = 18, len = o.len || 0.27;
    const hem = (th, k) => { const t = Math.abs(th - Math.PI) / (al / 2); return -len + (len + 0.14) * t ** 1.7 + (k % 2 ? 0.045 : 0) * (1 - t * 0.6); };
    const yAt = (f) => (th, k) => lerp(0.25, hem(th, k), f);
    const R = [[hem, 0.25 * bw, 0.152, -0.03], [yAt(0.6), 0.256 * bw, 0.142, -0.025], [yAt(0.25), 0.266 * bw, 0.132, -0.016], [0.25, 0.268 * bw, 0.126, -0.01], [0.3, 0.205 * bw, 0.112, -0.008], [0.335, 0.112, 0.088, -0.005]];
    const shrink = (r, d) => [r[0], r[1] - d, r[2] - d, r[3]];
    const rim = [(th, k) => hem(th, k) - 0.008, R[0][1] - 0.006, R[0][2] - 0.006, R[0][3]];
    const lip = [0.345, 0.106, 0.082, -0.005];
    const rings = [...R.slice().reverse().map((r) => shrink(r, 0.012)), rim, ...R, lip];
    const geo = loft(rings, seg, { a0, al });
    const m = meshOf(rig.J.chest, geo, mat); m.frustumCulled = false; m.children[0].frustumCulled = false;
    rig.cape = { geo, rest: Float32Array.from(geo.attributes.position.array), a: 0.1, v: 0, sway: 0, mesh: m };
    return m;
  }
  function bendCape(c) {
    const P = c.geo.attributes.position, A = P.array, R = c.rest, yp = 0.22, zp = -0.12, k = c.a / 0.45;
    for (let i = 0; i < A.length; i += 3) {
      const y = R[i + 1], z = R[i + 2], d = yp - y;
      if (d <= 0 || Math.abs(k) < 1e-4) { A[i] = R[i]; A[i + 1] = y; A[i + 2] = z; continue; }
      const ph = k * d, sn = Math.sin(ph), cs = Math.cos(ph), dz = z - zp;
      A[i] = R[i] + c.sway * d; A[i + 1] = yp - sn / k - dz * sn; A[i + 2] = zp - (1 - cs) / k + dz * cs;
    }
    P.needsUpdate = true;
  }
  function addTail(rig, parent, pos, segs, segLen, mkSeg, opts = {}) {
    let p = parent; const chain = [];
    for (let i = 0; i < segs; i++) {
      const jn = new THREE.Group(); jn.position.set(i ? 0 : pos[0], i ? -segLen : pos[1], i ? 0 : pos[2]); p.add(jn);
      mkSeg(jn, i); chain.push({ j: jn, a: opts.base || 0.1, v: 0, z: 0, vz: 0 }); p = jn;
    }
    rig.tails.push({ chain, base: opts.base || 0.1, lift: opts.lift || 1, ph: rand(0, 6), side: opts.side || 0 });
  }
  function setEmotion(rig, emo) { rig.baseEmo = emo; rig.emo = emo; rig.face.material.map = faceTexture(rig.cfg.face, emo); }
  // legacy spike list [dx, dy, dz, r, h] -> curved swept spikes merged into one mesh
  function spikes(J, mat, list, outline = OUT) {
    const g = [];
    for (const [dx, dy, dz, r, h] of list) {
      const d = new THREE.Vector3(dx, dy, dz).normalize();
      g.push([spikeGeo(h * 1.2, r * 1.15), orient([d.x * 0.085, 0.12 + d.y * 0.085, -0.01 + d.z * 0.085], [d.x, d.y + 0.25, d.z - 0.35], [0, 1, 0.3])]);
    }
    return meshOf(J.head, mergeGeos(g), mat, outline);
  }

  // ---------- character definitions ----------
  const REN_FACE = { id: 'ren', male: true, eyeH: 14.5, eye: '#7a6cf0', eyeDark: '#221a5a', eyeLight: '#cfc6ff', skin: '#f3d2b6', brow: '#15172a' };
  // Ren's head: same skull, but a broader, squarer jaw and a flatter chin
  const REN_HEAD = [[-0.04, 0.01, 0.008, 0.06], [-0.035, 0.034, 0.022, 0.058], [-0.02, 0.062, 0.044, 0.046], [0.008, 0.086, 0.074, 0.026], [0.045, 0.102, 0.097, 0.012], [0.085, 0.112, 0.11, 0.003], [0.13, 0.115, 0.118, -0.006], [0.17, 0.11, 0.115, -0.01], [0.205, 0.088, 0.095, -0.014], [0.228, 0.052, 0.06, -0.016], [0.24, 0.004, 0.004, -0.016]];
  function makeRen() {
    return buildRig({
      face: REN_FACE, headShape: REN_HEAD, shoulders: 1.12, flatChest: true, trim: true, collar: 0xf4f4ff, lapel: 0x34408c, cuff: 0xf2c14e, sole: 0xe8333f, belt: 0x3a2a24, hemLen: 0.19,
      colors: { skin: 0xf3d2b6, top: 0x232a58, bottom: 0x1a1d36, shoe: 0x2a2236, accent: 0xf2c14e },
      hair(rig, J) {
        // short, spiky, swept-back shounen hair: no side locks, no fringe curtain
        const blk = toon(0x22243a), str = toon(0x6f7fe0);
        hairCap(J, blk, 0.172, 0.05);
        const sp = [];
        for (const [el, azs, len, w] of [[66, [-20, 20], 0.15, 0.06], [50, [-52, 0, 52], 0.17, 0.064], [34, [-98, -140, 98, 140], 0.18, 0.064], [14, [-78, -118, -158, 158, 118, 78], 0.16, 0.06], [-8, [-128, -164, 164, 128], 0.14, 0.056]])
          azs.forEach((az) => sp.push([az, el, len * (1 + 0.1 * Math.sin(az * 0.7 + el)), w, 4]));
        // nape: short tufts pointing down/back; front: a short quiff that rises and sweeps back
        for (const az of [-150, 180, 150]) sp.push([az, -32, 0.1, 0.05, 0, 0.55]);
        for (const [az, len] of [[-34, 0.12], [-10, 0.13], [14, 0.12], [36, 0.11]]) sp.push([az, 74, len, 0.05, 4]);
        sp.push([-84, 0, 0.05, 0.03, 2], [84, 0, 0.05, 0.03, 2]);
        hairSpikes(J, blk, sp, 'ren');
        hairSpikes(J, str, [[64, 40, 0.16, 0.044, 4], [-80, 26, 0.16, 0.044, 4], [150, 20, 0.15, 0.046, 4]], 'ren2');
      },
      extra(rig, J) {
        const red = toon(0xc8283a, { side: THREE.DoubleSide }), gold = toon(0xf2c14e, { em: 0x403000, ei: 1 });
        addCape(rig, red);
        // clasp: gold studs on the cape edges, cords to a gem clasp on the chest
        const th0 = 0.38 * Math.PI, cl = [0, 0.262, 0.122], g = [];
        for (const sd of [-1, 1]) {
          const st = [sd * 0.205 * Math.sin(th0), 0.3, -0.008 + 0.112 * Math.cos(th0) + 0.01], d = [cl[0] - st[0], cl[1] - st[1], cl[2] - st[2]], ln = Math.hypot(...d);
          g.push([cachedGeo('stud', () => loft([[-0.012, 0.004, 0.004], [-0.008, 0.016, 0.016], [0.008, 0.016, 0.016], [0.012, 0.004, 0.004]], 8)), orient(st, [-sd * 0.6, 0, 0.8], [0, 1, 0])]);
          g.push([loft([[0, 0.006, 0.006], [ln, 0.006, 0.006]], 6), orient(st, d, [0, 1, 0])]);
        }
        g.push([cachedGeo('gem', () => loft([[-0.035, 0.003, 0.003], [0, 0.026, 0.012, 0, 2], [0.035, 0.003, 0.003]], 4)), xf(cl)]);
        meshOf(J.chest, mergeGeos(g), gold);
        // aura shell
        rig.aura = makeAura(0x8a6cff, 0x4fc3ff); rig.model.add(rig.aura);
      },
    });
  }
  function makeKaze() {
    return buildRig({
      face: { id: 'kaze', eye: '#3fe0c0', eyeDark: '#0a4a40', eyeH: 15, brow: '#c8d0e0' }, scale: 1.07, collar: 0xffffff, trim: true, boots: true,
      colors: { skin: 0xf6d6c0, top: 0x1f8a7a, bottom: 0x1a2a30, shoe: 0x20262e, accent: 0xffffff },
      hair(rig, J) {
        const h = toon(0xdfe6f4);
        hairCap(J, h);
        hairSpikes(J, h, [[0, 56, 0.17, 0.052, 0, 1.6], [-48, 44, 0.2, 0.052], [48, 44, 0.2, 0.052], [-108, 28, 0.21, 0.052], [108, 28, 0.21, 0.052], [180, 30, 0.18, 0.05], [-148, 2, 0.17, 0.05], [148, 2, 0.17, 0.05], [-34, 0, 0.08, 0.04, 1], [-10, 0, 0.09, 0.042, 1], [16, 0, 0.085, 0.04, 1], [40, 0, 0.075, 0.036, 1], [-80, 0, 0.16, 0.03, 2], [80, 0, 0.16, 0.03, 2]], 'kaze');
        addTail(rig, J.head, [0, 0.16, -0.12], 4, 0.12, (jn, i) => part(jn, G.cone, h, [0, -0.06, 0], [0.04 - i * 0.006, 0.14, 0.04], [Math.PI, 0, 0]), { base: 0.4, lift: 1 });
      },
      extra(rig, J) {
        const c = toon(0x1f8a7a), w = toon(0xffffff);
        for (const sx of [0.08, -0.08]) addTail(rig, J.hips, [sx, -0.14, -0.1], 3, 0.2, (jn) => part(jn, G.box, c, [0, -0.1, 0], [0.15, 0.21, 0.025]), { base: 0.08, lift: 0.8 });
        const blade = new THREE.Group(); J.haR.add(blade); blade.position.set(0, -0.04, 0.02);
        part(blade, G.box, toon(0x3a2a20), [0, 0, 0.06], [0.03, 0.035, 0.16]);
        part(blade, G.box, toon(0xd8f4ff, { em: 0x2fd8c0, ei: 0.3 }), [0, 0, 0.55], [0.018, 0.05, 0.85]);
        part(blade, G.cyl, toon(0xf2c14e), [0, 0, 0.14], [0.05, 0.015, 0.05], [Math.PI / 2, 0, 0]);
      },
    });
  }
  function makeTwin(clone) {
    return buildRig({
      face: { id: 'twin', type: 'mask', mask: '#f4f0ff', half: '#16101e', glow: '#ff2a4a' }, scale: 1.02, hem: true, boots: true,
      colors: { skin: 0xe8d0c8, top: 0x1a1022, bottom: 0x120a18, shoe: 0x2a0a14, accent: 0xc2183a, hand: 0x1a1022 },
      hair(rig, J) {
        const h = toon(0xa8102e);
        hairCap(J, h);
        spikes(J, h, [[0, 1, -0.3, 0.05, 0.22], [0.6, 0.6, -0.5, 0.05, 0.2], [-0.6, 0.6, -0.5, 0.05, 0.2], [0, 0.3, -1, 0.06, 0.26], [0.7, -0.2, -0.7, 0.045, 0.2], [-0.7, -0.2, -0.7, 0.045, 0.2]]);
      },
      extra(rig, J) {
        const r = toon(0xc2183a), d = toon(0x1a1022);
        for (const sx of [0.08, -0.08, 0]) addTail(rig, J.hips, [sx, -0.14, -0.1], 3, 0.2, (jn, i) => part(jn, G.box, i === 2 ? r : d, [0, -0.1, 0], [0.11, 0.21, 0.02]), { base: 0.1, lift: 1 });
        for (const h of ['haL', 'haR']) part(J[h], G.cone, toon(0xffd0d8, { em: 0xff2a4a, ei: 0.4 }), [0, -0.05, 0.25], [0.025, 0.5, 0.012], [Math.PI / 2, 0, 0]);
        part(J.chest, G.box, r, [0, 0.12, 0.1], [0.3, 0.03, 0.02], [0, 0, 0.6], null);
      },
    });
  }
  function makeWarden() {
    return buildRig({
      face: { id: 'warden', type: 'mask', mask: '#6b4a2f', glow: '#ffb020', lines: '#ffb020' }, scale: 2.3, bulk: 1.5, limb: 1.4, hem: false, boots: true,
      colors: { skin: 0x6b4a2f, top: 0x5a3c26, bottom: 0x4a3220, shoe: 0x3a2a1a, hand: 0x7a7066, accent: 0x5fa040 },
      hair(rig, J) {
        const br = toon(0x4a3220), moss = toon(0x5fa040);
        part(J.head, G.sphere, moss, [0, 0.17, -0.03], [0.12, 0.08, 0.12]);
        spikes(J, br, [[0.6, 1, 0, 0.03, 0.34], [-0.6, 1, 0, 0.03, 0.34], [0.9, 0.7, -0.2, 0.025, 0.24], [-0.9, 0.7, -0.2, 0.025, 0.24]]);
      },
      extra(rig, J) {
        const moss = toon(0x5fa040), leaf = toon(0x3f8a3a);
        part(J.chest, G.sphere, moss, [0.22, 0.26, 0], [0.12, 0.08, 0.12]); part(J.chest, G.sphere, moss, [-0.22, 0.26, 0], [0.12, 0.08, 0.12]);
        for (const sx of [0.1, -0.1, 0]) addTail(rig, J.chest, [sx, 0.25, -0.1], 3, 0.2, (jn) => part(jn, G.cone, leaf, [0, -0.1, 0], [0.09, 0.22, 0.03], [Math.PI, 0, 0]), { base: 0.15, lift: 0.5 });
        for (const h of ['haL', 'haR']) part(J[h], G.oct, toon(0x8a8478), [0, -0.05, 0], [0.09, 0.09, 0.09]);
        part(J.chest, G.sphere, toon(0xffb020, { em: 0xff8a00, ei: 1 }), [0, 0.14, 0.1], 0.04, null, null);
      },
    });
  }
  function makeNull() {
    return buildRig({
      face: { id: 'null', eye: '#ffd24a', eyeDark: '#8a5a00', eyeH: 14, skin: '#f4f0ff', brow: '#d8d0f0' }, scale: 1.22, hem: false, collar: 0xf5c542,
      colors: { skin: 0xf4f0ff, top: 0xeae6ff, bottom: 0x1a1428, shoe: 0x1a1428, accent: 0xf5c542 }, trim: true, cuff: 0xf5c542,
      hair(rig, J) {
        const h = toon(0xf8f6ff);
        hairCap(J, h);
        spikes(J, h, [[0, 1, -0.2, 0.05, 0.18], [0.5, 0.7, -0.6, 0.05, 0.2], [-0.5, 0.7, -0.6, 0.05, 0.2], [0.9, 0, -0.3, 0.04, 0.16], [-0.9, 0, -0.3, 0.04, 0.16]]);
        for (const sx of [0.06, -0.06]) addTail(rig, J.head, [sx, 0.1, -0.11], 4, 0.14, (jn) => part(jn, G.box, h, [0, -0.07, 0], [0.07, 0.15, 0.03]), { base: 0.2, lift: 1 });
        const halo = new THREE.Mesh(G.torus, toon(0xf5c542, { em: 0xf5a020, ei: 0.8 })); halo.scale.set(0.2, 0.2, 0.3); halo.position.set(0, 0.16, -0.2); J.head.add(halo); rig.halo = halo;
      },
      extra(rig, J) {
        part(J.hips, G.cone12, toon(0xeae6ff), [0, -0.45, 0], [0.32, 1.0, 0.28], [0, 0, 0]).rotation.x = Math.PI;
        part(J.hips, G.cyl, toon(0xf5c542), [0, -0.9, 0], [0.33, 0.04, 0.29], null, null);
        for (const sx of [0.12, -0.12]) addTail(rig, J.chest, [sx, 0.26, -0.08], 4, 0.22, (jn, i) => part(jn, G.box, toon(i % 2 ? 0x1a1428 : 0xeae6ff), [0, -0.11, 0], [0.18, 0.23, 0.02]), { base: 0.1, lift: 0.8 });
        rig.aura = makeAura(0xf5c542, 0xffffff); rig.model.add(rig.aura); rig.aura.visible = true;
      },
    });
  }
  // ---------- part 2 characters (chapters 5-8), all built with buildRig ----------
  function makeSabulo() {
    return buildRig({
      face: { id: 'dune', type: 'mask', mask: '#f0c870', half: '#b8862e', glow: '#ff7a1a', lines: '#5a3010' }, scale: 1.45, bulk: 1.25, limb: 1.1, hemLen: 0.34, hemColor: 0xe0bc78, boots: true, trim: true, belt: 0x2a5aa8,
      colors: { skin: 0x9a6a3a, top: 0xd8b070, bottom: 0x6a4a2a, shoe: 0x4a3018, hand: 0x9a6a3a, accent: 0x2fc8d8 },
      hair(rig, J) {
        // a tall striped headdress with a sun crest (original design)
        const gold = toon(0xf2c14e, { em: 0x3a2800, ei: 1 }), blue = toon(0x2a5aa8);
        hairCap(J, gold, 0.17, 0.02);
        for (const sx of [-1, 1]) addTail(rig, J.head, [sx * 0.105, 0.07, -0.02], 3, 0.1, (jn, i) => part(jn, G.box, i % 2 ? blue : gold, [0, -0.05, 0], [0.07, 0.11, 0.11]), { base: 0.04, lift: 0.3 });
        part(J.head, G.cone, gold, [0, 0.33, -0.03], [0.08, 0.18, 0.08]);
        part(J.head, G.torus, gold, [0, 0.3, -0.05], [0.09, 0.09, 0.2]);
        part(J.head, G.sphere, toon(0x2fc8d8, { em: 0x2fc8d8, ei: 0.9 }), [0, 0.21, 0.11], 0.026, null, null);
      },
      extra(rig, J) {
        const gold = toon(0xf2c14e, { em: 0x3a2800, ei: 1 }), wood = toon(0x5a3a1a);
        const staff = new THREE.Group(); J.haR.add(staff); staff.position.set(0, -0.04, 0.02);
        part(staff, G.cyl, wood, [0, 0, 0.25], [0.028, 1.5, 0.028], [Math.PI / 2, 0, 0]);
        part(staff, G.torus, gold, [0, 0, 1.0], [0.17, 0.17, 0.3]);
        part(staff, G.sphere, toon(0xff9a2a, { em: 0xff7a1a, ei: 1 }), [0, 0, 1.0], 0.08, null, null);
        for (const sx of [-1, 1]) part(J.chest, G.sphere, gold, [sx * 0.22, 0.27, 0], [0.11, 0.06, 0.1]);
        addCape(rig, toon(0xb83a2a, { side: THREE.DoubleSide }), { len: 0.48 });
        rig.aura = makeAura(0xffb347, 0xff6a1a); rig.model.add(rig.aura);
      },
    });
  }
  function makeFubuki() {
    return buildRig({
      face: { id: 'fubuki', eye: '#7fe8ff', eyeDark: '#1a4a7a', eyeLight: '#e8fcff', eyeH: 15, skin: '#f4f6ff', brow: '#c8d8f0' }, scale: 1.12, collar: 0xe8f4ff, trim: true, cuff: 0x7fe8ff, boots: true, hemLen: 0.3, hemColor: 0xe8f4ff,
      colors: { skin: 0xf4f6ff, top: 0x3a6ab8, bottom: 0x1a2a4a, shoe: 0xdfe8f8, accent: 0x7fe8ff },
      hair(rig, J) {
        const h = toon(0xeaf6ff);
        hairCap(J, h);
        hairSpikes(J, h, [[0, 60, 0.12, 0.05], [-50, 44, 0.14, 0.05], [50, 44, 0.14, 0.05], [-30, 0, 0.09, 0.045, 1], [0, 0, 0.1, 0.045, 1], [30, 0, 0.09, 0.045, 1], [-84, 0, 0.2, 0.035, 2], [84, 0, 0.2, 0.035, 2]], 'fubuki');
        for (const sx of [0.05, -0.05, 0]) addTail(rig, J.head, [sx, 0.08, -0.11], 5, 0.13, (jn, i) => part(jn, G.box, h, [0, -0.065, 0], [0.09 - i * 0.01, 0.14, 0.03]), { base: 0.15, lift: 0.9 });
        const ice = toon(0xbff4ff, { em: 0x4ad8ff, ei: 0.8 });
        for (let k = -2; k <= 2; k++) part(J.head, G.oct, ice, [k * 0.045, 0.25 - Math.abs(k) * 0.02, 0.03 - Math.abs(k) * 0.02], [0.02, 0.07 - Math.abs(k) * 0.012, 0.02]);
      },
      extra(rig, J) {
        const ice = toon(0xbff4ff, { em: 0x4ad8ff, ei: 0.6 });
        const sp = new THREE.Group(); J.haR.add(sp); sp.position.set(0, -0.04, 0.02);
        part(sp, G.cyl, toon(0xdfe8f8), [0, 0, 0.3], [0.02, 1.3, 0.02], [Math.PI / 2, 0, 0]);
        part(sp, G.oct, ice, [0, 0, 1.05], [0.06, 0.06, 0.28]);
        for (const sx of [-1, 1]) part(J.chest, G.oct, ice, [sx * 0.22, 0.3, 0], [0.06, 0.12, 0.06], [0, 0, sx * 0.5]);
        addCape(rig, toon(0xe8f4ff, { side: THREE.DoubleSide }), { len: 0.42 });
        rig.aura = makeAura(0x7fe8ff, 0xffffff); rig.model.add(rig.aura);
      },
    });
  }
  function makeColossus() {
    return buildRig({
      face: { id: 'prism', type: 'mask', mask: '#6a5a9a', half: '#3a2a6a', glow: '#ff7ae0', lines: '#c77dff' }, scale: 2.25, bulk: 1.55, limb: 1.4, hem: false, boots: true,
      colors: { skin: 0x5a4a8a, top: 0x4a3a7a, bottom: 0x3a2e62, shoe: 0x2a2048, hand: 0x7a6aaa, accent: 0xff7ae0 },
      hair(rig, J) {
        const cr = toon(0xd8a8ff, { em: 0x8a3aff, ei: 0.6 });
        for (let k = 0; k < 5; k++) { const a = (k - 2) * 0.45; part(J.head, G.oct, cr, [Math.sin(a) * 0.08, 0.22 + Math.cos(a) * 0.04, -0.03], [0.035, 0.14 - Math.abs(k - 2) * 0.025, 0.035], [0, 0, -a * 0.8]); }
      },
      extra(rig, J) {
        const cr = toon(0xff9af0, { em: 0xc83aff, ei: 0.7 }), cr2 = toon(0x9ff8ff, { em: 0x3ab8ff, ei: 0.7 });
        // crystal growths on the back and shoulders, crystal fists and a glowing heart
        for (let k = 0; k < 6; k++) { const sx = (k % 3 - 1) * 0.11, y = 0.12 + Math.floor(k / 3) * 0.12; part(J.chest, G.oct, k % 2 ? cr : cr2, [sx, y, -0.13], [0.05, 0.16, 0.05], [-0.7, 0, sx * 2]); }
        for (const sx of [-1, 1]) part(J.chest, G.oct, cr, [sx * 0.24, 0.3, 0], [0.07, 0.15, 0.07], [0, 0, sx * 0.6]);
        for (const h of ['haL', 'haR']) part(J[h], G.oct, cr2, [0, -0.06, 0], [0.1, 0.1, 0.1]);
        part(J.chest, G.oct, toon(0xffffff, { em: 0xff7ae0, ei: 1 }), [0, 0.15, 0.11], [0.05, 0.07, 0.03], null, null);
        rig.aura = makeAura(0xff7ae0, 0x9ff8ff); rig.model.add(rig.aura);
      },
    });
  }
  function makeVael(clone) {
    return buildRig({
      face: { id: 'vael', male: true, eye: '#ff3a5a', eyeDark: '#5a0010', eyeLight: '#ffc0c8', eyeH: 13.5, skin: '#dcd4e4', brow: '#120a18' }, headShape: REN_HEAD, scale: 1.24, shoulders: 1.16, flatChest: true, collar: 0x2a0a1a, lapel: 0x2a0a1a, trim: true, cuff: 0xffc24a, boots: true, hemLen: 0.32, hemColor: 0x140a1a, sole: 0xff3355, belt: 0xffc24a,
      colors: { skin: 0xdcd4e4, top: 0x1a1222, bottom: 0x0e0a14, shoe: 0x241a2e, accent: 0xffc24a },
      hair(rig, J) {
        const blk = toon(0x0e0a14), gold = toon(0xffc24a, { em: 0x5a3000, ei: 1 });
        hairCap(J, blk, 0.165, 0.03);
        hairSpikes(J, blk, [[0, 56, 0.16, 0.06], [-46, 40, 0.19, 0.06], [46, 40, 0.19, 0.06], [-110, 24, 0.22, 0.06], [110, 24, 0.22, 0.06], [180, 18, 0.24, 0.06], [-150, -6, 0.22, 0.055], [150, -6, 0.22, 0.055], [-20, 0, 0.08, 0.04, 1], [20, 0, 0.08, 0.04, 1]], 'vael');
        // a crown of black horns rimmed in gold
        for (const sx of [-1, 1]) { part(J.head, G.cone, toon(0x1a1020), [sx * 0.085, 0.27, 0.0], [0.03, 0.2, 0.03], [-0.25, 0, -sx * 0.45]); part(J.head, G.cone, gold, [sx * 0.04, 0.27, 0.07], [0.018, 0.09, 0.018], [0.1, 0, -sx * 0.2]); }
        part(J.head, G.torus, gold, [0, 0.19, 0], [0.12, 0.12, 0.12], [Math.PI / 2, 0, 0]);
      },
      extra(rig, J) {
        // a black greatsword with a red edge, a torn crimson cape and a dark aura
        const blade = new THREE.Group(); J.haR.add(blade); blade.position.set(0, -0.04, 0.02);
        part(blade, G.box, toon(0x2a1a20), [0, 0, 0.07], [0.035, 0.04, 0.2]);
        part(blade, G.box, toon(0x140a14, { em: 0x3a0010, ei: 0.5 }), [0, 0, 0.72], [0.025, 0.11, 1.15]);
        part(blade, G.box, toon(0xff3355, { em: 0xff1a3a, ei: 1 }), [0, 0.06, 0.72], [0.012, 0.012, 1.1], null, null);
        part(blade, G.box, toon(0xffc24a), [0, 0, 0.16], [0.05, 0.22, 0.04]);
        addCape(rig, toon(0x8a0a24, { side: THREE.DoubleSide }), { len: 0.5 });
        for (const sx of [-1, 1]) part(J.chest, G.cone, toon(0x241a2e), [sx * 0.24, 0.3, 0], [0.07, 0.14, 0.07], [0, 0, -sx * 0.9]);
        rig.aura = makeAura(0xff3a6a, 0x2a0010); rig.model.add(rig.aura); rig.aura.visible = !!clone;
      },
    });
  }
  function makeElder() {
    return buildRig({
      face: { id: 'elder', male: true, eye: '#5a4a3a', eyeDark: '#2a1a10', eyeH: 12, skin: '#e8c8a8', brow: '#f4f4f0' }, scale: 0.95, hemLen: 0.42, hemColor: 0x7a3a2a, collar: 0xf0e8d8,
      colors: { skin: 0xe8c8a8, top: 0x8a4a32, bottom: 0x4a3a30, shoe: 0x3a2a20, accent: 0xf2c14e },
      hair(rig, J) {
        const w = toon(0xf4f4f0);
        hairCap(J, w, 0.11, 0.0);
        part(J.head, G.cone, w, [0, -0.06, 0.095], [0.06, 0.15, 0.04], [Math.PI + 0.35, 0, 0]);
        part(J.head, G.cone12, toon(0xd8c088), [0, 0.28, 0], [0.26, 0.1, 0.26]);
      },
      extra(rig, J) { part(J.haR, G.cyl, toon(0x6a4a2a), [0, -0.38, 0.06], [0.022, 1.0, 0.022]); },
    });
  }
  const ENEMY_DEFS = {
    construct: { hp: 26, speed: 2.6, dmg: 6, wind: 0.75, name: 'Training Construct', mk: () => buildRig({ face: { id: 'construct', type: 'mask', mask: '#f4e6c0', glow: '#2fd8c0', lines: '#d8343f' }, scale: 1.0, hem: false, colors: { skin: 0xc99a62, top: 0xb88a52, bottom: 0xa87a48, shoe: 0x7a5a3a, hand: 0xc99a62 }, extra(r, J) { part(J.chest, G.sphere, toon(0x2fd8c0, { em: 0x2fd8c0, ei: 1 }), [0, 0.14, 0.1], 0.035, null, null); part(J.head, G.box, toon(0x7a5a3a), [0, 0.24, 0], [0.18, 0.03, 0.18]); } }) },
    hollow: { hp: 34, speed: 3.8, dmg: 8, wind: 0.6, name: 'Hollow', mk: () => buildRig({ face: { id: 'hollow', type: 'mask', mask: '#f8f4ff', glow: '#b030ff', lines: '#8a1aff' }, hem: false, limb: 0.9, colors: { skin: 0x2a1840, top: 0x241436, bottom: 0x1a0e28, shoe: 0x1a0e28, hand: 0x3a2050 }, extra(r, J) { for (const h of ['haL', 'haR']) for (const a of [-0.4, 0, 0.4]) part(J[h], G.cone, toon(0xe8e0ff), [a * 0.05, -0.1, 0.02], [0.012, 0.1, 0.012], [Math.PI, 0, a]); addTail(r, J.hips, [0, -0.05, -0.1], 3, 0.18, (jn, i) => part(jn, G.sphere, toon(0x3a1a5a, { em: 0x6a1aaa, ei: 0.6 }), [0, -0.08, 0], [0.08 - i * 0.02, 0.12, 0.05]), { base: 0.8, lift: 0.6 }); r.hunch = 0.35; } }) },
    thornling: { hp: 34, speed: 3.4, dmg: 8, wind: 0.65, name: 'Thornling', mk: () => buildRig({ face: { id: 'thorn', type: 'mask', mask: '#5a8a3a', glow: '#ffb020', lines: '#2a4a1a' }, scale: 0.85, hem: false, colors: { skin: 0x4a7a32, top: 0x3a6a2a, bottom: 0x5a4632, shoe: 0x3a2a1a, hand: 0x4a7a32 }, extra(r, J) { part(J.head, G.cone12, toon(0x8ad04a), [0, 0.3, 0], [0.16, 0.22, 0.16]); for (let i = 0; i < 4; i++) part(J.chest, G.cone, toon(0xd8c070), [0, 0.05 + i * 0.07, -0.1], [0.025, 0.12, 0.025], [-1.2, 0, 0]); } }) },
    nullknight: { hp: 48, speed: 3.6, dmg: 10, wind: 0.6, name: 'Null Knight', mk: () => buildRig({ face: { id: 'nk', type: 'mask', mask: '#dfe3f0', half: '#c8cce0', glow: '#7cf8ff', lines: '#3a3a5a' }, boots: true, colors: { skin: 0xdfe3f0, top: 0xdfe3f0, bottom: 0x2a2a3a, shoe: 0xdfe3f0, hand: 0xdfe3f0, accent: 0x7cf8ff }, trim: true, extra(r, J) { part(J.haR, G.cyl, toon(0x3a3a5a), [0, -0.03, 0.2], [0.015, 0.9, 0.015], [Math.PI / 2, 0, 0]); part(J.haR, G.cone, toon(0x7cf8ff, { em: 0x7cf8ff, ei: 0.8 }), [0, -0.03, 0.72], [0.04, 0.2, 0.02], [Math.PI / 2, 0, 0]); part(J.head, G.cone, toon(0xdfe3f0), [0, 0.3, -0.02], [0.03, 0.14, 0.08]); } }) },
    // part 2 enemies
    scarab: { hp: 40, speed: 4.2, dmg: 9, wind: 0.55, name: 'Dust Scarab', mk: () => buildRig({ face: { id: 'scarab', type: 'mask', mask: '#f0c870', glow: '#2fd8c0', lines: '#7a4a10' }, scale: 0.9, hem: false, limb: 0.9, colors: { skin: 0x8a5a2a, top: 0xb8862e, bottom: 0x7a5420, shoe: 0x4a3018, hand: 0x8a5a2a }, extra(r, J) { const sh = toon(0x2a8a7a, { em: 0x0a3a3a, ei: 0.6 }); part(J.chest, G.sphere, sh, [0, 0.16, -0.1], [0.2, 0.18, 0.16]); for (const sx of [-1, 1]) part(J.head, G.cone, toon(0xf0c870), [sx * 0.07, 0.22, 0.04], [0.025, 0.14, 0.025], [0.5, 0, -sx * 0.5]); r.hunch = 0.3; } }) },
    frostbrute: { hp: 72, speed: 2.9, dmg: 13, wind: 0.8, name: 'Frost Brute', mk: () => buildRig({ face: { id: 'fbrute', type: 'mask', mask: '#e8f4ff', glow: '#4ad8ff', lines: '#3a6ab8' }, scale: 1.3, bulk: 1.4, limb: 1.2, hem: false, colors: { skin: 0xdfe8f2, top: 0xeef4fa, bottom: 0x8a9ab8, shoe: 0x5a6a88, hand: 0x9ab0d0 }, extra(r, J) { const fur = toon(0xf4f8ff); for (const sx of [-1, 1]) { part(J.chest, G.sphere, fur, [sx * 0.2, 0.25, 0], [0.13, 0.1, 0.13]); part(J.head, G.cone, toon(0x9ab0d0), [sx * 0.1, 0.24, 0], [0.03, 0.16, 0.03], [0, 0, -sx * 0.6]); } const club = new THREE.Group(); J.haR.add(club); part(club, G.cyl, toon(0x6a5a4a), [0, 0, 0.25], [0.03, 0.6, 0.03], [Math.PI / 2, 0, 0]); part(club, G.oct, toon(0xbff4ff, { em: 0x4ad8ff, ei: 0.6 }), [0, 0, 0.6], [0.12, 0.12, 0.2]); r.hunch = 0.2; } }) },
    shardling: { hp: 46, speed: 3.7, dmg: 10, wind: 0.6, name: 'Shardling', mk: () => buildRig({ face: { id: 'shard', type: 'mask', mask: '#d8c8ff', half: '#a888f0', glow: '#ff7ae0', lines: '#6a3ab8' }, hem: false, colors: { skin: 0x6a5a9a, top: 0x5a4a8a, bottom: 0x3a2e62, shoe: 0x2a2048, hand: 0x9a8ad0 }, extra(r, J) { const cr = toon(0xff9af0, { em: 0xc83aff, ei: 0.7 }); for (let k = 0; k < 3; k++) part(J.chest, G.oct, cr, [(k - 1) * 0.09, 0.2, -0.12], [0.04, 0.14, 0.04], [-0.6, 0, (k - 1) * 0.4]); part(J.head, G.oct, cr, [0, 0.27, 0], [0.04, 0.12, 0.04]); for (const h of ['haL', 'haR']) part(J[h], G.oct, toon(0x9ff8ff, { em: 0x3ab8ff, ei: 0.6 }), [0, -0.1, 0.03], [0.03, 0.12, 0.03], [Math.PI, 0, 0]); } }) },
    hollowlord: { hp: 66, speed: 3.9, dmg: 12, wind: 0.55, name: 'Hollow Lord', mk: () => buildRig({ face: { id: 'hlord', type: 'mask', mask: '#1a1020', half: '#f4f0ff', glow: '#ff3a6a', lines: '#ffc24a' }, scale: 1.12, boots: true, trim: true, colors: { skin: 0x2a1840, top: 0x1a1022, bottom: 0x120a18, shoe: 0x241a2e, hand: 0x2a1840, accent: 0xffc24a }, extra(r, J) { for (const sx of [-1, 1]) part(J.head, G.cone, toon(0xf4f0ff), [sx * 0.09, 0.25, -0.02], [0.03, 0.2, 0.03], [-0.3, 0, -sx * 0.4]); part(J.haR, G.box, toon(0x1a1022, { em: 0xff3a6a, ei: 0.3 }), [0, -0.03, 0.45], [0.03, 0.06, 0.75]); addTail(r, J.chest, [0, 0.26, -0.1], 3, 0.2, (jn, i) => part(jn, G.box, toon(i % 2 ? 0x5a0a1a : 0x1a1022), [0, -0.1, 0], [0.3, 0.21, 0.02]), { base: 0.1, lift: 0.8 }); } }) },
  };

  // ---------- aura ----------
  const auraMats = [];
  function makeAura(c1, c2) {
    const g = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const m = new THREE.ShaderMaterial({
        uniforms: { t: { value: 0 }, c1: { value: new THREE.Color(c1) }, c2: { value: new THREE.Color(c2) }, k: { value: i }, amp: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
        fragmentShader: `varying vec2 vUv; uniform float t,k,amp; uniform vec3 c1,c2;
          float h(vec2 p){return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5);}
          float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
          void main(){ vec2 p=vec2(vUv.x*10.0+k*3.0, vUv.y*3.0 - t*(2.5+k)); float f=n(p)*0.6+n(p*2.3)*0.4; float a=smoothstep(0.35,0.75,f*(1.25-vUv.y));
          a*=smoothstep(0.0,0.15,vUv.y)*(1.0-vUv.y); vec3 c=mix(c1,c2,f); gl_FragColor=vec4(c*1.6,a*0.85*amp);} `,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      auraMats.push(m);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28 + i * 0.08, 0.42 + i * 0.1, 2.2, 18, 1, true), m);
      mesh.position.y = 1.05; g.add(mesh);
    }
    g.visible = false; return g;
  }

  // ---------- particles ----------
  function makeParticles(N, blending) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N), al = new Float32Array(N);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('alpha', new THREE.BufferAttribute(al, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowTex }, scale: { value: 400 } },
      vertexShader: 'attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale; void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/max(0.5,-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC*1.4,t.a*vA); if(gl_FragColor.a<0.01) discard; }',
      transparent: true, depthWrite: false, blending,
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
    const P = { N, pos, col, sz, al, vel: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N), s0: new Float32Array(N), grav: new Float32Array(N), drag: new Float32Array(N), i: 0, geo, mat, pts };
    return P;
  }
  const PA = makeParticles(1400, THREE.AdditiveBlending);
  const PN = makeParticles(600, THREE.NormalBlending);
  const tmpC = new THREE.Color();
  function spawnP(P, x, y, z, vx, vy, vz, life, size, color, grav = 0, drag = 1) {
    const i = P.i; P.i = (P.i + 1) % P.N;
    P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z; P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz;
    P.life[i] = life; P.max[i] = life; P.s0[i] = size; P.grav[i] = grav; P.drag[i] = drag;
    tmpC.set(color); P.col[i * 3] = tmpC.r; P.col[i * 3 + 1] = tmpC.g; P.col[i * 3 + 2] = tmpC.b;
  }
  function burst(x, y, z, n, color, speed = 6, life = 0.5, size = 0.25, grav = -6) {
    n = Math.ceil(n * qMul);
    for (let k = 0; k < n; k++) { const a = rand(0, TAU), b = rand(-1, 1), s = rand(0.3, 1) * speed; spawnP(PA, x, y, z, Math.cos(a) * Math.sqrt(1 - b * b) * s, b * s + speed * 0.3, Math.sin(a) * Math.sqrt(1 - b * b) * s, life * rand(0.6, 1.2), size * rand(0.6, 1.3), color, grav, 3); }
  }
  function updateP(P, dt) {
    for (let i = 0; i < P.N; i++) {
      if (P.life[i] <= 0) { P.al[i] = 0; continue; }
      P.life[i] -= dt; const d = Math.exp(-P.drag[i] * dt);
      P.vel[i * 3] *= d; P.vel[i * 3 + 1] = P.vel[i * 3 + 1] * d + P.grav[i] * dt; P.vel[i * 3 + 2] *= d;
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      const f = clamp(P.life[i] / P.max[i], 0, 1); P.al[i] = Math.min(1, f * 2.5); P.sz[i] = P.s0[i] * (0.4 + 0.6 * f);
    }
    P.geo.attributes.position.needsUpdate = P.geo.attributes.alpha.needsUpdate = P.geo.attributes.size.needsUpdate = P.geo.attributes.color.needsUpdate = true;
  }

  // ---------- slash arcs, flashes, rings, telegraphs, numbers ----------
  function arcGeo(r0, r1, a0, a1, seg) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) { const u = i / seg, a = lerp(a0, a1, u); for (const [r, v] of [[r0, 0], [r1, 1]]) { pos.push(Math.cos(a) * r, Math.sin(a) * r, 0); uv.push(u, v); } if (i < seg) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  }
  const ARC_G = arcGeo(0.55, 1, -1.3, 1.3, 24);
  const arcs = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.ShaderMaterial({
      uniforms: { col: { value: new THREE.Color() }, prog: { value: 0 }, op: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float prog,op; void main(){ float u=vUv.x, v=vUv.y; if(u>prog) discard; float w=sin(u*3.14159); float body=smoothstep(1.0-w*0.95,1.0-w*0.5,v)*smoothstep(1.0,0.9,v); float tail=exp(-(prog-u)*2.5); vec3 c=mix(col,vec3(1.0),smoothstep(0.75,0.95,v)); gl_FragColor=vec4(c*1.5,body*tail*op);} `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(ARC_G, m); mesh.visible = false; scene.add(mesh); arcs.push({ mesh, t: 0, life: 0 });
  }
  let arcI = 0;
  function slashArc(pos, yaw, tilt, size, color, flipDir = false) {
    const a = arcs[arcI = (arcI + 1) % arcs.length]; a.mesh.visible = true; a.t = 0; a.life = 0.22;
    a.mesh.position.copy(pos); a.mesh.rotation.set(0, 0, 0); a.mesh.rotateY(yaw); a.mesh.rotateZ(tilt); a.mesh.rotateX(-Math.PI / 2); if (flipDir) a.mesh.rotateY(Math.PI);
    a.mesh.scale.setScalar(size); a.mesh.material.uniforms.col.value.set(color);
  }
  const flashes = [];
  for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.visible = false; scene.add(s); flashes.push({ s, t: 0, life: 0, size: 1 }); }
  let flI = 0;
  function flash(pos, size, color) { const f = flashes[flI = (flI + 1) % flashes.length]; f.s.visible = true; f.s.position.copy(pos); f.t = 0; f.life = 0.16; f.size = size; f.s.material.color.set(color); f.s.material.rotation = rand(0, TAU); }
  const ringMatBase = () => new THREE.MeshBasicMaterial({ map: (() => { const [c, x] = cvs(128, 128); const g = x.createRadialGradient(64, 64, 40, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rings = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(G.plane, ringMatBase()); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); rings.push({ m, t: 0, life: 0, r: 1 }); }
  let rgI = 0;
  function shockRing(pos, radius, color, life = 0.45) { const r = rings[rgI = (rgI + 1) % rings.length]; r.m.visible = true; r.m.position.copy(pos); r.m.position.y += 0.08; r.t = 0; r.life = life; r.r = radius; r.m.material.color.set(color); }

  const teleMat = () => new THREE.ShaderMaterial({
    uniforms: { fill: { value: 0 }, shape: { value: 0 }, t: { value: 0 }, col: { value: new THREE.Color(0xff2a3a) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv; uniform float fill,shape,t; uniform vec3 col; void main(){ float a; if(shape<0.5){ float r=length(vUv-0.5)*2.0; if(r>1.0) discard; a=smoothstep(0.88,0.97,r)*0.9 + step(r,fill)*0.32 + 0.12; } else { float e=max(abs(vUv.x-0.5)*2.0, 0.0); a = smoothstep(0.8,0.95,e)*0.8 + step(vUv.y,fill)*0.32 + 0.12; } a*=0.75+0.25*sin(t*20.0); gl_FragColor=vec4(col,a);} `,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const teles = [];
  function telegraph(shape, pos, a, b, yaw, dur) {
    let tl = teles.find((x) => !x.active);
    if (!tl) { const m = new THREE.Mesh(G.plane, teleMat()); scene.add(m); tl = { m }; teles.push(tl); }
    tl.active = true; tl.t = 0; tl.dur = dur; tl.m.visible = true;
    tl.shape = shape; tl.cx = pos.x; tl.cz = pos.z; tl.a = a; tl.b = b; tl.yaw = yaw || 0; // geometry kept for getState().danger
    const u = tl.m.material.uniforms; u.shape.value = shape === 'circle' ? 0 : 1;
    tl.m.position.copy(pos); tl.m.position.y += 0.06; tl.m.rotation.set(-Math.PI / 2, 0, 0); tl.m.rotation.z = yaw || 0;
    if (shape === 'circle') tl.m.scale.set(a * 2, a * 2, 1);
    else { tl.m.scale.set(a, b, 1); tl.m.position.x += Math.sin(yaw) * b / 2; tl.m.position.z += Math.cos(yaw) * b / 2; tl.m.rotation.z = yaw + Math.PI; }
    return tl;
  }
  const nums = [];
  for (let i = 0; i < 12; i++) { const [c, x] = cvs(128, 64); const t = new THREE.CanvasTexture(c); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.visible = false; s.renderOrder = 10; scene.add(s); nums.push({ s, c, x, t, life: 0 }); }
  let nI = 0;
  function dmgNumber(pos, val, heavy, col) {
    const n = nums[nI = (nI + 1) % nums.length]; const x = n.x; x.clearRect(0, 0, 128, 64); const word = typeof val === 'string';
    x.font = `900 ${word ? 30 : heavy ? 48 : 40}px Impact, "Arial Black", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = '#1a0a2a'; x.strokeText(String(val), 64, 34); x.fillStyle = col || (heavy ? '#ffb020' : '#ffffff'); x.fillText(String(val), 64, 34);
    n.t.needsUpdate = true; n.s.visible = true; n.s.position.copy(pos).add(new THREE.Vector3(rand(-0.3, 0.3), 0, rand(-0.3, 0.3))); n.life = 0.8; n.s.scale.set(heavy ? 1.5 : 1.1, heavy ? 0.75 : 0.55, 1);
  }

  // ---------- screen overlay (speed lines, tint, flash) ----------
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, speed: { value: 0 }, tint: { value: new THREE.Color(0x6a3cff) }, tintAmt: { value: 0 }, white: { value: 0 }, aspect: { value: 1 }, black: { value: 0 }, ringR: { value: -1 }, ringCol: { value: new THREE.Color(0x8a5cff) }, vig: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);} ',
    fragmentShader: `varying vec2 vUv; uniform float t,speed,tintAmt,white,aspect,black,ringR,vig; uniform vec3 tint,ringCol; float h(float x){return fract(sin(x*91.7)*43758.5);}
      void main(){ vec2 p=(vUv-0.5)*vec2(aspect,1.0); float r=length(p); float a=atan(p.y,p.x); float id=floor(a*48.0/3.14159); float l=step(0.72,h(id+floor(t*14.0)))*smoothstep(0.28,0.75,r);
      vec4 c=vec4(1.0,1.0,1.0,l*speed*0.8); c.rgb=mix(c.rgb,tint,0.0); c=mix(c, vec4(tint, 0.55), tintAmt*(0.6+0.4*smoothstep(0.2,0.9,r))); c=mix(c,vec4(1.0),white);
      float vg=vig*smoothstep(0.25,0.95,r); c=vec4(mix(c.rgb,vec3(0.0),vg),max(c.a,vg)); c=mix(c,vec4(0.0,0.0,0.0,1.0),black);
      if(ringR>0.0){ float d=r-ringR; float ra=smoothstep(0.035,0.0,abs(d))+0.55*smoothstep(0.22,0.0,abs(d))*step(d,0.0)+0.25*smoothstep(0.5,0.0,-d)*step(d,0.0)*(1.0-smoothstep(0.0,1.2,ringR));
        float fl=0.75+0.25*sin(a*24.0+t*20.0); ra*=fl; c.rgb=mix(c.rgb,mix(ringCol*1.4,vec3(1.0),smoothstep(0.03,0.0,abs(d))),clamp(ra,0.0,1.0)); c.a=max(c.a,clamp(ra,0.0,1.0)); }
      gl_FragColor=c; }`,
    transparent: true, depthTest: false, depthWrite: false,
  }));
  overlay.frustumCulled = false; overlay.renderOrder = 999; scene.add(overlay);
  const OV = overlay.material.uniforms;

  // ---------- domain: INFINITE SANCTUM (a starry void sea under an eclipse, ringed by giant gates and rune halos) ----------
  // Everything here is built once on first use and reused; tinted by the equipped grimoire's colour.
  const NOISE_GLSL = `float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){return n2(p)*0.55+n2(p*2.1+3.7)*0.3+n2(p*4.3+1.3)*0.15;}`;
  const domeMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, op: { value: 0 }, crack: { value: 0 }, tint: { value: new THREE.Color(0x8a5cff) }, sunDir: { value: new THREE.Vector3(0, 0.4, -1).normalize() } },
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: `varying vec3 vP; uniform float t,op,crack; uniform vec3 tint,sunDir; ${NOISE_GLSL}
      vec2 vor(vec2 p){ vec2 i=floor(p),f=fract(p); float a=8.0,b=8.0; for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y)); vec2 o=vec2(h(i+g),h(i+g+17.0)); float d=length(g+o-f); if(d<a){b=a;a=d;}else if(d<b)b=d; } return vec2(a,b); }
      void main(){ vec3 d=normalize(vP); float lat=asin(clamp(d.y,-1.0,1.0)), lon=atan(d.z,d.x);
        float neb=fbm(vec2(lon*2.2+t*0.015,lat*3.0)); float neb2=fbm(vec2(lon*5.0-t*0.02,lat*6.0)+4.0);
        vec3 c=vec3(0.012,0.004,0.03)+tint*0.32*smoothstep(0.45,0.95,neb)*(0.4+0.6*neb2)+vec3(0.10,0.03,0.18)*smoothstep(0.5,0.9,neb2)*0.5;
        vec2 sg=vec2(lon*70.0,lat*70.0); vec2 gi=floor(sg); float st=step(0.986,h(gi))*smoothstep(0.45,0.05,length(fract(sg)-0.5))*(0.55+0.45*sin(t*3.0+h(gi+3.0)*40.0));
        vec2 sg2=vec2(lon*22.0,lat*22.0); vec2 gi2=floor(sg2); float st2=step(0.975,h(gi2+9.0))*smoothstep(0.3,0.0,length(fract(sg2)-0.5));
        c+=vec3(0.9,0.92,1.0)*(st*1.1+st2*1.4);
        float ang=acos(clamp(dot(d,normalize(sunDir)),-1.0,1.0));
        float disc=smoothstep(0.162,0.155,ang); float cor=smoothstep(0.55,0.16,ang); float rays=0.6+0.4*n2(vec2(atan(d.y-sunDir.y,d.x-sunDir.x)*6.0,t*0.4));
        c+=(tint*1.4+vec3(0.35,0.25,0.3))*cor*cor*rays*1.3; c+=vec3(1.0,0.95,0.9)*smoothstep(0.014,0.0,abs(ang-0.158))*2.0; c*=1.0-disc;
        c+=tint*0.55*smoothstep(0.22,0.0,abs(d.y+0.02));
        if(crack>0.0){ vec2 v=vor(vec2(lon*4.0,lat*6.0)); float e=smoothstep(0.08,0.0,v.y-v.x); c+=(vec3(1.0)+tint)*e*min(1.0,crack*3.0)*1.6; c*=1.0-0.5*crack; }
        gl_FragColor=vec4(c,op);} `,
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), domeMat); dome.visible = false; dome.renderOrder = -1; dome.frustumCulled = false; scene.add(dome);
  // seeded original rune glyphs (kanji-like strokes, made up)
  function runeGlyph(x, cx, cy, s, seed) {
    let k = seed * 9301 + 49297; const r = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
    x.lineCap = 'round'; x.lineJoin = 'round'; const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const kind = r(); x.lineWidth = s * (0.09 + r() * 0.05); x.beginPath();
      if (kind < 0.35) { const y = cy + (r() - 0.5) * s * 0.8; x.moveTo(cx - s * (0.2 + r() * 0.25), y); x.lineTo(cx + s * (0.2 + r() * 0.25), y + (r() - 0.5) * s * 0.1); }
      else if (kind < 0.65) { const xx = cx + (r() - 0.5) * s * 0.7; x.moveTo(xx, cy - s * (0.25 + r() * 0.2)); x.lineTo(xx + (r() - 0.5) * s * 0.1, cy + s * (0.25 + r() * 0.2)); }
      else if (kind < 0.85) { x.moveTo(cx + (r() - 0.5) * s * 0.6, cy - s * 0.4); x.quadraticCurveTo(cx, cy, cx + (r() - 0.5) * s * 0.8, cy + s * 0.42); }
      else { x.arc(cx + (r() - 0.5) * s * 0.4, cy + (r() - 0.5) * s * 0.4, s * (0.08 + r() * 0.1), 0, TAU); }
      x.stroke();
    }
  }
  let DW = null; // the domain world, built lazily
  function sigilTex() {
    return onceTex('sigil', 512, 512, (x) => {
      x.translate(256, 256); x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 8;
      for (const [r, w] of [[246, 6], [226, 3], [168, 4], [150, 2], [70, 3]]) { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); }
      for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, l = i % 6 ? 8 : 18; x.lineWidth = 2; x.beginPath(); x.moveTo(Math.cos(a) * 226, Math.sin(a) * 226); x.lineTo(Math.cos(a) * (226 - l), Math.sin(a) * (226 - l)); x.stroke(); }
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; x.save(); x.rotate(a); runeGlyph(x, 0, -197, 30, i + 3); x.restore(); }
      x.lineWidth = 3; x.beginPath(); for (let i = 0; i <= 7; i++) { const a = (i * 3 / 7) * TAU - Math.PI / 2; const px = Math.cos(a) * 150, py = Math.sin(a) * 150; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); // 7-point star
      x.lineWidth = 4; x.beginPath(); x.ellipse(0, 0, 54, 26, 0, 0, TAU); x.stroke(); x.beginPath(); x.arc(0, 0, 14, 0, TAU); x.fill();
    }, false);
  }
  function runeStripTex() {
    return onceTex('runestrip', 1024, 128, (x, w, h) => {
      x.strokeStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 6; x.lineWidth = 3;
      x.beginPath(); x.moveTo(0, 10); x.lineTo(w, 10); x.moveTo(0, h - 10); x.lineTo(w, h - 10); x.stroke();
      for (let i = 0; i < 12; i++) runeGlyph(x, (i + 0.5) * w / 12, h / 2, 70, i * 7 + 1);
    }, true);
  }
  const titleCache = new Map();
  function brushTitleTex(tint) {
    const key = new THREE.Color(tint).getHexString() + (document.fonts && document.fonts.check && document.fonts.check('80px Bangers') ? 'b' : '');
    if (titleCache.has(key)) return titleCache.get(key);
    const [c, x] = cvs(1024, 256); const col = '#' + new THREE.Color(tint).getHexString();
    let k = 7; const r = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
    // ink swash behind the name
    x.save(); x.translate(512, 158); x.rotate(-0.025);
    for (let i = 0; i < 26; i++) { x.globalAlpha = 0.07 + r() * 0.07; x.fillStyle = i % 3 ? col : '#120418'; x.beginPath(); x.ellipse((r() - 0.5) * 50, (r() - 0.5) * 16, 440 + r() * 50, 52 + r() * 18, 0, 0, TAU); x.fill(); }
    for (let i = 0; i < 90; i++) { x.globalAlpha = 0.25 + r() * 0.5; x.strokeStyle = r() < 0.75 ? col : '#ffffff'; x.lineWidth = 1 + r() * 4; const y = (r() - 0.5) * 100, x0 = -470 + r() * 80; x.beginPath(); x.moveTo(x0, y); x.bezierCurveTo(x0 + 300, y + (r() - 0.5) * 10, 200, y + (r() - 0.5) * 14, 480 - r() * 160, y + (r() - 0.5) * 12); x.stroke(); }
    x.restore(); x.globalAlpha = 1;
    // small subtitle
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 30px "Russo One", "Arial Black", sans-serif'; x.fillStyle = '#ffffff'; x.shadowColor = col; x.shadowBlur = 12;
    x.textAlign = 'right'; x.fillText('D O M A I N   E X P A N S I O N', 990, 30); x.shadowBlur = 0; x.fillRect(560, 28, 40, 3);
    // the name, slanted brush lettering
    const FONT = (n) => `${n}px Bangers, Impact, "Arial Black", sans-serif`, fit = (txt, n, w) => { x.font = FONT(n); const mw = x.measureText(txt).width; if (mw > w) { n = Math.floor(n * w / mw); x.font = FONT(n); } return n; };
    const ink = (txt, px, py, n, lw) => { x.save(); x.setTransform(1, 0, -0.16, 1, 0.16 * py, 0); x.lineJoin = 'round'; x.font = FONT(n);
      x.lineWidth = lw; x.strokeStyle = '#0a0410'; x.strokeText(txt, px, py); x.lineWidth = lw * 0.35; x.strokeStyle = col; x.strokeText(txt, px, py);
      const g = x.createLinearGradient(0, py - n * 0.45, 0, py + n * 0.45); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#fff4f0'); g.addColorStop(1, '#ffd0c8'); x.fillStyle = g; x.fillText(txt, px, py); x.restore(); };
    x.textAlign = 'left'; const n1 = fit('DOMAIN:', 58, 400); ink('DOMAIN:', 60, 74, n1, 12);
    x.textAlign = 'center'; const n2 = fit('INFINITE SANCTUM', 150, 940); ink('INFINITE SANCTUM', 520, 168, n2, 20);
    // dry-brush texture: gaps and speckles eaten out of the strokes, ink drops at the ends
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 26; i++) { x.globalAlpha = 0.5 + r() * 0.5; x.fillRect(r() * 1024, 102 + r() * 110, 30 + r() * 160, 1 + r() * 2.5); }
    for (let i = 0; i < 380; i++) { x.globalAlpha = 1; x.beginPath(); x.arc(r() * 1024, 92 + r() * 130, r() * 2.2, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    for (let i = 0; i < 30; i++) { x.fillStyle = r() < 0.5 ? col : '#ffffff'; x.beginPath(); const sd = r() < 0.5 ? -1 : 1; x.arc(512 + sd * (440 + r() * 70), 158 + (r() - 0.5) * 110, 1 + r() * 5, 0, TAU); x.fill(); }
    const t = ctex(c); titleCache.set(key, t); return t;
  }
  // screen-space brush title (bottom third; drawn in the 3D pass, so it is part of the cinematic)
  const titleQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, reveal: { value: 0 }, op: { value: 0 }, size: { value: new THREE.Vector2(0.9, 0.28) }, center: { value: new THREE.Vector2(0, -0.66) } },
    vertexShader: 'varying vec2 vUv; uniform vec2 size,center; void main(){ vUv=uv; gl_Position=vec4(center+position.xy*size,0.0,1.0);} ',
    fragmentShader: `varying vec2 vUv; uniform sampler2D map; uniform float reveal,op; ${NOISE_GLSL}
      void main(){ vec4 c=texture2D(map,vUv); float edge=reveal*1.25-0.12+(n2(vec2(vUv.y*9.0,reveal*3.0))-0.5)*0.12; float m=smoothstep(edge+0.04,edge-0.02,vUv.x);
        float glow=smoothstep(0.08,0.0,abs(vUv.x-edge))*step(0.02,c.a)*(1.0-step(1.0,reveal)); gl_FragColor=vec4(c.rgb+vec3(glow),c.a*m*op);} `,
    transparent: true, depthTest: false, depthWrite: false,
  }));
  titleQuad.frustumCulled = false; titleQuad.renderOrder = 1000; titleQuad.visible = false; scene.add(titleQuad);
  function buildDomainWorld() {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const tint = new THREE.Color(0x8a5cff);
    const floorMat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, op: { value: 1 }, unfold: { value: 0 }, tint: { value: tint } },
      vertexShader: 'varying vec2 vXY; void main(){ vXY=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: `varying vec2 vXY; uniform float t,op,unfold; uniform vec3 tint; ${NOISE_GLSL}
        void main(){ float r=length(vXY); if(r>unfold) discard; float a=atan(vXY.y,vXY.x);
          vec3 c=vec3(0.008,0.004,0.025)+tint*0.05*fbm(vXY*0.08+t*0.03);
          vec2 g=floor(vXY*1.6); c+=vec3(0.8,0.85,1.0)*step(0.988,h(g))*(0.35+0.65*sin(t*2.0+h(g+2.0)*30.0))*smoothstep(0.4,0.0,length(fract(vXY*1.6)-0.5));
          float rings=smoothstep(0.09,0.0,abs(r-7.0))+smoothstep(0.05,0.0,abs(r-7.8))+smoothstep(0.12,0.0,abs(r-21.5))+smoothstep(0.06,0.0,abs(r-23.0));
          float ticks=step(0.55,fract(a*36.0/6.2832+t*0.04))*smoothstep(0.35,0.0,abs(r-7.4))+step(0.7,fract(a*96.0/6.2832-t*0.02))*smoothstep(0.5,0.0,abs(r-22.25));
          float spokes=smoothstep(0.012,0.0,abs(fract(a*8.0/6.2832+0.5)-0.5)/max(r,1.0)*6.0)*smoothstep(7.8,9.0,r)*smoothstep(21.5,20.0,r)*0.35;
          float rip=smoothstep(0.06,0.0,abs(fract(r*0.07-t*0.45)-0.5)-0.44)*smoothstep(40.0,4.0,r)*0.5;
          c+=tint*(rings*1.6+ticks*0.9+spokes+rip);
          c+=(tint+vec3(0.6))*smoothstep(2.0,0.0,unfold-r)*step(unfold,58.0)*1.5;
          c=mix(c,vec3(0.01,0.0,0.02),smoothstep(28.0,58.0,r)*0.7);
          gl_FragColor=vec4(c,op);} `,
      transparent: true, depthWrite: true, fog: false,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(58, 64), floorMat); floor.rotation.x = -Math.PI / 2; floor.renderOrder = -1; g.add(floor);
    // giant gates: two pillars, a doubled lintel with upswept ends, a tie-beam, a rune plaque, crowned by a halo ring (original design)
    const B = (w, h, d, x, y, z, rz = 0) => [new THREE.BoxGeometry(w, h, d), xf([x, y, z], [0, 0, rz])];
    const body = mergeGeos([B(1.0, 11, 1.0, -3.8, 5.5, 0), B(1.0, 11, 1.0, 3.8, 5.5, 0), B(11.4, 0.8, 1.4, 0, 11.2, 0), B(1.6, 0.6, 1.4, -5.9, 11.45, 0, 0.22), B(1.6, 0.6, 1.4, 5.9, 11.45, 0, -0.22), B(9.4, 0.55, 0.8, 0, 9.4, 0), B(1.5, 1.9, 0.4, 0, 10.3, 0), B(1.5, 0.5, 1.5, -3.8, 0.25, 0), B(1.5, 0.5, 1.5, 3.8, 0.25, 0)]);
    const glow = mergeGeos([B(11.0, 0.14, 1.46, 0, 10.75, 0), B(1.1, 1.5, 0.46, 0, 10.3, 0), B(1.06, 0.18, 1.06, -3.8, 2.2, 0), B(1.06, 0.18, 1.06, 3.8, 2.2, 0), [new THREE.TorusGeometry(1.5, 0.16, 6, 28), xf([0, 13.6, 0])], [new THREE.TorusGeometry(0.9, 0.08, 6, 20), xf([0, 13.6, 0])]]);
    const NG = 8, bodyM = new THREE.InstancedMesh(body, new THREE.MeshToonMaterial({ color: 0x1a0d24, gradientMap: GRAD, emissive: 0x12061e }), NG), glowM = new THREE.InstancedMesh(glow, new THREE.MeshBasicMaterial({ color: tint, fog: false }), NG);
    bodyM.frustumCulled = glowM.frustumCulled = false; g.add(bodyM, glowM);
    // rune halos circling high above, and the sigil under Ren
    const strip = runeStripTex(); strip.repeat.set(-4, 1); // seen from inside: mirror so the runes read the right way
    const haloMat = new THREE.MeshBasicMaterial({ map: strip, color: tint, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const halo1 = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 3.2, 64, 1, true), haloMat), halo2 = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 2.2, 48, 1, true), haloMat);
    halo1.position.y = 16; halo2.position.y = 22; g.add(halo1, halo2);
    const sigMat = new THREE.MeshBasicMaterial({ map: sigilTex(), color: tint, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const sigil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sigMat); sigil.rotation.x = -Math.PI / 2; sigil.position.y = 0.06; g.add(sigil);
    // seal FX: a vertical sigil behind Ren and a glow at his hands (used before the world exists, so kept outside the group)
    const sealSig = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sigMat.clone()); sealSig.visible = false; scene.add(sealSig);
    const sealGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); sealGlow.visible = false; scene.add(sealGlow);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1);
    DW = { g, tint, floorMat, floor, bodyM, glowM, NG, halo1, halo2, haloMat, sigil, sigMat, sealSig, sealGlow,
      setGates(rise, sink, cx, cy, cz) {
        for (let i = 0; i < NG; i++) {
          const a = i / NG * TAU + Math.PI / NG, r = 25, k = sm((rise - i * 0.05) / 0.55);
          v.set(cx + Math.cos(a) * r, cy - 16 * (1 - k) - 16 * sink * sink + Math.sin(rise * 2 + i) * 0.0, cz + Math.sin(a) * r);
          q.setFromAxisAngle(_up, -a + Math.PI / 2); m4.compose(v, q, s1); bodyM.setMatrixAt(i, m4); glowM.setMatrixAt(i, m4);
        }
        bodyM.instanceMatrix.needsUpdate = true; glowM.instanceMatrix.needsUpdate = true;
      } };
    return DW;
  }
  const _up = new THREE.Vector3(0, 1, 0);

  // ---------- world state ----------
  let level = null; // { group, plats, blockers, gates, theme, ... }
  const levelGroup = new THREE.Group(); scene.add(levelGroup);
  let sky = null, petalColor = 0xffffff, ambientP = 0;
  const state = { screen: 'title', chapter: 0, time: 0, paused: false, fps: 60, combo: 0, comboT: 0, hits: 0, hitsTaken: 0, objective: null, boss: null, cp: 0, rush: false };
  let enemies = [], projectiles = [], pickups = [], npcs = [];
  let player = null;
  const input = { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0 };
  const pressed = { attack: false, jump: false, dodge: false, power: false, ultimate: false, lockOn: false, swapGrimoire: false };
  const held = { attack: false, jump: false, dodge: false, power: false, ultimate: false, lockOn: false, swapGrimoire: false };
  let settings = { cameraSensitivity: 1, difficulty: 'normal' };
  const D = () => DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
  // grimoire collection: ids in the order they were taken, the equipped one, per-grimoire cooldowns
  let grims = [], equipped = null; const gcd = {}; let castLock = 0;
  const GRIM = (id) => GRIMOIRES.find((g) => g.id === id);
  let allies = [], spells = [], dropFx = null, tokenGapT = 0, slotT = 0, atkSerial = 0;
  let cam = { yaw: 0, pitch: 0.28, dist: 6, shake: 0, fov: 55, mode: 'follow', shot: null, pos: new THREE.Vector3(0, 3, -6), look: new THREE.Vector3() };
  let hitStop = 0, timeScale = 1, slowT = 0, impact = 0, god = false, lockTarget = null, domainT = 0, flashT = 0;
  let powers = [];
  // part 2 passive powers (one per chapter 5-8): grimoire cooldowns, damage taken, aura gain, damage dealt
  const PASSIVE = { cd: () => (powers.includes('focus') ? 0.7 : 1), taken: () => (powers.includes('armor') ? 0.8 : 1), aura: () => (powers.includes('overflow') ? 1.35 : 1), dmg: () => (powers.includes('kakusei') ? 1.25 : 1) };
  let scene_ = null; // running story scene
  let triggers = [];
  let qMul = quality === 'low' ? 0.5 : 1;

  function sfx(name) { emit('sfx', { name }); }
  function setScreen(s) { state.screen = s; emit('screen', { screen: s }); }

  // ---------- sky ----------
  function makeSky(th) {
    const m = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(th.sky[0]) }, mid: { value: new THREE.Color(th.sky[1]) }, bot: { value: new THREE.Color(th.sky[2]) }, sunDir: { value: sun.position.clone().normalize() }, sunCol: { value: new THREE.Color(th.sun) }, stars: { value: th.stars }, t: { value: 0 }, storm: { value: th === THEMES[4] ? 1 : 0 } },
      vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww; }',
      fragmentShader: `varying vec3 vD; uniform vec3 top,mid,bot,sunCol,sunDir; uniform float stars,t,storm; float h(vec3 p){return fract(sin(dot(p,vec3(12.9,78.2,37.7)))*43758.5);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(12.9,78.2)))*43758.5),b=fract(sin(dot(i+vec2(1,0),vec2(12.9,78.2)))*43758.5),c=fract(sin(dot(i+vec2(0,1),vec2(12.9,78.2)))*43758.5),d=fract(sin(dot(i+vec2(1,1),vec2(12.9,78.2)))*43758.5);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
        void main(){ float y=vD.y; vec3 c = y>0.0 ? mix(bot, mix(mid, top, smoothstep(0.15,0.7,y)), smoothstep(0.0,0.15,y)) : bot*0.8;
        float s=max(dot(vD,normalize(sunDir)),0.0); c += sunCol*(pow(s,600.0)*2.0 + pow(s,12.0)*0.35);
        vec3 g=floor(vD*180.0); float st=step(0.996,h(g))*stars*smoothstep(0.05,0.4,y); c+=vec3(st);
        vec2 cp=vD.xz/(y+0.25)*2.0; float cl=n(cp+vec2(t*0.02,0.0))*0.6+n(cp*2.7)*0.4; float cm=smoothstep(0.55,0.8,cl)*smoothstep(0.0,0.25,y)*(1.0-stars*0.7);
        c=mix(c, mix(vec3(1.0), mid*0.6, storm*0.7), cm*0.55);
        gl_FragColor=vec4(c,1.0);} `,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const s = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), m); s.renderOrder = -2; s.frustumCulled = false; return s;
  }

  // ---------- level building ----------
  function clearLevel() {
    for (const e of enemies) { scene.remove(e.rig.root); if (e.shadow) scene.remove(e.shadow); if (e.rig.trail) scene.remove(e.rig.trail.m); } enemies = [];
    for (const p of projectiles) scene.remove(p.mesh); projectiles = [];
    for (const p of pickups) scene.remove(p.mesh); pickups = [];
    for (const n of npcs) scene.remove(n.root); npcs = [];
    for (const t of teles) { t.active = false; t.m.visible = false; }
    while (levelGroup.children.length) {
      const c = levelGroup.children.pop();
      c.traverse((o) => { if (o.geometry && !Object.values(G).includes(o.geometry) && !o.userData.outline) o.geometry.dispose(); });
    }
    if (sky) { scene.remove(sky); sky.geometry.dispose(); sky.material.dispose(); sky = null; }
    level = null; lockTarget = null; state.boss = null; state.objective = null; triggers = [];
    if (ultSeq) endUlt(); else if (DW) domainShow(false);
    dome.visible = false; domainT = 0; OV.tintAmt.value = 0;
  }
  function applyTheme(th) {
    sky = makeSky(th); scene.add(sky);
    scene.fog.color.set(th.fog); scene.fog.near = th.fogNear || 45; scene.fog.far = th.fogFar || 230;
    hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]); hemi.intensity = th.hemi[2];
    sun.color.set(th.sun); sun.intensity = th.sunI; petalColor = th.petals;
    renderer.setClearColor(th.fog);
  }
  function addPlat(L, x0, x1, z0, z1, y, opt = {}) {
    const th = L.theme, w = x1 - x0, d = z1 - z0, depth = opt.depth || 1.4;
    const g = new THREE.Group(); levelGroup.add(g);
    const tex = L.tex.clone(); tex.needsUpdate = true; tex.repeat.set(w / 8, d / 8);
    const top = new THREE.Mesh(G.box, toon(0xffffff, { map: tex })); top.scale.set(w, 0.3, d); top.position.set((x0 + x1) / 2, y - 0.15, (z0 + z1) / 2); g.add(top);
    const side = new THREE.Mesh(G.box, toon(th.side)); side.scale.set(w - 0.1, depth, d - 0.1); side.position.set((x0 + x1) / 2, y - 0.3 - depth / 2, (z0 + z1) / 2); g.add(side);
    const edge = new THREE.Mesh(G.box, toon(th.edge, L.id === 2 || L.id === 4 || th.glowEdge ? { em: th.edge, ei: 0.6 } : {})); edge.scale.set(w + 0.2, 0.12, d + 0.2); edge.position.set((x0 + x1) / 2, y - 0.27, (z0 + z1) / 2); g.add(edge);
    addOutline(top, OUT_PROP);
    L.plats.push({ type: 'rect', x0, x1, z0, z1, y });
  }
  function addCircle(L, cx, cz, r, y) {
    const tex = L.tex.clone(); tex.needsUpdate = true; tex.repeat.set(r / 4, r / 4);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 48), toon(0xffffff, { map: tex })); top.position.set(cx, y - 0.15, cz); levelGroup.add(top); addOutline(top, OUT_PROP);
    const side = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.1, r - 0.1, 1.4, 48), toon(L.theme.side)); side.position.set(cx, y - 1.0, cz); levelGroup.add(side);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.08, 6, 64), new THREE.MeshBasicMaterial({ color: L.theme.accent })); ring.rotation.x = -Math.PI / 2; ring.position.set(cx, y + 0.02, cz); levelGroup.add(ring);
    const ring2 = ring.clone(); ring2.scale.setScalar(0.4); ring2.position.y += 0.001; levelGroup.add(ring2);
    L.plats.push({ type: 'circle', cx, cz, r, y });
  }
  function addBlock(L, x0, x1, z0, z1, h, y = 0, visual = true) {
    L.blockers.push({ x0, x1, z0, z1 });
    if (!visual) return null;
    const w = x1 - x0, d = z1 - z0, cap = L.id === 2 ? 0x2ef2ff : 0xcfc3ad;
    const m = new THREE.Mesh(boxUV(w, h, d, 3, 3), toon(0xffffff, { map: wallTex(L.theme.wall) })); m.position.set((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2); levelGroup.add(m); addOutline(m, OUT_PROP);
    part(levelGroup, G.box, toon(cap, L.id === 2 ? { em: cap, ei: 0.5 } : {}), [(x0 + x1) / 2, y + h + 0.08, (z0 + z1) / 2], [w + 0.25, 0.16, d + 0.25], null, OUT_PROP);
    return m;
  }
  function wallTex(col) {
    const hx = '#' + col.toString(16).padStart(6, '0');
    return onceTex('wall' + hx, 128, 128, (x) => {
      x.fillStyle = shade(hx, 0.78); x.fillRect(0, 0, 128, 128);
      for (let r = 0; r < 4; r++) for (let i = -1; i < 3; i++) { const bx = i * 64 + (r % 2) * 32; x.fillStyle = shade(hx, rand(0.92, 1.06)); x.fillRect(bx + 2, r * 32 + 2, 60, 28); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(bx + 3, r * 32 + 3, 58, 3); }
    });
  }
  function addGate(L, z, x0, x1, y) {
    const b = { x0, x1, z0: z - 0.5, z1: z + 0.5, gate: true }; L.blockers.push(b);
    const m = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ color: L.theme.accent, transparent: true, opacity: 0.45, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.scale.set(x1 - x0, 4, 1); m.position.set((x0 + x1) / 2, y + 2, z); levelGroup.add(m);
    const gate = { b, m, open: false }; L.gates.push(gate); return gate;
  }
  function openGate(g) { if (!g || g.open) return; g.open = true; const i = level.blockers.indexOf(g.b); if (i >= 0) level.blockers.splice(i, 1); g.fade = 1; sfx('gate'); burst(g.m.position.x, g.m.position.y, g.m.position.z, 40, level.theme.accent, 8, 0.8, 0.4, 0); }

  function propTree(x, z, y, id) {
    const g = new THREE.Group(); g.position.set(x, y, z); levelGroup.add(g);
    if (id === 1 || id === 0) {
      part(g, G.cyl, toon(0x6a4a3a), [0, 1.2, 0], [0.25, 2.4, 0.25], null, OUT_PROP);
      for (const [a, b, c, r] of [[0, 3, 0, 1.6], [1, 2.6, 0.3, 1.1], [-1, 2.7, -0.2, 1.2], [0.2, 3.8, 0.4, 1.0]]) part(g, G.sphere, toon(0xffa8c8), [a, b, c], r, null, OUT_PROP);
    } else if (id === 3) {
      part(g, G.cyl, toon(0x5a3a2a), [0, 2, 0], [0.35, 4, 0.35], null, OUT_PROP);
      for (let i = 0; i < 4; i++) part(g, G.cone, toon(i % 2 ? 0x2f6a3a : 0x3a7a42), [0, 3 + i * 1.6, 0], [2.4 - i * 0.45, 2.6, 2.4 - i * 0.45], null, OUT_PROP);
    } else if (id === 2) {
      const h = rand(10, 40); const b = part(g, G.box, toon(0x1c1838), [0, -h / 2 - 6, 0], [rand(6, 10), h, rand(6, 10)], null, null);
    } else {
      // storm-peak crystal cluster growing out of a rock (planted on the ground)
      part(g, G.sphere, toon(0x5a5a80), [0, 0.1, 0], [1.1, 0.55, 1.0], null, OUT_PROP);
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + x, l = k ? rand(1.2, 2.0) : 3.0; part(g, G.oct, toon(0x9ff8ff, { em: 0x4ad8ff, ei: 0.8 }), [k ? Math.sin(a) * 0.45 : 0, l * 0.42, k ? Math.cos(a) * 0.45 : 0], [0.35, l, 0.35], [k ? Math.cos(a) * 0.35 : 0, a, k ? -Math.sin(a) * 0.35 : 0], OUT_PROP); }
    }
    return g;
  }
  function propLantern(x, z, y, col) {
    const g = new THREE.Group(); g.position.set(x, y, z); levelGroup.add(g);
    part(g, G.box, toon(0x8a8a90), [0, 0.5, 0], [0.3, 1, 0.3], null, OUT_PROP);
    part(g, G.box, toon(col, { em: col, ei: 1 }), [0, 1.2, 0], [0.45, 0.4, 0.45], null, OUT_PROP);
    part(g, G.cone, toon(0x5a5a64), [0, 1.6, 0], [0.45, 0.35, 0.45], [0, Math.PI / 4, 0], OUT_PROP);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })); s.position.y = 1.2; s.scale.setScalar(2.2); g.add(s);
  }
  function propGateArch(x, z, y, col) {
    const g = new THREE.Group(); g.position.set(x, y, z); levelGroup.add(g);
    const m = toon(col);
    part(g, G.cyl, m, [2.4, 2.5, 0], [0.25, 5, 0.25], null, OUT_PROP); part(g, G.cyl, m, [-2.4, 2.5, 0], [0.25, 5, 0.25], null, OUT_PROP);
    part(g, G.box, toon(0x2a2030), [0, 5.2, 0], [6.4, 0.35, 0.5], null, OUT_PROP); part(g, G.box, m, [0, 4.4, 0], [5.4, 0.25, 0.35], null, OUT_PROP);
  }
  function propBuilding(x, z, w, h, d, id) {
    const g = new THREE.Group(); g.position.set(x, 0, z); levelGroup.add(g);
    if (id === 1) {
      part(g, G.box, toon(0xf6f0e4), [0, h / 2, 0], [w, h, d], null, OUT_PROP);
      for (let i = 0; i < 2; i++) part(g, G.cone, toon(0x2a3a7a), [0, h + 0.8 + i * 2.2, 0], [w * 0.8 - i * 2, 2, d * 0.8 - i * 1.5], [0, Math.PI / 4, 0], OUT_PROP);
      for (let i = -2; i <= 2; i++) part(g, G.cyl, toon(0xd8343f), [i * w / 5, h / 2, d / 2 + 0.2], [0.25, h, 0.25], null, null);
      for (let i = -1; i <= 1; i++) part(g, G.box, toon(0x5ab0ff, { em: 0x204060, ei: 0.4 }), [i * w / 4, h * 0.65, d / 2 + 0.05], [1.2, 1.4, 0.1], null, null);
    } else if (id === 2) {
      const b = part(g, G.box, toon(0x221c44), [0, h / 2 - 0.5, 0], [w, h, d], null, null);
      const tex = winTex(); tex.repeat.set(w / 3, h / 3);
      const f = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: tex, fog: true })); f.scale.set(w, h, 1); f.position.set(0, h / 2 - 0.5, d / 2 + 0.05); g.add(f);
      const f2 = f.clone(); f2.rotation.y = Math.PI; f2.position.z = -d / 2 - 0.05; g.add(f2);
    } else if (id === 3) {
      part(g, G.box, toon(0x8a3a2a), [0, h / 2, 0], [w, h, d], null, OUT_PROP);
      part(g, G.cone, toon(0x2a2a3a), [0, h + 1.2, 0], [w * 0.85, 2.6, d * 0.85], [0, Math.PI / 4, 0], OUT_PROP);
    }
    return g;
  }
  let _win = null;
  function winTex() { if (!_win) { const [c, x] = cvs(64, 64); x.fillStyle = '#1c1838'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = Math.random() < 0.6 ? ['#ffd27a', '#7cf8ff', '#ff7ad8'][Math.floor(rand(0, 3))] : '#2a2650'; x.fillRect(8 + i * 32, 8 + j * 32, 18, 14); } _win = ctex(c, [1, 1]); } const t = _win.clone(); t.needsUpdate = true; return t; }
  function neonSign(x, y, z, ry, text, col) {
    const [c, g] = cvs(256, 96); g.fillStyle = 'rgba(10,0,30,0.85)'; g.fillRect(0, 0, 256, 96); g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(6, 6, 244, 84); g.font = '900 52px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 16; g.fillStyle = '#fff'; g.fillText(text, 128, 50);
    const m = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: ctex(c), side: THREE.DoubleSide })); m.scale.set(5, 1.9, 1); m.position.set(x, y, z); m.rotation.y = ry; levelGroup.add(m);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.5, depthWrite: false })); s.position.set(x, y, z); s.scale.set(9, 4.5, 1); levelGroup.add(s);
  }

  // ---------- scenery toolkit: merged batches, canvas textures made once, academy architecture, mountains ----------
  const texCache = new Map();
  function onceTex(key, w, h, draw, rep = true) { let t = texCache.get(key); if (!t) { const [c, x] = cvs(w, h); draw(x, w, h); t = ctex(c); if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; texCache.set(key, t); } return t; }
  const hexRGB = (h) => { const v = typeof h === 'number' ? h : parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const shade = (h, k, a = 1) => { const [r, g, b] = hexRGB(h); return `rgba(${clamp(r * k, 0, 255) | 0},${clamp(g * k, 0, 255) | 0},${clamp(b * k, 0, 255) | 0},${a})`; };
  // level batch: collect [geo, matrix] per material, then merge into one mesh per material
  function lvBatch() {
    const m = new Map();
    return {
      add(mat, geo, mtx) { if (!m.has(mat)) m.set(mat, []); m.get(mat).push([geo, mtx || null]); },
      flush(outline = OUT_PROP, parent = levelGroup) { const out = []; for (const [mat, list] of m) { const mesh = new THREE.Mesh(mergeGeos(list), mat); parent.add(mesh); if (outline && !mat.userData.noOutline) addOutline(mesh, outline); out.push(mesh); } m.clear(); return out; },
    };
  }
  // box with UVs in world units / tile size so tiled textures keep their scale
  function boxUV(w, h, d, tu = 4, tv = 4) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tu, uv.getY(k) * dims[f][1] / tv); }
    return g;
  }
  function planeUV(w, d, tu, tv) { const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tu, uv.getY(i) * d / tv); return g; }
  const HIP = new THREE.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4); // square hip roof, half-width 0.707
  const CONE8 = new THREE.ConeGeometry(1, 1, 8, 1), CYL12 = new THREE.CylinderGeometry(1, 1, 1, 12), PEAK = new THREE.ConeGeometry(1, 1, 7, 1);
  // stone wall with arched academy windows (one 4x4 m tile)
  function facadeTex(base = '#f3ead8') {
    return onceTex('facade' + base, 256, 256, (x, W) => {
      x.fillStyle = base; x.fillRect(0, 0, W, W);
      x.strokeStyle = shade(base, 0.84); x.lineWidth = 2; for (let r = 0; r < 8; r++) { const y = r * 32; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); for (let i = 0; i < 4; i++) { const xx = i * 64 + (r % 2) * 32; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 32); x.stroke(); } }
      for (let i = 0; i < 60; i++) { x.fillStyle = shade(base, rand(0.86, 1.06), 0.35); x.fillRect(rand(0, W), rand(0, W), rand(4, 18), rand(3, 10)); }
      x.fillStyle = shade(base, 0.72); x.fillRect(0, 0, W, 12); x.fillRect(0, 228, W, 10);
      const wx = 128, top = 56, bw = 34, bot = 196;
      x.fillStyle = '#fff8ea'; x.beginPath(); x.moveTo(wx - bw - 8, bot + 6); x.lineTo(wx - bw - 8, top + 6); x.arc(wx, top + 6, bw + 8, Math.PI, 0); x.lineTo(wx + bw + 8, bot + 6); x.fill();
      const g = x.createLinearGradient(0, top - bw, 0, bot); g.addColorStop(0, '#9fd8ff'); g.addColorStop(0.5, '#3a78c8'); g.addColorStop(1, '#1f3f7a');
      x.fillStyle = g; x.beginPath(); x.moveTo(wx - bw, bot); x.lineTo(wx - bw, top + 6); x.arc(wx, top + 6, bw, Math.PI, 0); x.lineTo(wx + bw, bot); x.fill();
      x.strokeStyle = '#fff8ea'; x.lineWidth = 4; x.beginPath(); x.moveTo(wx, top - bw + 6); x.lineTo(wx, bot); x.moveTo(wx - bw, 120); x.lineTo(wx + bw, 120); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.45)'; x.beginPath(); x.moveTo(wx - bw + 6, 150); x.lineTo(wx - 8, 70); x.lineTo(wx - 2, 70); x.lineTo(wx - bw + 12, 160); x.fill();
      x.fillStyle = shade(base, 0.7); x.fillRect(wx - bw - 12, bot + 4, 2 * bw + 24, 8);
    });
  }
  function bannerTex() {
    return onceTex('banner', 128, 256, (x) => {
      x.clearRect(0, 0, 128, 256); x.fillStyle = '#1f2a66'; x.beginPath(); x.moveTo(0, 0); x.lineTo(128, 0); x.lineTo(128, 236); x.lineTo(64, 200); x.lineTo(0, 236); x.closePath(); x.fill();
      x.strokeStyle = '#f2c14e'; x.lineWidth = 6; x.beginPath(); x.moveTo(8, 4); x.lineTo(8, 222); x.lineTo(64, 192); x.lineTo(120, 222); x.lineTo(120, 4); x.stroke();
      x.fillStyle = '#d8343f'; x.fillRect(8, 18, 112, 14);
      // original academy crest: a rising star inside a ring
      x.strokeStyle = '#f2c14e'; x.lineWidth = 5; x.beginPath(); x.arc(64, 108, 34, 0, TAU); x.stroke();
      x.fillStyle = '#f6efe0'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 26; x.lineTo(64 + Math.cos(a) * r, 108 + Math.sin(a) * r); } x.fill();
    }, false);
  }
  function stripBase(x, col, inset) {
    x.clearRect(0, 0, 128, 256); x.fillStyle = col; x.fillRect(inset + 6, 0, 116 - 2 * inset, 256);
    for (let y = 0; y < 256; y += 5) for (const s of [-1, 1]) { const r = rand(5, 10), cx = 64 + s * (58 - inset - rand(0, 6)); for (const dy of [0, -256, 256]) { x.beginPath(); x.arc(cx, y + dy, r, 0, TAU); x.fill(); } }
  }
  function grassTex() {
    return onceTex('grass', 128, 256, (x) => {
      stripBase(x, '#6fb04e', 12);
      for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${70 + rand(0, 40) | 0},${140 + rand(0, 50) | 0},${60 + rand(0, 30) | 0},0.6)`; x.beginPath(); x.ellipse(rand(26, 102), rand(0, 256), rand(6, 16), rand(4, 9), 0, 0, TAU); x.fill(); }
      for (let i = 0; i < 260; i++) { const xx = rand(14, 114), y = rand(0, 256), h = rand(4, 10); x.strokeStyle = Math.random() < 0.5 ? '#3f8a3a' : '#9ad86a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx + rand(-3, 3), y - h); x.stroke(); }
      for (let i = 0; i < 18; i++) { x.fillStyle = ['#ffd2e6', '#fff6a8', '#ffffff'][i % 3]; x.beginPath(); x.arc(rand(20, 108), rand(0, 256), 2.4, 0, TAU); x.fill(); }
    });
  }
  function pathTex() {
    return onceTex('path', 128, 256, (x) => {
      stripBase(x, '#dcc8a2', 10);
      for (let i = 0; i < 30; i++) { x.fillStyle = shade('#dcc8a2', rand(0.93, 1.05), 0.5); x.beginPath(); x.ellipse(rand(24, 104), rand(0, 256), rand(6, 14), rand(4, 8), 0, 0, TAU); x.fill(); }
      for (let i = 0; i < 70; i++) { x.fillStyle = shade('#a8957a', rand(0.8, 1.2), 0.8); x.beginPath(); x.ellipse(rand(18, 110), rand(0, 256), rand(1.5, 4), rand(1, 3), rand(0, 3), 0, TAU); x.fill(); }
    });
  }
  const decalMats = new Map();
  function decalMat(tex) { let m = decalMats.get(tex); if (!m) { m = new THREE.MeshToonMaterial({ map: tex, gradientMap: GRAD, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); m.userData.noOutline = true; decalMats.set(tex, m); } return m; }
  // strips lying on the floor (worn path, grass borders); tex tiles 4 m along the strip
  function floorStrip(B, mat, x0, x1, z0, z1, y) { B.add(mat, planeUV(x1 - x0, z1 - z0, x1 - x0, 4), xf([(x0 + x1) / 2, y + 0.015, (z0 + z1) / 2])); }
  // academy hall (front faces -Z when ry = 0)
  function academyHall(B, x, z, w, h, d, o = {}) {
    const ry = o.ry || 0, M = new THREE.Matrix4().makeRotationY(ry).setPosition(x, o.y || 0, z), at = (p, r, s) => new THREE.Matrix4().multiplyMatrices(M, xf(p, r, s));
    const wall = toon(0xffffff, { map: facadeTex() }), stone = toon(0xcfc3ad), roof = toon(o.roof || 0x2a3a7a), red = toon(0xd8343f), gold = toon(0xf2c14e, { em: 0x3a2800, ei: 1 }), dark = toon(0x3a2436);
    B.add(stone, G.box, at([0, 0.6, 0], null, [w + 1.2, 1.2, d + 1.2]));
    B.add(wall, boxUV(w, h, d), at([0, 1.2 + h / 2, 0]));
    B.add(stone, G.box, at([0, 1.2 + h + 0.3, 0], null, [w + 0.8, 0.6, d + 0.8]));
    const rh = Math.min(w, d) * 0.42;
    B.add(roof, HIP, at([0, 1.8 + h + rh / 2, 0], null, [(w / 2 + 1.6) / 0.707, rh, (d / 2 + 1.6) / 0.707]));
    B.add(gold, CONE8, at([0, 1.8 + h + rh + 0.6, 0], null, [0.35, 1.6, 0.35]));
    const n = Math.max(2, Math.round(w / 5));
    for (let i = 0; i <= n; i++) B.add(red, CYL12, at([-w / 2 + i * w / n, 1.2 + h / 2, -d / 2 - 0.5], null, [0.32, h, 0.32]));
    if (o.door !== false) { B.add(dark, G.box, at([0, 1.2 + 2.2, -d / 2 - 0.05], null, [3.2, 4.4, 0.3])); for (let i = 0; i < 3; i++) B.add(stone, G.box, at([0, 0.2 + i * 0.4, -d / 2 - 1.4 - (2 - i) * 0.8], null, [6, 0.4, 1.6 + (2 - i) * 1.6])); }
    if (o.towers) for (const s of [-1, 1]) {
      const th = h * 1.7, r = Math.min(4, d * 0.28);
      B.add(wall, boxUV(r * 2, th, r * 2), at([s * (w / 2 + r * 0.6), 1.2 + th / 2, -d / 2 + r]));
      B.add(stone, G.box, at([s * (w / 2 + r * 0.6), 1.2 + th + 0.3, -d / 2 + r], null, [r * 2 + 0.8, 0.6, r * 2 + 0.8]));
      B.add(roof, CONE8, at([s * (w / 2 + r * 0.6), 1.8 + th + r * 1.3, -d / 2 + r], [0, Math.PI / 8, 0], [r * 1.35, r * 2.6, r * 1.35]));
      B.add(gold, CONE8, at([s * (w / 2 + r * 0.6), 1.8 + th + r * 2.6 + 0.6, -d / 2 + r], null, [0.3, 1.4, 0.3]));
    }
    if (o.clock) {
      const ch = h * 2.1, cw = Math.min(10, w * 0.28);
      B.add(wall, boxUV(cw, ch, cw), at([0, 1.2 + ch / 2, 0]));
      B.add(stone, G.box, at([0, 1.2 + ch + 0.3, 0], null, [cw + 0.8, 0.6, cw + 0.8]));
      B.add(roof, HIP, at([0, 1.8 + ch + cw * 0.55, 0], null, [(cw / 2 + 1) / 0.707, cw * 1.1, (cw / 2 + 1) / 0.707]));
      B.add(gold, CONE8, at([0, 1.8 + ch + cw * 1.1 + 1, 0], null, [0.4, 2.2, 0.4]));
      B.add(gold, CYL12, at([0, 1.2 + ch - cw * 0.45, -cw / 2 - 0.15], [Math.PI / 2, 0, 0], [cw * 0.32, 0.3, cw * 0.32]));
      B.add(toon(0xfff8ea), CYL12, at([0, 1.2 + ch - cw * 0.45, -cw / 2 - 0.35], [Math.PI / 2, 0, 0], [cw * 0.26, 0.2, cw * 0.26]));
      B.add(dark, G.box, at([0, 1.2 + ch - cw * 0.45 + cw * 0.09, -cw / 2 - 0.5], [0, 0, 0.3], [0.25, cw * 0.2, 0.1]));
      B.add(dark, G.box, at([cw * 0.06, 1.2 + ch - cw * 0.45, -cw / 2 - 0.5], [0, 0, -1.2], [0.25, cw * 0.14, 0.1]));
    }
  }
  // distant mountain ring (no fog: colours are pre-hazed) plus a soft haze band in front of it
  function mountainRing(cx, cz, r0, r1, n, rock, snow, haze) {
    const B = lvBatch(), rm = new THREE.MeshToonMaterial({ color: rock, gradientMap: GRAD, fog: false }), sm2 = new THREE.MeshToonMaterial({ color: snow, gradientMap: GRAD, fog: false });
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + rand(-0.06, 0.06), r = rand(r0, r1), h = rand(55, 125), w = rand(45, 85), y0 = -12, ry = rand(0, TAU);
      const px = cx + Math.sin(a) * r, pz = cz + Math.cos(a) * r;
      B.add(rm, PEAK, xf([px, y0 + h / 2, pz], [0, ry, 0], [w, h, w * 0.8]));
      if (snow != null) B.add(sm2, PEAK, xf([px, y0 + h - h * 0.15 + 0.4, pz], [0, ry, 0], [w * 0.31, h * 0.3, w * 0.31 * 0.8]));
    }
    B.flush(null);
    const [c, x] = cvs(4, 64), [hr, hg, hb] = hexRGB(haze), g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, `rgba(${hr},${hg},${hb},0)`); g.addColorStop(0.55, `rgba(${hr},${hg},${hb},0.55)`); g.addColorStop(1, `rgba(${hr},${hg},${hb},0.95)`); x.fillStyle = g; x.fillRect(0, 0, 4, 64);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r0 - 25, r0 - 25, 90, 48, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, side: THREE.BackSide, fog: false }));
    band.position.set(cx, 20, cz); band.renderOrder = -1; levelGroup.add(band);
  }
  // ---------- solid ground to the horizon ----------
  // Terrain hugs every platform (sits just under its top, so plazas read as paved terraces on the ground) and rolls into hills away from the route.
  const TERRAIN = {
    0: { cols: [0x4a3a6e, 0x5a4680, 0x3a2c58], rock: 0x6a5a8a, amp: 7, slope: 0.035 },
    1: { cols: [0x7cc45e, 0x68b050, 0x8ad06a], rock: 0x9a9a8a, amp: 9, slope: 0.04 },
    2: { cols: [0x2a2842, 0x24223a, 0x30304a], rock: 0x3a3858, amp: 0, slope: 0 },
    3: { cols: [0x5f8a3a, 0x4f7a32, 0x7a7a3a], rock: 0x7a6a5a, amp: 13, slope: 0.05 },
    4: { cols: [0x6a6e98, 0x5a5e88, 0x7a7eaa], rock: 0x8a8cb8, amp: 16, slope: 0.07 },
    5: { cols: [0xe8c88a, 0xdcb478, 0xf2d6a0], rock: 0xc8985e, amp: 14, slope: 0.05 },
    6: { cols: [0xf2f6fc, 0xe0e8f4, 0xd2dcee], rock: 0xb0c0d8, amp: 18, slope: 0.09 },
    7: { cols: [0x3e3660, 0x322c50, 0x4a4070], rock: 0x241e3a, amp: 12, slope: 0.13 },
    8: { cols: [0x3a2e40, 0x30263a, 0x45384c], rock: 0x1e1622, amp: 10, slope: 0.045 },
  };
  function terrainNoise(x, z) { return Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 + 0.4) * 0.55 + Math.sin(x * 0.047 + z * 0.031 + 2.1) * 0.3 + Math.sin(z * 0.063 - x * 0.012) * 0.15; }
  function terrainH(L, x, z) {
    const T = TERRAIN[L.id] || TERRAIN[1]; let wsum = 0, ysum = 0, dmin = 1e9;
    for (const p of L.plats.concat(L.pads || [])) {
      const d = p.type === 'circle' ? Math.max(0, Math.hypot(x - p.cx, z - p.cz) - p.r) : Math.hypot(Math.max(p.x0 - x, 0, x - p.x1), Math.max(p.z0 - z, 0, z - p.z1));
      const w = 1 / (d + 0.5) ** 3; wsum += w; ysum += w * p.y; if (d < dmin) dmin = d;
    }
    const yb = wsum ? ysum / wsum : 0, k = sm((dmin - 2.5) / 45);
    return yb - 0.22 + k * (T.amp * (0.6 + 0.5 * terrainNoise(x, z)) + Math.min(dmin, 260) * T.slope);
  }
  function addTerrain(L) {
    const T = TERRAIN[L.id] || TERRAIN[1], N = 150, R = 520, cz = 80, pos = [], col = [], idx = [], c = new THREE.Color(), cols = T.cols.map((h) => new THREE.Color(h)), rock = new THREE.Color(T.rock);
    const warp = (u) => Math.sign(u) * Math.abs(u) ** 1.7 * R;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = warp(i / N * 2 - 1), z = cz + warp(j / N * 2 - 1), y = terrainH(L, x, z), n = terrainNoise(x * 3.1 + 7, z * 2.7 - 3);
      pos.push(x, y, z);
      c.copy(cols[0]).lerp(n > 0 ? cols[1] : cols[2], Math.abs(n) * 0.9);
      if (T.amp) c.lerp(rock, clamp((y - 9) / 14, 0, 0.8));
      col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, d = a + N + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD })); m.userData.terrain = true; levelGroup.add(m);
    return m;
  }
  // boulders and rock clusters sitting on (and sunk into) the terrain, away from the route
  function terrainRocks(L, n, col, minD = 22) {
    const B = lvBatch(), mat = toon(col), rk = cachedGeo('rock', () => new THREE.DodecahedronGeometry(1, 0));
    for (let i = 0; i < n; i++) {
      const sd = i % 2 ? 1 : -1, x = sd * rand(minD, 120), z = rand(-60, 240), y = terrainH(L, x, z), sc = rand(1.2, 4.5);
      B.add(mat, rk, xf([x, y + sc * 0.25, z], [rand(0, 3), rand(0, 3), rand(0, 3)], [sc, sc * rand(0.6, 1), sc * rand(0.8, 1.2)]));
      if (i % 3 === 0) B.add(mat, rk, xf([x + sc, y + sc * 0.1, z + rand(-1, 1) * sc], [rand(0, 3), rand(0, 3), 0], sc * 0.5));
    }
    B.flush();
  }
  // a low stone balustrade around the arena (round posts keep people on the ring) with an opening towards the route
  function arenaRim(L, cx, cz, r, y, col) {
    const B = lvBatch(), stone = toon(col), N = 56;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, x = cx + Math.sin(a) * (r + 0.6), z = cz + Math.cos(a) * (r + 0.6);
      if (Math.abs(x) < 14.6 && z < cz) continue;
      B.add(stone, CYL12, xf([x, y + 0.45, z], null, [0.32, 0.9, 0.32]));
      const a2 = (i + 0.5) / N * TAU, x2 = cx + Math.sin(a2) * (r + 0.6), z2 = cz + Math.cos(a2) * (r + 0.6);
      if (!(Math.abs(x2) < 14.6 && z2 < cz)) B.add(stone, G.box, xf([x2, y + 0.82, z2], [0, a2, 0], [2.4, 0.16, 0.4]));
      addSolid(L, x, z, 1.25, y - 0.5, 4);
    }
    B.flush();
  }
  // a crystal cluster growing out of the ground (no hovering)
  function crystalCluster(B, x, y, z, s, mat) {
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + s, l = k ? rand(0.8, 1.6) : 2.4; B.add(mat, G.oct, xf([x + (k ? Math.sin(a) * 0.5 : 0) * s, y + l * 0.45 * s, z + (k ? Math.cos(a) * 0.5 : 0) * s], [k ? Math.cos(a) * 0.4 : 0, a, k ? -Math.sin(a) * 0.4 : 0], [0.32 * s, l * s, 0.32 * s])); }
  }
  // round obstacles you slide around instead of getting stuck on
  function addSolid(L, x, z, r, y = 0, h = 3) { (L.solids = L.solids || []).push({ x, z, r, y, h }); }
  function courtyardProps(L, B, y, z0, z1, xw) {
    const wood = toon(0x8a5a3a), wood2 = toon(0x6a4430), straw = toon(0xe8c878), red = toon(0xd8343f), stone = toon(0xd8ccb8), white = toon(0xf6efe0);
    // benches against the grass borders
    for (let z = z0 + 6; z < z1 - 4; z += 12) for (const s of [-1, 1]) {
      const bx = s * (xw - 1.6), m = (p, sc) => xf([bx + p[0] * s, y + p[1], z + p[2]], [0, s * Math.PI / 2, 0], sc);
      B.add(wood, G.box, m([0, 0.48, 0], [2.2, 0.1, 0.55])); B.add(wood, G.box, m([0.24, 0.8, 0], [2.2, 0.4, 0.08]));
      for (const lx of [-0.9, 0.9]) B.add(wood2, G.box, xf([bx, y + 0.24, z + lx], null, [0.5, 0.48, 0.1]));
    }
    // training dummies
    for (const [dx, dz] of [[-7.5, z0 + 9], [7.5, z0 + 15], [-7.5, z0 + 27]]) {
      const px = dx, pz = dz;
      B.add(wood2, CYL12, xf([px, y + 0.9, pz], null, [0.09, 1.8, 0.09]));
      B.add(straw, CYL12, xf([px, y + 1.25, pz], null, [0.28, 0.8, 0.28]));
      B.add(wood2, CYL12, xf([px, y + 1.45, pz], [0, 0, Math.PI / 2], [0.06, 1.3, 0.06]));
      B.add(straw, G.sphere, xf([px, y + 1.9, pz], null, [0.2, 0.22, 0.2]));
      B.add(red, CYL12, xf([px, y + 1.3, pz - 0.27], [Math.PI / 2, 0, 0], [0.16, 0.04, 0.16]));
      B.add(white, CYL12, xf([px, y + 1.3, pz - 0.29], [Math.PI / 2, 0, 0], [0.09, 0.04, 0.09]));
      B.add(stone, CYL12, xf([px, y + 0.08, pz], null, [0.4, 0.16, 0.4]));
      addSolid(L, px, pz, 0.45, y);
    }
  }
  function fountain(L, B, x, z, y) {
    const stone = toon(0xe6dccb), stone2 = toon(0xbfb29c), gold = toon(0xf2c14e, { em: 0x3a2800, ei: 1 });
    B.add(stone, loft([[0, 2.3, 2.3], [0.55, 2.3, 2.3], [0.6, 2.15, 2.15], [0.55, 2.0, 2.0], [0.25, 2.0, 2.0], [0.25, 0.004, 0.004]], 32), xf([x, y, z]));
    B.add(stone2, CYL12, xf([x, y + 1.0, z], null, [0.45, 2.0, 0.45]));
    B.add(stone, loft([[0, 0.004, 0.004], [0, 1.0, 1.0], [0.25, 1.05, 1.05], [0.3, 0.9, 0.9], [0.12, 0.85, 0.85], [0.12, 0.004, 0.004]], 24), xf([x, y + 1.9, z]));
    B.add(gold, CONE8, xf([x, y + 2.5, z], null, [0.18, 0.7, 0.18]));
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.98, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.8 })); water.position.set(x, y + 0.45, z); levelGroup.add(water);
    const top = water.clone(); top.scale.setScalar(0.43); top.position.y = y + 2.15; levelGroup.add(top);
    const spray = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xbfeaff, transparent: true, opacity: 0.6, depthWrite: false })); spray.position.set(x, y + 2.6, z); spray.scale.set(1.6, 2.2, 1); levelGroup.add(spray);
    addSolid(L, x, z, 2.35, y, 1);
  }
  function wallBanners(B, xs, y, z0, z1, step) {
    const m = new THREE.MeshToonMaterial({ map: bannerTex(), gradientMap: GRAD, alphaTest: 0.5, side: THREE.DoubleSide }); m.userData.noOutline = true;
    const pole = toon(0x3a2a24), gold = toon(0xf2c14e);
    for (let z = z0; z <= z1; z += step) for (const x of xs) {
      const s = Math.sign(x);
      B.add(m, new THREE.PlaneGeometry(1.3, 2.6), xf([x - s * 0.08, y + 2.6, z], [0, -s * Math.PI / 2, 0]));
      B.add(pole, CYL12, xf([x - s * 0.1, y + 3.95, z], [Math.PI / 2, 0, 0], [0.05, 1.6, 0.05]));
      B.add(gold, G.sphere, xf([x - s * 0.1, y + 3.95, z - 0.82], null, 0.08)); B.add(gold, G.sphere, xf([x - s * 0.1, y + 3.95, z + 0.82], null, 0.08));
    }
  }

  // ---------- part 2 levels (chapters 5-8): same walkable route, new places. Everything stands on the terrain. ----------
  function palm(B, x, z, y, mats) {
    const [trunk, leaf] = mats, lean = rand(-0.25, 0.25), h = rand(5, 7.5);
    for (let k = 0; k < 4; k++) B.add(trunk, CYL12, xf([x + Math.sin(lean) * k * h / 4, y + (k + 0.5) * h / 4, z], [0, 0, -lean], [0.22 - k * 0.03, h / 4 + 0.1, 0.22 - k * 0.03]));
    const tx = x + Math.sin(lean) * h, ty = y + h;
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + x; B.add(leaf, G.box, xf([tx + Math.sin(a) * 1.2, ty - 0.35, z + Math.cos(a) * 1.2], [0.45, a, 0], [0.5, 0.08, 2.6])); }
  }
  function pine(B, x, z, y, mats, s = 1) {
    const [trunk, green, snow] = mats;
    B.add(trunk, CYL12, xf([x, y + 0.8 * s, z], null, [0.22 * s, 1.6 * s, 0.22 * s]));
    for (let k = 0; k < 3; k++) { const r = (2.0 - k * 0.5) * s, cy = y + (1.8 + k * 1.3) * s; B.add(green, CONE8, xf([x, cy, z], null, [r, 2.2 * s, r])); if (snow) B.add(snow, CONE8, xf([x, cy + 0.55 * s, z], null, [r * 0.62, 1.1 * s, r * 0.62])); }
  }
  function hut(L, B, x, z, w, d, ry, mats) {
    const [wall, roof, snow, win] = mats, y = terrainH(L, x, z) - 0.3, h = 3.2;
    const m = (p, sc, r2) => { const c = Math.cos(ry), sn = Math.sin(ry); return xf([x + p[0] * c + p[2] * sn, y + p[1], z - p[0] * sn + p[2] * c], [r2 ? r2[0] : 0, ry + (r2 ? r2[1] : 0), 0], sc); };
    B.add(wall, G.box, m([0, h / 2, 0], [w, h, d]));
    B.add(roof, HIP, m([0, h + 1.2, 0], [w * 0.9, 2.4, d * 0.9]));
    if (snow) B.add(snow, HIP, m([0, h + 1.75, 0], [w * 0.62, 1.4, d * 0.62]));
    for (const sx of [-0.25, 0.25]) B.add(win, G.box, m([sx * w, h * 0.55, d / 2 + 0.02], [0.9, 0.9, 0.08]));
    addSolid(L, x, z, Math.max(w, d) * 0.6, y, h);
  }
  function spire(B, x, z, y, w, h, mats) {
    const [stone, roof, glow] = mats;
    B.add(stone, G.box, xf([x, y + h / 2, z], null, [w, h, w]));
    B.add(roof, CONE8, xf([x, y + h + w * 1.1, z], [0, Math.PI / 8, 0], [w * 0.78, w * 2.4, w * 0.78]));
    for (let k = 1; k < h / 4; k++) for (const s of [-1, 1]) B.add(glow, G.box, xf([x + s * w * 0.2, y + k * 4, z - w / 2 - 0.02], null, [w * 0.14, 1.3, 0.1]));
  }
  function buildLevelP2(L, id) {
    const B = lvBatch(), th = L.theme;
    if (id === 5) {
      // Desert Ruins: broken sandstone columns, obelisks, palms, and a great pyramid temple behind the arena
      const sand = toon(0xe0bc80), sand2 = toon(0xc89a5a), dark = toon(0x8a6236), gold = toon(0xf2c14e, { em: 0x3a2800, ei: 1 }), trunk = toon(0x8a6a3a), leaf = toon(0x4a9a3a);
      for (const z of [6, 20, 34, 84, 100, 114]) for (const sx of [-1, 1]) {
        const y = z > 70 ? 1 : 0, x = sx * (z > 70 ? 12.2 : 10.4), h = (z * 7 + sx * 3) % 3 === 0 ? 4.2 : rand(1.4, 3.2);
        B.add(sand, CYL12, xf([x, y + h / 2, z], null, [0.55, h, 0.55])); B.add(sand2, G.box, xf([x, y + 0.15, z], null, [1.4, 0.3, 1.4]));
        if (h > 4) B.add(sand2, G.box, xf([x, y + h + 0.15, z], null, [1.4, 0.3, 1.4])); else B.add(sand, G.box, xf([x + sx * 1.2, y + 0.3, z + rand(-1, 1)], [0, rand(0, 3), Math.PI / 2], [0.5, 1.6, 0.5]));
        addSolid(L, x, z, 0.8, y);
      }
      for (let i = 0; i < 10; i++) { const sx = i % 2 ? 1 : -1, x = sx * rand(19, 44), z = rand(-10, 200), y = terrainH(L, x, z) - 0.4, h = rand(7, 13); B.add(sand2, G.box, xf([x, y + h / 2, z], null, [1.4, h, 1.4])); B.add(gold, HIP, xf([x, y + h + 0.6, z], null, [1.9, 1.2, 1.9])); }
      for (let i = 0; i < 16; i++) { const sx = i % 2 ? 1 : -1, x = sx * rand(17, 36), z = rand(-6, 190); palm(B, x, z, terrainH(L, x, z) - 0.2, [trunk, leaf]); }
      for (let a = 0; a < 8; a++) { const ang = a / 8 * TAU + 0.2, x = Math.sin(ang) * 21.5, z = 152 + Math.cos(ang) * 21.5; if (Math.abs(x) < 15 && z < 152) continue; B.add(sand2, G.box, xf([x, 3.5, z], null, [1.2, 7, 1.2])); B.add(gold, HIP, xf([x, 7.5, z], null, [1.6, 1, 1.6])); }
      const py = terrainH(L, 0, 228) - 3; B.add(sand, HIP, xf([0, py + 22, 228], null, [64, 44, 64])); B.add(gold, HIP, xf([0, py + 42, 228], null, [9, 6, 9]));
      B.add(dark, G.box, xf([0, py + 7, 205], null, [10, 14, 3]));
      for (const sx of [-1, 1]) { const x = sx * 78, y2 = terrainH(L, x, 170) - 3; B.add(sand2, HIP, xf([x, y2 + 13, 170], null, [36, 26, 36])); }
      for (const z of [22, 60, 96, 128]) propGateArch(0, z, z > 64 ? 1 : 0, 0xd8a868);
      for (const z of [12, 30, 88, 108]) { propLantern(-9.6, z, z > 70 ? 1 : 0, 0xffa040); propLantern(9.6, z, z > 70 ? 1 : 0, 0xffa040); }
      B.flush(); terrainRocks(L, 26, 0xc8985e, 24);
      mountainRing(0, 90, 360, 440, 30, 0xd8a868, null, 0xf2dcae);
    } else if (id === 6) {
      // Frozen Peak village: snowy huts with warm windows, snowy pines, lanterns, ice crystals around the arena, giant peaks
      const trunk = toon(0x5a3a2a), green = toon(0x2f5a4a), snow = toon(0xf6faff), wall = toon(0x7a4a32), roof = toon(0x3a3a4a), win = toon(0xffd27a, { em: 0xffb040, ei: 1 }), ice = toon(0xbff4ff, { em: 0x4ad8ff, ei: 0.6 });
      for (const [x, z, w, d, ry] of [[-19, 8, 7, 6, Math.PI / 2], [20, 22, 8, 6, -Math.PI / 2], [-20, 34, 6, 6, Math.PI / 2], [21, 84, 7, 6, -Math.PI / 2], [-21, 96, 8, 7, Math.PI / 2], [22, 110, 6, 6, -Math.PI / 2], [-22, 128, 7, 6, Math.PI / 2], [-30, 60, 9, 7, Math.PI / 2], [31, 52, 8, 6, -Math.PI / 2]]) hut(L, B, x, z, w, d, ry, [wall, roof, snow, win]);
      for (let i = 0; i < 44; i++) { const sx = i % 2 ? 1 : -1, x = sx * rand(26, 70), z = rand(-20, 220); pine(B, x, z, terrainH(L, x, z) - 0.2, [trunk, green, snow], rand(0.9, 1.6)); }
      for (let i = 0; i < 18; i++) { const sx = i % 2 ? 1 : -1, z = rand(-2, 132), x = sx * (z > 72 ? 13.4 : 11.6); B.add(snow, G.sphere, xf([x, (z > 72 ? 1 : 0) + 0.1, z], null, [rand(0.8, 1.5), rand(0.35, 0.6), rand(1, 2)])); }
      for (let a = 0; a < 10; a++) { const ang = a / 10 * TAU, x = Math.sin(ang) * 22, z = 152 + Math.cos(ang) * 22; if (Math.abs(x) < 15 && z < 152) continue; crystalCluster(B, x, terrainH(L, x, z) - 0.2, z, 1.6, ice); }
      for (const z of [20, 95]) propGateArch(0, z, z > 64 ? 1 : 0, 0x8a3a2a);
      for (const z of [10, 28, 86, 104, 118]) { propLantern(-10.4, z, z > 70 ? 1 : 0, 0xffb060); propLantern(10.4, z, z > 70 ? 1 : 0, 0xffb060); }
      B.flush(); terrainRocks(L, 20, 0x9aaac8, 26);
      mountainRing(0, 90, 300, 400, 34, 0x8a9ac0, 0xffffff, 0xdce8f8);
    } else if (id === 7) {
      // Crystal Caverns: a vaulted rock ceiling (stalactites hang from it), glowing crystal clusters and the Heart of Light
      const rock = new THREE.MeshToonMaterial({ color: 0x2a2244, gradientMap: GRAD, side: THREE.BackSide });
      const roofM = new THREE.Mesh(new THREE.SphereGeometry(240, 40, 20, 0, TAU, 0, Math.PI / 2), rock); roofM.scale.set(1, 0.32, 1); roofM.position.set(0, -6, 90); levelGroup.add(roofM);
      const roofY = (x, z) => { const d = Math.hypot(x, z - 90); return -6 + 0.32 * Math.sqrt(Math.max(0, 240 * 240 - d * d)); };
      const stone = toon(0x3a3058), pink = toon(0xff9af0, { em: 0xc83aff, ei: 0.75 }), cyan = toon(0x9ff8ff, { em: 0x3ab8ff, ei: 0.75 });
      for (let i = 0; i < 70; i++) { const x = rand(-110, 110), z = rand(-40, 230), l = rand(8, 26), ry = roofY(x, z); B.add(stone, CONE8, xf([x, ry - l / 2 + 2, z], [Math.PI, 0, 0], [rand(1.5, 4), l, rand(1.5, 4)])); }
      for (let i = 0; i < 40; i++) { const sx = i % 2 ? 1 : -1, x = sx * rand(16, 60), z = rand(-10, 210), y = terrainH(L, x, z); crystalCluster(B, x, y - 0.3, z, rand(1.2, 3.2), i % 3 ? pink : cyan); if (i % 4 === 0) { const s2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: i % 3 ? 0xff7ae0 : 0x6ad8ff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.55, depthWrite: false })); s2.position.set(x, y + 2.5, z); s2.scale.setScalar(9); levelGroup.add(s2); } }
      for (let i = 0; i < 26; i++) { const sx = i % 2 ? 1 : -1, x = sx * rand(16, 50), z = rand(-10, 210), y = terrainH(L, x, z), h = rand(3, 9); B.add(stone, CONE8, xf([x, y + h / 2 - 0.4, z], null, [rand(1, 2.2), h, rand(1, 2.2)])); }
      for (const z of [14, 32, 90, 106]) for (const sx of [-1, 1]) crystalCluster(B, sx * (z > 70 ? 12.6 : 10.8), z > 70 ? 1 : 0, z, 0.6, sx > 0 ? pink : cyan);
      // the Heart of Light, a giant crystal on plaza B (the mid-chapter scene looks at it)
      const hx = -8, hz = 90; B.add(stone, CYL12, xf([hx, 1.3, hz], null, [2.2, 0.6, 2.2]));
      const heart = new THREE.Mesh(G.oct, toon(0xffffff, { em: 0xff7ae0, ei: 0.9 })); heart.scale.set(1.3, 3.4, 1.3); heart.position.set(hx, 4.6, hz); levelGroup.add(heart); addOutline(heart, OUT_PROP); heart.userData.slow = true; L.spin.push(heart);
      const hg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff7ae0, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false })); hg.position.set(hx, 4.6, hz); hg.scale.setScalar(12); levelGroup.add(hg);
      addSolid(L, hx, hz, 2.4, 1, 6);
      for (let a = 0; a < 8; a++) { const ang = a / 8 * TAU + 0.2, x = Math.sin(ang) * 21.5, z = 152 + Math.cos(ang) * 21.5; if (Math.abs(x) < 15 && z < 152) continue; crystalCluster(B, x, 1, z, 2.2, a % 2 ? pink : cyan); }
      B.flush(); terrainRocks(L, 30, 0x3a3058, 22);
    } else if (id === 8) {
      // the Hollow Capital: black spires with red windows, braziers, the Emperor's palace and an eclipse in the sky
      const stone = toon(0x2a2232), roof = toon(0x140c18), glow = toon(0xff3355, { em: 0xff1a3a, ei: 1 }), gold = toon(0xffc24a, { em: 0x5a3000, ei: 1 });
      for (let i = 0; i < 30; i++) { const sx = i % 2 ? 1 : -1, x = sx * rand(19, 64), z = rand(-20, 210), w = rand(4, 8), h = rand(10, 30); spire(B, x, z, terrainH(L, x, z) - 1, w, h, [stone, roof, glow]); addSolid(L, x, z, w * 0.75, terrainH(L, x, z) - 1, h); }
      const py = terrainH(L, 0, 214) - 2; B.add(stone, G.box, xf([0, py + 9, 214], null, [44, 18, 14])); B.add(roof, HIP, xf([0, py + 22, 214], null, [44, 9, 20]));
      for (const sx of [-1, 0, 1]) spire(B, sx * 15, 218, py + (sx ? 12 : 18), sx ? 6 : 8, sx ? 26 : 34, [stone, roof, glow]);
      B.add(glow, G.box, xf([0, py + 6, 206.9], null, [8, 12, 0.3]));
      for (let a = 0; a < 8; a++) { const ang = a / 8 * TAU + 0.2, x = Math.sin(ang) * 21.5, z = 152 + Math.cos(ang) * 21.5; if (Math.abs(x) < 15 && z < 152) continue; B.add(stone, G.box, xf([x, 4, z], [0, ang, 0], [1.4, 8, 1.4])); B.add(glow, G.oct, xf([x, 9, z], null, [0.6, 1.2, 0.6])); B.add(gold, G.box, xf([x, 8.1, z], [0, ang, 0], [1.7, 0.25, 1.7])); }
      for (const z of [20, 60, 95, 126]) propGateArch(0, z, z > 64 ? 1 : 0, 0x3a2a40);
      for (const z of [8, 26, 84, 102, 116]) { propLantern(-10.6, z, z > 70 ? 1 : 0, 0xff3355); propLantern(10.6, z, z > 70 ? 1 : 0, 0xff3355); }
      B.flush(); terrainRocks(L, 24, 0x2a2232, 24);
      mountainRing(0, 90, 340, 420, 30, 0x2a1a2a, null, 0x2e0c1e);
      // the eclipse: a black sun with a burning corona, far away in the sky
      const ec = new THREE.Group(); ec.position.set(60, 150, 520); ec.lookAt(0, 20, 90); levelGroup.add(ec);
      const cor = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff4a3a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); cor.scale.setScalar(150); ec.add(cor);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshBasicMaterial({ color: 0x050008, fog: false })); disc.position.z = 1; ec.add(disc);
    }
  }
  // Standard chapter layout along +Z
  function buildLevel(id) {
    const th = THEMES[id];
    const L = { id, theme: th, plats: [], blockers: [], gates: [], tex: groundTex(th.ground, id), spin: [], checkpoints: [], arena: { x: 0, z: 152, r: 19, y: 1 } };
    level = L; applyTheme(th);
    // plaza A
    addPlat(L, -12, 12, -4, 40, 0);
    addBlock(L, -14, -12, -4, 40, 1.2); addBlock(L, 12, 14, -4, 40, 1.2); addBlock(L, -14, 14, -6, -4, 1.2);
    L.gate1 = addGate(L, 39.5, -12, 12, 0);
    // causeway: full-width, walled, gently stepped terraces (each step < 0.65, so you can just walk up; no jumps needed)
    for (const p of [[-12, 12, 40, 52, 0], [-12, 12, 52, 63, 0.35], [-12, 12, 63, 74.2, 0.7]]) addPlat(L, p[0], p[1], p[2], p[3], p[4], { depth: id === 2 ? 30 : 1.2 });
    addBlock(L, -13, -12, 40, 74, 1.9, 0); addBlock(L, 12, 13, 40, 74, 1.9, 0);
    // plaza B
    addPlat(L, -14, 14, 74, 120, 1);
    addBlock(L, -16, -14, 74, 120, 1.2, 1); addBlock(L, 14, 16, 74, 120, 1.2, 1);
    addBlock(L, -14, -12, 74, 75, 1.2, 1); addBlock(L, 12, 14, 74, 75, 1.2, 1);
    L.gate2 = addGate(L, 119.5, -14, 14, 1);
    addPlat(L, -14, 14, 120, 138, 1); addBlock(L, -15, -14, 120, 138, 1.2, 1); addBlock(L, 14, 15, 120, 138, 1.2, 1);
    addCircle(L, 0, 152, 20, 1);
    L.checkpoints = [new THREE.Vector3(0, 0, 2), new THREE.Vector3(0, 1, 80), new THREE.Vector3(0, 1, 128)];
    // checkpoint marker
    const cpm = part(levelGroup, G.oct, toon(th.accent, { em: th.accent, ei: 1 }), [2.2, 2.2, 127], [0.3, 0.6, 0.3], null, OUT_PROP); L.spin.push(cpm);
    // solid ground all the way to the horizon (no water, void or sky islands under the route)
    L.pads = id === 1 ? [{ x0: -31, x1: 31, z0: 189, z1: 214, y: 0 }, { x0: -45, x1: -29, z0: 38, z1: 82, y: 0 }, { x0: 29, x1: 45, z0: 38, z1: 82, y: 0 }, { x0: -19, x1: 19, z0: -32, z1: -16, y: 0 }]
      : id === 3 ? [{ x0: -10, x1: 10, z0: 172, z1: 186, y: 0 }] : id === 2 ? [] : [];
    addTerrain(L);
    arenaRim(L, 0, 152, 20, 1, th.rim ? th.rim : id === 2 ? 0x4a4870 : id === 4 ? 0x8a8cb8 : id === 3 ? 0x9a8a72 : 0xe6dccb);
    if (id === 1) terrainRocks(L, 14, 0xb8b0a0, 26); else if (id === 3) terrainRocks(L, 22, 0x8a7a6a, 24); else if (id === 4) terrainRocks(L, 34, 0x6a6c94, 22);
    // props by theme
    if (id === 1) {
      for (const z of [4, 18, 32, 86, 100, 114]) { propTree(-17, z, z > 70 ? 1 : 0, 1); propTree(17, z + 6, z > 70 ? 1 : 0, 1); }
      for (const z of [10, 26, 90, 108]) { propLantern(-10.5, z, z > 70 ? 1 : 0, 0xffd27a); propLantern(10.5, z, z > 70 ? 1 : 0, 0xffd27a); }
      // academy grounds: worn centre path, grass borders, benches, training dummies, fountain, banners (all merged per material)
      const B = lvBatch(), pm = decalMat(pathTex()), gm = decalMat(grassTex());
      for (const [z0, z1, y] of [[-3.8, 39.6, 0], [40, 52, 0], [52, 63, 0.35], [63, 74.2, 0.7], [74, 119.6, 1], [120, 134, 1]]) floorStrip(B, pm, -3.2, 3.2, z0, z1, y);
      for (const s of [-1, 1]) { floorStrip(B, gm, s > 0 ? 9.4 : -12, s > 0 ? 12 : -9.4, -3.8, 39.6, 0); floorStrip(B, gm, s > 0 ? 11.4 : -14, s > 0 ? 14 : -11.4, 75, 119.6, 1); }
      courtyardProps(L, B, 0, -4, 40, 12); courtyardProps(L, B, 1, 74, 120, 14);
      fountain(L, B, 0, -1.6, 0);
      wallBanners(B, [-12.6, 12.6], 0, 3, 37, 8.5); wallBanners(B, [-14.6, 14.6], 1, 80, 116, 9);
      // the academy itself: main hall with clock tower and spires, plus two wings and a rear hall
      academyHall(B, 0, 200, 56, 13, 18, { towers: true, clock: true });
      academyHall(B, -37, 60, 40, 9, 12, { ry: -Math.PI / 2 }); academyHall(B, 37, 60, 40, 9, 12, { ry: Math.PI / 2 });
      academyHall(B, 0, -24, 32, 8, 10, { ry: Math.PI, towers: true });
      B.flush();
      for (let a = 0; a < 8; a++) { const ang = a / 8 * TAU; part(levelGroup, G.cyl, toon(0xd8343f), [Math.sin(ang) * 21, 3, 152 + Math.cos(ang) * 21], [0.35, 6, 0.35], null, OUT_PROP); }
      mountainRing(0, 90, 360, 440, 34, 0x9fb6e2, 0xf6f9ff, 0xd8ecff);
    } else if (id === 2) {
      for (let i = 0; i < 26; i++) { const side = i % 2 ? 1 : -1; propBuilding(side * rand(30, 70), rand(-30, 220), rand(10, 20), rand(30, 70), rand(10, 20), 2); }
      neonSign(-11.8, 3, 20, Math.PI / 2, 'AURA', '#ff3fb4'); neonSign(11.8, 3.5, 30, -Math.PI / 2, 'NIGHT', '#2ef2ff'); neonSign(-13.8, 4, 96, Math.PI / 2, 'RAMEN', '#ffd23f'); neonSign(13.8, 4, 108, -Math.PI / 2, 'NEON', '#ff3fb4'); neonSign(0, 7, 175, Math.PI, 'SKYLINE', '#2ef2ff');
      for (const [x, z, y] of [[-8, 8, 0], [8, 34, 0], [-10, 100, 1], [9, 90, 1]]) { const g = new THREE.Group(); g.position.set(x, y, z); levelGroup.add(g); part(g, G.cyl, toon(0x6a6a8a), [0, 2.2, 0], [1, 1.6, 1], null, OUT_PROP); for (const a of [0.6, -0.6]) part(g, G.cyl, toon(0x3a3a50), [a, 0.7, a], [0.06, 1.4, 0.06], null, null); }
    } else if (id === 3) {
      for (let i = 0; i < 46; i++) { const side = i % 2 ? 1 : -1, x = side * rand(17, i < 30 ? 30 : 70), z = rand(-10, 200); propTree(x, z, terrainH(L, x, z), 3); }
      for (const z of [12, 30, 82, 100, 116]) { propLantern(-10.5, z, z > 70 ? 1 : 0, 0xffa040); propLantern(10.5, z, z > 70 ? 1 : 0, 0xffa040); }
      for (const z of [20, 60, 95, 126]) propGateArch(0, z, z > 64 ? 1 : 0, 0xe8333f);
      propBuilding(0, 178, 16, 6, 8, 3);
      const B = lvBatch(), gm = decalMat(grassTex()), pm = decalMat(pathTex());
      for (const s of [-1, 1]) { floorStrip(B, gm, s > 0 ? 9 : -12, s > 0 ? 12 : -9, -3.8, 39.6, 0); floorStrip(B, gm, s > 0 ? 10.5 : -14, s > 0 ? 14 : -10.5, 75, 119.6, 1); }
      for (const [z0, z1, y] of [[-3.8, 39.6, 0], [74, 119.6, 1]]) floorStrip(B, pm, -2.6, 2.6, z0, z1, y);
      B.flush(); mountainRing(0, 90, 340, 420, 30, 0x8a5a7a, null, 0xf0a070);
    } else if (id >= 5) { buildLevelP2(L, id);
    } else if (id === 4) {
      // the Sky Gate: a colossal ring standing on the summit (its base is sunk into the rock), with stone buttresses
      const gy = terrainH(L, 0, 186) + 15;
      const gate = new THREE.Mesh(new THREE.TorusGeometry(22, 1.6, 12, 64), toon(0x8a80c8, { em: 0x7cf8ff, ei: 0.35 })); gate.position.set(0, gy, 186); levelGroup.add(gate); addOutline(gate, OUT_PROP);
      const portal = new THREE.Mesh(new THREE.CircleGeometry(20.5, 48), new THREE.MeshBasicMaterial({ color: 0x2a1060, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); portal.position.copy(gate.position); levelGroup.add(portal);
      for (const sx of [-1, 1]) part(levelGroup, G.box, toon(0x5a5a80), [sx * 15, gy - 15, 186], [7, 9, 6], [0, 0, sx * 0.2], OUT_PROP);
      for (let i = 0; i < 30; i++) { const x = rand(-60, 60) + (i % 2 ? 26 : -26), z = rand(-10, 200); propTree(x, z, terrainH(L, x, z), 4); }
    }
    // petals / ambient
    ambientP = id === 2 ? 0.5 : 1;
    return L;
  }
  function groundAt(x, z, yRef) {
    let best = -Infinity;
    if (!level) return 0;
    for (const p of level.plats) {
      let inside = p.type === 'rect' ? x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 : (x - p.cx) ** 2 + (z - p.cz) ** 2 <= p.r * p.r;
      if (inside && p.y <= yRef + 0.65 && p.y > best) best = p.y;
    }
    return best;
  }
  function blocked(x, z, y) {
    if (!level) return false;
    for (const b of level.blockers) if (x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3) return true;
    for (const p of level.plats) { if (p.y > y + 0.65) { const inside = p.type === 'rect' ? x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 : (x - p.cx) ** 2 + (z - p.cz) ** 2 <= p.r * p.r; if (inside) return true; } }
    return false;
  }

  // ---------- objective beacon (light pillar at the goal + glowing ground arrow at Ren's feet) ----------
  const beacon = (() => {
    const [c, x] = cvs(4, 64); const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = gr; x.fillRect(0, 0, 4, 64);
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const add = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false };
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, 16, 20, 1, true), new THREE.MeshBasicMaterial(Object.assign({ color: 0xffd27a, map: new THREE.CanvasTexture(c), opacity: 0.55 }, add))); beam.position.y = 8; g.add(beam);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 6, 40), new THREE.MeshBasicMaterial(Object.assign({ color: 0xffe08a, opacity: 0.9 }, add))); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring);
    const sh = new THREE.Shape([[0, 0.75], [0.6, 0.05], [0.3, 0.05], [0.3, -0.55], [-0.3, -0.55], [-0.3, 0.05], [-0.6, 0.05]].map((p) => new THREE.Vector2(p[0], p[1])));
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })); arrow.visible = false; arrow.renderOrder = 3; scene.add(arrow);
    const rim = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a1030, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })); rim.scale.setScalar(1.25); rim.position.y = -0.005; arrow.add(rim);
    return { g, ring, arrow, pos: new THREE.Vector3() };
  })();
  function objectiveTarget() {
    if (!player || !level) return null;
    let best = null, bd = Infinity;
    for (const e of enemies) { if (e.dead || e.decoyHidden || e.removed) continue; const d = e.pos.distanceTo(player.pos); if (d < bd) { bd = d; best = e; } }
    if (best) return { pos: best.pos, enemy: true, boss: !!best.boss };
    let z = Infinity; for (const t of triggers) if (t.z != null && t.z < z) z = t.z;
    if (z === Infinity) return null;
    const tz = z + 2.5, gy = groundAt(0, tz, 50); beacon.pos.set(0, gy > -1e9 ? gy : player.pos.y, tz);
    return { pos: beacon.pos, enemy: false };
  }
  function updateBeacon() {
    const tg = state.screen === 'play' ? objectiveTarget() : null; state.target = tg;
    const B = beacon, show = !!(tg && player && !(tg.boss && bossActive));
    B.g.visible = show && !tg.enemy; if (B.g.visible) { B.g.position.copy(tg.pos); B.ring.scale.setScalar(1 + 0.18 * Math.sin(clock * 4)); }
    const dx = show ? tg.pos.x - player.pos.x : 0, dz = show ? tg.pos.z - player.pos.z : 0, d = Math.hypot(dx, dz);
    B.arrow.visible = show && d > (tg.enemy ? 4 : 3);
    if (B.arrow.visible) {
      const a = Math.atan2(dx, dz), r = 1.7 + 0.18 * Math.sin(clock * 6);
      B.arrow.position.set(player.pos.x + Math.sin(a) * r, (player.grounded ? player.pos.y : groundAt(player.pos.x, player.pos.z, player.pos.y)) + 0.07, player.pos.z + Math.cos(a) * r);
      B.arrow.rotation.y = a; B.arrow.material.color.set(tg.enemy ? 0xff3a5a : 0xffb020); B.arrow.material.opacity = 0.75 + 0.2 * Math.sin(clock * 6);
    }
  }

  // ---------- fighters ----------
  function makeFighter(rig, o) {
    const f = Object.assign({ rig, pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, hp: 100, maxHp: 100, radius: 0.45, grounded: true, state: 'idle', st: 0, inv: 0, dead: false, kb: new THREE.Vector3(), lastPos: new THREE.Vector3() }, o);
    scene.add(rig.root);
    const sh = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })); sh.rotation.x = -Math.PI / 2; scene.add(sh); f.shadow = sh; sh.scale.setScalar(1.2 * (rig.cfg.scale || 1));
    return f;
  }
  function removeFighter(f) { scene.remove(f.rig.root); scene.remove(f.shadow); if (f.rig.trail) { scene.remove(f.rig.trail.m); f.rig.trail.geo.dispose(); f.rig.trail = null; } }
  function syncFighter(f, dt) {
    const rg = f.rig; f.rig.root.position.copy(f.pos);
    // visual yaw follows the logical yaw through a fast critically-damped chase: no single-frame snaps / jitter
    if (rg.visYaw === undefined || !(dt > 0)) rg.visYaw = f.yaw; else rg.visYaw += angDiff(rg.visYaw, f.yaw) * (1 - Math.exp(-24 * dt));
    rg.root.rotation.y = rg.visYaw; rg.grounded = f.grounded;
    const g = groundAt(f.pos.x, f.pos.z, f.pos.y); f.shadow.position.set(f.pos.x, (g > -1e9 ? g : f.pos.y - 50) + 0.04, f.pos.z);
    const dx = f.pos.x - f.lastPos.x, dz = f.pos.z - f.lastPos.z;
    if (dt > 0) { const sp = Math.hypot(dx, dz) / dt; f.rig.speed = sp > 40 ? f.rig.speed || 0 : sp; f.rig.fwdSpeed = sp > 40 ? 0 : (dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw)) / dt; f.rig.sideSpeed = sp > 40 ? 0 : (dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw)) / dt; f.rig.vy = f.vel.y; }
    f.lastPos.copy(f.pos);
  }

  // ---------- animation ----------
  // Every frame a target pose is built procedurally (FK angles + foot IK targets), the legs are solved with 2-bone IK
  // (feet stay planted on the ground, no sliding or sinking), then the result is cross-faded from the pose the rig showed
  // when its animation changed, so states blend without pops. Idle / walk / run are one layer blended by smoothed speed.
  function kf(u, a, b, c, w = 0.3, s = 0.5, r = 0.75) { const k1 = sm(u / w), k2 = sm((u - w) / (s - w)), k3 = sm((u - r) / (1 - r)); return lerp(lerp(lerp(a, b, k1), c, k2), a, k3); }
  const ebk = (x) => { x = clamp(x, 0, 1); return 1 + 2.6 * (x - 1) ** 3 + 1.6 * (x - 1) ** 2; }; // ease-out-back: fast with a little overshoot
  // swing curve: rest -> anticipation (0..a) -> strike (a..s, overshoot) -> follow-through hold -> rest (r..1)
  function swg(u, rest, ant, hit, a = 0.24, s = 0.42, r = 0.72) { const k1 = sm(u / a), k2 = u < a ? 0 : ebk((u - a) / (s - a)), k3 = sm((u - r) / (1 - r)); return lerp(lerp(lerp(rest, ant, k1), hit, k2), rest, k3); }
  const wrapA = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
  const FADE = { loco: 0.2, air: 0.13, flip: 0.05, atk1: 0.05, atk2: 0.05, atk3: 0.06, launch: 0.06, dodge: 0.05, step: 0.05, dash: 0.06, cast: 0.08, hurt: 0.035, down: 0.14, launched: 0.07, power: 0.2, burst: 0.06, victory: 0.25, sign: 0.1, seal: 0.1, point: 0.2, talk: 0.25, claw: 0.1, slam: 0.12, slash: 0.1, cast2: 0.12, raise: 0.15, kneel: 0.22, float: 0.3 };
  const WIND_TAIL = { claw: 0.45, slash: 0.45, slam: 0.55, raise: 0.5, cast2: 0.55, dash: 0.35 };
  // which limb draws a slash trail, and when (fraction of the animation)
  const TRAIL_SPEC = { atk1: ['haR', 'elR', 0.18, 0.62], atk2: ['haL', 'elL', 0.18, 0.62], atk3: ['ftR', 'knR', 0.16, 0.7], launch: ['haR', 'elR', 0.28, 0.66] };
  const WIND_TRAIL = { slash: 'haR', claw: 'haR', slam: 'haR' };
  const L1 = 0.43, LMAX = 0.858, ANK = 0.04; // thigh = shin length, max reach, ankle height when standing
  function initAnim(rig) {
    rig.F = new Float32Array(JN.length * 3 + 3); rig.FT = [[0, ANK, 0, 0, 0], [0, ANK, 0, 0, 0]];
    rig.spdS = 0; rig.fwdS = 0; rig.sideS = 0; rig.vyS = 0; rig.ph = rand(0, 1); rig.sq = 0; rig.sqV = 0; rig.landT = 9; rig.landK = 0; rig.wasGr = true; rig.lastVy = 0;
    rig.grp = null; rig.seenN = -1; rig.playN = rig.playN || 0; rig.fadeT = 1; rig.fadeD = 0.1; rig.hurtSide = 1;
    let i = 0; for (const n of JN) { const r = rig.J[n].rotation; rig.F[i++] = r.x; rig.F[i++] = r.y; rig.F[i++] = r.z; }
    rig.F[i++] = rig.J.hips.position.y; rig.F[i++] = 0; rig.F[i++] = 1;
  }
  const _tv1 = new THREE.Vector3(), _tv2 = new THREE.Vector3(), _tv3 = new THREE.Vector3();
  function animate(rig, dt) {
    rig.t += dt; rig.animT += dt; const T = rig.T, t = rig.t, J = rig.J;
    if (!rig.F) initAnim(rig);
    for (const n of JN) { T[n][0] = 0; T[n][1] = 0; T[n][2] = 0; }
    const A = rig.anim, dur = rig.animDur || 1, at = rig.animT, u = clamp(at / dur, 0, 1), FT = rig.FT;
    const S = (n, x, y, z) => { const a = T[n]; a[0] = x; a[1] = y; a[2] = z; };
    const add = (n, x, y, z) => { const a = T[n]; a[0] += x; a[1] += y; a[2] += z; };
    const foot = (i, x, y, z, toe = 0) => { const f = FT[i]; f[0] = x; f[1] = y; f[2] = z; f[3] = toe; f[4] = 1; };
    const noIK = () => { FT[0][4] = FT[1][4] = 0; };
    let hy = 0, spin = 0, flip = 0, pivY = 1, glint = 0;
    const sc = rig.cfg.scale || 1, bw = rig.cfg.bulk || 1, fx = 0.105 * bw;
    // smoothed kinematics (speed from position deltas is noisy)
    if (dt > 0) {
      const ks = 1 - Math.exp(-10 * dt);
      rig.spdS += (rig.speed - rig.spdS) * ks; rig.fwdS += (rig.fwdSpeed - rig.fwdS) * ks; rig.sideS += ((rig.sideSpeed || 0) - rig.sideS) * ks; rig.vyS += (rig.vy - rig.vyS) * (1 - Math.exp(-14 * dt));
      // landing squash + crouch, take-off crouch -> stretch (a damped spring on the model's scale)
      const gr = rig.grounded !== false;
      if (gr && !rig.wasGr && rig.lastVy < -3) { const imp = clamp(-rig.lastVy / 15, 0.2, 1); rig.sqV -= 3.2 * imp; rig.landT = 0; rig.landK = imp; }
      if (!gr && rig.wasGr && rig.vy > 4) { rig.sq = -0.09; rig.sqV = 3.6; }
      rig.wasGr = gr; rig.lastVy = rig.vy;
      rig.sqV += (-240 * rig.sq - 15 * rig.sqV) * dt; rig.sq = clamp(rig.sq + rig.sqV * dt, -0.2, 0.2); rig.landT += dt;
    }
    const breath = Math.sin(t * 2.1), br2 = Math.sin(t * 2.1 - 0.7);
    // ---- base stance (every pose starts from it) ----
    if (rig.fight) {
      S('shL', -0.5 + 0.03 * br2, 0.1, 0.32); S('elL', -1.8, 0, 0); S('shR', -0.32 + 0.03 * br2, -0.1, -0.3); S('elR', -1.6, 0, 0);
      S('spine', 0.06, 0.12, 0); S('chest', 0.03 + 0.025 * breath, 0.16, 0); S('head', -0.04 - 0.015 * breath, -0.26, 0);
      S('hipL', 0, 0.1, 0); S('hipR', 0, -0.28, 0);
      hy = -0.075 + 0.006 * breath; foot(0, fx + 0.03, ANK, 0.13); foot(1, -fx - 0.03, ANK, -0.12);
    } else {
      S('shL', 0.02 * br2, 0, 0.1 + 0.02 * breath); S('shR', 0.02 * br2, 0, -0.1 - 0.02 * breath); S('elL', -0.22, 0, 0); S('elR', -0.22, 0, 0);
      S('chest', 0.02 + 0.03 * breath, 0, 0); S('head', -0.02 * breath, 0, 0); S('hipL', 0, 0.06, 0); S('hipR', 0, -0.06, 0);
      hy = -0.012 + 0.004 * breath; foot(0, fx, ANK, 0.02); foot(1, -fx, ANK, -0.02);
    }
    if (rig.hunch) { add('spine', rig.hunch, 0, 0); add('head', -rig.hunch, 0, 0); add('shL', -0.4, 0, 0.1); add('shR', -0.4, 0, -0.1); }
    // ---- locomotion layer: walk -> run, feet follow a stance/swing path matched to the ground speed ----
    const LO = A === 'idle' || A === 'run';
    const mv = rig.spdS / sc, mW = LO ? sm((mv - 0.25) / 1.3) : 0;
    if (LO && dt > 0) rig.ph = (rig.ph + dt * (1.4 + 0.28 * Math.min(mv, 10))) % 1;
    if (mW > 0.001) {
      const runW = sm((mv - 2.2) / 3.4), f = 1.4 + 0.28 * Math.min(mv, 10), beta = lerp(0.6, 0.36, runW), half = beta * (mv / f) * 0.5;
      const vf = rig.fwdS / sc, vs = rig.sideS / sc, vl = Math.hypot(vf, vs) || 1, dz = vf / vl, dx = vs / vl, lift = lerp(0.09, 0.22, runW);
      for (let i = 0; i < 2; i++) {
        const c = (rig.ph + i * 0.5) % 1; let s, y = 0, toe = 0;
        if (c < beta) { s = half * (1 - 2 * c / beta); if (c > beta * 0.7) toe = 0.5 * runW * sm((c / beta - 0.7) / 0.3); }
        else { const q = (c - beta) / (1 - beta); s = half * (2 * sm(q) - 1); y = lift * Math.sin(Math.PI * q) * (1 - 0.35 * q); toe = lerp(0.5 * runW, 0, sm(q / 0.7)) + 0.15 * Math.sin(Math.PI * q); }
        const f0 = FT[i], sd = i ? -1 : 1;
        foot(i, lerp(f0[0], sd * fx * 0.85 + dx * s, mW), lerp(f0[1], ANK + y, mW), lerp(f0[2], dz * s, mW), lerp(f0[3], toe, mW));
      }
      const M = (n, x, y, z) => { const a = T[n]; a[0] = lerp(a[0], x, mW); a[1] = lerp(a[1], y, mW); a[2] = lerp(a[2], z, mW); };
      const cL = Math.cos(TAU * rig.ph); // +1: left foot forward
      const arm = lerp(0.38, 0.95, runW), lean = (0.06 + 0.3 * runW) * clamp(dz, -0.3, 1);
      M('shL', arm * cL - 0.1 * runW, 0, 0.12 + 0.06 * runW); M('shR', -arm * cL - 0.1 * runW, 0, -0.12 - 0.06 * runW);
      M('elL', lerp(-0.35, -1.45, runW) - 0.3 * runW * Math.max(0, -cL), 0, 0); M('elR', lerp(-0.35, -1.45, runW) - 0.3 * runW * Math.max(0, cL), 0, 0);
      M('spine', lean, 0, 0); M('chest', 0.04 * runW, 0.24 * runW * cL + 0.05 * cL, 0); M('head', -lean * 0.75, -(0.24 * runW + 0.05) * cL * 0.8, 0);
      M('hipL', 0, 0.04, 0); M('hipR', 0, -0.04, 0);
      const bob = (0.012 + 0.03 * runW) * Math.cos(2 * TAU * (rig.ph - beta / 2));
      hy = lerp(hy, -0.03 - 0.07 * runW - bob, mW);
    }
    // ---- actions ----
    const hc = (cy, sy) => -(cy + sy) * 0.9; // head counter-twist so he keeps looking at the target
    switch (A) {
      case 'air': {
        noIK(); const wr = sm((rig.vyS + 1) / 7); // 1 rising, 0 falling
        S('hipL', lerp(-0.4, -1.05, wr), 0, 0.08); S('knL', lerp(0.5, 1.55, wr), 0, 0); S('ftL', lerp(0.25, 0.45, wr), 0, 0);
        S('hipR', lerp(0.1, 0.3, wr), 0, -0.08); S('knR', lerp(0.35, 0.85, wr), 0, 0); S('ftR', 0.45, 0, 0);
        S('shL', lerp(-0.7, 0.45, wr), 0, lerp(0.95, 0.3, wr)); S('shR', lerp(-0.6, 0.5, wr), 0, lerp(-0.95, -0.3, wr)); S('elL', -0.7, 0, 0); S('elR', -0.7, 0, 0);
        S('spine', lerp(-0.04, 0.14, wr), 0, 0); S('head', lerp(0.12, -0.14, wr), 0, 0); hy = 0; break;
      }
      case 'flip': noIK(); { const k = Math.sin(Math.PI * u); S('hipL', -0.5 - 1.1 * k, 0, 0.05); S('knL', 0.6 + 1.5 * k, 0, 0); S('hipR', -0.4 - 1.1 * k, 0, -0.05); S('knR', 0.6 + 1.5 * k, 0, 0); S('shL', -0.4 - 0.8 * k, 0, 0.4); S('shR', -0.4 - 0.8 * k, 0, -0.4); S('elL', -1.5, 0, 0); S('elR', -1.5, 0, 0); S('spine', 0.5 * k, 0, 0); S('head', 0.3 * k, 0, 0); flip = (1 - (1 - u) ** 2) * TAU; } break;
      case 'atk1': {
        const cy = swg(u, 0.16, -0.5, 0.62), sy = swg(u, 0.12, -0.2, 0.3);
        S('shR', swg(u, -0.32, 0.5, -1.62), swg(u, -0.1, 0.25, -0.2), swg(u, -0.3, -0.6, -0.08)); S('elR', swg(u, -1.6, -2.25, -0.06), 0, 0);
        S('shL', swg(u, -0.5, -0.8, -0.35), 0.1, 0.38); S('elL', -1.95, 0, 0);
        S('chest', 0.05, cy, 0); S('spine', swg(u, 0.06, 0.02, 0.22), sy, 0); S('head', -0.05, hc(cy, sy), 0);
        hy = swg(u, -0.075, -0.11, -0.16); foot(0, fx + 0.03, ANK, swg(u, 0.13, 0.2, 0.34), 0); foot(1, -fx - 0.03, ANK, swg(u, -0.12, -0.16, -0.3), swg(u, 0, 0, 0.3)); break;
      }
      case 'atk2': {
        const cy = swg(u, 0.16, 0.75, -0.5), sy = swg(u, 0.12, 0.32, -0.25);
        S('shL', swg(u, -0.5, 0.5, -1.62), swg(u, 0.1, -0.25, 0.2), swg(u, 0.32, 0.6, 0.08)); S('elL', swg(u, -1.8, -2.25, -0.06), 0, 0);
        S('shR', swg(u, -0.32, -0.7, -0.3), -0.1, -0.38); S('elR', -1.95, 0, 0);
        S('chest', 0.05, cy, 0); S('spine', swg(u, 0.06, 0.02, 0.22), sy, 0); S('head', -0.05, hc(cy, sy), 0);
        hy = swg(u, -0.075, -0.11, -0.16); foot(0, fx + 0.03, ANK, swg(u, 0.13, 0.08, 0.3), 0); foot(1, -fx - 0.03, ANK, swg(u, -0.12, -0.2, -0.28), swg(u, 0, 0.1, 0.3)); break;
      }
      case 'atk3': {
        spin = ebk((u - 0.12) / 0.5) * TAU; FT[1][4] = 0;
        S('hipR', swg(u, -0.1, 0.35, -1.55, 0.2, 0.42, 0.8), 0, swg(u, 0, 0, -0.95, 0.2, 0.42, 0.8)); S('knR', swg(u, 0.3, 1.5, 0.05, 0.2, 0.42, 0.8), 0, 0); S('ftR', 0.4, 0, 0);
        S('spine', swg(u, 0.06, 0.2, 0.05, 0.2, 0.42, 0.8), 0, swg(u, 0, 0, 0.5, 0.2, 0.42, 0.8)); S('chest', 0, 0, swg(u, 0, 0, 0.15, 0.2, 0.42, 0.8));
        S('shL', -0.3, 0, swg(u, 0.4, 0.9, 1.25)); S('shR', -0.3, 0, swg(u, -0.4, -0.9, -1.2)); S('elL', -0.5, 0, 0); S('elR', -0.5, 0, 0);
        hy = swg(u, -0.075, -0.16, -0.05, 0.2, 0.42, 0.8); foot(0, fx * 0.3, ANK, 0.02, swg(u, 0, 0.1, 0.35)); break;
      }
      case 'launch': {
        const a = 0.3, s = 0.45, cy = swg(u, 0.16, -0.45, 0.3, a, s, 0.78);
        hy = swg(u, -0.075, -0.3, 0.06, a, s, 0.78);
        S('shR', swg(u, -0.32, 0.5, -2.95, a, s, 0.78), 0, -0.15); S('elR', swg(u, -1.6, -2.3, -0.25, a, s, 0.78), 0, 0);
        S('shL', swg(u, -0.5, -0.9, 0.5, a, s, 0.78), 0, 0.4); S('elL', -1.6, 0, 0);
        S('chest', swg(u, 0.04, 0.45, -0.35, a, s, 0.78), cy, 0); S('spine', swg(u, 0.06, 0.35, -0.1, a, s, 0.78), 0, 0); S('head', swg(u, -0.04, -0.1, -0.35, a, s, 0.78), hc(cy, 0.1), 0);
        foot(0, fx + 0.05, ANK, 0.16, swg(u, 0, 0, 0.55, a, s, 0.78)); foot(1, -fx - 0.05, ANK, -0.14, swg(u, 0, 0, 0.6, a, s, 0.78)); break;
      }
      case 'dodge': {
        noIK(); const tk = Math.sin(Math.PI * clamp(u / 0.92, 0, 1)); flip = sm((u - 0.04) / 0.8) * TAU; pivY = 1 - 0.5 * tk; hy = -0.1 * tk;
        S('spine', 0.2 + 0.8 * tk, 0, 0); S('chest', 0.3 * tk, 0, 0); S('head', 0.45 * tk, 0, 0);
        S('hipL', -0.25 - 1.45 * tk, 0, 0.1); S('knL', 0.35 + 1.85 * tk, 0, 0); S('hipR', -0.15 - 1.35 * tk, 0, -0.1); S('knR', 0.45 + 1.75 * tk, 0, 0); S('ftL', 0.3 * tk, 0, 0); S('ftR', 0.3 * tk, 0, 0);
        S('shL', -0.5 - 0.7 * tk, 0, 0.3); S('shR', -0.5 - 0.7 * tk, 0, -0.3); S('elL', -1.7, 0, 0); S('elR', -1.7, 0, 0); break;
      }
      case 'step': { // back-step: a low hop away, guard up
        const k = Math.sin(Math.PI * u), e = sm(u / 0.3) * (1 - sm((u - 0.7) / 0.3));
        S('spine', -0.12 * e, 0.1, 0); S('chest', -0.1 * e, 0.2, 0); S('head', 0.08 * e, -0.28, 0);
        S('shL', -0.9, 0.1, 0.35); S('elL', -2.0, 0, 0); S('shR', -0.7, -0.1, -0.35); S('elR', -1.9, 0, 0);
        hy = -0.08 - 0.08 * e; foot(0, fx + 0.04, ANK + 0.07 * k, 0.13 + 0.22 * e, 0.2 * k); foot(1, -fx - 0.04, ANK + 0.1 * k, -0.12 - 0.08 * e, 0.3 * k); break;
      }
      case 'dash':
        if (rig.isPlayer || dur < 0.5) {
          noIK(); S('spine', 0.8, 0, 0); S('head', -0.65, 0, 0); S('shL', 1.15, 0, 0.35); S('shR', 1.15, 0, -0.35); S('elL', -0.2, 0, 0); S('elR', -0.2, 0, 0);
          S('hipL', 0.55, 0, 0.05); S('knL', 0.8, 0, 0); S('hipR', -0.35, 0, -0.05); S('knR', 1.1, 0, 0); S('ftL', 0.5, 0, 0); S('ftR', 0.3, 0, 0); hy = -0.14; break;
        }
      // falls through: a boss's gale dash wind-up is handled with the other wind-ups
      case 'claw': case 'slash': case 'slam': case 'raise': case 'cast2': {
        // boss / enemy wind-ups: a clear anticipation pose that is held (with a charge tremble and a growing glint)
        // until the strike, then a fast strike with overshoot, a follow-through hold, and a recovery
        const W = Math.max(0.2, dur - (WIND_TAIL[A] || 0.45)), sS = A === 'claw' ? 0.6 * W : W - 0.07, aT = Math.min(0.32, sS * 0.6);
        const ka = sm(at / aT), ks = at < sS ? 0 : ebk((at - sS) / 0.1), kr = sm((at - sS - 0.3) / Math.max(0.15, dur - sS - 0.3));
        const tr = at < sS ? Math.sin(t * 55) * 0.02 * ka : 0;
        const V = (rest, ant, hit) => lerp(lerp(lerp(rest, ant, ka), hit, ks), rest, kr);
        glint = at < sS ? ka * (0.35 + 0.65 * clamp(at / sS, 0, 1)) : 1 - sm((at - sS) / 0.18);
        if (A === 'claw') {
          S('shR', V(-0.3, -2.6, -0.45) + tr, 0, -0.2); S('elR', V(-0.5, -0.4, -0.1), 0, 0); S('shL', V(-0.3, -2.3, -0.6) + tr, 0, 0.25); S('elL', -0.45, 0, 0);
          S('chest', V(0.03, -0.4, 0.55), V(0.16, 0.3, -0.2), 0); S('spine', V(0.06, -0.15, 0.3), 0, 0); S('head', V(-0.04, 0.2, -0.2), -0.2, 0);
          hy = V(-0.075, -0.02, -0.16); foot(0, fx + 0.03, ANK, V(0.13, 0.08, 0.32)); foot(1, -fx - 0.03, ANK, -0.14, V(0, 0.2, 0.2));
        } else if (A === 'slash') {
          const cy = V(0.1, -1.1, 1.15) + tr;
          S('shR', -1.45, 0, V(-0.3, -0.95, 0.25)); S('elR', V(-0.4, -0.15, -0.1), 0, 0); S('shL', V(-0.5, -0.2, -0.6), 0, 0.65); S('elL', -1.2, 0, 0);
          S('chest', 0.05, cy, 0); S('spine', V(0.06, 0.15, 0.25), V(0.1, -0.35, 0.35), 0); S('head', 0, hc(cy, V(0.1, -0.35, 0.35)), 0);
          hy = V(-0.075, -0.17, -0.13); foot(0, fx + 0.05, ANK, V(0.13, 0.2, 0.38)); foot(1, -fx - 0.05, ANK, V(-0.12, -0.25, -0.3), V(0, 0.3, 0.3));
        } else if (A === 'slam') {
          const up = V(-0.3, -2.95, -0.85) + tr;
          S('shL', up, 0, 0.15); S('shR', up, 0, -0.15); S('elL', V(-0.3, -0.5, -0.2), 0, 0); S('elR', V(-0.3, -0.5, -0.2), 0, 0);
          S('chest', V(0.03, -0.45, 0.75), 0, 0); S('spine', V(0.06, -0.15, 0.45), 0, 0); S('head', V(0, 0.3, -0.25), 0, 0);
          hy = V(-0.05, 0.05, -0.3); foot(0, fx + 0.06, ANK, 0.15, V(0, 0.3, 0)); foot(1, -fx - 0.06, ANK, -0.15, V(0, 0.3, 0));
        } else if (A === 'raise') {
          S('shL', V(-0.4, 0.15, -2.85) + tr, 0, V(0.3, -0.5, 0.4)); S('shR', V(-0.4, 0.15, -2.85) + tr, 0, V(-0.3, 0.5, -0.4)); S('elL', V(-0.4, -1.6, -0.15), 0, 0); S('elR', V(-0.4, -1.6, -0.15), 0, 0);
          S('chest', V(0.03, 0.35, -0.25), 0, 0); S('spine', V(0.06, 0.25, -0.1), 0, 0); S('head', V(0, 0.3, -0.45), 0, 0);
          hy = V(-0.06, -0.2, 0.0); foot(0, fx + 0.09, ANK, 0.08); foot(1, -fx - 0.09, ANK, -0.08);
        } else if (A === 'cast2') {
          S('shL', V(-0.4, -0.3, -1.45), 0, V(0.2, 0.5, -0.15)); S('shR', V(-0.4, -0.3, -1.45), 0, V(-0.2, -0.5, 0.15)); S('elL', V(-0.6, -2.1, -0.08) + tr, 0, 0); S('elR', V(-0.6, -2.1, -0.08) + tr, 0, 0);
          S('chest', V(0.03, -0.3, 0.2), 0, 0); S('spine', V(0.06, -0.1, 0.15), 0, 0); S('head', V(0, 0.15, -0.05), 0, 0);
          hy = V(-0.06, -0.12, -0.14); foot(0, fx + 0.04, ANK, V(0.12, 0.1, 0.3)); foot(1, -fx - 0.04, ANK, -0.15);
        } else { // dash wind-up: coiled sprinter crouch, then launches
          S('spine', V(0.1, 0.55, 0.85), 0, 0); S('head', V(0, -0.45, -0.65), 0, 0); S('shL', V(-0.3, 0.9, 1.15), 0, 0.3); S('shR', V(-0.3, 0.9, 1.15), 0, -0.3); S('elL', -0.3, 0, 0); S('elR', -0.3, 0, 0);
          hy = V(-0.06, -0.28, -0.14); foot(0, fx, ANK, V(0.12, 0.38, 0.3), V(0, 0, 0.3)); foot(1, -fx, ANK, V(-0.12, -0.4, -0.5), V(0, 0.4, 0.6));
        }
        break;
      }
      case 'cast': {
        const cy = swg(u, 0.16, 0.4, -0.35, 0.2, 0.34, 0.75);
        S('shL', swg(u, -0.5, -0.4, -1.5, 0.2, 0.34, 0.75), 0, swg(u, 0.32, 0.5, 0.08, 0.2, 0.34, 0.75)); S('elL', swg(u, -1.8, -2.0, -0.12, 0.2, 0.34, 0.75), 0, 0);
        S('shR', -0.6, 0, -0.5); S('elR', -1.4, 0, 0); S('chest', 0.04, cy, 0); S('head', -0.05, hc(cy, 0.12), 0);
        hy = swg(u, -0.075, -0.12, -0.15, 0.2, 0.34, 0.75); foot(0, fx + 0.04, ANK, swg(u, 0.13, 0.1, 0.32, 0.2, 0.34, 0.75)); foot(1, -fx - 0.04, ANK, -0.15); break;
      }
      case 'hurt': { // additive flinch on top of the stance: snap back, twist away, stumble, recover
        const k = (u < 0.14 ? ebk(u / 0.14) : 1) * (1 - sm((u - 0.3) / 0.7)), hs = rig.hurtSide;
        add('chest', -0.45 * k, 0.35 * hs * k, 0.14 * hs * k); add('spine', -0.22 * k, 0.1 * hs * k, 0); add('head', -0.45 * k, 0.25 * hs * k, -0.1 * hs * k);
        add('shL', -0.5 * k, 0, 0.75 * k); add('shR', -0.5 * k, 0, -0.75 * k); add('elL', 1.0 * k, 0, 0); add('elR', 1.0 * k, 0, 0);
        hy -= 0.1 * k; FT[0][2] -= 0.12 * k; FT[1][2] -= 0.08 * k; break;
      }
      case 'down': noIK(); flip = -1.45; pivY = 0.22; S('shL', -0.3, 0, 1.2); S('shR', -0.3, 0, -1.2); S('knL', 0.4, 0, 0); S('hipL', -0.3, 0, 0.1); break;
      case 'launched': noIK(); flip = -0.9 - Math.min(1, rig.animT) * 0.5; S('shL', -2.4, 0, 0.6); S('shR', -2.4, 0, -0.6); S('hipL', -0.5, 0, 0); S('knL', 0.8, 0, 0); S('knR', 0.5, 0, 0); S('spine', -0.2, 0, 0); S('head', -0.4, 0, 0); break;
      case 'power': {
        const tr = Math.sin(t * 40) * 0.012;
        S('shL', -0.2, 0, 0.55); S('shR', -0.2, 0, -0.55); S('elL', -0.95, 0, 0); S('elR', -0.95, 0, 0); S('chest', -0.22 + tr, 0, 0); S('spine', 0.05, 0, 0); S('head', -0.18, 0, 0);
        hy = -0.17 + 0.01 * breath; foot(0, fx + 0.15, ANK, 0.05); foot(1, -fx - 0.15, ANK, -0.05); S('hipL', 0, 0.3, 0); S('hipR', 0, -0.3, 0); break;
      }
      case 'burst': { // Aura Burst: curl up, then explode open
        const k = sm(u / 0.32), o = u < 0.42 ? 0 : ebk((u - 0.42) / 0.12), tr = u < 0.42 ? Math.sin(t * 60) * 0.02 * k : 0;
        S('shL', lerp(-0.9 * k, -2.3, o) + tr, 0, lerp(-0.5 * k, 1.3, o)); S('shR', lerp(-0.9 * k, -2.3, o) + tr, 0, lerp(0.5 * k, -1.3, o)); S('elL', lerp(-1.9 * k, -0.15, o), 0, 0); S('elR', lerp(-1.9 * k, -0.15, o), 0, 0);
        S('spine', lerp(0.4 * k, -0.15, o), 0, 0); S('chest', lerp(0.3 * k, -0.35, o), 0, 0); S('head', lerp(0.35 * k, -0.4, o), 0, 0);
        hy = lerp(-0.08 - 0.18 * k, -0.08, o); foot(0, fx + 0.14, ANK, 0.06); foot(1, -fx - 0.14, ANK, -0.06); S('hipL', 0, 0.3, 0); S('hipR', 0, -0.3, 0); break;
      }
      case 'victory': S('shR', -2.95, 0, -0.15); S('elR', -0.2, 0, 0); S('shL', 0.25, 0, 0.5); S('elL', -1.5, 0, 0); S('head', -0.15, 0.15, 0); S('chest', -0.1, 0, 0); S('spine', 0, 0, 0); hy = -0.02; foot(0, fx + 0.04, ANK, 0.05); foot(1, -fx - 0.04, ANK, -0.05); break;
      case 'sign': S('shL', -1.1, 0, -0.45); S('elL', -1.25, 0, 0); S('shR', -1.1, 0, 0.45); S('elR', -1.25, 0, 0); S('head', 0.15, 0, 0); S('spine', 0.05, 0, 0); S('chest', 0, 0, 0); hy = -0.12; foot(0, fx + 0.12, ANK, 0.04); foot(1, -fx - 0.12, ANK, -0.04); break;
      case 'seal': { // the Sanctum Seal: right hand upright before the face, left hand flat beneath it, a cross of palms
        const k = sm(at / 0.3), tr = Math.sin(t * 50) * 0.01 * k;
        S('shR', lerp(-0.32, -0.62, k), lerp(-0.1, 0.32, k), lerp(-0.3, 0.38, k)); S('elR', lerp(-1.6, -2.05, k) + tr, 0, 0); S('haR', 0, lerp(0, -0.9, k), 0);
        S('shL', lerp(-0.5, -0.5, k), lerp(0.1, -0.38, k), lerp(0.32, -0.3, k)); S('elL', lerp(-1.8, -1.62, k), 0, 0); S('haL', lerp(0, -0.3, k), lerp(0, 1.3, k), 0);
        S('spine', 0.04, 0, 0); S('chest', lerp(0.03, -0.06, k), lerp(0.16, 0, k), 0); S('head', lerp(-0.04, 0.12, k), lerp(-0.26, 0, k), 0); S('neck', 0.04 * k, 0, 0);
        hy = lerp(-0.075, -0.15, k) + 0.005 * breath; foot(0, fx + 0.12 * k, ANK, lerp(0.13, 0.06, k)); foot(1, -fx - 0.12 * k, ANK, lerp(-0.12, -0.06, k)); S('hipL', 0, 0.3 * k, 0); S('hipR', 0, -0.3 * k, 0); break;
      }
      case 'point': S('shR', -1.55, 0, -0.05); S('elR', -0.05, 0, 0); break;
      case 'talk': S('shR', -0.45 + Math.sin(t * 3) * 0.12, 0, -0.2); S('elR', -1.1, 0, 0); S('head', Math.sin(t * 2.5) * 0.04, 0, 0); break;
      case 'kneel': noIK(); S('hipL', -1.4, 0, 0.1); S('knL', 1.45, 0, 0); S('hipR', 0.2, 0, -0.1); S('knR', 1.8, 0, 0); S('spine', 0.5, 0, 0); S('head', 0.2, 0, 0); S('shL', -0.3, 0, 0.3); S('shR', -0.3, 0, -0.3); hy = -0.42; break;
      case 'float': S('shL', -0.2, 0, 0.6 + breath * 0.05); S('shR', -0.2, 0, -0.6 - breath * 0.05); S('elL', -0.4, 0, 0); S('elR', -0.4, 0, 0); break; // grounded now: no hovering
    }
    // landing crouch: the hips dip and the planted legs absorb it (IK bends the knees)
    if (rig.landT < 0.32 && FT[0][4]) hy -= 0.15 * rig.landK * Math.min(1, rig.landT / 0.04) * (1 - rig.landT / 0.32) ** 2;
    // ---- 2-bone leg IK (sagittal plane + a hip roll for side offsets) ----
    const hipY = 0.9 + hy;
    for (let i = 0; i < 2; i++) {
      const f = FT[i]; if (!f[4]) continue; const hn = i ? 'hipR' : 'hipL', kn = i ? 'knR' : 'knL', fn = i ? 'ftR' : 'ftL';
      const dx = f[0] - (i ? -0.095 : 0.095) * bw, dy = Math.max(0.05, hipY - f[1]), dz = f[2];
      const dv = Math.hypot(dy, dx), roll = Math.atan2(dx, dy), d = Math.min(Math.hypot(dz, dv), LMAX);
      const k = Math.PI - Math.acos(clamp((2 * L1 * L1 - d * d) / (2 * L1 * L1), -1, 1)), phi = Math.atan2(dz, dv);
      T[hn][0] = -(phi + k / 2); T[hn][2] = roll; T[kn][0] = k; T[kn][1] = 0; T[kn][2] = 0; T[fn][0] = phi - k / 2 + f[3]; T[fn][2] = -roll;
    }
    // ---- cross-fade from the pose shown when the animation (or a replay of it) started ----
    const grp = (LO ? 'loco' : A) + (rig.fight ? 1 : 0), F = rig.F;
    if (grp !== rig.grp || rig.playN !== rig.seenN) {
      let i = 0; for (const n of JN) { const r = J[n].rotation; F[i++] = r.x; F[i++] = r.y; F[i++] = r.z; }
      F[i++] = J.hips.position.y; F[i++] = wrapA(rig.pivot.rotation.x); F[i++] = rig.pivot.position.y;
      rig.grp = grp; rig.seenN = rig.playN; rig.fadeT = 0; rig.fadeD = FADE[LO ? 'loco' : A] ?? 0.12;
    }
    rig.fadeT += dt; const x = clamp(rig.fadeT / rig.fadeD, 0, 1), w = rig.fadeD > 0.15 ? sm(x) : x * (2 - x);
    let i = 0;
    for (const n of JN) { const r = J[n].rotation, a = T[n]; r.x = lerp(F[i++], a[0], w); r.y = lerp(F[i++], a[1], w); r.z = lerp(F[i++], a[2], w); }
    J.hips.position.y = lerp(F[i++], 0.94 + hy, w);
    rig.pivot.rotation.x = lerp(F[i++], flip, w); rig.pivot.position.y = lerp(F[i++], pivY, w);
    if (spin || A === 'atk3') rig.pivot.rotation.y = spin; else rig.pivot.rotation.y = wrapA(rig.pivot.rotation.y) * Math.exp(-16 * dt);
    const sq = rig.sq; rig.model.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    // tails
    const lift = clamp(rig.fwdSpeed * 0.13, -0.2, 1.3) + clamp(-rig.vy * 0.08, -0.3, 1.0);
    for (const tl of rig.tails) {
      tl.chain.forEach((c, i) => {
        const target = tl.base + lift * tl.lift * (0.5 + i * 0.25) + Math.sin(t * 8 + i * 1.3 + tl.ph) * 0.07 * (0.4 + Math.abs(lift)) + (i ? 0.05 : 0);
        c.v += (140 * (target - c.a) - 12 * c.v) * dt; c.a += c.v * dt; c.a = clamp(c.a, -0.6, 1.7);
        c.j.rotation.x = c.a; c.j.rotation.z = Math.sin(t * 5 + i + tl.ph) * 0.05;
      });
    }
    if (rig.cape) {
      const c = rig.cape, tgt = 0.1 + lift * 0.55 + Math.sin(t * 7 + 1) * 0.035 * (0.3 + Math.abs(lift)) + (A === 'dodge' || A === 'flip' ? 0.5 : 0) + (A === 'air' ? 0.25 : 0);
      if (dt > 0) { c.v += (90 * (tgt - c.a) - 10 * c.v) * dt; c.a = clamp(c.a + c.v * dt, -0.25, 1.5); }
      c.sway = Math.sin(t * 2.3) * 0.05 - J.chest.rotation.y * 0.12; bendCape(c);
    }
    // blink
    rig.blinkT -= dt;
    if (rig.blinkT < 0 && rig.cfg.face.type !== 'mask') {
      if (rig.emo !== 'blink' && ['neutral', 'determined', 'angry'].includes(rig.baseEmo)) { rig.emo = 'blink'; rig.face.material.map = faceTexture(rig.cfg.face, 'blink'); rig.blinkT = 0.12; }
      else { rig.emo = rig.baseEmo; rig.face.material.map = faceTexture(rig.cfg.face, rig.baseEmo); rig.blinkT = rand(2, 4.5); }
    }
    if (rig.halo) rig.halo.rotation.z += dt;
    // wind-up glint on the striking hand (bosses / enemies), so attacks read before they land
    if (glint > 0.01 && !rig.isPlayer) {
      if (!rig.glint) { rig.glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff5a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); rig.glint.position.set(0, -0.08, 0.02); }
      const hj = A === 'raise' || A === 'cast2' || A === 'dash' ? J.chest : J.haR; if (rig.glint.parent !== hj) hj.add(rig.glint);
      rig.glint.visible = true; rig.glint.material.opacity = Math.min(1, glint * 1.2); rig.glint.scale.setScalar((0.35 + 0.9 * glint) * (1 + 0.15 * Math.sin(t * 30)));
    } else if (rig.glint) rig.glint.visible = false;
    // slash trails
    const ts = TRAIL_SPEC[A] || (WIND_TRAIL[A] && glint > 0 && rig.animT > 0 ? [WIND_TRAIL[A], WIND_TRAIL[A] === 'haR' ? 'elR' : 'elL', -1, -1] : null);
    let on = false;
    if (ts) { if (ts[2] < 0) { const W = Math.max(0.2, dur - (WIND_TAIL[A] || 0.45)), sS = A === 'claw' ? 0.6 * W : W - 0.07; on = at > sS - 0.02 && at < sS + 0.22; } else on = u > ts[2] && u < ts[3]; }
    if ((on || (rig.trail && rig.trail.live > 0)) && dt > 0) updateTrail(rig, on ? ts : null, dt);
  }
  // ribbon trail behind a fist / foot: a small ring buffer of world-space samples, drawn additive with fading alpha
  const TRAIL_N = 14;
  function updateTrail(rig, ts, dt) {
    let tr = rig.trail;
    if (!tr) {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(TRAIL_N * 6), al = new Float32Array(TRAIL_N * 2), idx = [];
      for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('a', new THREE.BufferAttribute(al, 1)); geo.setIndex(idx);
      const mat = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(rig.isPlayer ? 0x9a8cff : 0xff6a4a) } },
        vertexShader: 'attribute float a; varying float vA; void main(){ vA=a; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
        fragmentShader: 'uniform vec3 col; varying float vA; void main(){ gl_FragColor=vec4(mix(col*1.3, vec3(1.0), vA*vA*0.7), vA*0.9);} ',
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.visible = false; m.renderOrder = 5; scene.add(m);
      tr = rig.trail = { m, geo, pos, al, pts: [], live: 0 };
    }
    if (rig.isPlayer && rig.trailCol !== undefined) tr.m.material.uniforms.col.value.set(rig.trailCol);
    if (ts) {
      const h = rig.J[ts[0]].getWorldPosition(_tv1), e = rig.J[ts[1]].getWorldPosition(_tv2), d = _tv3.subVectors(h, e).normalize(), sc = rig.cfg.scale || 1;
      const ix = h.x - d.x * 0.08 * sc, iy = h.y - d.y * 0.08 * sc, iz = h.z - d.z * 0.08 * sc, ox = h.x + d.x * 0.36 * sc, oy = h.y + d.y * 0.36 * sc, oz = h.z + d.z * 0.36 * sc;
      const lp = tr.pts[0];
      if (lp) for (let s = 1; s <= 2; s++) { const k = s / 3; tr.pts.unshift([lerp(lp[0], ix, k), lerp(lp[1], iy, k), lerp(lp[2], iz, k), lerp(lp[3], ox, k), lerp(lp[4], oy, k), lerp(lp[5], oz, k)]); }
      tr.pts.unshift([ix, iy, iz, ox, oy, oz]); tr.live = 0.16;
    } else { tr.live -= dt; tr.pts.splice(Math.max(1, tr.pts.length - 3)); }
    if (tr.pts.length > TRAIL_N) tr.pts.length = TRAIL_N;
    const n = tr.pts.length, fade = clamp(tr.live / 0.16, 0, 1);
    for (let i = 0; i < TRAIL_N; i++) {
      const p = tr.pts[Math.min(i, n - 1)] || [0, 0, 0, 0, 0, 0], a = i < n ? (1 - i / Math.max(1, n - 1)) * fade : 0;
      tr.pos.set(p, i * 6); tr.al[i * 2] = a * 0.5; tr.al[i * 2 + 1] = a;
    }
    tr.geo.attributes.position.needsUpdate = true; tr.geo.attributes.a.needsUpdate = true; tr.m.visible = n > 1 && tr.live > 0;
    if (tr.live <= 0) tr.pts.length = 0;
  }
  function play(rig, anim, dur) { rig.anim = anim; rig.animT = 0; rig.animDur = dur || 1; rig.playN = (rig.playN || 0) + 1; if (anim === 'hurt') rig.hurtSide = Math.random() < 0.5 ? -1 : 1; }

  // ---------- player ----------
  const COMBO = [
    { anim: 'atk1', dur: 0.32, hit: 0.11, dmg: 8, kb: 2.5, lunge: 5, range: 1.9, tilt: 0.3 },
    { anim: 'atk2', dur: 0.32, hit: 0.11, dmg: 9, kb: 2.5, lunge: 5, range: 1.9, tilt: -0.3 },
    { anim: 'atk3', dur: 0.48, hit: 0.22, dmg: 12, kb: 6, lunge: 4, range: 2.3, tilt: 0.05, arc: 3.2 },
    { anim: 'launch', dur: 0.55, hit: 0.22, dmg: 15, kb: 2, lunge: 3, range: 2.0, launch: 10, heavy: true, tilt: 1.4 },
  ];
  function makePlayer() {
    const rig = makeRen();
    const p = makeFighter(rig, { hp: 100, maxHp: 100, aura: 0, combo: 0, comboWin: 0, cd: { dash: 0, power: 0, dodge: 0 }, jumps: 2, coyote: 0, safe: new THREE.Vector3(), book: null, bookT: 0 });
    rig.fight = true; rig.isPlayer = true;
    // grimoire book
    const book = new THREE.Group(); scene.add(book); book.visible = false;
    const cov = toon(0xb0142a, { em: 0x400010, ei: 1 }), pg = toon(0xfff4e0);
    for (const s of [-1, 1]) { const half = new THREE.Group(); half.rotation.y = s * 0.5; book.add(half); part(half, G.box, cov, [s * 0.17, 0, 0], [0.34, 0.46, 0.04]); part(half, G.box, pg, [s * 0.16, 0, 0.03], [0.3, 0.42, 0.03], null, null); }
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff5a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); bg.scale.setScalar(1.6); book.add(bg);
    book.scale.setScalar(0.72); p.book = book;
    return p;
  }
  function nearestEnemy(from, maxD, dirYaw, cone) {
    let best = null, bd = maxD;
    for (const e of enemies) {
      if (e.dead || e.decoyHidden) continue; const dx = e.pos.x - from.x, dz = e.pos.z - from.z, d = Math.hypot(dx, dz);
      if (d > bd) continue; if (cone !== undefined && Math.abs(angDiff(dirYaw, Math.atan2(dx, dz))) > cone) continue;
      best = e; bd = d;
    }
    return best;
  }
  function faceTarget(p, t) { if (t) p.yaw = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z); }
  function gainAura(v) { player.aura = clamp(player.aura + v * PASSIVE.aura(), 0, 100); }

  function damageEnemy(e, dmg, o = {}) {
    if (e.dead) return;
    if (typeof dmg === 'number') dmg = Math.round(dmg * PASSIVE.dmg());
    const hp = e.pos.clone(); hp.y += 1.3 * (e.rig.cfg.scale || 1);
    const src = o.from || (player ? player.pos : e.pos);
    const front = Math.abs(angDiff(e.yaw, Math.atan2(src.x - e.pos.x, src.z - e.pos.z))) < 1.35;
    // i-frames: some boss moves, enemy evades
    if (e.iframe > 0 || e.state === 'evade') { if (!o.tick) { dmgNumber(hp.clone().add(new THREE.Vector3(0, 0.6, 0)), 'MISS', false, '#9ff8ff'); flash(hp, 1, 0x9ff8ff); } return; }
    // guard: blocks frontal hits; heavy hits / spells break a normal enemy's guard
    if (e.state === 'guard' && (e.boss || front)) {
      if (!e.boss && (o.heavy || o.spell)) { e.state = 'stagger'; e.st = -0.7; e.guardFx && (e.guardFx.visible = false); dmgNumber(hp.clone().add(new THREE.Vector3(0, 0.9, 0)), 'BREAK', true, '#ffd27a'); shockRing(e.pos, 1.6, 0x7ad8ff, 0.3); sfx('guardBreakHit'); }
      else {
        const chip = Math.max(1, Math.round(dmg * 0.12)); e.hp -= chip; state.combo++; state.comboT = 2.2;
        if (!o.tick) { dmgNumber(hp.clone().add(new THREE.Vector3(0, 0.6, 0)), 'BLOCK', false, '#7ad8ff'); flash(hp, 1.3, 0x7ad8ff); sfx('blockHit'); hitStop = Math.max(hitStop, 0.03); }
        if (!e.boss) e.kb.set(e.pos.x - src.x, 0, e.pos.z - src.z).normalize().multiplyScalar(2);
        if (e.hp <= 0) killEnemy(e); return;
      }
    }
    if (e.boss && e.def.armorMul) dmg = Math.round(dmg * e.def.armorMul);
    e.hp -= dmg; state.hits++; state.combo++; state.comboT = 2.2; gainAura((o.heavy ? 6 : o.tick ? 1 : 3.5) * (o.ult ? 0 : D().aura));
    // bosses read a long string of hits and answer with a guard + counter
    if (e.boss && !o.ally && !o.tick) { e.chainHits = (e.recentT > 0 ? e.chainHits || 0 : 0) + 1; e.recentT = 1.1; if (e.chainHits >= D().guardHits && (e.state === 'idle' || e.state === 'chase') && e.hp > 0) { e.chainHits = 0; e.wantGuard = true; } }
    dmgNumber(hp.clone().add(new THREE.Vector3(0, 0.6, 0)), dmg, o.heavy); flash(hp, o.heavy ? 2.4 : 1.4, o.color || 0xfff2a0);
    burst(hp.x, hp.y, hp.z, o.heavy ? 18 : 9, o.color || 0xffd27a, 7, 0.35, 0.2);
    hitStop = Math.max(hitStop, o.heavy ? 0.11 : 0.05); cam.shake = Math.max(cam.shake, o.heavy ? 0.35 : 0.14);
    if (o.heavy && quality !== 'low') impact = 2;
    emit('hit', { damage: dmg, heavy: !!o.heavy, combo: state.combo });
    const dir = o.dir || new THREE.Vector3(e.pos.x - src.x, 0, e.pos.z - src.z).normalize();
    if (!e.boss && e.rootT > 0) { /* rooted in place: takes the hit without moving */ }
    else if (!e.boss && o.tick) { /* void pull ticks don't knock back */ }
    else if (!e.boss || e.stagger) {
      e.kb.copy(dir).multiplyScalar(o.kb || 3);
      if (o.launch && !e.boss) { e.vel.y = o.launch; e.grounded = false; e.state = 'launched'; e.st = 0; play(e.rig, 'launched'); }
      else if (e.state !== 'launched') { e.state = 'stagger'; e.st = 0; play(e.rig, 'hurt', 0.4); }
      else { e.vel.y = Math.max(e.vel.y, 4); }
    } else if (!(e.poiseLock > 0)) { e.poise = (e.poise || 0) + dmg; if (e.poise > (e.def.poise || 70) * D().poise && e.state !== 'rage') { e.poise = 0; e.poiseLock = 5; e.wantGuard = false; e.chainHits = 0; e.state = 'stagger'; e.st = -1.2; play(e.rig, e.def.id === 'warden' ? 'kneel' : 'hurt', 1.5); cancelTele(e); endBossAttackFx(e); } }
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e) {
    if (e.dead) return;
    if (e.boss && e.def.onDefeat) { e.hp = 0; e.dead = true; e.def.onDefeat(e); return; }
    e.dead = true; e.state = 'dying'; e.st = 0; play(e.rig, 'down'); cancelTele(e); relTok(e);
    const p = e.pos; burst(p.x, p.y + 1, p.z, 30, e.decoy ? 0xff2a4a : 0xb48cff, 6, 0.7, 0.35, 2);
    if (!e.decoy) { emit('enemyDown', {}); sfx('enemyDown'); if (Math.random() < 0.35) spawnHeal(p); }
    if (lockTarget === e) lockTarget = null;
  }
  function spawnHeal(p) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x5aff9a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.scale.setScalar(0.9); s.position.copy(p).add(new THREE.Vector3(0, 0.8, 0)); scene.add(s); pickups.push({ mesh: s, t: 0 }); }
  function hurtPlayer(dmg, from) {
    const p = player; if (!p || p.dead || state.screen !== 'play') return false;
    if (p.inv > 0) { if (p.state === 'dodge' && !p.perfect) { p.perfect = true; slowT = 0.5; gainAura(12); sfx('perfect'); flash(p.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 2.5, 0x9ff8ff); } return false; }
    if (god) return false;
    dmg = Math.max(1, Math.round(dmg * D().dmg * PASSIVE.taken()));
    p.hp -= dmg; state.hitsTaken++; p.inv = 0.7; state.combo = 0;
    if (from) { const d = new THREE.Vector3(p.pos.x - from.x, 0, p.pos.z - from.z).normalize(); p.kb.copy(d).multiplyScalar(7); }
    cam.shake = 0.4; hitStop = 0.06; burst(p.pos.x, p.pos.y + 1.2, p.pos.z, 12, 0xff4a5a, 6, 0.4, 0.25);
    emit('hurt', { damage: dmg, hp: Math.max(0, p.hp) });
    setEmotionT(p.rig, 'hurt', 0.5);
    if (p.hp <= 0) { p.hp = 0; p.dead = true; p.state = 'dead'; play(p.rig, 'down'); p.rig.aura.visible = false; setTimeout(() => { if (state.screen === 'play') { setScreen('dead'); emit('dead', {}); } }, 1200); }
    else { p.state = 'hurt'; p.st = 0; play(p.rig, 'hurt', 0.35); }
    return true;
  }
  function setEmotionT(rig, emo, dur) { setEmotion(rig, emo); clearTimeout(rig._et); rig._et = setTimeout(() => setEmotion(rig, rig === player?.rig ? 'determined' : 'neutral'), dur * 1000); }

  function updatePlayer(dt) {
    const p = player, rig = p.rig; if (!p) return;
    rig.trailCol = equipped && GRIM(equipped) ? GRIM(equipped).color : 0x9a8cff;
    for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
    for (const k in gcd) gcd[k] = Math.max(0, gcd[k] - dt); castLock = Math.max(0, castLock - dt);
    p.inv = Math.max(0, p.inv - dt); p.st += dt;
    if (p.book.visible) { p.bookT -= dt; const tgt = p.pos.clone().add(new THREE.Vector3(Math.sin(p.yaw + 1.35) * 0.55, 1.05 + Math.sin(rig.t * 3) * 0.05, Math.cos(p.yaw + 1.35) * 0.55)); /* tucked by his hip, out of the view */ p.book.position.lerp(tgt, 1 - Math.exp(-10 * dt)); p.book.rotation.y = p.yaw; if (p.bookT < 0) p.book.visible = false; if (Math.random() < 0.3) spawnP(PA, p.book.position.x, p.book.position.y, p.book.position.z, rand(-0.5, 0.5), 1, rand(-0.5, 0.5), 0.5, 0.14, p.bookCol || 0xff7a2a); }
    if (p.dead) { p.vel.x = p.vel.z = 0; physics(p, dt); return; }
    const playing = state.screen === 'play';
    // camera-relative movement
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    let mx = playing ? input.moveX : 0, my = playing ? input.moveY : 0; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    const wx = fx * my - fz * mx, wz = fz * my + fx * mx; const wl = Math.hypot(wx, wz);
    if (playing) {
      if (pressed.lockOn) { lockTarget = lockTarget ? null : nearestEnemy(p.pos, 25); sfx('lock'); }
      if (lockTarget && (lockTarget.dead || lockTarget.pos.distanceTo(p.pos) > 30)) lockTarget = null;
    }
    const busy = ['atk', 'dodge', 'dash', 'cast', 'ult', 'hurt'].includes(p.state);
    // actions
    if (playing) {
      if (pressed.ultimate && p.aura >= 100 && p.state !== 'ult') { startUlt(); }
      else if (pressed.dodge && p.cd.dodge <= 0 && p.state !== 'ult' && p.state !== 'dash') {
        // with a direction: a dodge roll that way; with no direction on the ground: a quick back-step, guard up
        const back = wl <= 0.1 && p.grounded;
        p.state = 'dodge'; p.st = 0; p.inv = 0.38; p.perfect = false; p.cd.dodge = 0.55; play(rig, back ? 'step' : 'dodge', back ? 0.36 : 0.4);
        if (wl > 0.1) p.yaw = Math.atan2(wx, wz);
        p.dodgeDir = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)).multiplyScalar(back ? -0.8 : 1); sfx('dodge');
      } else if (pressed.power && !busy) {
        // the equipped grimoire's spell; while it recharges (or with none equipped) Power is Aura Dash
        const hasD = powers.includes('dash');
        if (equipped && GRIM(equipped) && (gcd[equipped] || 0) <= 0 && castLock <= 0) castSpell(equipped); else if (hasD && p.cd.dash <= 0) startDash();
      } else if (pressed.jump && p.state !== 'ult' && p.state !== 'hurt' && (p.jumps > 0)) {
        const first = p.grounded || p.coyote > 0; if (first || p.jumps > 0) { p.vel.y = first ? 9.5 : 8.5; p.grounded = false; p.coyote = 0; p.jumps--; if (!first) { play(rig, 'flip', 0.45); burst(p.pos.x, p.pos.y + 0.2, p.pos.z, 10, 0xb48cff, 3, 0.4, 0.25, 0); } sfx('jump'); if (p.state === 'atk') p.state = 'idle'; }
      }
      if (pressed.attack) p.atkBuf = 0.35;
      if (pressed.swapGrimoire && grims.length) { const i = grims.indexOf(equipped); equipGrimoire(grims[(i + 1) % grims.length], true); } // from none (Aura Dash) this picks the first book
    }
    p.atkBuf = Math.max(0, (p.atkBuf || 0) - dt);
    if (p.atkBuf > 0 && playing && (p.state === 'idle' || (p.state === 'atk' && p.st > COMBO[p.combo].hit + 0.06))) {
      p.atkBuf = 0;
      let next = p.state === 'atk' ? p.combo + 1 : (p.comboWin > 0 ? p.combo + 1 : 0); if (next >= COMBO.length) next = 0;
      if (!p.grounded && next === 3) next = 0;
      p.combo = next; p.state = 'atk'; p.st = 0; p.hitDone = false; const c = COMBO[next]; play(rig, c.anim, c.dur);
      const t = lockTarget || nearestEnemy(p.pos, 5.5, wl > 0.1 ? Math.atan2(wx, wz) : p.yaw, 1.8);
      if (t) faceTarget(p, t); else if (wl > 0.1) p.yaw = Math.atan2(wx, wz);
      p.lungeT = t; sfx('whoosh'); atkSerial++;
      if (!p.grounded) p.vel.y = Math.max(p.vel.y, 2.5);
    }
    p.comboWin = Math.max(0, p.comboWin - dt);
    // state behaviours
    let speed = 0;
    if (p.state === 'atk') {
      const c = COMBO[p.combo];
      const lungeOK = !p.lungeT || p.lungeT.pos.distanceTo(p.pos) > 1.5;
      if (p.st < c.hit && lungeOK) { p.vel.x = Math.sin(p.yaw) * c.lunge; p.vel.z = Math.cos(p.yaw) * c.lunge; } else { p.vel.x *= 0.7; p.vel.z *= 0.7; }
      if (!p.hitDone && p.st >= c.hit) {
        p.hitDone = true; const ch = p.pos.clone().add(new THREE.Vector3(Math.sin(p.yaw) * 0.8, 1.15, Math.cos(p.yaw) * 0.8));
        slashArc(ch, p.yaw, c.tilt, c.heavy ? 1.9 : 1.5, c.heavy ? 0xff5ad8 : 0x8a7cff, c.combo % 2);
        for (const e of enemies) {
          if (e.dead || e.decoyHidden) continue; const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
          if (d < c.range + e.radius && Math.abs(angDiff(p.yaw, Math.atan2(dx, dz))) < (c.arc || 1.3) && Math.abs(e.pos.y - p.pos.y) < 2.5 * (e.rig.cfg.scale || 1)) damageEnemy(e, c.dmg + Math.floor(rand(0, 3)), { kb: c.kb, launch: c.launch, heavy: c.heavy });
        }
      }
      if (p.st >= c.dur) { p.state = 'idle'; p.comboWin = 0.35; if (p.combo === 3) p.comboWin = 0; }
    } else if (p.state === 'dodge' && p.atkBuf > 0 && p.st > 0.05 && playing && powers.includes('dash') && p.cd.dash <= 0) {
      p.atkBuf = 0; startDash(); // dodge + attack = Aura Dash strike
    } else if (p.state === 'dodge') {
      const k = p.st < 0.28 ? 15 : 3; p.vel.x = p.dodgeDir.x * k; p.vel.z = p.dodgeDir.z * k;
      if (Math.random() < 0.6) spawnP(PA, p.pos.x + rand(-0.3, 0.3), p.pos.y + rand(0.3, 1.5), p.pos.z, 0, 0.5, 0, 0.35, 0.35, 0x9a8cff);
      if (p.st > 0.4) { p.state = 'idle'; }
    } else if (p.state === 'dash') {
      p.vel.x = Math.sin(p.yaw) * 30; p.vel.z = Math.cos(p.yaw) * 30; p.vel.y = Math.max(p.vel.y, 0);
      for (let i = 0; i < 4 * qMul; i++) spawnP(PA, p.pos.x + rand(-0.3, 0.3), p.pos.y + rand(0.4, 1.6), p.pos.z + rand(-0.3, 0.3), 0, 0, 0, 0.4, 0.45, i % 2 ? 0x4fc3ff : 0xb48cff);
      for (const e of enemies) { if (e.dead || p.dashHit.has(e)) continue; if (e.pos.distanceTo(p.pos) < 1.8 + e.radius) { p.dashHit.add(e); damageEnemy(e, 18, { kb: 7, heavy: true, color: 0x7ad8ff, launch: 6 }); } }
      if (p.st > 0.26) { p.state = 'idle'; rig.aura.visible = false; p.vel.x *= 0.2; p.vel.z *= 0.2; }
    } else if (p.state === 'cast') { p.vel.x *= 0.8; p.vel.z *= 0.8; if (p.st > 0.45) p.state = 'idle'; }
    else if (p.state === 'hurt') { if (p.st > 0.35) p.state = 'idle'; }
    else if (p.state === 'ult') { p.vel.x = p.vel.z = 0; }
    else if (p.state === 'idle') {
      speed = 7.2 * Math.min(1, wl);
      p.vel.x = wx / (wl || 1) * speed; p.vel.z = wz / (wl || 1) * speed;
      if (wl > 0.1) { const ty = lockTarget ? Math.atan2(lockTarget.pos.x - p.pos.x, lockTarget.pos.z - p.pos.z) : Math.atan2(wx, wz); p.yaw += angDiff(p.yaw, ty) * (1 - Math.exp(-14 * dt)); }
      else if (lockTarget) faceTarget(p, lockTarget);
      if (rig.anim !== 'flip' || rig.animT > 0.45) rig.anim = p.grounded ? (speed > 0.5 ? 'run' : 'idle') : 'air';
    }
    p.vel.x += p.kb.x; p.vel.z += p.kb.z; p.kb.multiplyScalar(Math.exp(-8 * dt));
    physics(p, dt);
    // fall-out
    if (p.pos.y < (level ? -9 : -50)) { p.pos.copy(p.safe); p.vel.set(0, 0, 0); if (!god) { p.hp = Math.max(1, p.hp - 10); emit('hurt', { damage: 10, hp: p.hp }); } sfx('fall'); }
    if (p.grounded && groundAt(p.pos.x, p.pos.z, p.pos.y) > -1e9 && p.state !== 'dash') { const g = groundAt(p.pos.x + 1.2, p.pos.z, p.pos.y), g2 = groundAt(p.pos.x - 1.2, p.pos.z, p.pos.y), g3 = groundAt(p.pos.x, p.pos.z + 1.2, p.pos.y), g4 = groundAt(p.pos.x, p.pos.z - 1.2, p.pos.y); if (g > -1e9 && g2 > -1e9 && g3 > -1e9 && g4 > -1e9) p.safe.copy(p.pos); }
    // aura particles
    const powered = p.aura >= 100 || rig.aura.visible;
    if (powered && Math.random() < 0.5 * qMul) spawnP(PA, p.pos.x + rand(-0.4, 0.4), p.pos.y + rand(0, 1.6), p.pos.z + rand(-0.4, 0.4), 0, rand(1, 2.5), 0, 0.6, 0.3, Math.random() < 0.5 ? 0x8a6cff : 0x4fc3ff);
    rig.model.traverse; // noop
    syncFighter(p, dt);
  }
  function physics(f, dt) {
    f.vel.y -= (f.gravity ?? 26) * dt;
    const nx = f.pos.x + f.vel.x * dt, nz = f.pos.z + f.vel.z * dt;
    if (!blocked(nx, f.pos.z, f.pos.y)) f.pos.x = nx; if (!blocked(f.pos.x, nz, f.pos.y)) f.pos.z = nz;
    if (level && level.solids) for (const c of level.solids) {
      const dx = f.pos.x - c.x, dz = f.pos.z - c.z, rr = c.r + 0.3;
      if (dx * dx + dz * dz < rr * rr && f.pos.y < c.y + c.h && f.pos.y > c.y - 1) { const d = Math.hypot(dx, dz) || 0.001; f.pos.x = c.x + dx / d * rr + (Math.abs(dx / d) < 0.35 ? (dx >= 0 ? 0.04 : -0.04) : 0); f.pos.z = c.z + dz / d * rr; }
    }
    if (state.boss && level && f !== null && f.kind !== 'proj') { const a = level.arena, dx = f.pos.x - a.x, dz = f.pos.z - a.z, d = Math.hypot(dx, dz); if (d > a.r - 0.6 && bossActive) { f.pos.x = a.x + dx / d * (a.r - 0.6); f.pos.z = a.z + dz / d * (a.r - 0.6); } }
    f.pos.y += f.vel.y * dt;
    const g = groundAt(f.pos.x, f.pos.z, f.pos.y - f.vel.y * dt);
    f.coyote = Math.max(0, (f.coyote || 0) - dt);
    if (g > -1e9 && f.pos.y <= g && f.vel.y <= 0) { if (!f.grounded && f.vel.y < -6) { if (f === player) sfx('land'); } f.pos.y = g; f.vel.y = 0; f.grounded = true; f.jumps = 2; f.coyote = 0.12; }
    else if (f.grounded && g > -1e9 && f.pos.y - g < 0.3) { f.pos.y = g; f.vel.y = 0; }
    else { if (f.grounded) f.jumps = 1; f.grounded = false; }
    if (f.fly) { f.pos.y = Math.max(f.pos.y, f.fly); }
  }
  function startDash() {
    const p = player; p.state = 'dash'; p.st = 0; p.inv = 0.3; p.cd.dash = 2.2; p.dashHit = new Set(); play(p.rig, 'dash', 0.3); p.rig.aura.visible = true;
    const t = lockTarget || nearestEnemy(p.pos, 12, p.yaw, 1.0); if (t) faceTarget(p, t);
    OV.speed.value = 1; sfx('dash'); cam.shake = 0.15;
  }
  // ---------- grimoire collection + spells ----------
  const hexOf = (c) => new THREE.Color(c).getHex();
  function addGrimoire(id) { if (GRIM(id) && !grims.includes(id)) grims.push(id); }
  function equipGrimoire(id, fx) {
    if (id != null && !grims.includes(id)) return false;
    equipped = id == null ? null : id; const g = GRIM(equipped);
    if (player && g) {
      tintBook(g.color);
      if (fx && state.screen === 'play') { const p = player; if (!p.book.visible) p.book.position.copy(p.pos).add(new THREE.Vector3(0, 1.05, 0)); p.book.visible = true; p.bookT = Math.max(p.bookT, 1.2); shockRing(p.pos, 1.8, g.color, 0.35); burst(p.pos.x, p.pos.y + 1.4, p.pos.z, 14, g.color, 3, 0.5, 0.3, 0); }
    }
    emit('equip', { id: equipped, name: g ? g.name : 'Aura Dash', color: g ? g.color : null, icon: g ? g.icon : null }); if (fx) sfx('equip');
    return true;
  }
  // recolour Ren's floating book to the equipped grimoire (covers + glow; near-white page materials are left alone)
  function tintBook(col) {
    const p = player; if (!p || !p.book) return; const c = new THREE.Color(col); p.bookCol = c.getHex();
    p.book.traverse((o) => {
      if (o.isSprite && o.material) o.material.color.copy(c);
      else if (o.isMesh && o.material && o.material.isMeshToonMaterial && !o.userData.outline) {
        // the book shares cached toon materials, so give it its own copies once
        if (!o.userData.bookMat) { o.material = o.material.clone(); o.userData.bookMat = true; o.userData.page = o.material.color.r + o.material.color.g + o.material.color.b > 2.4; }
        if (!o.userData.page) { o.material.color.copy(c).multiplyScalar(0.8); o.material.emissive.copy(c).multiplyScalar(0.35); }
      }
    });
  }
  function castSpell(id) {
    const g = GRIM(id), S = g.spell, fn = SPELLS[S.kind]; if (!fn || !player) return;
    const p = player; p.state = 'cast'; p.st = 0; play(p.rig, 'cast', 0.5); gcd[id] = S.cd * PASSIVE.cd(); castLock = 0.7;
    if (!p.book.visible) p.book.position.copy(p.pos).add(new THREE.Vector3(0, 1.05, 0)); p.book.visible = true; p.bookT = 2.5; tintBook(g.color);
    const t = lockTarget || nearestEnemy(p.pos, 16, p.yaw, 1.4); if (t) faceTarget(p, t);
    fn(S, hexOf(g.color), t);
    emit('cast', { id, name: g.name });
  }
  const SPELLS = {
    // Crimson Pages: homing fire blades (the original grimoire)
    fire(S, col) {
      const p = player; sfx('spellFire');
      const targets = enemies.filter((e) => !e.dead && !e.decoyHidden && e.pos.distanceTo(p.pos) < 22);
      for (let i = 0; i < S.count; i++) {
        const m = new THREE.Mesh(G.cone, new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(0.12, 0.8, 0.12); scene.add(m);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff4a1a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); glow.scale.setScalar(1.2); m.add(glow);
        const a = p.yaw + (i - (S.count - 1) / 2) * 0.35; const pos = p.pos.clone().add(new THREE.Vector3(0, 1.9, 0));
        projectiles.push({ mesh: m, pos, vel: new THREE.Vector3(Math.sin(a) * 9, 3, Math.cos(a) * 9), owner: 'player', dmg: S.dmg, life: 2.5, target: targets.length ? targets[i % targets.length] : null, delay: i * 0.06, color: 0xff7a2a, trail: 0xff6a1a, radius: 0.9 });
      }
    },
    // Gale: wide horizontal wind crescents that pierce everything in a line
    gale(S, col) {
      const p = player; sfx('galeWind'); cam.shake = Math.max(cam.shake, 0.15); OV.speed.value = Math.max(OV.speed.value, 0.5);
      for (let i = 0; i < S.count; i++) {
        const a = p.yaw + (i - (S.count - 1) / 2) * 0.2;
        const m = new THREE.Mesh(ARC_G, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.scale.setScalar(2.1);
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); gl.scale.setScalar(1.4); m.add(gl); scene.add(m);
        const pos = p.pos.clone().add(new THREE.Vector3(Math.sin(a) * 0.6, 0.9 + i * 0.22, Math.cos(a) * 0.6));
        projectiles.push({ mesh: m, pos, vel: new THREE.Vector3(Math.sin(a) * S.speed, 0, Math.cos(a) * S.speed), owner: 'player', dmg: S.dmg, life: S.range / S.speed, delay: 0, color: col, trail: 0xc8fff0, radius: 1.5, pierce: true, hitSet: new Set(), arc: true, flat: true, yaw: a, kb: 4 });
      }
      slashArc(p.pos.clone().add(new THREE.Vector3(Math.sin(p.yaw) * 0.8, 1.2, Math.cos(p.yaw) * 0.8)), p.yaw, 0.1, 2.2, col);
    },
    // Shadow: two shadow clones of Ren that fight on their own for a few seconds
    shadow(S, col) {
      const p = player; sfx('shadowClone'); for (const a of allies) a.life = Math.min(a.life, 0.05);
      for (let i = 0; i < S.count; i++) { const side = i % 2 ? 1 : -1; spawnAlly(p.pos.clone().add(new THREE.Vector3(Math.cos(p.yaw) * side * 1.5, 0, -Math.sin(p.yaw) * side * 1.5)), S, col, i); }
      shockRing(p.pos, 3, col, 0.45); burst(p.pos.x, p.pos.y + 1, p.pos.z, 30, col, 5, 0.6, 0.4, 0);
    },
    // Thorn: roots erupt under nearby enemies and hold them in place
    thorn(S, col) {
      const p = player; sfx('thornRoot'); cam.shake = Math.max(cam.shake, 0.3); shockRing(p.pos, S.radius, col, 0.5);
      const list = enemies.filter((e) => !e.dead && !e.decoyHidden && e.state !== 'spawn' && e.pos.distanceTo(p.pos) < S.radius).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, 8);
      for (const e of list) {
        spikeBurst(e.pos.clone(), 0x4a8a2a); e.rootT = e.boss ? S.bossRoot : S.root; showVine(e, col);
        damageEnemy(e, S.dmg, { spell: true, kb: 0, color: col });
        if (!e.boss && !e.dead && e.state !== 'launched') { e.state = 'rooted'; e.st = 0; relTok(e); cancelTele(e); play(e.rig, 'hurt', 0.4); }
      }
      if (!list.length) for (let i = 1; i <= 4; i++) spikeBurst(p.pos.clone().add(new THREE.Vector3(Math.sin(p.yaw) * i * 2, 0, Math.cos(p.yaw) * i * 2)), 0x4a8a2a);
    },
    // Void: an orb that drags enemies in, then bursts
    void(S, col, t) {
      const p = player; sfx('voidCharge');
      let to = t ? t.pos.clone() : p.pos.clone().add(new THREE.Vector3(Math.sin(p.yaw) * 7, 0, Math.cos(p.yaw) * 7));
      const off = to.clone().sub(p.pos).setY(0); if (off.length() > 12) to = p.pos.clone().add(off.setLength(12));
      to.y = (t ? t.pos.y : p.pos.y) + 1.4;
      const core = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0x07000f })); core.scale.setScalar(0.15);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); halo.scale.setScalar(5); core.add(halo);
      const ring = new THREE.Mesh(G.torus, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); ring.scale.set(1.5, 1.5, 0.35); core.add(ring);
      const ring2 = ring.clone(); ring2.rotation.x = Math.PI / 2; core.add(ring2);
      scene.add(core); core.position.copy(p.pos).setY(p.pos.y + 1.4);
      spells.push({ kind: 'void', mesh: core, ring, ring2, from: core.position.clone(), to, t: 0, S, col, tickT: 0.2 });
    },
    // Dune (Sabulo): a sandstorm funnel that rolls forward, sweeps enemies along and bursts at the end
    dune(S, col) {
      const p = player; sfx('galeWind'); cam.shake = Math.max(cam.shake, 0.2);
      const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(CONE8, mat); c.rotation.x = Math.PI; c.scale.set(0.9 + k * 0.75, 3.4 - k * 0.4, 0.9 + k * 0.75); c.position.y = 1.7 + k * 0.45; g.add(c); }
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 })); gl.scale.setScalar(6); gl.position.y = 1.6; g.add(gl);
      g.position.copy(p.pos).add(new THREE.Vector3(Math.sin(p.yaw) * 1.2, 0, Math.cos(p.yaw) * 1.2)); scene.add(g);
      spells.push({ kind: 'dune', mesh: g, dir: new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)), t: 0, S, col, tickT: 0, caught: new Set() });
    },
    // Frost (Fubuki): three lines of ice pillars race out and freeze what they touch
    frost(S, col) {
      const p = player; sfx('thornRoot'); cam.shake = Math.max(cam.shake, 0.2); shockRing(p.pos, 2.2, col, 0.35);
      const lines = []; for (let l = 0; l < S.lines; l++) { const a = p.yaw + (l - (S.lines - 1) / 2) * 0.34; lines.push([Math.sin(a), Math.cos(a)]); }
      const g = new THREE.Group(); scene.add(g);
      spells.push({ kind: 'frost', mesh: g, origin: p.pos.clone(), lines, step: 0, stepT: 0, t: 0, S, col, hit: new Set() });
    },
    // Prism (Colossus): a rainbow beam that bounces from enemy to enemy
    prism(S, col, t) {
      const p = player; sfx('beam'); const hues = [0xff4a6a, 0xffa040, 0xffe24a, 0x5aff8a, 0x4ad8ff, 0x8a6aff, 0xff7ae0];
      let from = p.pos.clone().setY(p.pos.y + 1.3), cur = t && !t.dead && t.pos.distanceTo(p.pos) < S.range ? t : nearestEnemy(p.pos, S.range, p.yaw, Math.PI);
      const seen = new Set(), segs = [];
      for (let k = 0; k < S.bounces && cur; k++) {
        seen.add(cur); const to = cur.pos.clone(); to.y += 1.1 * (cur.rig.cfg.scale || 1); segs.push([from.clone(), to.clone(), hues[k % hues.length], cur]); from = to;
        let nx = null, bd = S.hop; for (const e of enemies) { if (e.dead || e.decoyHidden || seen.has(e) || e.state === 'spawn') continue; const d = e.pos.distanceTo(cur.pos); if (d < bd) { bd = d; nx = e; } } cur = nx;
      }
      if (!segs.length) segs.push([from.clone(), from.clone().add(new THREE.Vector3(Math.sin(p.yaw) * 12, 0, Math.cos(p.yaw) * 12)), hues[0], null]);
      const g = new THREE.Group(); scene.add(g); const up = new THREE.Vector3(0, 1, 0);
      segs.forEach(([a, b, c, e], k) => {
        const len = a.distanceTo(b) || 0.1, q = new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize());
        for (const [w, cc] of [[0.17, c], [0.06, 0xffffff]]) { const m = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: cc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(w, len, w); m.position.copy(a).lerp(b, 0.5); m.quaternion.copy(q); g.add(m); }
        flash(b, 2.2, c); burst(b.x, b.y, b.z, 10, c, 5, 0.4, 0.25, 0);
        if (e) damageEnemy(e, S.dmg + k * 2, { spell: true, kb: 1.5, color: c, from: a, heavy: k === segs.length - 1 && k > 0 });
      });
      spells.push({ kind: 'prism', mesh: g, t: 0, S, col });
    },
    // Eclipse (Vael): a black sun over Ren rains crescent blades on every enemy nearby
    eclipse(S, col) {
      const p = player; sfx('voidCharge');
      const sun = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0x07000a })); sun.scale.setScalar(0.05);
      const cor = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); cor.scale.setScalar(4.4); sun.add(cor);
      const ring = new THREE.Mesh(G.torus, new THREE.MeshBasicMaterial({ color: 0xffc24a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); ring.scale.set(1.25, 1.25, 0.18); sun.add(ring);
      sun.position.copy(p.pos).setY(p.pos.y + 3.5); scene.add(sun); shockRing(p.pos, 3, col, 0.45);
      spells.push({ kind: 'eclipse', mesh: sun, ring, t: 0, S, col, fireT: 0.3, k: 0 });
    },
  };
  // per-frame behaviour of the part 2 spells; return true when the spell is finished (it is then removed)
  const SPELL_TICK = {
    dune(s, dt) {
      const S = s.S, m = s.mesh, sp = S.speed * (s.t < 0.2 ? s.t / 0.2 : 1);
      const nx = m.position.x + s.dir.x * sp * dt, nz = m.position.z + s.dir.z * sp * dt;
      if (!blocked(nx, nz, m.position.y + 0.5)) { m.position.x = nx; m.position.z = nz; } else s.t = Math.max(s.t, S.life - 0.1);
      const gy = groundAt(m.position.x, m.position.z, m.position.y + 1); if (gy > -1e9) m.position.y = gy;
      m.rotation.y += dt * 8; m.children.forEach((c, k) => { if (c.isMesh) { c.rotation.y += dt * (5 + k * 3); c.material.opacity = 0.5 * Math.min(1, s.t * 4, (S.life - s.t) * 4); } });
      for (const e of enemies) {
        if (e.dead || e.decoyHidden || e.state === 'spawn') continue; const dx = m.position.x - e.pos.x, dz = m.position.z - e.pos.z, d = Math.hypot(dx, dz); if (d > S.radius + e.radius) continue;
        const f = e.boss ? 0.12 : 1, tx = e.pos.x + (dx * 3 + s.dir.x * sp) * dt * f, tz = e.pos.z + (dz * 3 + s.dir.z * sp) * dt * f;
        if (!blocked(tx, e.pos.z, e.pos.y)) e.pos.x = tx; if (!blocked(e.pos.x, tz, e.pos.y)) e.pos.z = tz;
        if (!e.boss && !['launched', 'rooted', 'dying'].includes(e.state)) { if (e.state !== 'stagger') play(e.rig, 'hurt', 0.4); e.state = 'stagger'; e.st = 0; relTok(e); cancelTele(e); }
        s.caught.add(e);
      }
      s.tickT -= dt; if (s.tickT <= 0) { s.tickT = S.tick; for (const e of s.caught) if (!e.dead && Math.hypot(e.pos.x - m.position.x, e.pos.z - m.position.z) < S.radius + e.radius + 0.6) damageEnemy(e, S.dmg, { tick: true, spell: true, color: s.col, from: m.position }); }
      for (let k = 0; k < 3 * qMul + 1; k++) { const a = rand(0, TAU), r = rand(0.5, S.radius); spawnP(PN, m.position.x + Math.cos(a) * r, m.position.y + rand(0.2, 3.5), m.position.z + Math.sin(a) * r, -Math.sin(a) * 7, rand(1, 3), Math.cos(a) * 7, 0.45, 0.35, k % 2 ? s.col : 0xd8b070, 0, 1); }
      if (s.t < S.life) return false;
      const c = m.position.clone(); shockRing(c, S.radius + 1.5, s.col, 0.5); burst(c.x, c.y + 1, c.z, 40, s.col, 9, 0.6, 0.45, 2); sfx('slam'); cam.shake = Math.max(cam.shake, 0.4);
      for (const e of enemies) if (!e.dead && !e.decoyHidden && Math.hypot(e.pos.x - c.x, e.pos.z - c.z) < S.radius + 1.5 + e.radius) damageEnemy(e, S.finish, { heavy: true, spell: true, kb: 6, launch: 6, color: s.col, from: c });
      return true;
    },
    frost(s, dt) {
      const S = s.S; s.stepT -= dt;
      while (s.stepT <= 0 && s.step < S.steps) {
        s.stepT += 0.055; s.step++; const dist = 1.3 + s.step * S.gap;
        for (const [dx, dz] of s.lines) {
          const x = s.origin.x + dx * dist, z = s.origin.z + dz * dist, gy = groundAt(x, z, s.origin.y + 1.5); if (gy < -1e9 || blocked(x, z, gy + 0.2)) continue;
          const pt = new THREE.Vector3(x, gy, z); crystalBurst(pt, 0xbff4ff, 3, 0.75 + s.step * 0.04);
          for (const e of enemies) {
            if (e.dead || e.decoyHidden || s.hit.has(e) || e.state === 'spawn' || Math.hypot(e.pos.x - x, e.pos.z - z) > 1.5 + e.radius) continue;
            s.hit.add(e); e.rootT = e.boss ? S.bossFreeze : S.freeze; showIce(e);
            damageEnemy(e, S.dmg, { spell: true, kb: 0, color: s.col, from: s.origin });
            if (!e.boss && !e.dead && e.state !== 'launched') { e.state = 'rooted'; e.st = 0; relTok(e); cancelTele(e); play(e.rig, 'hurt', 0.4); }
          }
        }
        if (s.step === 1) sfx('roots');
      }
      return s.step >= S.steps;
    },
    prism(s) {
      const k = 1 - s.t / 0.45; s.mesh.children.forEach((m) => { m.material.opacity = Math.max(0, k); });
      if (k > 0) return false; s.mesh.children.forEach((m) => m.material.dispose()); return true;
    },
    eclipse(s, dt) {
      const S = s.S, m = s.mesh, p = player; if (!p) return true;
      m.position.lerp(new THREE.Vector3(p.pos.x - Math.sin(p.yaw) * 0.8, p.pos.y + 3.5, p.pos.z - Math.cos(p.yaw) * 0.8), 1 - Math.exp(-6 * dt));
      const grow = Math.min(1, s.t / 0.3), fade = Math.min(1, (S.life - s.t) / 0.3); m.scale.setScalar(Math.max(0.01, 0.6 * grow * fade)); s.ring.rotation.z += dt * 3; s.ring.rotation.x = 0.4 + Math.sin(s.t * 2) * 0.2;
      if (Math.random() < 0.6 * qMul) { const a = rand(0, TAU); spawnP(PA, m.position.x + Math.cos(a) * 1.1, m.position.y + rand(-0.4, 0.4), m.position.z + Math.sin(a) * 1.1, Math.cos(a) * 1.5, rand(-0.5, 0.5), Math.sin(a) * 1.5, 0.4, 0.35, a > 3 ? s.col : 0xffc24a, 0, 0); }
      s.fireT -= dt;
      if (s.fireT <= 0 && s.t < S.life - 0.2) {
        s.fireT = S.rate; const list = enemies.filter((e) => !e.dead && !e.decoyHidden && e.state !== 'spawn' && e.pos.distanceTo(p.pos) < S.range);
        if (list.length) {
          const tg = list[s.k % list.length], col = s.k % 2 ? 0xffc24a : s.col; s.k++;
          const b = new THREE.Mesh(G.cone, new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); b.scale.set(0.14, 0.95, 0.14); scene.add(b);
          const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); gl.scale.setScalar(1.3); b.add(gl);
          const a = rand(0, TAU); projectiles.push({ mesh: b, pos: m.position.clone(), vel: new THREE.Vector3(Math.cos(a) * 6, 4, Math.sin(a) * 6), owner: 'player', dmg: S.dmg, life: 2.2, target: tg, color: col, trail: col, radius: 0.9 });
          if (s.k % 3 === 1) sfx('spellFire');
        }
      }
      return s.t >= S.life;
    },
  };
  // frozen enemies: a block of ice around the legs (shares the vine holder so it hides when the hold ends)
  function showIce(e) {
    showVine(e, 0x8fe8ff);
    if (!e.vine.userData.iced) {
      e.vine.userData.iced = true; const m = new THREE.MeshToonMaterial({ color: 0xbff4ff, gradientMap: GRAD, emissive: 0x2a8aff, emissiveIntensity: 0.5, transparent: true, opacity: 0.72 });
      for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(G.oct, m); const a = i / 4 * TAU; c.position.set(Math.sin(a) * 0.32, 0.45, Math.cos(a) * 0.32); c.scale.set(0.32, 0.75, 0.32); c.rotation.set(Math.cos(a) * 0.3, a, -Math.sin(a) * 0.3); c.userData.ice = true; e.vine.add(c); }
    }
    e.vine.children.forEach((c) => (c.visible = !!c.userData.ice));
  }
  // shadow clones: Ren's rig recoloured as a living shadow, reused between casts
  const shadowRigs = []; let shadowMat = null, shadowFaceMat = null;
  function makeShadowRig() {
    const rig = makeRen(); rig.fight = true; rig.blinkT = Infinity;
    if (!shadowMat) { shadowMat = new THREE.MeshToonMaterial({ color: 0x1c0c34, gradientMap: GRAD, emissive: 0x3a0c7a, emissiveIntensity: 0.7 }); shadowFaceMat = shadowMat.clone(); shadowFaceMat.emissive.set(0x5a1aaa); }
    rig.root.traverse((o) => { if (!o.isMesh || !o.material) return; if (o.userData.outline) o.material = OUT_AURA; else if (o === rig.face) o.material = shadowFaceMat; else if (o.material.isMeshToonMaterial) o.material = shadowMat; });
    if (rig.aura) { rig.aura.visible = true; rig.aura.traverse((m) => { if (m.material && m.material.uniforms && m.material.uniforms.c1) { m.material.uniforms.c1.value.set(0x7a2aff); m.material.uniforms.c2.value.set(0x1a0040); } }); }
    return rig;
  }
  function spawnAlly(pos, S, col, i) {
    const rig = shadowRigs[i] || (shadowRigs[i] = makeShadowRig()); rig.root.scale.setScalar(0.01); rig.anim = 'idle';
    const a = makeFighter(rig, { kind: 'ally', life: S.life, dmg: S.dmg, swingI: i, col, hitDone: true });
    a.pos.copy(pos); a.pos.y = player.pos.y; a.yaw = player.yaw; a.lastPos.copy(a.pos); syncFighter(a, 0);
    burst(pos.x, pos.y + 1, pos.z, 20, col, 4, 0.5, 0.35, 0); allies.push(a); return a;
  }
  function removeAllies() { for (const a of allies) removeFighter(a); allies = []; }
  function updateAllies(dt) {
    for (let i = allies.length - 1; i >= 0; i--) {
      const a = allies[i], rig = a.rig; a.life -= dt; a.st += dt;
      if (a.life <= 0 || !player || player.dead) { burst(a.pos.x, a.pos.y + 1, a.pos.z, 18, a.col, 4, 0.5, 0.3, 1); removeFighter(a); allies.splice(i, 1); continue; }
      rig.root.scale.setScalar(a.life < 0.35 ? Math.max(0.01, a.life / 0.35) : Math.min(1, a.st / 0.25 + 0.01));
      let t = null, bd = 24; for (const e of enemies) { if (e.dead || e.decoyHidden || e.state === 'spawn') continue; const d = e.pos.distanceTo(a.pos); if (d < bd) { bd = d; t = e; } }
      a.vel.x = a.vel.z = 0;
      if (a.state === 'atk') {
        const c = COMBO[a.swingI % 3];
        if (a.st < c.hit) { a.vel.x = Math.sin(a.yaw) * 3; a.vel.z = Math.cos(a.yaw) * 3; }
        if (!a.hitDone && a.st >= c.hit) {
          a.hitDone = true; slashArc(a.pos.clone().add(new THREE.Vector3(Math.sin(a.yaw) * 0.8, 1.15, Math.cos(a.yaw) * 0.8)), a.yaw, c.tilt, 1.4, a.col, a.swingI % 2);
          for (const e of enemies) { if (e.dead || e.decoyHidden) continue; const dx = e.pos.x - a.pos.x, dz = e.pos.z - a.pos.z, d = Math.hypot(dx, dz); if (d < 2.1 + e.radius && Math.abs(angDiff(a.yaw, Math.atan2(dx, dz))) < 1.4) damageEnemy(e, Math.round((a.dmg + rand(0, 2)) * (e.boss ? 0.5 : 1)), { kb: 1.5, ally: true, color: a.col, from: a.pos, dir: new THREE.Vector3(dx, 0, dz).normalize() }); }
        }
        if (a.st >= c.dur + 0.12) { a.state = 'idle'; a.st = 0; a.swingI++; }
      } else if (t) {
        const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z, d = Math.hypot(dx, dz) || 1, ty = Math.atan2(dx, dz); a.yaw += angDiff(a.yaw, ty) * (1 - Math.exp(-12 * dt));
        if (d > 1.6 + t.radius) { a.vel.x = dx / d * 8.5; a.vel.z = dz / d * 8.5; rig.anim = 'run'; }
        else { a.state = 'atk'; a.st = 0; a.hitDone = false; a.yaw = ty; const c = COMBO[a.swingI % 3]; play(rig, c.anim, c.dur); }
      } else {
        const side = allies.indexOf(a) % 2 ? 1 : -1, gx = player.pos.x + Math.cos(player.yaw) * side * 1.6, gz = player.pos.z - Math.sin(player.yaw) * side * 1.6, dx = gx - a.pos.x, dz = gz - a.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.8) { a.vel.x = dx / d * Math.min(9, d * 3); a.vel.z = dz / d * Math.min(9, d * 3); a.yaw += angDiff(a.yaw, Math.atan2(dx, dz)) * (1 - Math.exp(-10 * dt)); rig.anim = 'run'; } else { rig.anim = 'idle'; a.yaw += angDiff(a.yaw, player.yaw) * (1 - Math.exp(-6 * dt)); }
      }
      if (Math.random() < 0.35 * qMul) spawnP(PA, a.pos.x + rand(-0.3, 0.3), a.pos.y + rand(0.2, 1.6), a.pos.z + rand(-0.3, 0.3), 0, rand(0.5, 1.5), 0, 0.5, 0.3, Math.random() < 0.5 ? a.col : 0x2a0a5a);
      physics(a, dt); syncFighter(a, dt);
    }
  }
  // rooted enemies: a ring of vines around their legs
  function showVine(e, col) {
    if (!e.vine) {
      const g = new THREE.Group(), m = toon(0x3a7a22, { em: 0x2a6a10, ei: 0.5 });
      for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(G.torus, m); t.rotation.x = Math.PI / 2; t.position.y = 0.2 + i * 0.28; t.scale.set(0.5 - i * 0.06, 0.5 - i * 0.06, 0.7); g.add(t); }
      for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(G.cone, m); const a = i / 5 * TAU; c.position.set(Math.sin(a) * 0.45, 0.35, Math.cos(a) * 0.45); c.scale.set(0.06, 0.7, 0.06); c.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4); g.add(c); }
      e.rig.root.add(g); e.vine = g;
    }
    e.vine.visible = true; e.vine.children.forEach((c) => (c.visible = !c.userData.ice));
  }
  function updateSpells(dt) {
    for (let i = spells.length - 1; i >= 0; i--) {
      const s = spells[i]; s.t += dt;
      if (s.kind !== 'void') { const f = SPELL_TICK[s.kind]; if (!f || f(s, dt)) { scene.remove(s.mesh); spells.splice(i, 1); } continue; }
      const S = s.S, travel = 0.35;
      s.ring.rotation.z += dt * 6; s.ring2.rotation.y += dt * 5;
      if (s.t < travel) { s.mesh.position.lerpVectors(s.from, s.to, sm(s.t / travel)); s.mesh.scale.setScalar(0.15 + 0.5 * s.t / travel); }
      else if (s.t < travel + S.hold) {
        const k = (s.t - travel) / S.hold; s.mesh.position.copy(s.to); s.mesh.scale.setScalar(0.65 + k * 0.45 + Math.sin(s.t * 30) * 0.03);
        for (const e of enemies) {
          if (e.dead || e.decoyHidden || e.state === 'spawn') continue; const dx = s.to.x - e.pos.x, dz = s.to.z - e.pos.z, d = Math.hypot(dx, dz); if (d > S.pull || d < 0.7) continue;
          const f = (e.boss ? 1.4 : 7) * (1 - (d / S.pull) * 0.5), nx = e.pos.x + dx / d * f * dt, nz = e.pos.z + dz / d * f * dt;
          if (!blocked(nx, e.pos.z, e.pos.y)) e.pos.x = nx; if (!blocked(e.pos.x, nz, e.pos.y)) e.pos.z = nz;
          if (!e.boss && !['launched', 'rooted', 'dying'].includes(e.state)) { if (e.state !== 'stagger') play(e.rig, 'hurt', 0.4); e.state = 'stagger'; e.st = 0; relTok(e); cancelTele(e); }
        }
        s.tickT -= dt; if (s.tickT <= 0) { s.tickT = 0.32; for (const e of enemies) if (!e.dead && !e.decoyHidden && Math.hypot(e.pos.x - s.to.x, e.pos.z - s.to.z) < S.pull * 0.55) damageEnemy(e, S.tick, { tick: true, spell: true, color: s.col, from: s.to }); }
        for (let k2 = 0; k2 < 3; k2++) { const a = rand(0, TAU), r = rand(2.5, S.pull); spawnP(PA, s.to.x + Math.cos(a) * r, s.to.y + rand(-1.2, 1), s.to.z + Math.sin(a) * r, -Math.cos(a) * r * 2.4, rand(-0.5, 0.5), -Math.sin(a) * r * 2.4, 0.38, 0.32, k2 % 2 ? s.col : 0xffffff, 0, 0); }
      } else {
        impact = quality !== 'low' ? 2 : 0; cam.shake = Math.max(cam.shake, 0.6); sfx('voidSmash'); OV.white.value = 0.25;
        const gp = s.to.clone(); gp.y -= 1.4; shockRing(gp, S.radius + 1, s.col, 0.55); shockRing(gp, S.radius * 0.6, 0xffffff, 0.35); burst(s.to.x, s.to.y, s.to.z, 50, s.col, 12, 0.7, 0.45, 0); flash(s.to, 4.5, s.col);
        for (const e of enemies) if (!e.dead && !e.decoyHidden && Math.hypot(e.pos.x - s.to.x, e.pos.z - s.to.z) < S.radius + e.radius) damageEnemy(e, S.dmg, { heavy: true, spell: true, kb: 8, launch: 7, color: s.col, from: gp });
        scene.remove(s.mesh); spells.splice(i, 1);
      }
    }
  }
  function clearSpells() { for (const s of spells) scene.remove(s.mesh); spells = []; removeAllies(); }
  // boss drop: the grimoire rises out of the beaten boss, flies to Ren's hand, then tucks into his book
  function makeGrimBook(col) {
    const book = new THREE.Group(); const cov = toon(col, { em: col, ei: 0.35 }), pg = toon(0xfff4e0);
    for (const s of [-1, 1]) { const half = new THREE.Group(); half.rotation.y = s * 0.5; book.add(half); part(half, G.box, cov, [s * 0.17, 0, 0], [0.34, 0.46, 0.04]); part(half, G.box, pg, [s * 0.16, 0, 0.03], [0.3, 0.42, 0.03], null, null); }
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); bg.scale.setScalar(2.4); book.add(bg);
    return book;
  }
  function startDrop(b, id) {
    const g = GRIM(id); if (!g || dropFx) return; const col = hexOf(g.color);
    const book = makeGrimBook(col); const from = b.pos.clone(); from.y += 1.4 * (b.rig.cfg.scale || 1); book.position.copy(from); book.scale.setScalar(0.01); scene.add(book);
    shockRing(b.pos, 4, col, 0.7); burst(from.x, from.y, from.z, 40, col, 6, 0.8, 0.4, 0); sfx('grimoireAppear');
    dropFx = { id, g, col, book, from, t: 0, phase: 'rise' };
  }
  function grabDrop() {
    const f = dropFx; if (!f || f.phase !== 'rise') return; f.phase = 'fly'; f.t = 0; f.flyFrom = f.book.position.clone();
    addGrimoire(f.id); sfx('powerup');
    emit('grimoireGet', { id: f.id, name: f.g.name, desc: f.g.desc, color: f.g.color, icon: f.g.icon });
    equipGrimoire(f.id);
    if (player) { player.state = 'pose'; player.vel.set(0, 0, 0); play(player.rig, 'victory', 3); setEmotion(player.rig, 'smile'); } // 'pose' keeps the idle logic from overriding the raised arm
  }
  function updateDrop(dt) {
    const f = dropFx; if (!f) return; f.t += dt; const bk = f.book;
    const hand = new THREE.Vector3(); if (player) { player.rig.J.haR.getWorldPosition(hand); hand.y += 0.3; }
    if (f.phase === 'rise') { const k = sm(f.t / 1.1); bk.position.set(f.from.x, f.from.y + k * 1.2 + Math.sin(f.t * 3) * 0.08, f.from.z); bk.scale.setScalar(0.01 + k * 1.7); bk.rotation.y += dt * 3; if (Math.random() < 0.6) spawnP(PA, bk.position.x + rand(-0.6, 0.6), bk.position.y + rand(-0.6, 0.6), bk.position.z + rand(-0.6, 0.6), 0, 1, 0, 0.6, 0.3, f.col); }
    else if (f.phase === 'fly') { const k = sm(f.t / 0.45); bk.position.lerpVectors(f.flyFrom, hand, k); bk.scale.setScalar(1.7 - k * 0.5); bk.position.y += Math.sin(k * Math.PI) * 0.8; bk.rotation.y += dt * 8; if (f.t >= 0.45) { f.phase = 'held'; f.t = 0; flash(hand, 3, f.col); shockRing(player ? player.pos : hand, 3, f.col, 0.5); burst(hand.x, hand.y, hand.z, 40, f.col, 6, 0.7, 0.35, 0); } }
    else if (f.phase === 'held') { bk.position.copy(hand); bk.rotation.y = (player ? player.yaw : 0) + Math.sin(f.t * 2) * 0.3; bk.scale.setScalar(1.1 + Math.sin(f.t * 6) * 0.05); if (Math.random() < 0.5) spawnP(PA, hand.x + rand(-0.4, 0.4), hand.y + rand(-0.3, 0.5), hand.z + rand(-0.4, 0.4), 0, 1.2, 0, 0.5, 0.25, f.col); if (f.t > 1.8) { f.phase = 'tuck'; f.t = 0; } }
    else { const k = f.t / 0.35; bk.scale.setScalar(Math.max(0.01, 1.1 * (1 - k))); bk.position.copy(hand); if (k >= 1) endDrop(); }
  }
  function endDrop() { if (dropFx) { scene.remove(dropFx.book); dropFx = null; } if (player && player.state === 'pose') player.state = 'idle'; }
  // what threatens Ren right now (for the bot and for UI warnings): the most-filled telegraph he stands in, or a projectile closing in
  function dangerNow() {
    const p = player; if (!p || state.screen !== 'play') return null; let best = null;
    for (const t of teles) {
      if (!t.active || !t.m.visible) continue; const fill = clamp(t.t / (t.dur || 1), 0, 1); let ax = 0, az = 0, inside = false;
      if (t.shape === 'circle') { const dx = p.pos.x - t.cx, dz = p.pos.z - t.cz, d = Math.hypot(dx, dz); inside = d < t.a + 0.6; ax = d > 0.05 ? dx / d : -Math.sin(p.yaw); az = d > 0.05 ? dz / d : -Math.cos(p.yaw); }
      else { const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw), lx = p.pos.x - t.cx, lz = p.pos.z - t.cz, along = lx * fx + lz * fz, perp = lx * fz - lz * fx; inside = along > -0.6 && along < t.b + 0.6 && Math.abs(perp) < t.a / 2 + 0.6; const sg = perp >= 0 ? 1 : -1; ax = fz * sg; az = -fx * sg; }
      if (inside && (!best || fill > best.fill)) best = { fill, ax, az, kind: t.shape };
    }
    for (const pr of projectiles) {
      if (pr.owner !== 'enemy') continue; const dx = p.pos.x - pr.pos.x, dz = p.pos.z - pr.pos.z, d = Math.hypot(dx, dz), v = Math.hypot(pr.vel.x, pr.vel.z) || 1;
      if (d < 5 && (dx * pr.vel.x + dz * pr.vel.z) / (d * v) > 0.6) { const fill = 1 - d / 5; if (!best || fill > best.fill) best = { fill, ax: -pr.vel.z / v, az: pr.vel.x / v, kind: 'shot' }; }
    }
    for (const e of enemies) if (e.ring && !e.ring.hit) { const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z), gap = d - e.ring.r; if (gap > -0.5 && gap < 3) { const fill = 1 - gap / 3; if (!best || fill > best.fill) best = { fill, ax: (p.pos.x - e.pos.x) / (d || 1), az: (p.pos.z - e.pos.z) / (d || 1), kind: 'ring' }; } }
    return best;
  }
  // ---------- ultimates ----------
  // Aura Burst (before the Domain is learned): ~0.9 s — curl up, close-up push, impact frames, shockwave + light pillar.
  // Domain (chapter 4 power): a ~3.2 s cinematic that freezes the fight (input locked for that long only):
  //   0.00 hand seal close-up -> 1.00 push-in to his eyes -> 1.25 cut to black + expanding shockwave ring
  //   -> 1.70 the inner world unfolds (void sea, eclipse, gates rising, rune halos) + brush title -> 3.20 control back,
  //   then the SURE HIT: every enemy inside is struck again and again for 4.5 s -> the domain shatters.
  const ULT = { burstLock: 0.9, cine: 3.2, sure: 4.5, shatter: 0.7, radius: 26 };
  let ultSeq = null, pillar = null, savedFog = null;
  function grimTint() { const g = equipped && GRIM(equipped); return new THREE.Color(g ? g.color : 0x8a5cff); }
  function startUlt() {
    const p = player; p.aura = 0; p.state = 'ult'; p.st = 0; p.inv = 99;
    const isDomain = powers.includes('domain');
    const name = isDomain ? 'Domain: Infinite Sanctum' : 'Aura Burst';
    emit('ult', { name }); sfx(isDomain ? 'domain' : 'ult'); p.rig.aura.visible = true;
    play(p.rig, isDomain ? 'seal' : 'burst', isDomain ? 99 : 0.9);
    ultSeq = { t: 0, domain: isDomain, fired: false, ticks: 0, phase: 'cine', yaw: p.yaw, c: p.pos.clone(), tint: grimTint(), black: false };
    { // pick the camera side with the clearest view of Ren; turn him toward it when it's far off his front
      let best = 0, bs = -1e9;
      for (const a of [0.35, -0.35, 0.9, -0.9, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
        const Y = p.yaw + a; let clr = 9;
        for (const e of enemies) { if (e.dead) continue; const ex = e.pos.x - p.pos.x, ez = e.pos.z - p.pos.z, al = ex * Math.sin(Y) + ez * Math.cos(Y), pr = Math.abs(ex * Math.cos(Y) - ez * Math.sin(Y)); if (al > -1 && al < 7.5) clr = Math.min(clr, pr - (e.radius || 0.5) * (e.rig.cfg.scale || 1)); }
        const sc = Math.min(clr, 3) - Math.abs(a) * 0.35; if (sc > bs) { bs = sc; best = a; }
      }
      if (Math.abs(best) > 1.0) { p.yaw += best; ultSeq.yaw = p.yaw; best = 0; }
      ultSeq.camA = best; if (isDomain) p.rig.visYaw = p.yaw;
    }
    emit('cinematic', { on: true, kind: isDomain ? 'domain' : 'burst', dur: isDomain ? ULT.cine : ULT.burstLock });
    setEmotion(p.rig, 'angry'); p.vel.set(0, p.vel.y, 0);
    if (isDomain) {
      const W = DW || buildDomainWorld(); W.tint.copy(ultSeq.tint); domeMat.uniforms.tint.value.copy(ultSeq.tint);
      W.sealSig.material.color.copy(ultSeq.tint); W.haloMat.color.copy(ultSeq.tint).lerp(new THREE.Color(0xffffff), 0.25); W.sigMat.color.copy(ultSeq.tint); W.glowM.material.color.copy(ultSeq.tint).lerp(new THREE.Color(0xffffff), 0.3); W.sealGlow.material.color.copy(ultSeq.tint).lerp(new THREE.Color(0xffffff), 0.5);
      titleQuad.material.uniforms.map.value = brushTitleTex(ultSeq.tint); OV.ringCol.value.copy(ultSeq.tint);
    }
  }
  // the fight is frozen while a cinematic plays
  function cineFreeze() { return !!(ultSeq && ultSeq.phase === 'cine' && ultSeq.domain); }
  function domainShow(on) {
    const u = ultSeq, W = DW; if (!W) return;
    if (on) {
      W.g.visible = true; W.g.position.set(0, 0, 0); W.floor.position.set(u.c.x, u.c.y + 0.03, u.c.z); W.sigil.position.set(u.c.x, u.c.y + 0.07, u.c.z);
      W.halo1.position.set(u.c.x, u.c.y + 16, u.c.z); W.halo2.position.set(u.c.x, u.c.y + 22, u.c.z);
      dome.visible = true; dome.position.copy(u.c); dome.scale.setScalar(70); domeMat.uniforms.op.value = 1; domeMat.uniforms.crack.value = 0;
      const sy = u.yaw + (u.camA || 0); domeMat.uniforms.sunDir.value.set(-Math.sin(sy), 0.42, -Math.cos(sy)).normalize();
      levelGroup.visible = false; if (sky) sky.visible = false;
      if (scene.fog && !savedFog) { savedFog = [scene.fog.near, scene.fog.far]; scene.fog.near = 400; scene.fog.far = 900; }
      W.setGates(0, 0, u.c.x, u.c.y, u.c.z);
    } else {
      W.g.visible = false; dome.visible = false; levelGroup.visible = true; if (sky) sky.visible = true;
      if (savedFog && scene.fog) { scene.fog.near = savedFog[0]; scene.fog.far = savedFog[1]; } savedFog = null;
      W.sealSig.visible = false; W.sealGlow.visible = false;
    }
  }
  function updateUlt(dt) {
    if (!ultSeq) return; const u = ultSeq, p = player; if (!p) { endUlt(); return; } u.t += dt; const t = u.t;
    if (!u.domain) {
      // ---- Aura Burst ----
      if (t < 0.42) { OV.tintAmt.value = sm(t / 0.3) * 0.45; if (Math.random() < 0.9) { const a = rand(0, TAU), r = rand(1.5, 3); spawnP(PA, p.pos.x + Math.cos(a) * r, p.pos.y + rand(0.3, 2), p.pos.z + Math.sin(a) * r, -Math.cos(a) * r * 3, 0, -Math.sin(a) * r * 3, 0.3, 0.35, 0xb48cff); } }
      if (t > 0.42 && !u.fired) {
        u.fired = true; impact = 3; cam.shake = 0.9; OV.white.value = 0.9; OV.tintAmt.value = 0; shockRing(p.pos, 10, 0xb48cff, 0.6); shockRing(p.pos, 6, 0xffffff, 0.4); shockRing(p.pos, 13, 0x4fc3ff, 0.8);
        burst(p.pos.x, p.pos.y + 1, p.pos.z, 50 * qMul, 0x8a6cff, 14, 0.8, 0.5, 0); sfx('explosion');
        if (!pillar) { pillar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20, 1, true), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xc8b0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); scene.add(pillar); }
        pillar.visible = true; pillar.position.copy(p.pos); pillar.userData.t = 0;
        for (const e of enemies) if (!e.dead && e.pos.distanceTo(p.pos) < 10) damageEnemy(e, e.boss ? 35 : 45, { heavy: true, kb: 10, launch: 9, color: 0xb48cff, ult: true });
      }
      if (t >= ULT.burstLock) endUlt();
      return;
    }
    // ---- Domain: Infinite Sanctum ----
    const W = DW, c = u.c;
    if (u.phase === 'cine' && t > 0.5 && t < 2.85 && pressed.ultimate) { u.t = 2.85; } // press ULT again to skip ahead
    if (u.phase === 'cine') {
      // seal: sigil behind him, glow gathering at his hands, particles drawn in
      const sealOn = t < 1.32;
      W.sealSig.visible = sealOn; W.sealGlow.visible = sealOn;
      if (sealOn) {
        const k = sm(t / 0.6), bx = c.x - Math.sin(u.yaw) * 0.55, bz = c.z - Math.cos(u.yaw) * 0.55;
        W.sealSig.position.set(bx, c.y + 1.35, bz); W.sealSig.lookAt(camera.position); W.sealSig.rotateZ(t * 0.8); W.sealSig.scale.setScalar(0.2 + 2.6 * k); W.sealSig.material.opacity = 0.85 * k;
        p.rig.J.haR.getWorldPosition(_tv1); p.rig.J.haL.getWorldPosition(_tv2); _tv1.add(_tv2).multiplyScalar(0.5);
        W.sealGlow.position.copy(_tv1); W.sealGlow.scale.setScalar(0.12 + 0.22 * sm(t / 0.9) + 0.03 * Math.sin(t * 40)); W.sealGlow.material.opacity = 0.8 * (1 - sm((t - 0.9) / 0.25));
        if (Math.random() < 0.8) { const a = rand(0, TAU), r = rand(0.8, 1.6); spawnP(PA, _tv1.x + Math.cos(a) * r, _tv1.y + rand(-0.6, 0.6), _tv1.z + Math.sin(a) * r, -Math.cos(a) * r * 2.5, 0, -Math.sin(a) * r * 2.5, 0.35, 0.18, u.tint.getHex()); }
        OV.tintAmt.value = 0; OV.vig.value = sm(t / 0.8) * 0.75;
      } else W.sealGlow.visible = false;
      if (t > 0.95 && t < 1.25) { OV.vig.value = 0.75 + sm((t - 0.95) / 0.3) * 0.25; }
      // cut to black with an expanding shockwave ring; the world swaps behind it
      if (t >= 1.25 && !u.black) { u.black = true; sfx('explosion'); cam.shake = 0.6; domainShow(true); OV.vig.value = 0; }
      if (t >= 1.25) {
        const bt = t - 1.25; OV.black.value = bt < 0.45 ? 1 : Math.max(0, 1 - (bt - 0.45) / 0.35); OV.ringR.value = bt < 1.0 ? 0.02 + bt * 1.9 : -1;
        const unf = sm((t - 1.6) / 1.1); W.floorMat.uniforms.unfold.value = 1 + unf * 57; W.setGates(Math.max(0, (t - 1.75) / 1.1), 0, c.x, c.y, c.z);
        W.haloMat.opacity = sm((t - 2.1) / 0.6); W.sigMat.opacity = sm((t - 1.7) / 0.4); W.sigil.scale.setScalar(2 + 14 * sm((t - 1.7) / 0.9)); W.sigil.rotation.z = t * 0.25;
        if (t > 1.7 && !u.wave) { u.wave = true; shockRing(c, 30, u.tint.getHex(), 1.0); shockRing(c, 14, 0xffffff, 0.6); impact = quality === 'low' ? 0 : 1; }
        if (t > 2.05 && p.rig.anim === 'seal') { play(p.rig, 'victory', 99); setEmotion(p.rig, 'determined'); }
      }
      // brush title: wipes in at 1.95 s, holds, fades as control returns
      if (t > 1.9) { titleQuad.visible = true; const tu = titleQuad.material.uniforms; tu.reveal.value = sm((t - 1.9) / 0.55); tu.op.value = 1 - sm((t - (ULT.cine + 0.2)) / 0.5); layoutTitle(); }
      if (t >= ULT.cine) {
        u.phase = 'sure'; u.st = 0; p.state = 'idle'; p.inv = 0.6; play(p.rig, 'idle'); setEmotion(p.rig, 'determined'); OV.black.value = 0; OV.ringR.value = -1;
        emit('cinematic', { on: false, kind: 'domain' }); W.sealSig.visible = false; W.sealGlow.visible = false;
      }
    } else if (u.phase === 'sure') {
      u.st += dt; domainT = ULT.sure - u.st; OV.tintAmt.value = 0;
      const tu = titleQuad.material.uniforms; tu.op.value = Math.max(0, tu.op.value - dt * 2); if (tu.op.value <= 0) titleQuad.visible = false;
      W.setGates(9, 0, c.x, c.y, c.z); W.sigil.rotation.z += dt * 0.25;
      // SURE HIT: every enemy inside the domain is struck, again and again
      const N = 15;
      if (u.st > u.ticks * (ULT.sure / N) && u.ticks < N) {
        u.ticks++; const last = u.ticks === N;
        for (const e of enemies) {
          if (e.dead || e.decoyHidden || Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > ULT.radius) continue;
          const wasI = e.iframe; e.iframe = 0; const wasS = e.state; if (wasS === 'evade' || wasS === 'guard') e.state = 'domainHit';
          damageEnemy(e, e.boss ? Math.max(1, Math.round(e.maxHp * (last ? 0.04 : 0.008))) : (last ? 30 : 12), { heavy: last, kb: last ? 4 : 0.6, color: u.tint.getHex(), ult: true, from: c });
          if (wasI > 0) e.iframe = wasI; if (e.state === 'domainHit') e.state = wasS;
          const q = e.pos.clone(); q.y += 1.1 * (e.rig.cfg.scale || 1);
          slashArc(q, rand(0, TAU), rand(-1.2, 1.2), 1.6 * (e.rig.cfg.scale || 1), u.ticks % 2 ? u.tint.getHex() : 0xffffff, u.ticks % 2 === 0);
          if (last) shockRing(e.pos, 3.5, 0xffffff, 0.4);
        }
        if (last) { cam.shake = Math.max(cam.shake, 0.5); OV.white.value = 0.35; }
      }
      if (u.st >= ULT.sure || state.screen !== 'play') { u.phase = 'shatter'; u.st = 0; OV.white.value = 0.7; sfx('explosion'); cam.shake = 0.5; for (let i = 0; i < W.NG; i++) { const a = i / W.NG * TAU + Math.PI / W.NG; burst(c.x + Math.cos(a) * 25, c.y + 6, c.z + Math.sin(a) * 25, 14 * qMul, u.tint.getHex(), 9, 0.9, 0.6, -4); } }
    } else {
      u.st += dt; const k = u.st / ULT.shatter; domainT = 0;
      domeMat.uniforms.crack.value = sm(k * 1.6); domeMat.uniforms.op.value = 1 - sm((k - 0.45) / 0.55); W.floorMat.uniforms.op.value = 1 - sm((k - 0.3) / 0.6);
      W.haloMat.opacity = 1 - sm(k / 0.5); W.sigMat.opacity = 1 - sm(k / 0.4); W.setGates(9, sm(k), c.x, c.y, c.z); titleQuad.visible = false;
      if (k > 0.5 && W.g.visible && !u.restored) { u.restored = true; levelGroup.visible = true; if (sky) sky.visible = true; }
      if (k >= 1) endUlt();
    }
  }
  function layoutTitle() {
    // keep the brush title inside the bottom third and at most ~90% wide, whatever the aspect
    const asp = W / H, tex = 1024 / 256; let wN = 0.86, hN = wN * asp / tex * 2 / 2; // NDC half-sizes
    if (hN > 0.18) { hN = 0.18; wN = hN * tex / asp; }
    const u = titleQuad.material.uniforms; u.size.value.set(wN, hN); u.center.value.set(0, -1 + 0.08 + hN);
  }
  function endUlt() {
    const p = player, was = ultSeq; ultSeq = null; domainT = 0; OV.tintAmt.value = 0; OV.black.value = 0; OV.ringR.value = -1; OV.vig.value = 0; titleQuad.visible = false;
    if (DW) { domainShow(false); DW.floorMat.uniforms.op.value = 1; DW.floorMat.uniforms.unfold.value = 0; } dome.visible = false; domeMat.uniforms.crack.value = 0;
    if (was && was.phase === 'cine' && was.domain) emit('cinematic', { on: false, kind: 'domain' });
    if (p) { if (p.state === 'ult') p.state = 'idle'; p.inv = Math.max(p.inv > 50 ? 0 : p.inv, 0.5); p.rig.aura.visible = false; setEmotion(p.rig, 'determined'); if (p.rig.anim === 'seal' || p.rig.anim === 'burst' || (p.rig.anim === 'victory' && was && was.domain)) play(p.rig, 'idle'); }
  }
  // camera shots for the ultimates; returns true when it drives the camera this frame
  function ultCamera() {
    const u = ultSeq, p = player; if (!u || !p) return false; const t = u.t, Y = u.yaw + (u.camA || 0) * 0.6, fx = Math.sin(Y), fz = Math.cos(Y), lx = Math.cos(Y), lz = -Math.sin(Y), c = u.c;
    const at = (f, l, y, lf, ll, ly, fov) => { cam.pos.set(c.x + fx * f + lx * l, c.y + y, c.z + fz * f + lz * l); cam.look.set(c.x + fx * lf + lx * ll, c.y + ly, c.z + fz * lf + lz * ll); cam.fov = fov; };
    if (!u.domain) {
      if (t < 0.42) { const k = sm(t / 0.42); at(lerp(2.6, 2.0, k), lerp(-1.0, -0.8, k), lerp(0.85, 0.75, k), 0, 0, 1.1, lerp(42, 34, k)); return true; }
      if (t < 0.85) { const k = sm((t - 0.42) / 0.43); at(lerp(-1.0, -2.6, k), lerp(-4.2, -5.0, k), lerp(1.3, 2.1, k), 0, 0, 1.0, 62); return true; }
      return false;
    }
    if (u.phase !== 'cine') return false;
    if (t < 1.0) { const k = sm(t / 1.0); at(lerp(1.75, 1.3, k), lerp(-0.62, -0.42, k), lerp(1.38, 1.46, k), 0.1, 0, lerp(1.32, 1.4, k), lerp(34, 27, k)); return true; }
    if (t < 1.25) { const k = sm((t - 1.0) / 0.25); at(lerp(1.3, 0.85, k), lerp(-0.42, -0.08, k), lerp(1.46, 1.5, k), 0.1, -0.01, lerp(1.4, 1.48, k), lerp(27, 19, k)); return true; }
    const k = sm((t - 1.6) / 1.6), a = lerp(0.5, 0.18, k) * (u.camA < 0 ? -1 : 1) + (u.camA || 0) * 0.4, d = lerp(4.6, 6.4, k);
    cam.pos.set(c.x + Math.sin(Y + a) * d, c.y + lerp(0.5, 0.75, k), c.z + Math.cos(Y + a) * d); cam.look.set(c.x, c.y + lerp(1.3, 1.45, k), c.z); cam.fov = 52; return true;
  }

  // ---------- enemies ----------
  let attackTokens = 0;
  // AI traits per enemy type (stats live in ENEMY_DEFS): block/evade = chance to react to Ren's swing,
  // ranged = may spawn as a ranged attacker that keeps its distance, chain = extra follow-up swings, shot = bolt colour
  const ENEMY_AI = {
    construct: { block: 0.22, evade: 0, ranged: true, chain: 0, shot: 0x2fd8c0 },
    hollow: { block: 0, evade: 0.32, ranged: true, chain: 1, shot: 0xc040ff },
    thornling: { block: 0.15, evade: 0.15, ranged: true, chain: 0, shot: 0xffb020 },
    nullknight: { block: 0.38, evade: 0.05, ranged: true, chain: 1, shot: 0x7cf8ff },
    scarab: { block: 0, evade: 0.3, ranged: true, chain: 1, shot: 0xe8a83a },
    frostbrute: { block: 0.42, evade: 0, ranged: false, chain: 0, shot: 0x8fe8ff },
    shardling: { block: 0.3, evade: 0.12, ranged: true, chain: 1, shot: 0xff7ae0 },
    hollowlord: { block: 0.32, evade: 0.25, ranged: true, chain: 1, shot: 0xff3a6a },
  };
  function spawnEnemy(type, x, z, y, role) {
    const def = ENEMY_DEFS[type]; const rig = def.mk(); rig.fight = true; const hp = Math.round(def.hp * D().eHp);
    const e = makeFighter(rig, { type, def, hp, maxHp: hp, kind: 'enemy', state: 'spawn', st: 0, atkCd: rand(0.5, 2), role: role || 'melee', shotCd: rand(1.2, 2.6) });
    e.pos.set(x, y + 0.01, z); e.yaw = Math.PI; e.lastPos.copy(e.pos); syncFighter(e, 0);
    burst(x, y + 0.5, z, 20, role === 'ranged' ? 0xff8a3a : 0xb48cff, 4, 0.6, 0.35, 2); rig.root.scale.setScalar(0.01);
    if (role === 'ranged') { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: (ENEMY_AI[type] || {}).shot || 0xff8a3a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); g.scale.setScalar(0.45); g.position.set(0, 2.05, 0); rig.root.add(g); }
    enemies.push(e); return e;
  }
  function cancelTele(e) { if (e.tele) { for (const t of [].concat(e.tele)) { t.active = false; t.m.visible = false; } e.tele = null; } }
  function enemyWindup(e, wind) {
    e.state = 'windup'; e.st = 0; e.wind = wind; play(e.rig, 'claw', wind + 0.45); e.rig.animT = 0;
    e.tele = telegraph('circle', e.pos.clone().add(new THREE.Vector3(Math.sin(e.yaw) * 1.3, 0, Math.cos(e.yaw) * 1.3)), 1.3, 0, 0, wind);
  }
  function enemyShot(e, yaw) {
    const col = (ENEMY_AI[e.type] || {}).shot || 0xff3a5a;
    const m = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.setScalar(0.2);
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); g.scale.setScalar(7); m.add(g); scene.add(m);
    const pos = e.pos.clone().add(new THREE.Vector3(Math.sin(yaw) * 0.6, 1.1 * (e.rig.cfg.scale || 1), Math.cos(yaw) * 0.6));
    projectiles.push({ mesh: m, pos, vel: new THREE.Vector3(Math.sin(yaw) * 13, 0, Math.cos(yaw) * 13), owner: 'enemy', dmg: Math.round(e.def.dmg * 0.8), life: 1.6, radius: 0.75, color: col });
    sfx('enemyProjectile');
  }
  function showGuard(e, on) {
    if (on && !e.guardFx) { const m = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(0.75, 0.95, 0.14); m.position.set(0, 1.1, 0.6); e.rig.root.add(m); e.guardFx = m; }
    if (e.guardFx) e.guardFx.visible = !!on;
  }
  // the director: hands out attack turns and spreads the waiting enemies into a ring around Ren
  function enemyDirector(dt) {
    tokenGapT = Math.max(0, tokenGapT - dt);
    attackTokens = 0; for (const e of enemies) { if (e.dead) e.hasTok = false; else if (e.hasTok) attackTokens++; }
    slotT -= dt; if (slotT > 0 || !player) return; slotT = 0.35;
    const list = enemies.filter((e) => !e.boss && !e.dead && !e.decoyHidden && e.role !== 'ranged' && !e.hasTok); if (!list.length) return;
    const ang = (e) => Math.atan2(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
    list.sort((a, b) => ang(a) - ang(b));
    const step = TAU / Math.max(list.length, 3); let sx = 0, sz = 0;
    list.forEach((e, i) => { const o = ang(e) - i * step; sx += Math.sin(o); sz += Math.cos(o); });
    const base = Math.atan2(sx, sz); list.forEach((e, i) => { e.slotA = base + i * step; });
  }
  function updateEnemy(e, dt) {
    const rig = e.rig; e.st += dt; const s = rig.cfg.scale || 1;
    if (e.state === 'spawn') { rig.root.scale.setScalar(s * sm(e.st / 0.6)); if (e.st > 0.6) { e.state = 'chase'; e.st = 0; } physics(e, dt); syncFighter(e, dt); rig.root.scale.setScalar(s * sm(e.st / 0.6 + (e.state === 'chase' ? 1 : 0))); return; }
    if (e.state === 'dying') { rig.root.scale.setScalar(s * Math.max(0.01, 1 - e.st * 1.6)); physics(e, dt); e.vel.x *= 0.9; e.vel.z *= 0.9; syncFighter(e, dt); if (e.st > 0.6) { removeFighter(e); e.removed = true; } return; }
    if (e.boss) { bossBrain(e, dt); }
    else {
      const p = player, dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 0.001, ty = Math.atan2(dx, dz), A = ENEMY_AI[e.type] || {}, Df = D();
      e.atkCd -= dt; e.vel.x = 0; e.vel.z = 0; e.guardCd = (e.guardCd || 0) - dt; e.evadeCd = (e.evadeCd || 0) - dt;
      if (e.rootT > 0) { e.rootT -= dt; if (e.vine) { e.vine.rotation.y += dt; if (e.rootT <= 0) e.vine.visible = false; } }
      // read Ren's swing as it starts: some enemies block, some side-step (one roll per swing)
      if (p.state === 'atk' && e.seenSwing !== atkSerial && (e.state === 'chase' || e.state === 'recover')) {
        e.seenSwing = atkSerial;
        if (d < 3.3 && Math.abs(angDiff(p.yaw, Math.atan2(-dx, -dz))) < 0.9) {
          const r = Math.random(), pb = (A.block || 0) * Df.react, pe = (A.evade || 0) * Df.react;
          if (pb && e.guardCd <= 0 && r < pb) { e.state = 'guard'; e.st = 0; e.guardCd = 3.2; e.yaw = ty; play(rig, 'sign', 1); showGuard(e, true); relTok(e); }
          else if (pe && e.evadeCd <= 0 && r < pb + pe) { e.state = 'evade'; e.st = 0; e.evadeCd = 3.5; const sd = Math.random() < 0.5 ? 1 : -1; e.evDir = new THREE.Vector3(-dx / d * 0.7 + dz / d * sd, 0, -dz / d * 0.7 - dx / d * sd).normalize(); play(rig, 'dodge', 0.36); sfx('evade'); relTok(e); cancelTele(e); }
        }
      }
      switch (e.state) {
        case 'chase': {
          e.yaw += angDiff(e.yaw, ty) * (1 - Math.exp(-6 * dt));
          const canTok = e.atkCd <= 0 && attackTokens < Df.tokens && tokenGapT <= 0 && !p.dead;
          if (e.role === 'ranged' && !e.hasTok) {
            // keep 6-10 m away, strafe, and fire telegraphed bolts while the others close in
            if (e.strafeT === undefined || (e.strafeT -= dt) <= 0) { e.strafeT = rand(1.4, 2.8); e.strafe = Math.random() < 0.5 ? 1 : -1; }
            const ux = dx / d, uz = dz / d; let vx = uz * e.strafe * 0.7, vz = -ux * e.strafe * 0.7;
            if (d > 10) { vx += ux; vz += uz; } else if (d < 5.5) { vx -= ux * 1.2; vz -= uz * 1.2; }
            const l = Math.hypot(vx, vz) || 1, sp = e.def.speed * 0.7; e.vel.x = vx / l * sp; e.vel.z = vz / l * sp; rig.anim = 'run';
            e.shotCd -= dt; let aiming = 0; for (const o of enemies) if (o.state === 'aim') aiming++;
            if (e.shotCd <= 0 && d < 17 && d > 3 && !p.dead && aiming < (Df.tokens >= 3 ? 2 : 1)) { e.state = 'aim'; e.st = 0; e.wind = 0.85 * Df.wind; e.aimYaw = ty; e.yaw = ty; play(rig, 'cast', e.wind + 0.4); e.tele = telegraph('line', e.pos.clone(), 1.1, Math.min(18, d + 4), ty, e.wind); }
            else if (d < 2.4 && canTok) { e.hasTok = true; attackTokens++; e.tokT = 0; tokenGapT = Df.gap; }
            break;
          }
          if (e.hasTok) {
            // my turn: close in and strike
            e.tokT = (e.tokT || 0) + dt;
            if (d > 1.7) { e.vel.x = dx / d * e.def.speed; e.vel.z = dz / d * e.def.speed; rig.anim = 'run'; } else rig.anim = 'idle';
            if (d < 2.4 && !p.dead) { e.chainLeft = (A.chain || 0) + Df.chain; enemyWindup(e, e.def.wind * Df.wind); }
            else if (e.tokT > 3.5) { relTok(e); e.atkCd = rand(0.5, 1); }
          } else {
            // wait my turn on a ring around Ren
            const sa = e.slotA !== undefined ? e.slotA : Math.atan2(-dx, -dz), ring = 3.6;
            const gx = p.pos.x + Math.sin(sa) * ring - e.pos.x, gz = p.pos.z + Math.cos(sa) * ring - e.pos.z, gd = Math.hypot(gx, gz);
            if (gd > 0.5) { const sp = e.def.speed * (gd > 3 ? 1 : 0.5); e.vel.x = gx / gd * sp; e.vel.z = gz / gd * sp; rig.anim = 'run'; } else rig.anim = 'idle';
            if (canTok && d < 10) { e.hasTok = true; attackTokens++; e.tokT = 0; tokenGapT = Df.gap + rand(0, 0.3); }
          }
          break;
        }
        case 'windup':
          rig.animT = Math.min(rig.animT, e.wind * 0.6);
          if (e.tele && !Array.isArray(e.tele)) e.tele.m.material.uniforms.fill.value = e.st / e.wind;
          if (e.st > e.wind) {
            e.state = 'attack'; e.st = 0; rig.animT = e.wind * 0.62; sfx('enemyAtk');
            const c = e.pos.clone().add(new THREE.Vector3(Math.sin(e.yaw) * 1.3, 0, Math.cos(e.yaw) * 1.3)); cancelTele(e);
            slashArc(c.clone().setY(e.pos.y + 1.1), e.yaw, 1.2, 1.2, 0xff3a5a);
            if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 1.6 && Math.abs(p.pos.y - e.pos.y) < 1.6) hurtPlayer(e.def.dmg, e.pos);
            e.vel.x = Math.sin(e.yaw) * 4; e.vel.z = Math.cos(e.yaw) * 4;
          }
          break;
        case 'attack':
          if (e.st > 0.42) {
            if (e.chainLeft > 0 && d < 3.2 && !p.dead && Math.random() < 0.4 * Df.react) { e.chainLeft--; e.yaw = ty; enemyWindup(e, 0.4); }
            else { e.state = 'recover'; e.st = 0; relTok(e); e.atkCd = rand(1.7, 3.0) * Df.atkCd; }
          }
          break;
        case 'recover': rig.anim = 'idle'; e.yaw += angDiff(e.yaw, ty) * (1 - Math.exp(-4 * dt)); if (e.st > 0.4) { e.state = 'chase'; e.st = 0; } break;
        case 'aim':
          e.yaw = e.aimYaw; if (e.tele && !Array.isArray(e.tele)) e.tele.m.material.uniforms.fill.value = e.st / e.wind;
          if (Math.random() < 0.5) spawnP(PA, e.pos.x + Math.sin(e.yaw) * 0.6 + rand(-0.15, 0.15), e.pos.y + 1.2 + rand(-0.15, 0.15), e.pos.z + Math.cos(e.yaw) * 0.6, 0, 0.3, 0, 0.3, 0.35, A.shot || 0xff3a5a);
          if (e.st > e.wind) { cancelTele(e); enemyShot(e, e.aimYaw); e.state = 'recover'; e.st = -0.1; e.shotCd = rand(2.6, 3.8) / Df.ranged; }
          break;
        case 'guard': e.yaw += angDiff(e.yaw, ty) * (1 - Math.exp(-10 * dt)); if (e.st > 0.95) { e.state = 'chase'; e.st = 0; showGuard(e, false); e.atkCd = Math.min(e.atkCd, 0.3); } break;
        case 'evade': { const k = e.st < 0.28 ? 9 : 2; e.vel.x = e.evDir.x * k; e.vel.z = e.evDir.z * k; if (e.st > 0.36) { e.state = 'chase'; e.st = 0; e.atkCd = Math.min(e.atkCd, 0.4); } break; }
        case 'rooted': rig.animT = Math.min(rig.animT, 0.15); if (!(e.rootT > 0)) { e.state = 'chase'; e.st = 0; } break;
        case 'stagger': relTok(e); cancelTele(e); showGuard(e, false); if (e.st > 0.45) { e.state = 'chase'; e.st = 0; e.atkCd = Math.max(e.atkCd, 0.6); } break;
        case 'launched': relTok(e); cancelTele(e); showGuard(e, false); e.gravity = 18; if (e.grounded && e.st > 0.2) { e.state = 'down'; e.st = 0; play(rig, 'down'); e.gravity = 26; } break;
        case 'down': if (e.st > 0.7) { e.state = 'chase'; e.st = 0; } break;
      }
    }
    e.vel.x += e.kb.x; e.vel.z += e.kb.z; e.kb.multiplyScalar(Math.exp(-7 * dt));
    // separation
    for (const o of enemies) { if (o === e || o.dead) continue; const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z, d = Math.hypot(dx, dz), m = e.radius + o.radius; if (d < m && d > 0.001) { e.pos.x += dx / d * (m - d) * 0.5; e.pos.z += dz / d * (m - d) * 0.5; } }
    if (player && !player.dead) { const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz), m = e.radius + 0.4; if (d < m && d > 0.001 && player.state !== 'dash') { e.pos.x += dx / d * (m - d); e.pos.z += dz / d * (m - d); } }
    physics(e, dt);
    if (e.pos.y < -15 && !e.boss) killEnemy(e);
    syncFighter(e, dt);
  }
  function relTok(e) { if (e.hasTok) { e.hasTok = false; attackTokens = Math.max(0, attackTokens - 1); } }

  // ---------- bosses ----------
  let bossActive = false;
  // data-driven: attacks per phase, the rage move that opens each new phase, moves with i-frames, the gap-closer, and the grimoire it drops.
  // Part 2 adds the chapter 5-8 bosses here (and their grimoires in GRIMOIRES).
  const BOSSES = {
    kaze: { mk: makeKaze, hp: 320, speed: 4.5, poise: 60, attacks: ['windSlash', 'galeDash', 'combo'], p2: ['windSlash3', 'cyclone', 'galeDash', 'combo', 'multiDash'], p3: ['windSlash3', 'multiDash', 'combo', 'tornado', 'galeDash'], phases: [0.6, 0.3], rage: { 2: 'cyclone', 3: 'tornado' }, iframes: ['galeDash', 'multiDash', 'cyclone', 'tornado'], closer: 'galeDash', emo: 'determined', drop: 'gale' },
    twin: { mk: makeTwin, hp: 380, speed: 5, poise: 70, attacks: ['galeDash', 'orbs', 'combo'], p2: ['galeDash', 'orbs', 'combo', 'clones', 'shadowStep'], p3: ['shadowStep', 'orbRing', 'clones', 'combo', 'galeDash'], phases: [0.6, 0.3], rage: { 2: 'clones', 3: 'orbRing' }, iframes: ['galeDash', 'shadowStep'], closer: 'shadowStep', emo: 'neutral', armorMul: 1, drop: 'shadow' },
    warden: { mk: makeWarden, hp: 520, speed: 2.4, poise: 90, attacks: ['slam', 'roots', 'sweep'], p2: ['slam', 'roots', 'sweep', 'quake'], p3: ['quake', 'thornWall', 'roots', 'sweep', 'slam'], phases: [0.6, 0.3], rage: { 2: 'quake', 3: 'thornWall' }, iframes: [], closer: 'roots', emo: 'angry', drop: 'thorn' },
    null: { mk: makeNull, hp: 720, speed: 3.5, poise: 110, attacks: ['orbs', 'beam', 'blink'], p2: ['orbs', 'beam', 'blink', 'ringBurst', 'storm', 'orbRing'], p3: ['orbRing', 'beam', 'blink2', 'ringBurst', 'storm', 'crossBeams'], phases: [0.66, 0.33], rage: { 2: 'ringBurst', 3: 'crossBeams' }, iframes: ['blink', 'blink2'], closer: 'blink', emo: 'neutral', drop: 'void' },
    // part 2 bosses: want = preferred distance, melee = combo anim, *Col = colours for shared moves, decoyMk = clone rig, tint3 = phase-3 screen tint
    dune: { mk: makeSabulo, hp: 820, speed: 3.3, poise: 110, attacks: ['sandWave', 'quicksand', 'combo', 'roots'], p2: ['sandWave', 'quicksand', 'combo', 'burrow', 'roots', 'sandstorm'], p3: ['burrow', 'duneQuake', 'sandstorm', 'quicksand', 'sandWave', 'combo'], phases: [0.6, 0.3], rage: { 2: 'sandstorm', 3: 'duneQuake' }, iframes: ['burrow'], closer: 'burrow', emo: 'angry', drop: 'dune', want: 5, radius: 0.8, melee: 'slash', spikeCol: 0xc8985e },
    frost: { mk: makeFubuki, hp: 900, speed: 4.8, poise: 100, attacks: ['iceLance', 'shardFan', 'combo'], p2: ['iceLance3', 'shardFan', 'combo', 'blizzard', 'multiDash', 'frostNova'], p3: ['avalanche', 'frostNova', 'multiDash', 'iceLance3', 'combo', 'blizzard'], phases: [0.6, 0.3], rage: { 2: 'blizzard', 3: 'avalanche' }, iframes: ['multiDash'], closer: 'multiDash', emo: 'neutral', drop: 'frost', want: 5, melee: 'slash', tint3: 0x6ad8ff },
    prism: { mk: makeColossus, hp: 1080, speed: 2.6, poise: 140, attacks: ['prismBeam', 'crystalRise', 'slam'], p2: ['prismBeam', 'crystalRise', 'slam', 'crossBeams', 'quake', 'shardFan'], p3: ['prismWave', 'crossBeams', 'crystalRise', 'prismBeam', 'quake', 'slam'], phases: [0.6, 0.3], rage: { 2: 'crossBeams', 3: 'prismWave' }, iframes: [], closer: 'crystalRise', emo: 'angry', drop: 'prism', want: 4, radius: 1.3, big: true, melee: 'slam', beamCol: 0xff9af0 },
    vael: { mk: makeVael, hp: 1450, speed: 4.6, poise: 150, attacks: ['combo', 'orbs', 'shadowStep', 'eclipseSlash'], p2: ['combo', 'orbRing', 'shadowStep', 'crossBeams', 'eclipseSlash', 'clones'], p3: ['blackSun', 'blink2', 'crossBeams', 'eclipseRain', 'combo', 'ringBurst', 'eclipseSlash'], phases: [0.66, 0.33], rage: { 2: 'clones', 3: 'blackSun' }, iframes: ['shadowStep', 'blink2'], closer: 'shadowStep', emo: 'neutral', drop: 'eclipse', want: 5, melee: 'slash', orbCol: 0xff3a6a, stepCol: 0xff3a6a, beamCol: 0xff3a6a, decoyMk: makeVael, tint3: 0xff2a4a, music: 'final' },
  };
  function spawnBoss(id) {
    const B = BOSSES[id]; const rig = B.mk(); rig.fight = id !== 'null' && !B.noFight;
    const def = Object.assign({ id }, B); const hp = Math.round(B.hp * D().bHp);
    const e = makeFighter(rig, { type: id, def, hp, maxHp: hp, kind: 'enemy', boss: true, state: 'idle', st: 0, atkCd: 1.5, phase: 1, radius: B.radius || (id === 'warden' ? 1.3 : 0.55) });
    const a = level.arena; e.pos.set(a.x, a.y, a.z + 6); e.yaw = Math.PI; e.lastPos.copy(e.pos); syncFighter(e, 0);
    setEmotion(rig, B.emo);
    def.onDefeat = (b) => bossDefeated(b);
    enemies.push(e); state.boss = { name: CHAPTERS.find((c) => c.boss.id === id).boss.name, hp: e.hp, maxHp: e.maxHp, phase: 1 };
    return e;
  }
  function bossBrain(e, dt) {
    const p = player, rig = e.rig, B = e.def; if (e.dead) return;
    const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 0.001, ty = Math.atan2(dx, dz), Df = D();
    e.vel.x = 0; e.vel.z = 0; e.iframe = 0; e.recentT = Math.max(0, (e.recentT || 0) - dt); e.poiseLock = Math.max(0, (e.poiseLock || 0) - dt);
    if (e.rootT > 0) { e.rootT -= dt; if (e.vine) { e.vine.rotation.y += dt; if (e.rootT <= 0) e.vine.visible = false; } }
    // phase check: a new phase opens with a rage roar (i-frames, pushes Ren back) and its signature move
    const fr = e.hp / e.maxHp;
    if (B.phases[e.phase - 1] !== undefined && fr <= B.phases[e.phase - 1]) {
      e.phase++; state.boss.phase = e.phase; emit('bossPhase', { phase: e.phase }); sfx('roar'); impact = 2; cam.shake = 0.6; shockRing(e.pos, 8, 0xff3a5a, 0.6); burst(e.pos.x, e.pos.y + 1.5, e.pos.z, 50, 0xff3a5a, 9, 0.8, 0.4, 0); setEmotion(rig, 'angry');
      if ((B.id === 'null' || B.tint3) && e.phase === 3) { OV.tintAmt.value = 0.25; OV.tint.value.set(B.tint3 || 0xff2a6a); }
      endBossAttackFx(e); e.wantGuard = false; showGuard(e, false); e.state = 'rage'; e.st = 0; e.ragePushed = false; play(rig, 'power', 1.2); if (rig.aura) rig.aura.visible = true;
    }
    if (!bossActive || p.dead) { rig.anim = 'idle'; return; }
    const rate = [1, 1.25, 1.5][e.phase - 1] / Df.bossCd;
    switch (e.state) {
      case 'idle': case 'chase': {
        if (e.wantGuard) { e.wantGuard = false; e.state = 'guard'; e.st = 0; e.yaw = ty; play(rig, 'sign', 0.8); showGuard(e, true); flash(e.pos.clone().setY(e.pos.y + 1.4), 2.4, 0x7ad8ff); sfx('guardUp'); break; }
        e.yaw += angDiff(e.yaw, ty) * (1 - Math.exp(-5 * dt)); e.atkCd -= dt * rate;
        const want = B.want || (B.id === 'warden' ? 3.5 : B.id === 'null' ? 8 : 4), rooted = e.rootT > 0;
        if (!rooted && d > want + 1) { const sp = B.speed * [1, 1.15, 1.3][e.phase - 1]; e.vel.x = dx / d * sp; e.vel.z = dz / d * sp; rig.anim = 'run'; }
        else if (!rooted && d < want - 2) { e.vel.x = -dx / d * 2; e.vel.z = -dz / d * 2; rig.anim = 'run'; }
        else rig.anim = 'idle';
        if (e.atkCd <= 0) {
          const list = e.phase === 3 && B.p3 ? B.p3 : e.phase >= 2 && B.p2 ? B.p2 : B.attacks; const pick = () => list[Math.floor(Math.random() * list.length)];
          let a = pick(); if (a === e.lastAtk) a = pick(); if ((a === 'melee' || a === 'combo') && d > 6) a = B.closer || list[0];
          e.lastAtk = a; startBossAttack(e, a);
        }
        break;
      }
      case 'attack': bossAttackUpdate(e, dt); break;
      case 'stagger': if (e.st > 0) { e.state = 'idle'; e.st = 0; e.atkCd = 0.8; } break;
      case 'guard': e.yaw += angDiff(e.yaw, ty) * (1 - Math.exp(-12 * dt)); if (e.st > 0.4) { showGuard(e, false); startBossAttack(e, 'counter'); } break;
      case 'rage':
        e.iframe = 1; if (Math.random() < 0.6) spawnP(PA, e.pos.x + rand(-0.8, 0.8), e.pos.y + rand(0, 2.5), e.pos.z + rand(-0.8, 0.8), 0, 4, 0, 0.5, 0.45, 0xff3a5a);
        if (e.st > 0.35 && !e.ragePushed) { e.ragePushed = true; shockRing(e.pos, 6, 0xff3a5a, 0.5); cam.shake = 0.5; if (d < 5.5) p.kb.set(dx / d * 12, 0, dz / d * 12); }
        if (e.st > 1.1) { if (rig.aura && B.id !== 'null') rig.aura.visible = false; const list = e.phase === 3 && B.p3 ? B.p3 : B.p2 || B.attacks; const a = (B.rage && B.rage[e.phase]) || list[0]; e.lastAtk = a; startBossAttack(e, a); }
        break;
    }
  }
  function aimYaw(e) { return Math.atan2(player.pos.x - e.pos.x, player.pos.z - e.pos.z); }
  const fwdOf = (e, r) => e.pos.clone().add(new THREE.Vector3(Math.sin(e.yaw) * r, 0, Math.cos(e.yaw) * r));
  function bossHit(c, r, dmg) { const p = player; if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < r && p.pos.y - level.arena.y < 1.2) return hurtPlayer(dmg, c); return false; }
  // Hard's extra chain steps start after the chapter 1 tutorial boss
  const chainX = () => (state.chapter >= 2 ? D().chain : 0);
  const CHAINED = ['combo', 'multiDash', 'quake', 'crossBeams', 'shadowStep', 'blink2'];
  function startBossAttack(e, a) {
    e.state = 'attack'; e.st = 0; e.atk = a; e.fired = 0; const rig = e.rig; e.yaw = aimYaw(e); sfx('telegraph');
    const W0 = { windSlash: 0.85, windSlash3: 0.9, galeDash: 0.8, melee: 0.6, combo: 0.7, cyclone: 1.1, orbs: 0.7, clones: 0.8, slam: 1.1, roots: 1.0, sweep: 1.2, beam: 1.1, blink: 0.7, ringBurst: 1.0, storm: 1.0, counter: 0.5, tornado: 1.1, orbRing: 0.85, thornWall: 1.0, multiDash: 0.75, quake: 0.9, crossBeams: 1.1, shadowStep: 0.45, blink2: 0.45 }[a] || (ATK2[a] && ATK2[a].w) || 0.8;
    // later phases and Hard wind up faster, but a telegraph never gets shorter than 0.45 s
    const W = Math.max(Math.min(W0, 0.45), W0 / ([1, 1.1, 1.2][e.phase - 1] / D().wind));
    e.wind = W; const fwd = (r) => fwdOf(e, r);
    e.pos.y = Math.max(e.pos.y, groundAt(e.pos.x, e.pos.z, e.pos.y + 1) || e.pos.y);
    const gy = level.arena.y; const gp = (v) => v.setY(gy); const sc = rig.cfg.scale || 1;
    if (CHAINED.includes(a)) { chainStart(e, a); return; }
    if (ATK2[a]) { ATK2[a].setup(e, W, gp); return; }
    switch (a) {
      case 'windSlash': play(rig, 'slash', W + 0.5); e.tele = telegraph('line', gp(e.pos.clone()), 2.4, 22, e.yaw, W); break;
      case 'windSlash3': play(rig, 'slash', W + 0.5); e.tele = [-0.45, 0, 0.45].map((o) => telegraph('line', gp(e.pos.clone()), 2.2, 20, e.yaw + o, W)); break;
      case 'galeDash': play(rig, 'dash', W + 0.4); e.dashLen = Math.min(16, Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) + 4); e.tele = telegraph('line', gp(e.pos.clone()), 2.2, e.dashLen, e.yaw, W); break;
      case 'melee': play(rig, B_melee(e), W + 0.4); e.tele = telegraph('circle', gp(fwd(1.8 * sc)), 2.4, 0, 0, W); break;
      case 'counter': play(rig, B_melee(e), W + 0.4); e.tele = telegraph('circle', gp(e.pos.clone()), 3.4 * Math.max(1, sc * 0.8), 0, 0, W); break;
      case 'cyclone': play(rig, 'raise', W + 0.6); e.tele = telegraph('circle', gp(e.pos.clone()), 5.5, 0, 0, W); break;
      case 'tornado': play(rig, 'raise', W + 0.6); e.tele = telegraph('circle', gp(e.pos.clone()), 6, 0, 0, W); break;
      case 'orbs': play(rig, 'cast2', W + 0.5); break;
      case 'orbRing': play(rig, 'cast2', W + 0.5); e.tele = telegraph('circle', gp(e.pos.clone()), 3, 0, 0, W); break;
      case 'clones': play(rig, 'raise', W + 0.4); break;
      case 'slam': play(rig, 'slam', W + 0.6); e.tele = telegraph('circle', gp(fwd(3.5)), 4.5, 0, 0, W); break;
      case 'thornWall': play(rig, 'slam', W + 0.6); e.tele = telegraph('circle', gp(e.pos.clone()), 3.5, 0, 0, W); break;
      case 'roots': play(rig, 'raise', W + 0.5); { const n = e.phase >= 2 ? 6 : 4; e.rootPts = []; for (let i = 0; i < n; i++) { const pt = i === 0 ? player.pos.clone() : player.pos.clone().add(new THREE.Vector3(rand(-6, 6), 0, rand(-6, 6))); gp(pt); e.rootPts.push(pt); } e.tele = e.rootPts.map((pt) => telegraph('circle', pt, 1.8, 0, 0, W)); } break;
      case 'sweep': play(rig, 'slash', W + 0.5); e.tele = telegraph('circle', gp(e.pos.clone()), 7, 0, 0, W); break;
      case 'beam': play(rig, 'cast2', W + 0.7); e.tele = telegraph('line', gp(e.pos.clone()), 3, 30, e.yaw, W); break;
      case 'blink': play(rig, 'raise', W + 0.4); break;
      case 'ringBurst': play(rig, 'raise', W + 0.6); e.tele = telegraph('circle', gp(e.pos.clone()), 3, 0, 0, W); break;
      case 'storm': play(rig, 'raise', W + 0.8); { e.rootPts = []; for (let i = 0; i < 7; i++) { const a2 = rand(0, TAU), r = rand(0, level.arena.r - 2); const pt = i < 2 ? player.pos.clone() : new THREE.Vector3(level.arena.x + Math.cos(a2) * r, gy, level.arena.z + Math.sin(a2) * r); gp(pt); e.rootPts.push(pt); } e.tele = e.rootPts.map((pt) => telegraph('circle', pt, 2, 0, 0, W)); } break;
    }
  }
  function B_melee(e) { return e.def.melee || (e.def.id === 'warden' ? 'slam' : e.def.id === 'kaze' ? 'slash' : 'claw'); }
  // multi-step attacks: each step has its own telegraph (setup), a hit (fire) and an active window (act)
  const CHAINS = {
    combo: {
      n: (e) => (e.phase >= 2 ? 3 : 2) + chainX(), dur: 0.2, wind: (e, i) => (i ? Math.max(0.4, 0.52 - e.phase * 0.04) : e.wind),
      setup(e, i, W) { e.yaw = aimYaw(e); play(e.rig, B_melee(e), W + 0.35); const sc = e.rig.cfg.scale || 1; e.cR = 2.3 * Math.max(1, sc * 0.85); e.tele = telegraph('circle', fwdOf(e, 1.9 * sc).setY(level.arena.y), e.cR, 0, 0, W); },
      pre(e, i, t, W, dt) {
        // step in toward Ren during the first half of the wind-up; the red circle travels with the boss
        const p = player, dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 1, sc = e.rig.cfg.scale || 1;
        if (t < W * 0.55) { e.yaw += angDiff(e.yaw, Math.atan2(dx, dz)) * (1 - Math.exp(-6 * dt)); if (d > 2.2 * sc && !(e.rootT > 0)) { e.vel.x = dx / d * 6; e.vel.z = dz / d * 6; } }
        if (e.tele && !Array.isArray(e.tele)) { const c = fwdOf(e, 1.9 * sc); e.tele.m.position.set(c.x, level.arena.y + 0.06, c.z); e.tele.cx = c.x; e.tele.cz = c.z; }
      },
      fire(e, i) { const sc = e.rig.cfg.scale || 1, c = fwdOf(e, 1.9 * sc); slashArc(c.clone().setY(e.pos.y + 1.2), e.yaw, i % 2 ? -0.5 : 0.5, 2 * sc, i === e.cN - 1 ? 0xff7a2a : 0xff3a5a, i % 2); bossHit(c, e.cR, i === e.cN - 1 ? 13 : 10); sfx('whoosh'); if (i === e.cN - 1) cam.shake = Math.max(cam.shake, 0.3); },
    },
    multiDash: {
      n: (e) => 3 + chainX(), dur: 0.3, wind: (e, i) => (i ? 0.5 : e.wind), iframe: (e, i, fired) => fired,
      setup(e, i, W) { e.yaw = aimYaw(e); play(e.rig, 'dash', W + 0.3); e.dashLen = Math.min(14, Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) + 3); e.tele = telegraph('line', e.pos.clone().setY(level.arena.y), 2.2, e.dashLen, e.yaw, W); },
      fire(e) { e.dashFrom = e.pos.clone(); e.hitP = false; sfx('dash'); },
      act(e, i, t) { const k = clamp(t / 0.22, 0, 1), np = e.dashFrom.clone().add(new THREE.Vector3(Math.sin(e.yaw) * e.dashLen * k, 0, Math.cos(e.yaw) * e.dashLen * k)); if (!blocked(np.x, np.z, e.pos.y)) { e.pos.x = np.x; e.pos.z = np.z; } spawnP(PA, e.pos.x, e.pos.y + 1, e.pos.z, 0, 0, 0, 0.4, 0.6, 0x7affe0); if (!e.hitP && player.pos.distanceTo(e.pos) < 1.6) e.hitP = hurtPlayer(13, e.pos) || true; },
    },
    quake: {
      n: (e) => 3 + chainX(), dur: 0.25, wind: (e, i) => (i ? 0.6 : e.wind),
      setup(e, i, W) { e.yaw = aimYaw(e); play(e.rig, 'slam', W + 0.5); const off = player.pos.clone().sub(e.pos).setY(0); if (off.length() > 12) off.setLength(12); e.cPt = e.pos.clone().add(off).setY(level.arena.y); e.tele = telegraph('circle', e.cPt, 3, 0, 0, W); },
      fire(e) { const c = e.cPt; shockRing(c, 4, 0xffb020, 0.45); burst(c.x, c.y + 0.3, c.z, 30, 0xc8a070, 8, 0.6, 0.5); cam.shake = Math.max(cam.shake, 0.5); sfx('slam'); bossHit(c, 3, 15); },
    },
    crossBeams: {
      n: () => 2, dur: 0.55, wind: (e, i) => (i ? 0.8 : e.wind),
      setup(e, i, W) { if (!i) e.cRot = rand(0, Math.PI / 2); play(e.rig, 'raise', W + 0.6); e.cYaws = [0, 1, 2, 3].map((k) => e.cRot + (i % 2 ? Math.PI / 4 : 0) + k * Math.PI / 2); e.tele = e.cYaws.map((y) => telegraph('line', e.pos.clone().setY(level.arena.y), 2.8, 26, y, W)); },
      fire(e) {
        const p = player, gy = level.arena.y; e.beams = []; sfx('beam'); cam.shake = 0.45; let hit = false;
        for (const y of e.cYaws) {
          const holder = new THREE.Group(), m = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: e.def.beamCol || 0xfff0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(0.8, 26, 0.8); m.rotation.x = Math.PI / 2; m.position.z = 13; holder.add(m); holder.position.set(e.pos.x, gy + 1.1, e.pos.z); holder.rotation.y = y; scene.add(holder); e.beams.push(holder);
          const lx = p.pos.x - e.pos.x, lz = p.pos.z - e.pos.z, along = lx * Math.sin(y) + lz * Math.cos(y), perp = Math.abs(lx * Math.cos(y) - lz * Math.sin(y));
          if (!hit && along > 0 && along < 26 && perp < 1.5 && p.pos.y - gy < 2) hit = hurtPlayer(16, e.pos) || true;
        }
      },
      act(e, i, t) { if (e.beams) for (const b of e.beams) b.children[0].material.opacity = 1 - clamp(t / 0.55, 0, 1); },
      end(e) { if (e.beams) { for (const b of e.beams) scene.remove(b); e.beams = null; } },
    },
    // vanish, reappear behind Ren, strike (twice for blink2 / Hard)
    shadowStep: {
      n: (e) => 2 * (1 + chainX()), dur: 0.15, wind: (e, i) => (i % 2 ? 0.6 : e.wind), iframe: (e, i) => i % 2 === 0,
      setup(e, i, W) { const col = e.def.stepCol || (e.def.id === 'twin' ? 0xff2a4a : 0xffd24a); if (i % 2 === 0) { play(e.rig, 'raise', W + 0.3); burst(e.pos.x, e.pos.y + 1, e.pos.z, 20, col, 4, 0.4, 0.4, 0); } else { e.yaw = aimYaw(e); play(e.rig, 'slash', W + 0.4); e.rig.animT = 0.1; e.tele = telegraph('circle', fwdOf(e, 1.5).setY(level.arena.y), 2.6, 0, 0, W); } },
      fire(e, i) {
        const col = e.def.stepCol || (e.def.id === 'twin' ? 0xff2a4a : 0xffd24a);
        if (i % 2 === 0) { burst(e.pos.x, e.pos.y + 1, e.pos.z, 25, col, 5, 0.5, 0.4, 0); const an = player.yaw + Math.PI + rand(-0.6, 0.6); let x = player.pos.x + Math.sin(an) * 2.6, z = player.pos.z + Math.cos(an) * 2.6; if (blocked(x, z, e.pos.y)) { x = player.pos.x - Math.sin(an) * 2.6; z = player.pos.z - Math.cos(an) * 2.6; } e.pos.x = x; e.pos.z = z; e.yaw = aimYaw(e); sfx('blink'); burst(e.pos.x, e.pos.y + 1, e.pos.z, 25, col, 5, 0.5, 0.4, 0); }
        else { slashArc(e.pos.clone().setY(e.pos.y + 1.2), e.yaw, 0.2, 2.6, col); bossHit(fwdOf(e, 1.5), 2.6, 14); sfx('whoosh'); }
      },
    },
  };
  CHAINS.blink2 = Object.assign({}, CHAINS.shadowStep, { n: (e) => 4 + 2 * chainX() });
  // ---------- part 2 boss moves (chapters 5-8) ----------
  // ATK2[name]: w = base wind-up (s), setup(e, W, gp) = telegraph + anim, pre(e, t, dt) = during the wind-up, fire(e) = the hit, act(e, t, dt) = after the hit, dur = active time
  function crystalBurst(pt, col, n = 5, s = 1) {
    const g = new THREE.Group(); g.position.copy(pt); scene.add(g); const m = toon(col, { em: col, ei: 0.5 });
    for (let i = 0; i < n; i++) { const a = i / n * TAU + rand(-0.3, 0.3), r = i ? rand(0.4, 0.9) * s : 0, l = (i ? rand(1.2, 2) : 2.6) * s; part(g, G.oct, m, [Math.sin(a) * r, l * 0.4, Math.cos(a) * r], [0.3 * s, l, 0.3 * s], [Math.cos(a) * 0.35, a, -Math.sin(a) * 0.35]); }
    burst(pt.x, pt.y + 0.4, pt.z, 14, col, 6, 0.5, 0.3);
    projectiles.push({ mesh: g, pos: pt.clone(), vel: new THREE.Vector3(), owner: 'fx', life: 0.9, grow: true });
  }
  function sandColumn(pt, col = 0xe8b860) {
    const m = new THREE.Mesh(CONE8, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.scale.set(1.8, 7, 1.8); m.rotation.x = Math.PI; m.position.set(pt.x, pt.y + 3.5, pt.z); scene.add(m);
    burst(pt.x, pt.y + 0.5, pt.z, 24, col, 7, 0.7, 0.45, 2); shockRing(pt, 2.6, col, 0.4);
    projectiles.push({ mesh: m, pos: m.position.clone(), vel: new THREE.Vector3(), owner: 'fx', life: 0.45 });
  }
  function darkStrike(pt, col = 0xff3a6a) {
    const pts = []; let x = pt.x, z = pt.z; for (let y = 36; y >= pt.y; y -= 4) { pts.push(new THREE.Vector3(x, y, z)); x = pt.x + rand(-1, 1); z = pt.z + rand(-1, 1); } pts.push(pt.clone());
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true })); scene.add(l);
    flash(pt.clone().setY(pt.y + 0.5), 4, col); shockRing(pt, 2.5, col, 0.4); burst(pt.x, pt.y + 0.3, pt.z, 16, 0x2a0010, 5, 0.5, 0.4, 0);
    projectiles.push({ mesh: l, pos: pt.clone(), vel: new THREE.Vector3(), owner: 'fx', life: 0.3 });
  }
  function beamAt(e, yaw, col, len = 28, w = 0.8) {
    const holder = new THREE.Group(), m = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.scale.set(w, len, w); m.rotation.x = Math.PI / 2; m.position.z = len / 2; holder.add(m);
    const core = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); core.scale.set(w * 0.35, len, w * 0.35); core.rotation.x = Math.PI / 2; core.position.z = len / 2; holder.add(core);
    holder.position.set(e.pos.x, level.arena.y + 1.1, e.pos.z); holder.rotation.y = yaw; scene.add(holder); (e.p2fx = e.p2fx || []).push(holder);
    const p = player, lx = p.pos.x - e.pos.x, lz = p.pos.z - e.pos.z, along = lx * Math.sin(yaw) + lz * Math.cos(yaw), perp = Math.abs(lx * Math.cos(yaw) - lz * Math.sin(yaw));
    return along > 0 && along < len && perp < w + 0.7 && p.pos.y - level.arena.y < 2;
  }
  const scatterPts = (e, n, near, gy) => { const pts = []; for (let i = 0; i < n; i++) { const a2 = rand(0, TAU), r = rand(0, level.arena.r - 2); pts.push(i < near ? player.pos.clone().add(new THREE.Vector3(i ? rand(-3, 3) : 0, 0, i ? rand(-3, 3) : 0)).setY(gy) : new THREE.Vector3(level.arena.x + Math.cos(a2) * r, gy, level.arena.z + Math.sin(a2) * r)); } return pts; };
  const hitAt = (c, r, dmg) => { const p = player; if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < r && p.pos.y - level.arena.y < 1.2) return hurtPlayer(dmg, c); return false; };
  const ringHit = (e, dmg) => { const p = player, dd = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z); if (!e.ring.hit && Math.abs(dd - e.ring.r) < 0.9 && p.pos.y - level.arena.y < 0.8) { e.ring.hit = true; hurtPlayer(dmg, e.pos); } };
  const ATK2 = {
    // Dune Tyrant Sabulo
    sandWave: { w: 0.9, dur: 0.6, setup(e, W, gp) { play(e.rig, 'slash', W + 0.5); e.tele = telegraph('line', gp(e.pos.clone()), 4.2, 24, e.yaw, W); },
      fire(e) { const pr = bossProj(e, e.yaw, 11, 0xe8a83a, 14, { arc: true, radius: 2.0, life: 2.3, h: 0.7 }); pr.mesh.scale.setScalar(2.8); sfx('wind'); cam.shake = Math.max(cam.shake, 0.3); },
      act(e) { if (Math.random() < 0.5) spawnP(PN, e.pos.x + Math.sin(e.yaw) * 2, level.arena.y + 0.3, e.pos.z + Math.cos(e.yaw) * 2, Math.sin(e.yaw) * 6, 1, Math.cos(e.yaw) * 6, 0.6, 0.5, 0xd8b070); } },
    quicksand: { w: 0.95, dur: 2.6, setup(e, W, gp) { play(e.rig, 'raise', W + 0.5); e.qPt = gp(player.pos.clone()); e.tele = telegraph('circle', e.qPt, 5.5, 0, 0, W); },
      fire(e) {
        const g = new THREE.Group(); g.position.copy(e.qPt).setY(level.arena.y + 0.05); scene.add(g); (e.p2fx = e.p2fx || []).push(g);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(5.5, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8a5a2a, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); g.add(disc);
        for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.6 + k * 1.3, 0.12, 6, 40), new THREE.MeshBasicMaterial({ color: 0xe8b860, transparent: true, opacity: 0.8 })); r.rotation.x = -Math.PI / 2; r.position.y = 0.04; g.add(r); }
        e.qT = 0; sfx('slam'); shockRing(e.qPt, 5.5, 0xe8a83a, 0.5);
      },
      act(e, t, dt) {
        const g = e.p2fx && e.p2fx[0]; if (g) { g.rotation.y += dt * 2.4; g.children.forEach((c, k) => { if (k) c.scale.setScalar(1 - ((t * 0.6 + k * 0.33) % 1) * 0.5); }); if (t > 2.3) g.scale.setScalar(Math.max(0.01, (2.6 - t) / 0.3)); }
        const p = player, dx = e.qPt.x - p.pos.x, dz = e.qPt.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < 5.5 && t < 2.3 && p.state !== 'dodge' && p.state !== 'dash') { p.kb.x += dx / (d || 1) * 18 * dt; p.kb.z += dz / (d || 1) * 18 * dt; e.qT -= dt; if (e.qT <= 0 && d < 2.6) { e.qT = 0.55; hurtPlayer(8, e.qPt); } }
        if (Math.random() < 0.6) { const a = rand(0, TAU), r = rand(1, 5.5); spawnP(PN, e.qPt.x + Math.cos(a) * r, level.arena.y + 0.2, e.qPt.z + Math.sin(a) * r, -Math.cos(a) * 2, 0.4, -Math.sin(a) * 2, 0.5, 0.35, 0xc8985e); }
      } },
    burrow: { w: 1.05, dur: 0.6, setup(e, W, gp) { play(e.rig, 'raise', W + 0.3); e.tele = telegraph('circle', gp(player.pos.clone()), 3.2, 0, 0, W); sfx('roots'); },
      pre(e, t, dt) {
        e.iframe = 1; const sc = e.rig.cfg.scale || 1, k = clamp(t / 0.45, 0, 1); e.rig.root.scale.setScalar(Math.max(0.01, sc * (1 - k))); e.hideScale = true;
        if (Math.random() < 0.7) spawnP(PN, e.pos.x + rand(-1, 1), level.arena.y + 0.2, e.pos.z + rand(-1, 1), rand(-2, 2), 3, rand(-2, 2), 0.6, 0.5, 0xd8b070, -6);
        if (e.tele && !Array.isArray(e.tele) && t < e.wind * 0.7) { const c = e.tele, p = player; c.cx += (p.pos.x - c.cx) * (1 - Math.exp(-5 * dt)); c.cz += (p.pos.z - c.cz) * (1 - Math.exp(-5 * dt)); c.m.position.set(c.cx, level.arena.y + 0.06, c.cz); }
        if (e.tele && !Array.isArray(e.tele)) { e.burPt = new THREE.Vector3(e.tele.cx, level.arena.y, e.tele.cz); if (Math.random() < 0.5) spawnP(PN, e.tele.cx + rand(-1.5, 1.5), level.arena.y + 0.2, e.tele.cz + rand(-1.5, 1.5), 0, 2, 0, 0.4, 0.4, 0xd8b070, -4); }
      },
      fire(e) { const c = e.burPt || player.pos.clone(); e.pos.x = c.x; e.pos.z = c.z; e.yaw = aimYaw(e); spikeBurst(c.clone().setY(level.arena.y), 0xc8985e); sandColumn(c.clone().setY(level.arena.y)); cam.shake = 0.6; sfx('slam'); hitAt(c, 3.2, 17); play(e.rig, 'power', 0.8); },
      act(e, t) { const sc = e.rig.cfg.scale || 1; e.rig.root.scale.setScalar(sc * Math.min(1, 0.2 + t / 0.25)); if (t < 0.2) e.iframe = 1; if (t >= 0.25) e.hideScale = false; } },
    sandstorm: { w: 1.0, dur: 0.7, setup(e, W, gp) { play(e.rig, 'raise', W + 0.6); e.rootPts = scatterPts(e, 8, 2, level.arena.y); e.tele = e.rootPts.map((pt) => telegraph('circle', pt, 2.3, 0, 0, W)); },
      fire(e) { sfx('wind'); cam.shake = 0.5; for (const pt of e.rootPts) { sandColumn(pt); hitAt(pt, 2.3, 14); } } },
    // Frost Empress Fubuki
    iceLance: { w: 0.8, dur: 0.4, setup(e, W, gp) { play(e.rig, 'cast2', W + 0.4); e.tele = telegraph('line', gp(e.pos.clone()), 1.8, 26, e.yaw, W); },
      fire(e) { const pr = bossProj(e, e.yaw, 24, 0x8fe8ff, 14, { radius: 1.0, life: 1.3 }); pr.mesh.scale.set(0.2, 0.2, 1.5); pr.mesh.rotation.y = e.yaw; sfx('wind'); } },
    iceLance3: { w: 0.85, dur: 0.4, setup(e, W, gp) { play(e.rig, 'cast2', W + 0.4); e.tele = [-0.38, 0, 0.38].map((o) => telegraph('line', gp(e.pos.clone()), 1.8, 24, e.yaw + o, W)); },
      fire(e) { for (const o of [-0.38, 0, 0.38]) { const pr = bossProj(e, e.yaw + o, 22, 0x8fe8ff, 13, { radius: 1.0, life: 1.3 }); pr.mesh.scale.set(0.2, 0.2, 1.5); pr.mesh.rotation.y = e.yaw + o; } sfx('wind'); } },
    shardFan: { w: 0.7, dur: 0.4, setup(e, W) { play(e.rig, 'cast2', W + 0.4); },
      fire(e) { const n = e.phase >= 2 ? 9 : 7, col = e.def.id === 'prism' ? 0xff9af0 : 0xbff4ff; for (let i = 0; i < n; i++) { const pr = bossProj(e, e.yaw + (i - (n - 1) / 2) * 0.17, 13, col, 9, { radius: 0.8, life: 2.2 }); pr.mesh.scale.setScalar(0.24); } sfx('orb'); } },
    frostNova: { w: 1.15, dur: 0.8, setup(e, W, gp) { play(e.rig, 'raise', W + 0.6); e.tele = telegraph('circle', gp(e.pos.clone()), 7, 0, 0, W); },
      fire(e) { const gy = level.arena.y; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, r = 2.5 + (k % 3) * 1.6; crystalBurst(new THREE.Vector3(e.pos.x + Math.cos(a) * r, gy, e.pos.z + Math.sin(a) * r), 0xbff4ff, 4, 1.1); } shockRing(e.pos, 8, 0x8fe8ff, 0.55); flash(e.pos.clone().setY(gy + 1), 6, 0xbff4ff); cam.shake = 0.6; sfx('slam'); hitAt(e.pos, 7, 17); } },
    blizzard: { w: 1.0, dur: 0.7, setup(e, W, gp) { play(e.rig, 'raise', W + 0.6); e.rootPts = scatterPts(e, 9, 3, level.arena.y); e.tele = e.rootPts.map((pt) => telegraph('circle', pt, 2.1, 0, 0, W)); OV.tintAmt.value = Math.max(OV.tintAmt.value, 0.12); OV.tint.value.set(0x9fdcff); },
      pre(e) { if (Math.random() < 0.8) spawnP(PN, player.pos.x + rand(-12, 12), level.arena.y + rand(4, 9), player.pos.z + rand(-12, 12), -3, -6, 0, 0.8, 0.2, 0xffffff); },
      fire(e) { sfx('roots'); cam.shake = 0.45; for (const pt of e.rootPts) { crystalBurst(pt, 0xbff4ff, 5, 1); hitAt(pt, 2.1, 14); } },
      act(e, t) { if (t > 0.5 && !(state.boss && state.boss.phase === 3 && e.def.tint3)) OV.tintAmt.value = 0; } },
    // The Prism Colossus
    prismBeam: { w: 1.15, dur: 0.8, setup(e, W, gp) { play(e.rig, 'cast2', W + 0.7); e.tele = [-0.32, 0, 0.32].map((o) => telegraph('line', gp(e.pos.clone()), 2.4, 28, e.yaw + o, W)); },
      fire(e) { let hit = false; [0xff5a9a, 0x9ff8ff, 0xffe27a].forEach((c, k) => { if (beamAt(e, e.yaw + (k - 1) * 0.32, c, 28, 0.8) && !hit) hit = hurtPlayer(17, e.pos) || true; }); sfx('beam'); cam.shake = 0.45; },
      act(e, t) { if (e.p2fx) for (const b of e.p2fx) b.children.forEach((c) => (c.material.opacity = 1 - clamp(t / 0.8, 0, 1))); } },
    crystalRise: { w: 1.0, dur: 0.7, setup(e, W, gp) { play(e.rig, 'slam', W + 0.6); e.rootPts = scatterPts(e, 7, 2, level.arena.y); e.tele = e.rootPts.map((pt) => telegraph('circle', pt, 2.3, 0, 0, W)); },
      fire(e) { sfx('roots'); cam.shake = 0.5; e.rootPts.forEach((pt, k) => { crystalBurst(pt, k % 2 ? 0xff9af0 : 0x9ff8ff, 5, 1.2); hitAt(pt, 2.3, 15); }); } },
    prismWave: { w: 1.0, dur: 2.2, setup(e, W, gp) { play(e.rig, 'slam', W + 0.6); e.tele = telegraph('circle', gp(e.pos.clone()), 3.5, 0, 0, W); },
      fire(e) { e.ring = { r: 0.5, hit: false, last: 0 }; sfx('wave'); cam.shake = 0.5; },
      act(e, t, dt) { if (!e.ring) return; const gy = level.arena.y; e.ring.r += dt * 8; shockRingAt(e, e.ring.r, 0xff7ae0); if (e.ring.r - e.ring.last > 3 && e.ring.r < 18) { e.ring.last = e.ring.r; for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + e.ring.r; crystalBurst(new THREE.Vector3(e.pos.x + Math.cos(an) * e.ring.r, gy, e.pos.z + Math.sin(an) * e.ring.r), k % 2 ? 0xff9af0 : 0x9ff8ff, 3, 0.9); } } ringHit(e, 16); } },
    // Hollow Emperor Vael
    eclipseSlash: { w: 0.85, dur: 0.5, setup(e, W, gp) { play(e.rig, 'slash', W + 0.5); e.tele = [-0.6, -0.3, 0, 0.3, 0.6].map((o) => telegraph('line', gp(e.pos.clone()), 1.9, 20, e.yaw + o, W)); },
      fire(e) { for (const o of [-0.6, -0.3, 0, 0.3, 0.6]) bossProj(e, e.yaw + o, 16, 0xff3a6a, 12, { arc: true, radius: 1.2 }); sfx('wind'); slashArc(e.pos.clone().setY(e.pos.y + 1.2), e.yaw, 0, 3, 0xff3a6a); } },
    eclipseRain: { w: 1.05, dur: 0.6, setup(e, W, gp) { play(e.rig, 'raise', W + 0.6); e.rootPts = scatterPts(e, 9, 3, level.arena.y); e.tele = e.rootPts.map((pt) => telegraph('circle', pt, 2.2, 0, 0, W)); },
      fire(e) { sfx('lightning'); flashT = 0.12; cam.shake = 0.5; for (const pt of e.rootPts) { darkStrike(pt); hitAt(pt, 2.2, 15); } } },
    blackSun: { w: 1.4, dur: 2.2, setup(e, W, gp) {
        play(e.rig, 'raise', W + 0.8); e.tele = telegraph('circle', gp(e.pos.clone()), 4, 0, 0, W);
        const sun = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0x050008 })); const cor = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff3a6a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); cor.scale.setScalar(4); sun.add(cor);
        sun.position.copy(e.pos).setY(level.arena.y + 2.5); sun.scale.setScalar(0.1); scene.add(sun); (e.p2fx = e.p2fx || []).push(sun); e.sun = sun; OV.tintAmt.value = Math.max(OV.tintAmt.value, 0.2); OV.tint.value.set(0xff2a4a);
      },
      pre(e, t) { if (e.sun) { const k = sm(t / e.wind); e.sun.position.y = level.arena.y + 2.5 + k * 3.5; e.sun.scale.setScalar(0.1 + k * 1.3); } if (Math.random() < 0.7) { const a = rand(0, TAU), r = rand(4, 9); spawnP(PA, e.pos.x + Math.cos(a) * r, level.arena.y + rand(0.5, 5), e.pos.z + Math.sin(a) * r, -Math.cos(a) * r * 1.5, 2, -Math.sin(a) * r * 1.5, 0.5, 0.4, 0xff3a6a, 0, 0); } },
      fire(e) { const n = D().chain ? 18 : 14; for (let i = 0; i < n; i++) bossProj(e, i / n * TAU + rand(0, 0.2), 8, 0xff3a6a, 11, { h: 1.2, life: 3.2, radius: 0.8 }); e.ring = { r: 0.5, hit: false }; impact = quality !== 'low' ? 2 : 0; cam.shake = 0.8; sfx('explosion'); shockRing(e.pos, 6, 0xff3a6a, 0.6); },
      act(e, t, dt) { if (e.ring) { e.ring.r += dt * 9; shockRingAt(e, e.ring.r, 0xff3a6a); ringHit(e, 15); } if (e.sun) e.sun.scale.setScalar(Math.max(0.01, 1.4 * (1 - t / 2.2))); } },
  };
  // chained part 2 moves
  CHAINS.duneQuake = Object.assign({}, CHAINS.quake, { n: (e) => 4 + chainX(), wind: (e, i) => (i ? 0.55 : e.wind) });
  CHAINS.avalanche = {
    n: (e) => 4 + chainX(), dur: 0.25, wind: (e, i) => (i ? 0.45 : e.wind),
    setup(e, i, W) { if (!i) { e.yaw = aimYaw(e); e.avYaw = e.yaw; play(e.rig, 'slash', W + 0.4); } const r = 3.5 + i * 3.4; e.cPt = e.pos.clone().add(new THREE.Vector3(Math.sin(e.avYaw) * r, 0, Math.cos(e.avYaw) * r)).setY(level.arena.y); e.tele = telegraph('circle', e.cPt, 2.9, 0, 0, W); },
    fire(e) { const c = e.cPt; crystalBurst(c, 0xbff4ff, 6, 1.3); shockRing(c, 3.5, 0x8fe8ff, 0.4); cam.shake = Math.max(cam.shake, 0.45); sfx('slam'); bossHit(c, 2.9, 15); },
  };
  CHAINED.push('duneQuake', 'avalanche');
  function chainStart(e, a) { const C = CHAINS[a]; e.cN = C.n(e); e.cI = 0; e.cT0 = e.st; e.cFired = false; e.cW = C.wind(e, 0); C.setup(e, 0, e.cW); }
  function chainUpdate(e, dt) {
    const C = CHAINS[e.atk], t = e.st - e.cT0;
    if (C.iframe && C.iframe(e, e.cI, e.cFired)) e.iframe = 1;
    if (!e.cFired) {
      if (C.pre) C.pre(e, e.cI, t, e.cW, dt);
      const fill = clamp(t / e.cW, 0, 1); if (e.tele) for (const tl of [].concat(e.tele)) tl.m.material.uniforms.fill.value = fill;
      if (Math.random() < 0.35) spawnP(PA, e.pos.x + rand(-0.5, 0.5), e.pos.y + rand(0.5, 2.5) * (e.rig.cfg.scale || 1), e.pos.z + rand(-0.5, 0.5), 0, 2, 0, 0.4, 0.35, 0xff3a5a);
      if (t >= e.cW) { e.cFired = true; cancelTele(e); C.fire(e, e.cI); }
    } else {
      if (C.act) C.act(e, e.cI, t - e.cW, dt);
      if (t >= e.cW + C.dur) {
        if (C.end) C.end(e, e.cI);
        e.cI++; if (e.cI >= e.cN || player.dead) { bossAttackEnd(e); return; }
        e.cT0 = e.st; e.cFired = false; e.cW = C.wind(e, e.cI); C.setup(e, e.cI, e.cW);
      }
    }
  }
  function endBossAttackFx(e) { cancelTele(e); if (e.p2fx) { for (const m of e.p2fx) scene.remove(m); e.p2fx = null; e.sun = null; } if (e.hideScale) { e.hideScale = false; e.rig.root.scale.setScalar(e.rig.cfg.scale || 1); } if (e.beam) { scene.remove(e.beam); e.beam = null; } if (e.beams) { for (const b of e.beams) scene.remove(b); e.beams = null; } if (e.ringMesh) e.ringMesh.visible = false; e.ring = null; e.rig.pivot.rotation.y = 0; }
  function bossAttackEnd(e) { endBossAttackFx(e); e.state = 'idle'; e.st = 0; e.atkCd = rand(1.0, 2.0); }
  function bossProj(e, yaw, speed, color, dmg, opts = {}) {
    const m = new THREE.Mesh(opts.arc ? ARC_G : G.sphere, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    if (opts.arc) { m.scale.setScalar(1.6); } else m.scale.setScalar(0.35);
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); g.scale.setScalar(opts.arc ? 1.5 : 4); m.add(g);
    scene.add(m); const pos = e.pos.clone(); pos.y = level.arena.y + (opts.h || 1.1);
    const pr = { mesh: m, pos, vel: new THREE.Vector3(Math.sin(yaw) * speed, 0, Math.cos(yaw) * speed), owner: 'enemy', dmg, life: opts.life || 3, radius: opts.radius || 1.0, homing: opts.homing || 0, color, arc: opts.arc, yaw };
    projectiles.push(pr); return pr;
  }
  function bossAttackUpdate(e, dt) {
    if (CHAINS[e.atk]) { chainUpdate(e, dt); return; }
    const rig = e.rig, a = e.atk, W = e.wind, p = player, gy = level.arena.y;
    const firing = e.st >= W;
    if (firing && e.def.iframes && e.def.iframes.includes(a)) e.iframe = 1;
    const A2 = ATK2[a]; if (!firing && A2 && A2.pre) A2.pre(e, e.st, dt);
    if (!firing) { if (e.tele && !Array.isArray(e.tele)) e.tele.m.material.uniforms.fill.value = e.st / W; else if (e.tele) e.tele.forEach((t) => (t.m.material.uniforms.fill.value = e.st / W)); if (Math.random() < 0.4) spawnP(PA, e.pos.x + rand(-0.5, 0.5), e.pos.y + rand(0.5, 2.5) * (rig.cfg.scale || 1), e.pos.z + rand(-0.5, 0.5), 0, 2, 0, 0.4, 0.35, 0xff3a5a); return; }
    const once = () => { if (e.fired) return false; e.fired = 1; cancelTele(e); return true; };
    const hitCircle = (c, r, dmg) => { if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < r && p.pos.y - gy < 1.2) hurtPlayer(dmg, c); };
    const fwd = (r) => fwdOf(e, r); const sc = rig.cfg.scale || 1;
    let dur = 0.7;
    if (A2) { if (once()) A2.fire(e); if (A2.act) A2.act(e, e.st - W, dt); dur = A2.dur || 0.7; }
    switch (a) {
      case 'windSlash': if (once()) { bossProj(e, e.yaw, 16, 0x7affe0, 12, { arc: true, radius: 1.3 }); sfx('wind'); } break;
      case 'windSlash3': if (once()) { for (const o of [-0.45, 0, 0.45]) bossProj(e, e.yaw + o, 15, 0x7affe0, 12, { arc: true, radius: 1.2 }); sfx('wind'); } break;
      case 'galeDash': { dur = 0.45; if (once()) { e.dashFrom = e.pos.clone(); sfx('dash'); e.hitP = false; } const k = clamp((e.st - W) / 0.25, 0, 1); const np = e.dashFrom.clone().add(new THREE.Vector3(Math.sin(e.yaw) * e.dashLen * k, 0, Math.cos(e.yaw) * e.dashLen * k)); if (!blocked(np.x, np.z, e.pos.y)) { e.pos.x = np.x; e.pos.z = np.z; } spawnP(PA, e.pos.x, e.pos.y + 1, e.pos.z, 0, 0, 0, 0.4, 0.6, e.def.id === 'twin' ? 0xff2a4a : 0x7affe0); if (!e.hitP && p.pos.distanceTo(e.pos) < 1.6) { e.hitP = hurtPlayer(14, e.pos) || true; } break; }
      case 'melee': if (once()) { const c = fwd(1.8 * sc); slashArc(c.clone().setY(e.pos.y + 1.2), e.yaw, 0.2, 2, 0xff3a5a); hitCircle(c, 2.4, 12); sfx('whoosh'); } break;
      case 'counter': dur = 0.35; if (once()) { const r = 3.4 * Math.max(1, sc * 0.8); shockRing(e.pos, r + 0.4, 0x7ad8ff, 0.4); slashArc(e.pos.clone().setY(e.pos.y + 1.2), e.yaw, 0, 3 * sc, 0x7ad8ff); rig.pivot.rotation.y = 0; hitCircle(e.pos, r, 14); sfx('counterStrike'); cam.shake = Math.max(cam.shake, 0.4); } break;
      case 'cyclone': dur = 0.9; if (once()) { shockRing(e.pos, 6, 0x7affe0, 0.5); sfx('wind'); hitCircle(e.pos, 5.5, 15); } e.rig.pivot.rotation.y += dt * 30; for (let i = 0; i < 3; i++) { const an = rand(0, TAU); spawnP(PA, e.pos.x + Math.cos(an) * 4, e.pos.y + rand(0, 2), e.pos.z + Math.sin(an) * 4, -Math.sin(an) * 8, 1, Math.cos(an) * 8, 0.5, 0.4, 0x9affea); } break;
      case 'tornado': dur = 1.0; if (once()) { shockRing(e.pos, 7, 0x7affe0, 0.6); sfx('wind'); hitCircle(e.pos, 6, 16); for (let i = 0; i < 8; i++) bossProj(e, e.yaw + i / 8 * TAU, 13, 0x7affe0, 10, { arc: true, radius: 1.1 }); cam.shake = 0.5; } e.rig.pivot.rotation.y += dt * 30; for (let i = 0; i < 4; i++) { const an = rand(0, TAU); spawnP(PA, e.pos.x + Math.cos(an) * 5, e.pos.y + rand(0, 3), e.pos.z + Math.sin(an) * 5, -Math.sin(an) * 10, 2, Math.cos(an) * 10, 0.5, 0.45, 0x9affea); } break;
      case 'orbs': if (once()) { const n = e.phase >= 2 ? 7 : 5; const col = e.def.orbCol || (e.def.id === 'twin' ? 0xff2a6a : 0xffd24a); for (let i = 0; i < n; i++) bossProj(e, e.yaw + (i - (n - 1) / 2) * 0.28, 7, col, 10, { homing: 1.2, h: 1.4, life: 3.5 }); sfx('orb'); } break;
      case 'orbRing': if (once()) { const n = D().chain ? 16 : 12, col = e.def.orbCol || (e.def.id === 'twin' ? 0xff2a6a : 0xffd24a); for (let i = 0; i < n; i++) bossProj(e, e.yaw + (i + 0.5) / n * TAU, 7.5, col, 10, { h: 1.2, life: 3.5, radius: 0.8 }); shockRing(e.pos, 3, col, 0.4); sfx('orb'); } break;
      case 'clones': if (once()) { const alive = enemies.filter((x) => x.decoy && !x.dead).length; for (let i = alive; i < 2; i++) { const an = rand(0, TAU); spawnDecoy(e, level.arena.x + Math.cos(an) * 8, level.arena.z + Math.sin(an) * 8); } sfx('clone'); burst(e.pos.x, e.pos.y + 1, e.pos.z, 30, 0xff2a4a, 6, 0.6, 0.4, 0); } break;
      case 'slam': if (once()) { const c = fwd(3.5); shockRing(c, 5.5, 0xffb020, 0.5); cam.shake = 0.6; sfx('slam'); burst(c.x, gy + 0.3, c.z, 40, 0xc8a070, 8, 0.6, 0.5); hitCircle(c, 4.5, 18); } dur = 0.9; break;
      case 'roots': if (once()) { sfx('roots'); for (const pt of e.rootPts) { spikeBurst(pt, e.def.spikeCol || 0x6a4a2a); hitCircle(pt, 1.8, 13); } } dur = 0.8; break;
      case 'storm': if (once()) { sfx('lightning'); flashT = 0.15; for (const pt of e.rootPts) { lightning(pt); hitCircle(pt, 2, 14); } } dur = 0.6; break;
      case 'sweep': if (once()) { shockRing(e.pos, 8, 0xffb020, 0.5); slashArc(e.pos.clone().setY(e.pos.y + 1.5), e.yaw, 0, 6, 0xffb020); e.rig.pivot.rotation.y = 0; sfx('slam'); hitCircle(e.pos, 7, 15); cam.shake = 0.4; } break;
      case 'beam': dur = 0.9; if (once()) { const len = 30; const m = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(0.9, len, 0.9); m.rotation.x = Math.PI / 2; const c = fwd(len / 2); m.position.set(c.x, gy + 1.1, c.z); m.rotation.set(Math.PI / 2, 0, 0); m.rotation.z = 0; const holder = new THREE.Group(); holder.position.copy(m.position); holder.rotation.y = e.yaw; m.position.set(0, 0, 0); holder.add(m); scene.add(holder); e.beam = holder; sfx('beam'); cam.shake = 0.4;
          const lx = p.pos.x - e.pos.x, lz = p.pos.z - e.pos.z, along = lx * Math.sin(e.yaw) + lz * Math.cos(e.yaw), perp = Math.abs(lx * Math.cos(e.yaw) - lz * Math.sin(e.yaw)); if (along > 0 && along < len && perp < 1.6 && p.pos.y - gy < 2) hurtPlayer(20, e.pos); }
        if (e.beam) { e.beam.children[0].material.opacity = 1 - clamp((e.st - W) / dur, 0, 1); } break;
      case 'blink': if (once()) { burst(e.pos.x, e.pos.y + 1, e.pos.z, 25, 0xffd24a, 5, 0.5, 0.4, 0); const an = p.yaw + Math.PI; e.pos.x = p.pos.x + Math.sin(an) * 2.5; e.pos.z = p.pos.z + Math.cos(an) * 2.5; e.yaw = aimYaw(e); sfx('blink'); e.blinkStrike = true; e.tele = telegraph('circle', p.pos.clone().setY(gy), 2.6, 0, 0, 0.6); e.fired = 1; e.bt = e.st; } if (e.blinkStrike && e.st - e.bt > 0.6) { e.blinkStrike = false; cancelTele(e); play(rig, 'slash', 0.6); rig.animT = 0.3; slashArc(e.pos.clone().setY(e.pos.y + 1.2), e.yaw, 0.2, 2.6, 0xffd24a); const c = fwd(1.5); hitCircle(c, 2.6, 14); } else if (e.blinkStrike && e.tele && !Array.isArray(e.tele)) e.tele.m.material.uniforms.fill.value = (e.st - e.bt) / 0.6; if (e.blinkStrike) e.iframe = 0; dur = 1.4; break;
      case 'ringBurst': if (once()) { e.ring = { r: 0.5, hit: false }; sfx('wave'); } if (e.ring) { e.ring.r += dt * 9; shockRingAt(e, e.ring.r); const dd = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z); if (!e.ring.hit && Math.abs(dd - e.ring.r) < 0.8 && p.pos.y - gy < 0.8) { e.ring.hit = true; hurtPlayer(14, e.pos); } } dur = 2.2; break;
      case 'thornWall': if (once()) { e.ring = { r: 0.5, hit: false, last: 0 }; sfx('roots'); cam.shake = 0.5; } if (e.ring) { e.ring.r += dt * 8; shockRingAt(e, e.ring.r, 0x6ad04a); if (e.ring.r - e.ring.last > 3 && e.ring.r < 18) { e.ring.last = e.ring.r; for (let k = 0; k < 3; k++) { const an = k / 3 * TAU + e.ring.r; spikeBurst(new THREE.Vector3(e.pos.x + Math.cos(an) * e.ring.r, gy, e.pos.z + Math.sin(an) * e.ring.r), 0x4a8a2a); } } for (let k = 0; k < 4; k++) { const an = rand(0, TAU); spawnP(PA, e.pos.x + Math.cos(an) * e.ring.r, gy + 0.3, e.pos.z + Math.sin(an) * e.ring.r, 0, 3, 0, 0.4, 0.4, 0x8ad04a); } const dd = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z); if (!e.ring.hit && Math.abs(dd - e.ring.r) < 0.9 && p.pos.y - gy < 0.8) { e.ring.hit = true; hurtPlayer(16, e.pos); } } dur = 2.2; break;
    }
    if (e.st > W + dur) bossAttackEnd(e);
  }
  function shockRingAt(e, r, col = 0xffd24a) {
    if (!e.ringMesh) { e.ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, blending: THREE.AdditiveBlending })); e.ringMesh.rotation.x = -Math.PI / 2; scene.add(e.ringMesh); }
    e.ringMesh.visible = true; e.ringMesh.material.color.set(col); e.ringMesh.position.set(e.pos.x, level.arena.y + 0.4, e.pos.z); e.ringMesh.scale.set(r, r, 6);
  }
  function spikeBurst(pt, col) {
    const g = new THREE.Group(); g.position.copy(pt); scene.add(g);
    for (let i = 0; i < 6; i++) { const m = part(g, G.cone, toon(col), [rand(-0.8, 0.8), 0.8, rand(-0.8, 0.8)], [0.3, 1.8, 0.3], [rand(-0.3, 0.3), 0, rand(-0.3, 0.3)]); }
    burst(pt.x, pt.y + 0.3, pt.z, 15, 0x8ad04a, 6, 0.5, 0.3);
    projectiles.push({ mesh: g, pos: pt.clone(), vel: new THREE.Vector3(), owner: 'fx', life: 0.8, grow: true });
  }
  function lightning(pt) {
    const pts = []; let x = pt.x, z = pt.z; for (let y = 40; y >= pt.y; y -= 4) { pts.push(new THREE.Vector3(x, y, z)); x = pt.x + rand(-1.2, 1.2); z = pt.z + rand(-1.2, 1.2); } pts.push(pt.clone());
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xeaf8ff, transparent: true })); scene.add(l);
    flash(pt.clone().setY(pt.y + 0.5), 4, 0x9ff8ff); shockRing(pt, 2.5, 0x9ff8ff, 0.35);
    projectiles.push({ mesh: l, pos: pt.clone(), vel: new THREE.Vector3(), owner: 'fx', life: 0.25 });
  }
  function spawnDecoy(boss, x, z) {
    const rig = (boss.def.decoyMk || makeTwin)(true); rig.fight = true;
    const e = makeFighter(rig, { type: 'twinClone', def: { id: 'twinClone', speed: 4.5, dmg: 8, wind: 0.6, hp: 1 }, hp: 1, maxHp: 1, kind: 'enemy', decoy: true, state: 'spawn', st: 0, atkCd: rand(1, 2) });
    rig.root.traverse((o) => { if (o.material && o.material.isMeshToonMaterial && !o.userData.outline) { } });
    e.pos.set(x, level.arena.y, z); e.lastPos.copy(e.pos); setEmotion(rig, 'neutral'); enemies.push(e); return e;
  }

  // ---------- projectiles ----------
  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i]; pr.life -= dt;
      if (pr.owner === 'fx') { if (pr.grow) pr.mesh.scale.y = Math.min(1, pr.mesh.scale.y + dt * 12) * (pr.life < 0.2 ? pr.life / 0.2 : 1); if (pr.mesh.material) pr.mesh.material.opacity = pr.life * 4; }
      else {
        if (pr.delay > 0) { pr.delay -= dt; pr.mesh.position.copy(player.pos).add(new THREE.Vector3(0, 1.9, 0)); continue; }
        if (pr.owner === 'player') {
          if (pr.target && !pr.target.dead) { const tp = pr.target.pos.clone(); tp.y += 1.1 * (pr.target.rig.cfg.scale || 1); const want = tp.sub(pr.pos).normalize().multiplyScalar(18); pr.vel.lerp(want, 1 - Math.exp(-5 * dt)); }
          if (Math.random() < 0.7) spawnP(PA, pr.pos.x, pr.pos.y, pr.pos.z, 0, 0.5, 0, 0.3, 0.4, pr.trail || 0xff6a1a);
          for (const e of enemies) {
            if (e.dead || e.decoyHidden || (pr.hitSet && pr.hitSet.has(e))) continue; const c = e.pos.clone(); c.y += 1 * (e.rig.cfg.scale || 1);
            if (c.distanceTo(pr.pos) < pr.radius + e.radius * 0.8 + (e.boss && (e.def.id === 'warden' || e.def.big) ? 1 : 0)) {
              damageEnemy(e, pr.dmg, { kb: pr.kb || 3, color: pr.color || 0xff7a2a, spell: true, from: pr.pos.clone().sub(pr.vel.clone().setY(0).setLength(2)) }); burst(pr.pos.x, pr.pos.y, pr.pos.z, 12, pr.color || 0xff5a1a, 6, 0.4, 0.3);
              if (pr.pierce) { pr.hitSet.add(e); continue; } pr.life = 0; break;
            }
          }
        } else {
          if (pr.homing && player) { const tp = player.pos.clone(); tp.y += 1.1; const sp = pr.vel.length(); const want = tp.sub(pr.pos).setY(0).normalize().multiplyScalar(sp); pr.vel.lerp(want, 1 - Math.exp(-pr.homing * dt)); }
          if (player && player.pos.clone().setY(player.pos.y + 1).distanceTo(pr.pos) < pr.radius) { if (hurtPlayer(pr.dmg, pr.pos) || player.inv > 0) { } pr.life = 0; burst(pr.pos.x, pr.pos.y, pr.pos.z, 10, pr.color, 5, 0.4, 0.3); }
        }
        pr.pos.addScaledVector(pr.vel, dt); pr.mesh.position.copy(pr.pos);
        if (pr.owner === 'player') pr.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pr.vel.clone().normalize());
        if (pr.arc) { pr.mesh.rotation.set(0, 0, 0); pr.mesh.rotateY(pr.yaw - Math.PI / 2); if (pr.flat) pr.mesh.rotateX(Math.PI / 2); if (pr.owner === 'player') pr.mesh.material.opacity = Math.min(0.9, pr.life * 3); }
      }
      if (pr.life <= 0) { scene.remove(pr.mesh); projectiles.splice(i, 1); }
    }
  }

  // ---------- story scenes ----------
  const NAMES = { ren: 'Ren', kaze: 'Instructor Kaze', twin: 'The Masked Twin', warden: 'Thorn Warden', null: 'Sovereign Null', book: 'Grimoire', dune: 'Dune Tyrant Sabulo', frost: 'Frost Empress Fubuki', prism: 'The Prism Colossus', vael: 'Hollow Emperor Vael', elder: 'Elder Toma' };
  function actor(id) { if (id === 'ren') return player?.rig; const n = npcs.find((x) => x.id === id); if (n) return n.rig; const b = enemies.find((e) => e.boss && e.def.id === id); return b ? b.rig : null; }
  function spawnNpc(id, mk, x, z, yaw, y = 0) { const rig = mk(); rig.root.position.set(x, y, z); rig.root.rotation.y = yaw; scene.add(rig.root); const n = { id, rig, root: rig.root }; npcs.push(n); return n; }
  function removeNpc(id) { const i = npcs.findIndex((n) => n.id === id); if (i >= 0) { scene.remove(npcs[i].root); npcs.splice(i, 1); } }
  function runScene(steps, then) {
    scene_ = { steps, i: -1, then, wait: 0, waitingLine: false };
    setScreen('scene'); if (player) { player.vel.set(0, 0, 0); player.state = 'idle'; player.rig.fight = false; }
    nextStep();
  }
  function nextStep() {
    const sc = scene_; if (!sc) return;
    sc.i++;
    if (sc.i >= sc.steps.length) { endScene(); return; }
    const s = sc.steps[sc.i];
    if (s.do) { s.do(); nextStep(); return; }
    if (s.wait) { sc.wait = s.wait; if (s.shot) setShot(s.shot); return; }
    if (s.say) {
      const r = actor(s.say); if (r && s.emo) setEmotion(r, s.emo); if (r && s.anim) play(r, s.anim, 1.5);
      setShot(s.shot || { type: 'close', who: s.say });
      sc.waitingLine = true;
      emit('line', { speaker: NAMES[s.say] || s.say, text: s.text, emotion: s.emo || 'neutral', side: s.say === 'ren' ? 'left' : 'right', id: s.say });
    }
  }
  function endScene() {
    const sc = scene_; if (!sc) return; scene_ = null; cam.mode = 'follow';
    emit('sceneEnd', {});
    if (player) { setEmotion(player.rig, 'determined'); player.rig.fight = true; }
    if (sc.then) sc.then();
    // a finished story scene must always hand control back (the mid-chapter scene used to leave the screen on 'scene' forever)
    if (state.screen === 'scene' && !scene_ && level) setScreen('play');
  }
  function setShot(sh) { cam.mode = 'shot'; cam.shot = Object.assign({ t: 0 }, sh); }
  function shotCamera(dt) {
    const sh = cam.shot; sh.t += dt; let pos, look, fov = 40;
    if (sh.type === 'close' || sh.type === 'hero') {
      const r = actor(sh.who) || player?.rig; if (!r) return;
      const head = new THREE.Vector3(); r.J.head.getWorldPosition(head); head.y += 0.1 * (r.cfg.scale || 1);
      const yaw = r.root.rotation.y, sc = r.cfg.scale || 1; const side = sh.who === 'ren' ? 1 : -1;
      if (sh.type === 'close') { const d = 1.25 * sc; pos = head.clone().add(new THREE.Vector3(Math.sin(yaw) * d + Math.cos(yaw) * 0.35 * side * sc, 0.02 * sc, Math.cos(yaw) * d - Math.sin(yaw) * 0.35 * side * sc)); look = head.clone().add(new THREE.Vector3(-Math.cos(yaw) * 0.12 * side, -0.05 * sc, Math.sin(yaw) * 0.12 * side)); fov = 34; }
      else { const d = 3.2 * sc - sh.t * 0.15; pos = r.root.position.clone().add(new THREE.Vector3(Math.sin(yaw + 0.4) * d, 0.5 * sc, Math.cos(yaw + 0.4) * d)); look = r.root.position.clone().add(new THREE.Vector3(0, 1.3 * sc, 0)); fov = 45; }
    } else if (sh.type === 'wide') { pos = sh.pos.clone().add(new THREE.Vector3(Math.sin(sh.t * 0.2) * 1, 0, 0)); look = sh.look; fov = 50; }
    else if (sh.type === 'two') { const a = actor(sh.a), b = actor(sh.b); if (!a || !b) return; const m = a.root.position.clone().add(b.root.position).multiplyScalar(0.5); const dir = b.root.position.clone().sub(a.root.position).setY(0).normalize(); const perp = new THREE.Vector3(dir.z, 0, -dir.x); const dd = a.root.position.distanceTo(b.root.position); pos = m.clone().addScaledVector(perp, dd * 0.9 + 2.5).add(new THREE.Vector3(0, 1.8, 0)); look = m.clone().add(new THREE.Vector3(0, 1.4, 0)); fov = 45; }
    const k = sh.t < 0.02 ? 1 : 1 - Math.exp(-8 * dt);
    cam.pos.lerp(pos, k); cam.look.lerp(look, k); cam.fov = lerp(cam.fov, fov, k);
  }
  const say = (who, text, emo, extra = {}) => Object.assign({ say: who, text, emo }, extra);
  function stageTwo(npcId, mk, z, y) {
    player.pos.set(0, y, z); player.yaw = 0; player.vel.set(0, 0, 0); syncFighter(player, 0);
    if (npcId) spawnNpc(npcId, mk, 0, z + 3.2, Math.PI, y);
  }

  // ---------- chapter flow ----------
  const ENEMY_BY_CH = { 1: ['construct'], 2: ['hollow'], 3: ['thornling', 'hollow'], 4: ['nullknight', 'hollow'], 5: ['scarab', 'hollow', 'scarab'], 6: ['frostbrute', 'hollow'], 7: ['shardling', 'nullknight', 'shardling'], 8: ['hollowlord', 'frostbrute', 'shardling'] };
  function setObjective(text, total) { state.objective = { text, done: 0, total: total || 0 }; emit('objective', { text, done: 0, total: total || 0 }); }
  function wave(types, n, zc, y, label, onClear) {
    // some of each wave keep their distance and shoot (none in the chapter 1 tutorial wave)
    const nR = state.chapter === 1 && n <= 3 ? 0 : Math.round(n * 0.25 * D().ranged);
    const list = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rand(-0.3, 0.3), ty = types[i % types.length]; list.push(spawnEnemy(ty, Math.sin(a) * 6, zc + Math.cos(a) * 5, y, i >= n - nR && ENEMY_AI[ty] && ENEMY_AI[ty].ranged ? 'ranged' : 'melee')); }
    setObjective(label, n);
    triggers.push({ check: () => { const done = list.filter((e) => e.dead).length; if (state.objective && done !== state.objective.done) { state.objective.done = done; emit('objective', { text: label, done, total: n }); } return done >= n; }, fire: onClear });
  }
  function reachZ(z, fn) { triggers.push({ z, check: () => player && player.pos.z > z && !player.dead, fire: fn }); }
  function checkpoint(i) { state.cp = Math.max(state.cp, i); try { localStorage.setItem('aura-rising-cp', JSON.stringify({ ch: state.chapter, cp: state.cp })); } catch (e) { } if (player) player.hp = player.maxHp; emit('checkpoint', { index: i }); sfx('checkpoint'); }
  // Kakusei (chapter 8): Ren's aura burns gold from then on
  function applyKakusei() {
    if (!player || !player.rig.aura || !powers.includes('kakusei')) return;
    player.rig.aura.traverse((m) => { if (m.material && m.material.uniforms && m.material.uniforms.c1) { m.material.uniforms.c1.value.set(0xffc24a); m.material.uniforms.c2.value.set(0xff6a1a); } });
  }
  function learnPower(id) {
    const ch = CHAPTERS.find((c) => c.power.id === id); if (!powers.includes(id)) powers.push(id);
    emit('powerLearned', { id, name: ch.power.name, desc: ch.power.desc }); sfx('powerup');
    if (player) { play(player.rig, 'power', 2); player.rig.aura.visible = true; setTimeout(() => { if (player && player.state !== 'dash' && player.state !== 'ult') player.rig.aura.visible = false; }, 2200); burst(player.pos.x, player.pos.y + 1, player.pos.z, 60, 0xb48cff, 8, 0.9, 0.4, 0); shockRing(player.pos, 5, 0xb48cff, 0.6); }
    if (id === 'domain' && player) player.aura = 100;
    if (id === 'kakusei' && player) { player.aura = 100; applyKakusei(); }
    if (id === 'grimoire') { addGrimoire('crimson'); equipGrimoire('crimson'); }
    if (id === 'dash' && equipped) equipGrimoire(null);
  }
  const SCRIPTS = {
    1: {
      intro: [say('ren', 'First day at Starfall Academy... Okay, Ren. Do not mess this up.', 'determined'), say('kaze', 'You are the transfer student. Late, too.', 'neutral'), say('ren', 'Instructor Kaze?! The Gale Blade himself?', 'shocked'), say('kaze', 'Rumor says you broke a training construct with one punch. Show me.', 'neutral'), say('ren', 'Leave it to me!', 'smile')],
      wave1: 'Defeat the Training Constructs', mid: [say('kaze', 'Your fists are glowing. That is raw aura.', 'neutral'), say('ren', 'Whoa... it feels warm!', 'shocked'), say('kaze', 'Focus it. Strike four times. The last blow sends them flying.', 'determined')],
      wave2: 'Try your Aura Punch combo', bossIntro: [say('kaze', 'Enough warm-ups. Draw your aura and face me.', 'determined'), say('ren', 'I will not hold back, Instructor!', 'determined'), say('kaze', 'Good. Neither will the wind. Watch for the red marks!', 'smile')],
      win: [say('kaze', 'Hah... you actually landed a hit. Welcome to Starfall Academy, Ren.', 'smile'), say('ren', 'Did you see that?! I did it!', 'smile'), say('kaze', 'But that aura of yours is drawing something to the city. Be careful tonight.', 'neutral')],
    },
    2: {
      intro: [say('ren', 'Kaze said strange shadows were seen over the rooftops...', 'neutral'), say('kaze', 'Hollows. Masked things that feed on aura. They hunt anyone who shines too bright.', 'determined'), say('ren', 'Then I will hunt them first!', 'angry')],
      wave1: 'Defeat the Hollows', mid: [say('ren', 'They are too fast... I need to be faster!', 'angry'), say('ren', 'Aura... carry me!', 'determined')],
      wave2: 'Use Aura Dash on the Hollows', bossIntro: [say('twin', 'So you are the little spark everyone whispers about.', 'neutral'), say('twin', 'Let us see if you can tell which of us is real.', 'angry'), say('ren', 'Take off that mask and fight me!', 'angry')],
      win: [say('twin', 'Impossible... my shadows...', 'shocked'), say('twin', 'The Sovereign will come for your light anyway.', 'neutral'), say('ren', 'The Sovereign...?', 'shocked')],
    },
    3: {
      intro: [say('kaze', 'This shrine guards an old grimoire. It chooses its own reader.', 'neutral'), say('ren', 'A book that chooses people? That is kind of creepy.', 'shocked'), say('kaze', 'Then try not to make it angry.', 'smile')],
      wave1: 'Clear the shrine path', mid: [say('ren', 'The pages are on fire... but it does not burn!', 'shocked'), say('book', 'Reader found. Crimson Pages, awaken.', 'neutral', { shot: { type: 'hero', who: 'ren' } }), say('ren', 'Okay. Let us do this together!', 'smile')],
      wave2: 'Burn through with the Grimoire', bossIntro: [say('warden', 'Thief... The roots remember every thief.', 'angry'), say('ren', 'I am not stealing it! It picked me!', 'determined'), say('warden', 'Then prove the book chose well.', 'angry')],
      win: [say('warden', 'The book... chose well. Go. The Sky Gate is opening.', 'neutral'), say('ren', 'The Sky Gate? Then that is where the Sovereign waits.', 'determined')],
    },
    4: {
      intro: [say('kaze', 'Above the storm stands the Sky Gate. Sovereign Null wants your aura to open it.', 'determined'), say('ren', 'Then I will close it. For good.', 'determined'), say('kaze', 'Ren. You have grown. Go.', 'smile')],
      wave1: 'Break through the Null Knights', mid: [say('ren', 'My aura is overflowing... like a whole world inside me.', 'shocked'), say('ren', 'I can feel it. My own Domain!', 'angry')],
      wave2: 'Unleash your Domain (ULTIMATE)', bossIntro: [say('null', 'Little spark. Your light will open my gate.', 'neutral'), say('ren', 'My light is for protecting people. Not you!', 'angry'), say('null', 'Then be emptied.', 'angry')],
      win: [say('null', 'Such... warmth. I had forgotten.', 'shocked'), say('ren', 'The gate is closing!', 'determined'), say('kaze', 'You did it, Ren. The academy has a new legend.', 'smile'), say('ren', 'Heh. I am just getting started!', 'smile')],
    },
    // ---------- part 2: the road to the Hollow Capital ----------
    // npc: who stands with Ren in the intro; midNpc: who joins the mid-chapter scene; winKaze: Kaze walks in after the boss; n1/n2: wave sizes
    5: {
      npc: 'kaze', n1: 4, n2: 5,
      intro: [say('kaze', 'Null was never the true master, Ren. Something sent the Hollows to him.', 'determined'), say('ren', 'Something stronger than Null...?', 'shocked'), say('vael', 'Little spark. You broke my servant. Come to my Capital... if you can walk that far.', 'neutral', { shot: { type: 'wide', pos: new THREE.Vector3(-7, 6, 16), look: new THREE.Vector3(0, 2, 4) } }), say('ren', 'Who said that?!', 'angry'), say('kaze', 'The Hollow Emperor, Vael. His Capital lies past this desert, the Frozen Peak and the Crystal Caverns.', 'neutral'), say('ren', 'Then I will cross all of them, and get stronger in every one!', 'determined')],
      wave1: 'Defeat the Dust Scarabs',
      mid: [say('ren', 'These ruins... the walls are covered in pictures of grimoires.', 'shocked'), say('book', 'Reader. Every grimoire you have taken still remembers its master. Listen, and they will answer faster.', 'neutral', { shot: { type: 'hero', who: 'ren' } }), say('ren', 'I can hear them! They want to fight with me!', 'smile')],
      wave2: 'Chain your grimoire spells (swap with G)',
      bossIntro: [say('dune', 'Who walks upon my sand? The Emperor promised me your light.', 'angry'), say('ren', 'Nobody is taking my light!', 'determined'), say('dune', 'Then the desert will swallow you. Watch the ground, little spark.', 'angry')],
      win: [say('dune', 'The sand... it feels warm again. The Emperor waits beyond the Frozen Peak.', 'shocked'), say('ren', 'One down! Next stop: the Frozen Peak!', 'smile')],
    },
    6: {
      npc: 'elder', n1: 4, n2: 5, midNpc: 'elder',
      intro: [say('elder', 'A traveler, in this storm? You must be the boy the wind told us about.', 'neutral'), say('ren', 'I am Ren! I am on my way to the Hollow Capital.', 'smile'), say('elder', 'Then you must pass Empress Fubuki. Her blizzard has frozen our village for a hundred days.', 'determined'), say('ren', 'Then I will melt it!', 'determined')],
      wave1: 'Drive the Frost Brutes out of the village',
      mid: [say('elder', 'Your aura is bright, but bright things shatter. Let it flow around you, like a warm coat.', 'neutral'), say('ren', 'Like armor made of aura...', 'shocked'), say('elder', 'Yes. Now the cold cannot bite so deep.', 'smile')],
      wave2: 'Protect the village',
      bossIntro: [say('frost', 'Another little flame, come to go out in my snow.', 'neutral'), say('ren', 'Give this village its spring back!', 'angry'), say('frost', 'Spring is a lie. Only the blizzard lasts forever.', 'angry')],
      win: [say('frost', 'Warm... it has been so long since I felt warm.', 'shocked'), say('ren', 'The snow is melting! Next: the Crystal Caverns.', 'smile')],
    },
    7: {
      npc: 'kaze', n1: 4, n2: 5,
      intro: [say('kaze', 'The road to the Capital runs under the mountain. Stay close to the light.', 'neutral'), say('ren', 'Whoa... the crystals are glowing all by themselves!', 'shocked'), say('kaze', 'They drink aura. Yours most of all.', 'smile'), say('ren', 'Then let us give them a show!', 'smile')],
      wave1: 'Shatter the Shardlings',
      mid: [say('ren', 'That giant crystal... it is beating like a heart.', 'shocked'), say('book', 'The Heart of Light. Touch it, reader, and your aura will overflow.', 'neutral', { shot: { type: 'hero', who: 'ren' } }), say('ren', 'Here goes nothing!', 'determined')],
      wave2: 'Overflow your aura',
      bossIntro: [say('prism', 'INTRUDER. THE HEART BELONGS TO THE EMPEROR.', 'angry'), say('ren', 'The Heart belongs to everyone!', 'angry'), say('prism', 'THEN BE SPLIT INTO SEVEN COLOURS.', 'angry')],
      win: [say('prism', 'Light... restored. The Capital... lies above.', 'neutral'), say('ren', 'Vael. I am coming for you.', 'determined')],
    },
    8: {
      npc: 'kaze', n1: 5, n2: 6, winKaze: true,
      intro: [say('kaze', 'The Hollow Capital. Every Hollow that ever was came from this city.', 'determined'), say('ren', 'Instructor! You came all this way?', 'shocked'), say('kaze', 'A teacher walks with his student to the very end. Go, Ren. I will hold the gate.', 'smile'), say('ren', 'Right. Let us finish this!', 'determined')],
      wave1: 'Break through the Hollow Lords',
      mid: [say('ren', 'Kaze, the Twin, the Warden, Null... I can feel all of their power in my books.', 'shocked'), say('ren', 'My aura is changing... it is turning gold!', 'angry'), say('book', 'This is your Kakusei, Ren. Your true awakening.', 'neutral', { shot: { type: 'hero', who: 'ren' } })],
      wave2: 'Awaken and break the last guard',
      bossIntro: [say('vael', 'So the spark became a flame. I will swallow it all the same.', 'neutral'), say('ren', 'I am not a spark anymore. I am Ren of Starfall Academy!', 'angry'), say('vael', 'Then come. Let the last darkness fall!', 'angry')],
      win: [say('vael', 'Impossible... a light that does not go out...', 'shocked'), say('ren', 'It is because I am not alone. Everyone I met is right here with me.', 'determined'), say('kaze', 'Ren! The Hollows are fading away. It is over!', 'smile'), say('ren', 'Heh. Let us go home, Instructor.', 'smile')],
    },
  };
  const NPC_MK = { kaze: makeKaze, elder: makeElder };
  function resetCombatFx() { clearSpells(); endDrop(); for (const k in gcd) gcd[k] = 0; castLock = 0; tokenGapT = 0; slotT = 0; attackTokens = 0; }
  // the collection comes from the save ({ grimoires, equipped }); without one, keep what this session has and add what earlier chapters must have given
  function restoreGrimoires(n, o) {
    if (Array.isArray(o.grimoires)) grims = o.grimoires.filter((id, i, a) => GRIM(id) && a.indexOf(id) === i);
    else {
      for (const c of CHAPTERS) {
        if (c.power.id === 'grimoire' && powers.includes('grimoire')) addGrimoire('crimson');
        const d = c.id < n && BOSSES[c.boss.id] && BOSSES[c.boss.id].drop; if (d) addGrimoire(d);
      }
    }
    if (powers.includes('grimoire') && !grims.includes('crimson')) addGrimoire('crimson');
    if ('equipped' in o) equipped = o.equipped && grims.includes(o.equipped) ? o.equipped : null;
    else if (!grims.includes(equipped)) equipped = grims.length ? grims[grims.length - 1] : null;
  }
  function startChapter(n, o = {}) {
    if (n === 'rush') return startBossRush(o);
    n = Number(n); if (n > CHAPTERS.length) return showEnding();
    endUlt(); clearLevel(); resetCombatFx(); scene_ = null; state.paused = false;
    state.chapter = n; state.time = 0; state.hits = 0; state.hitsTaken = 0; state.combo = 0; state.cp = 0; bossActive = false; attackTokens = 0;
    OV.tint.value.set(0x6a3cff);
    powers = (o.powers || powers || []).filter((p) => p !== 'punch'); for (const c of CHAPTERS) if (c.id < n && !powers.includes(c.power.id) && !o.powers) powers.push(c.power.id);
    powers = powers.filter((p) => p !== 'punch');
    buildLevel(n);
    if (player) { removeFighter(player); scene.remove(player.book); }
    player = makePlayer(); setEmotion(player.rig, 'determined');
    let cp = 0;
    if (o.fromCheckpoint) { try { const s = JSON.parse(localStorage.getItem('aura-rising-cp') || 'null'); if (s && s.ch === n) cp = s.cp; } catch (e) { } if (typeof o.fromCheckpoint === 'number') cp = o.fromCheckpoint; if (o.fromCheckpoint && !cp) cp = 2; }
    state.cp = cp;
    const S = SCRIPTS[n], L = level, types = ENEMY_BY_CH[n];
    const learnId = CHAPTERS[n - 1].power.id;
    if (cp >= 1 && !powers.includes(learnId) && learnId !== 'punch') powers.push(learnId);
    restoreGrimoires(n, o); if (equipped) tintBook(GRIM(equipped).color);
    const pos = L.checkpoints[cp]; player.pos.copy(pos); player.safe.copy(pos); player.lastPos.copy(pos); player.yaw = 0; cam.yaw = 0; syncFighter(player, 0);
    // a checkpoint start runs no scene, so drop the title/ending orbit camera and start right behind Ren
    cam.mode = 'follow'; cam.pos.copy(pos).add(new THREE.Vector3(0, 2.6, -6)); cam.look.copy(pos).add(new THREE.Vector3(0, 1.45, 0));
    emit('music', { track: THEMES[n].music });
    const stageBoss = () => {
      reachZ(134, () => {
        const a = L.arena; const boss = spawnBoss(CHAPTERS[n - 1].boss.id); bossActive = false;
        player.pos.set(0, a.y, a.z - 8); player.yaw = 0; boss.pos.set(0, a.y + (boss.def.float ? 0.6 : 0), a.z + 2); boss.yaw = Math.PI; syncFighter(player, 0); syncFighter(boss, 0);
        if (n === 1) removeNpc('kaze');
        runScene([...S.bossIntro.map((s) => s), { do: () => { } }], () => bossIntroCard(boss));
      });
    };
    const part2 = () => {
      openGate(L.gate1); setObjective('Cross to the next area', 0);
      reachZ(80, () => {
        checkpoint(1);
        const mid = [{ do: () => { player.pos.set(0, 1, 80); player.yaw = 0; syncFighter(player, 0); if (n === 1 || n === 3) { removeNpc('kaze'); } if (S.midNpc) spawnNpc(S.midNpc, NPC_MK[S.midNpc], 0, 83.2, Math.PI, 1); } }, ...S.mid, { do: () => learnPower(learnId) }, { wait: 2.2, shot: { type: 'hero', who: 'ren' } }];
        runScene(mid, () => {
          if (S.midNpc) removeNpc(S.midNpc);
          wave(types, S.n2 || (n === 1 ? 4 : 5), 98, 1, S.wave2, () => { openGate(L.gate2); setObjective('Head to the arena', 0); stageBoss(); });
        });
      });
    };
    const startPlay = () => { setScreen('play'); };
    if (cp === 0) {
      const npcId = 'npc' in S ? S.npc : n === 2 ? null : 'kaze';
      stageTwo(npcId, NPC_MK[npcId] || makeKaze, 4, 0);
      if (n === 2 || n === 4) spawnNpc('kaze', makeKaze, 2.5, 7.5, Math.PI + 0.5, 0);
      if (n === 2) { const k = npcs[0]; }
      const intro = [{ wait: 2.2, shot: { type: 'wide', pos: new THREE.Vector3(8, 4.5, 20), look: new THREE.Vector3(0, 1.4, 4) } }, ...S.intro];
      runScene(o.skipIntro ? [] : intro, () => {
        removeNpc('kaze'); if (npcId) removeNpc(npcId); startPlay();
        wave(types, S.n1 || (n === 1 ? 3 : 4), 26, 0, S.wave1, () => part2());
        reachZ(14, () => { });
      });
    } else if (cp === 1) {
      openGate(L.gate1); startPlay();
      wave(types, S.n2 || (n === 1 ? 4 : 5), 98, 1, S.wave2, () => { openGate(L.gate2); setObjective('Head to the arena', 0); stageBoss(); });
    } else {
      openGate(L.gate1); openGate(L.gate2); startPlay(); setObjective('Enter the arena', 0); stageBoss();
    }
    if (n === 4 && cp >= 1) player.aura = 100;
    applyKakusei();
  }
  function bossIntroCard(boss) {
    const ch = CHAPTERS.find((c) => c.boss.id === boss.def.id);
    setScreen('bossIntro'); emit('bossIntro', { name: ch.boss.name, title: ch.boss.title, chapter: ch.id });
    emit('music', { track: boss.def.music || (boss.def.id === 'null' ? 'final' : 'boss') }); sfx('roar');
    setShot({ type: 'hero', who: boss.def.id }); play(boss.rig, 'power', 2); setEmotion(boss.rig, 'angry');
    burst(boss.pos.x, boss.pos.y + 1, boss.pos.z, 50, 0xff3a5a, 8, 0.9, 0.4, 0);
    introTimer = 2.6; introBoss = boss;
  }
  let introTimer = 0, introBoss = null;
  function bossDefeated(b) {
    bossActive = false; cancelTele(b); impact = 4; slowT = 1.2; cam.shake = 0.8; sfx('bossDown');
    burst(b.pos.x, b.pos.y + 1.5, b.pos.z, 80, 0xffd27a, 10, 1, 0.5, 0);
    for (const e of enemies) if (!e.boss && !e.dead) killEnemy(e);
    for (const pr of projectiles) pr.life = 0;
    state.boss.hp = 0;
    setTimeout(() => {
      if (!player) return; endUlt();
      play(b.rig, 'kneel'); b.state = 'idle';
      player.pos.set(b.pos.x, level.arena.y, b.pos.z - 3.2); player.yaw = 0; b.yaw = Math.PI; b.rig.root.rotation.y = Math.PI; syncFighter(player, 0); syncFighter(b, 0); play(player.rig, 'victory', 2); player.rig.fight = false;
      if (state.rush) { if (b.def.drop) addGrimoire(b.def.drop); rushNext(); return; }
      const n = state.chapter; const win = SCRIPTS[n].win.slice();
      if (n === 1 || n === 4) { spawnNpc('kaze_win', makeKaze, 3, b.pos.z - 1, -Math.PI / 2, level.arena.y); }
      else if (SCRIPTS[n].winKaze) { spawnNpc('kaze_win', makeKaze, b.pos.x - 2.8, b.pos.z - 1.6, Math.PI / 2, level.arena.y); } // the 'two' shot camera sits on +x: keep Kaze behind the pair
      const steps = win.map((s) => (s.say === 'kaze' ? Object.assign({}, s, { say: n === 1 ? 'kaze' : 'kaze2' }) : s));
      NAMES.kaze2 = 'Instructor Kaze';
      if (n === 1) { removeNpc('kaze_win'); }
      if (n === 4 || SCRIPTS[n].winKaze) { const kn = npcs.find((x) => x.id === 'kaze_win'); if (kn) kn.id = 'kaze2'; }
      const drop = b.def.drop && GRIM(b.def.drop) ? b.def.drop : null;
      const dropSteps = drop ? [{ do: () => startDrop(b, drop) }, { wait: 1.3, shot: { type: 'two', a: 'ren', b: b.def.id } }, { do: () => grabDrop() }, { wait: 2.1, shot: { type: 'hero', who: 'ren' } }, { do: () => endDrop() }] : [{ wait: 1.6, shot: { type: 'hero', who: 'ren' } }];
      runScene([{ do: () => { play(player.rig, 'victory', 2); } }, ...dropSteps, ...steps], () => chapterClear());
    }, 1300);
  }
  function chapterClear() {
    const n = state.chapter, t = state.time, par = [0, 240, 270, 300, 330, 340, 350, 360, 400][n] || 300;
    const rank = state.hitsTaken <= 6 && t < par ? 'S' : state.hitsTaken <= 16 || t < par * 1.25 ? 'A' : 'B';
    const learnId = CHAPTERS[n - 1].power.id; if (!powers.includes(learnId) && learnId !== 'punch') powers.push(learnId);
    try { localStorage.removeItem('aura-rising-cp'); } catch (e) { }
    setScreen('clear'); state.objective = null; bossActive = false;
    emit('chapterClear', { chapter: n, time: Math.round(t), rank, hits: state.hits, hitsTaken: state.hitsTaken, powers: powers.slice(), grimoires: grims.slice(), equipped, difficulty: settings.difficulty });
    if (player) { play(player.rig, 'victory', 2); setEmotion(player.rig, 'smile'); setShot({ type: 'hero', who: 'ren' }); }
  }
  function showEnding() {
    // the story is over: back home to the academy courtyard
    endUlt(); clearLevel(); resetCombatFx(); buildLevel(1); level.blockers = [];
    if (player) { removeFighter(player); scene.remove(player.book); }
    player = makePlayer(); player.pos.set(0, 1, 152); syncFighter(player, 0); play(player.rig, 'victory', 2); player.rig.fight = false; player.rig.aura.visible = true; setEmotion(player.rig, 'smile');
    spawnNpc('kaze', makeKaze, 2.6, 153.5, -2.2, 1); play(npcs[0].rig, 'idle');
    setScreen('ending'); emit('music', { track: 'title' }); emit('ending', {});
    cam.mode = 'orbit'; cam.orbitC = new THREE.Vector3(0, 2, 152); cam.orbitR = 7; cam.orbitH = 1.5;
  }
  // Boss rush
  let rushIdx = 0;
  function startBossRush(o = {}) { if (Array.isArray(o.grimoires)) grims = o.grimoires.filter((id, i, a) => GRIM(id) && a.indexOf(id) === i); if ('equipped' in o) equipped = o.equipped; if (o.difficulty && DIFFICULTY[o.difficulty]) settings.difficulty = o.difficulty; state.rush = true; rushIdx = 0; state.rushTime = 0; rushLoad(); }
  function rushLoad() {
    const n = rushIdx + 1; endUlt(); clearLevel(); resetCombatFx(); scene_ = null; state.chapter = n; bossActive = false;
    powers = CHAPTERS.map((c) => c.power.id).filter((p) => p !== 'punch'); addGrimoire('crimson'); for (const c of CHAPTERS) if (c.id < n && BOSSES[c.boss.id] && BOSSES[c.boss.id].drop) addGrimoire(BOSSES[c.boss.id].drop); if (!grims.includes(equipped)) equipped = grims[grims.length - 1] || null; buildLevel(n);
    if (player) { removeFighter(player); scene.remove(player.book); }
    const keepHp = player && rushIdx > 0 ? player.hp : 100;
    player = makePlayer(); player.hp = Math.min(100, keepHp + 40); player.pos.set(0, 1, 140); player.safe.copy(player.pos); syncFighter(player, 0);
    const a = level.arena; const boss = spawnBoss(CHAPTERS[n - 1].boss.id); boss.pos.set(0, a.y, a.z + 2);
    emit('music', { track: THEMES[n].music }); bossIntroCard(boss); state.boss.name = boss.def.id;
    state.boss.name = CHAPTERS[n - 1].boss.name;
  }
  function rushNext() {
    rushIdx++; if (rushIdx >= CHAPTERS.length) { state.rush = false; setScreen('clear'); emit('chapterClear', { chapter: 'rush', time: Math.round(state.time), rank: state.hitsTaken < 8 ? 'S' : state.hitsTaken < 20 ? 'A' : 'B', hits: state.hits, hitsTaken: state.hitsTaken }); return; }
    rushLoad();
  }

  // ---------- title ----------
  function showTitleScene() {
    endUlt(); clearLevel(); resetCombatFx(); scene_ = null; state.rush = false;
    const th = THEMES[0]; level = { id: 0, theme: th, plats: [], blockers: [], gates: [], tex: groundTex(th.ground, 0), spin: [], arena: { x: 0, z: 0, r: 30, y: 0 } };
    applyTheme(th); addCircle(level, 0, 0, 6, 0); addTerrain(level);
    { // crystal clusters and blossom trees standing on the ground around the stage
      const B = lvBatch(), cm = toon(0x7a5ab0, { em: 0x3a1a6a, ei: 0.6 });
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + rand(-0.15, 0.15), r = rand(11, 24), x = Math.cos(a) * r, z = Math.sin(a) * r; crystalCluster(B, x, terrainH(level, x, z), z, rand(0.9, 1.8), cm); }
      B.flush();
      for (let i = 0; i < 6; i++) { const x = Math.cos(i) * 30, z = Math.sin(i) * 30 - 10; propTree(x, z, terrainH(level, x, z), 1); }
    }
    if (player) { removeFighter(player); scene.remove(player.book); }
    player = makePlayer(); player.pos.set(0, 0, 0); player.yaw = 0.3; syncFighter(player, 0); play(player.rig, 'power', 99); player.rig.aura.visible = true; player.rig.fight = false; setEmotion(player.rig, 'determined');
    setScreen('title'); emit('music', { track: 'title' });
    cam.mode = 'orbit'; cam.orbitC = new THREE.Vector3(0, 1.3, 0); cam.orbitR = 4.2; cam.orbitH = -0.2;
  }

  // ---------- camera ----------
  const tmpV = new THREE.Vector3();
  function updateCamera(dt) {
    const sens = 0.0045 * (settings.cameraSensitivity || 1);
    if (cam.mode === 'follow' && player) {
      cam.yaw -= input.lookDX * sens; cam.pitch = clamp(cam.pitch + input.lookDY * sens * (settings.invertY ? -1 : 1), -0.15, 0.9);
      const p = player;
      const tgt = p.pos.clone().add(new THREE.Vector3(0, 1.45, 0));
      if (lockTarget && !lockTarget.dead) {
        const lt = lockTarget.pos; const want = Math.atan2(lt.x - p.pos.x, lt.z - p.pos.z); cam.yaw += angDiff(cam.yaw, want) * (1 - Math.exp(-4 * dt));
        tgt.lerp(lt.clone().add(new THREE.Vector3(0, 1.2, 0)), 0.3);
      } else if (Math.abs(input.lookDX) < 0.01 && Math.hypot(input.moveX, input.moveY) > 0.2 && input.moveY > -0.5) {
        cam.yaw += angDiff(cam.yaw, p.yaw) * (1 - Math.exp(-0.9 * dt)) * Math.abs(input.moveX);
      }
      const dist = (state.boss && bossActive ? 7.5 : 6) * (state.boss && state.boss.name === 'Thorn Warden' ? 1.2 : 1);
      cam.dist = lerp(cam.dist, dist, 1 - Math.exp(-3 * dt));
      const cp = Math.cos(cam.pitch);
      const want = tgt.clone().add(new THREE.Vector3(-Math.sin(cam.yaw) * cam.dist * cp, Math.sin(cam.pitch) * cam.dist + 0.4, -Math.cos(cam.yaw) * cam.dist * cp));
      const k = 1 - Math.exp(-12 * dt); cam.pos.lerp(want, k); cam.look.lerp(tgt, k); cam.fov = lerp(cam.fov, player.state === 'dash' ? 68 : 55, 1 - Math.exp(-6 * dt));
    } else if (cam.mode === 'shot' && cam.shot) shotCamera(dt);
    else if (cam.mode === 'orbit') { const t = clock * 0.18; cam.pos.set(cam.orbitC.x + Math.sin(t) * cam.orbitR, cam.orbitC.y + cam.orbitH + 0.3, cam.orbitC.z + Math.cos(t) * cam.orbitR); cam.look.copy(cam.orbitC).add(new THREE.Vector3(0, 0.15, 0)); cam.fov = 45; }
    // ult cinematic
    ultCamera();
    camera.position.copy(cam.pos); cam.shake = Math.max(0, cam.shake - dt * 1.6);
    if (cam.shake > 0) camera.position.add(tmpV.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(cam.shake * 0.25));
    camera.lookAt(cam.look); camera.fov = cam.fov; camera.updateProjectionMatrix();
    input.lookDX = 0; input.lookDY = 0;
  }

  // ---------- main loop ----------
  let renderOn = !opts.noRender; // opts.noRender: test-only, runs the game without drawing (headless bots on slow machines)
  let clock = 0, last = performance.now(), raf = 0, running = true, hidden = false, ctxLost = false, frames = 0, fpsT = 0, lowFpsCount = 0, highFpsCount = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (hidden || ctxLost) return;
    frames++; fpsT += dt;
    if (fpsT >= 1) { state.fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; emit('fps', { fps: state.fps }); autoQuality(); }
    if (!state.paused) update(dt);
    else { input.lookDX = input.lookDY = 0; for (const k in pressed) pressed[k] = false; }
    if (renderOn) render();
  }
  function update(rawDt) {
    clock += rawDt;
    if (slowT > 0) { slowT -= rawDt; timeScale = 0.3; } else timeScale = 1;
    let dt = rawDt * timeScale;
    if (hitStop > 0) { hitStop -= rawDt; dt = 0; }
    if (state.screen === 'play') state.time += rawDt;
    if (state.comboT > 0) { state.comboT -= rawDt; if (state.comboT <= 0) state.combo = 0; }
    // scene
    if (scene_ && scene_.wait > 0) { scene_.wait -= rawDt; if (scene_.wait <= 0) nextStep(); }
    if (state.screen === 'bossIntro') { introTimer -= rawDt; if (introTimer <= 0) { setScreen('play'); bossActive = true; cam.mode = 'follow'; if (introBoss) { play(introBoss.rig, 'idle'); setEmotion(introBoss.rig, introBoss.def.emo); } setObjective('Defeat ' + (state.boss ? state.boss.name : 'the boss'), 0); } }
    if (player) updatePlayer(state.screen === 'play' || state.screen === 'scene' || state.screen === 'clear' || state.screen === 'dead' || state.screen === 'title' || state.screen === 'ending' || state.screen === 'bossIntro' ? dt : 0);
    updateUlt(rawDt);
    const frz = cineFreeze(), eDt = frz ? 0 : domainT > 0 ? dt * 0.25 : dt;
    enemyDirector(state.screen === 'play' ? eDt : 0);
    for (const e of enemies) if (!e.removed) updateEnemy(e, state.screen === 'play' || e.dead ? eDt : 0);
    enemies = enemies.filter((e) => !e.removed);
    if (state.boss) { const b = enemies.find((e) => e.boss); if (b) state.boss.hp = Math.max(0, Math.round(b.hp)); }
    updateAllies(state.screen === 'play' && !frz ? dt : 0); updateSpells(state.screen === 'play' ? eDt : 0); updateDrop(rawDt);
    for (const a of allies) animate(a.rig, state.screen === 'play' && !frz ? dt : 0);
    for (const n of npcs) animate(n.rig, rawDt);
    for (const e of enemies) animate(e.rig, eDt || (e.dead ? rawDt : 0));
    if (player) animate(player.rig, dt || rawDt * 0.05);
    updateProjectiles(eDt);
    // pickups
    for (let i = pickups.length - 1; i >= 0; i--) { const pk = pickups[i]; pk.t += rawDt; if (!player) break; const tp = player.pos.clone(); tp.y += 1; const d = pk.mesh.position.distanceTo(tp); if (pk.t > 0.5) pk.mesh.position.lerp(tp, 1 - Math.exp(-(d < 4 ? 8 : 0.5) * rawDt)); if (d < 0.7 || pk.t > 8) { if (d < 0.7) { player.hp = Math.min(player.maxHp, player.hp + 8); sfx('heal'); } scene.remove(pk.mesh); pickups.splice(i, 1); } }
    // triggers
    if (state.screen === 'play') for (let i = 0; i < triggers.length; i++) { const t = triggers[i]; if (t.check()) { triggers.splice(i, 1); i--; t.fire && t.fire(); } }
    updateBeacon(); if (ultSeq && ultSeq.phase === 'cine') { beacon.arrow.visible = false; beacon.g.visible = false; }
    // gates fade
    if (level) for (const g of level.gates) { if (g.open && g.m.visible) { g.fade -= rawDt * 1.5; g.m.material.opacity = Math.max(0, g.fade) * 0.45; g.m.scale.y = 4 * Math.max(0.01, g.fade); if (g.fade <= 0) g.m.visible = false; } else if (!g.open) g.m.material.opacity = 0.35 + Math.sin(clock * 4) * 0.12; }
    if (level) for (const s of level.spin) { s.rotation.y += rawDt * (s.userData.slow ? 0.1 : 1.2); if (s.userData.slow) s.rotation.z += rawDt * 0.05; }
    // ambient particles
    if (level && player) {
      const c = player.pos; const th = level.theme; const n = qMul * (level.id === 2 ? 0.3 : 0.8);
      if (Math.random() < n) { if (level.id === 4) for (let k = 0; k < 4; k++) spawnP(PN, c.x + rand(-20, 20), c.y + 14, c.z + rand(-10, 25), -1, -30, 0, 0.7, 0.12, 0xb8c8ff, 0, 0); else spawnP(level.id === 3 || level.id === 2 ? PA : PN, c.x + rand(-18, 18), c.y + rand(level.id === 3 ? 0.5 : 6, level.id === 3 ? 4 : 10), c.z + rand(-8, 25), rand(-0.5, 0.5), level.id === 3 ? rand(-0.2, 0.4) : -1.2, rand(-0.3, 0.3), 5, level.id === 3 ? 0.22 : 0.28, th.petals, 0, 0.2); }
      if (level.id === 4 && Math.random() < 0.004) { flashT = 0.12; sfx('thunder'); }
    }
    updateP(PA, rawDt); updateP(PN, rawDt);
    // vfx pools
    for (const a of arcs) if (a.mesh.visible) { a.t += rawDt; const u = a.t / a.life; a.mesh.material.uniforms.prog.value = Math.min(1.2, u * 2.2); a.mesh.material.uniforms.op.value = 1 - sm((u - 0.5) * 2); if (u >= 1) a.mesh.visible = false; }
    for (const f of flashes) if (f.s.visible) { f.t += rawDt; const u = f.t / f.life; f.s.scale.setScalar(f.size * (0.5 + u)); f.s.material.opacity = 1 - u; if (u >= 1) f.s.visible = false; }
    for (const r of rings) if (r.m.visible) { r.t += rawDt; const u = r.t / r.life; r.m.scale.setScalar(r.r * 2 * (0.2 + 0.8 * sm(u))); r.m.material.opacity = 1 - u; if (u >= 1) r.m.visible = false; }
    for (const t of teles) if (t.active) { t.t += frz ? 0 : rawDt; t.m.material.uniforms.t.value = clock; if (t.t > t.dur + 0.1 && !enemies.some((e) => e.tele === t || (Array.isArray(e.tele) && e.tele.includes(t)))) { t.active = false; t.m.visible = false; } }
    for (const n of nums) if (n.s.visible) { n.life -= rawDt; n.s.position.y += rawDt * 1.4; n.s.material.opacity = Math.min(1, n.life * 3); if (n.life <= 0) n.s.visible = false; }
    for (const m of auraMats) { m.uniforms.t.value = clock; }
    OV.t.value = clock; OV.speed.value = Math.max(player && player.state === 'dash' ? 1 : (ultSeq && ultSeq.phase === 'cine' && ultSeq.t < 1.25 ? 0.8 : 0), OV.speed.value - rawDt * 3);
    OV.white.value = Math.max(0, OV.white.value - rawDt * 3);
    if (sky) sky.material.uniforms.t.value = clock;
    if (flashT > 0) { flashT -= rawDt; hemi.intensity = level ? level.theme.hemi[2] * 2.4 : 2; } else if (level) hemi.intensity = level.theme.hemi[2];
    domeMat.uniforms.t.value = clock;
    if (DW && DW.g.visible) { DW.floorMat.uniforms.t.value = clock; DW.halo1.rotation.y += rawDt * 0.08; DW.halo2.rotation.y -= rawDt * 0.13; }
    if (pillar && pillar.visible) { const k = (pillar.userData.t += rawDt) / 0.6; pillar.scale.set(lerp(0.4, 2.6, sm(k)), 30, lerp(0.4, 2.6, sm(k))); pillar.position.y = (player ? player.pos.y : 0) + 15; pillar.material.opacity = 1 - sm(k); if (k >= 1) pillar.visible = false; }
    if (level && level.id === 0 && player) { player.rig.aura.visible = true; if (Math.random() < 0.6) spawnP(PA, rand(-1, 1), rand(0, 2), rand(-1, 1), 0, rand(1, 3), 0, 0.8, 0.35, Math.random() < 0.5 ? 0x8a6cff : 0x4fc3ff); }
    for (const k in pressed) pressed[k] = false;
    updateCamera(rawDt);
  }
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 }), whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  function render() {
    if (sky) sky.position.copy(camera.position);
    if (impact > 0) {
      const odd = impact % 2 === 0; const bg = scene.background; scene.background = new THREE.Color(odd ? 0xffffff : 0x000000); scene.overrideMaterial = odd ? blackMat : whiteMat;
      const sv = sky ? sky.visible : false, tv = titleQuad.visible; if (sky) sky.visible = false; overlay.visible = false; titleQuad.visible = false; dome.visible && (dome.userData.v = true); const dv = dome.visible; dome.visible = false;
      renderer.render(scene, camera);
      scene.overrideMaterial = null; scene.background = bg || null; if (sky) sky.visible = sv; overlay.visible = true; titleQuad.visible = tv; dome.visible = dv; impact--;
      return;
    }
    renderer.render(scene, camera);
  }
  function autoQuality() {
    if (quality !== 'auto') return;
    if (state.fps < 42) { lowFpsCount++; highFpsCount = 0; } else if (state.fps > 57) { highFpsCount++; lowFpsCount = 0; } else { lowFpsCount = highFpsCount = 0; }
    if (lowFpsCount >= 2 && pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio - 0.2); renderer.setPixelRatio(pixelRatio); lowFpsCount = 0; onResize(); if (pixelRatio < 1) qMul = 0.6; }
    if (highFpsCount >= 5 && pixelRatio < Math.min(devicePixelRatio || 1, 1.75)) { pixelRatio = Math.min(Math.min(devicePixelRatio || 1, 1.75), pixelRatio + 0.15); renderer.setPixelRatio(pixelRatio); highFpsCount = 0; onResize(); qMul = 1; }
  }
  function onResize(w, h) {
    if (w && h) { W = w; H = h; }
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    OV.aspect.value = W / H; const sc = (H * renderer.getPixelRatio()) / (2 * Math.tan((55 * Math.PI) / 360)); PA.mat.uniforms.scale.value = sc; PN.mat.uniforms.scale.value = sc;
  }
  onResize();
  const winResize = () => onResize(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight);
  addEventListener('resize', winResize);
  const onVis = () => { if (document.hidden) { hidden = true; if (state.screen === 'play' && !state.paused) { state.paused = true; emit('paused', { reason: 'hidden' }); } } else { hidden = false; last = performance.now(); } };
  document.addEventListener('visibilitychange', onVis);
  const onLost = (e) => { e.preventDefault(); ctxLost = true; emit('contextLost', {}); };
  const onRestored = () => { ctxLost = false; scene.traverse((o) => { if (o.material) { const ms = [].concat(o.material); ms.forEach((m) => { m.needsUpdate = true; if (m.map) m.map.needsUpdate = true; }); } }); faceCache.forEach((t) => (t.needsUpdate = true)); GRAD.needsUpdate = true; emit('contextRestored', {}); };
  canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);
  raf = requestAnimationFrame(frame);

  // ---------- API ----------
  const api = {
    showTitleScene,
    startChapter,
    startBossRush,
    showEnding,
    playEnding() { showEnding(); },
    retry() { startChapter(state.chapter || 1, { fromCheckpoint: state.cp || true, powers: powers.slice(), grimoires: grims.slice(), equipped }); },
    equipGrimoire(id) { return equipGrimoire(id == null ? null : String(id), state.screen === 'play'); },
    setInput(i = {}) {
      if (typeof i.moveX === 'number') input.moveX = i.moveX; if (typeof i.moveY === 'number') input.moveY = i.moveY;
      if (i.lookDX) input.lookDX += i.lookDX; if (i.lookDY) input.lookDY += i.lookDY;
      for (const k in pressed) { if (k in i) { const v = !!i[k]; if (v && !held[k]) pressed[k] = true; held[k] = v; } }
    },
    advanceDialogue() { if (scene_ && scene_.waitingLine) { scene_.waitingLine = false; nextStep(); } },
    skipScene() {
      if (!scene_) return; const sc = scene_; for (let i = sc.i + 1; i < sc.steps.length; i++) if (sc.steps[i].do) sc.steps[i].do();
      sc.i = sc.steps.length; endScene();
    },
    pause() { state.paused = true; },
    resume() { state.paused = false; last = performance.now(); },
    quit() { showTitleScene(); },
    resize(w, h) { onResize(w, h); },
    setQuality(q) { quality = q; pixelRatio = q === 'high' ? Math.min(devicePixelRatio || 1, 2) : q === 'low' ? 0.8 : Math.min(devicePixelRatio || 1, 1.5); qMul = q === 'low' ? 0.5 : 1; renderer.setPixelRatio(pixelRatio); onResize(); OUT_PROP.visible = q !== 'low'; },
    setSettings(s = {}) { const d = s.difficulty; Object.assign(settings, s); if (d !== undefined && !DIFFICULTY[d]) settings.difficulty = 'normal'; },
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => api.off(ev, fn); },
    off(ev, fn) { const l = listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
    getState() {
      const p = player;
      return {
        screen: state.screen, chapter: state.chapter, hp: p ? Math.round(p.hp) : 0, maxHp: p ? p.maxHp : 100, aura: p ? Math.round(p.aura) : 0, auraMax: 100,
        ultReady: !!(p && p.aura >= 100), ultName: powers.includes('domain') ? 'Domain: Infinite Sanctum' : 'Aura Burst', powers: ['punch', ...powers],
        cooldowns: { dash: p ? p.cd.dash / 2.2 : 0, power: p ? (equipped && GRIM(equipped) ? (gcd[equipped] || 0) / (GRIM(equipped).spell.cd * PASSIVE.cd()) : powers.includes('dash') ? p.cd.dash / 2.2 : 0) : 0, dodge: p ? p.cd.dodge / 0.55 : 0, spell: equipped && GRIM(equipped) ? (gcd[equipped] || 0) / (GRIM(equipped).spell.cd * PASSIVE.cd()) : 0 },
        grimoires: grims.map((id) => { const g = GRIM(id); return { id, name: g.name, color: g.color, desc: g.desc, icon: g.icon }; }), equipped, difficulty: settings.difficulty,
        danger: dangerNow(), allies: allies.length,
        objective: state.objective ? Object.assign({}, state.objective) : null, boss: state.boss && bossActive || (state.boss && state.screen === 'bossIntro') ? (() => { const b = enemies.find((e) => e.boss); return Object.assign({ phases: (BOSSES[(b || {}).type] || { phases: [] }).phases.length + 1, guarding: !!(b && b.state === 'guard'), state: b ? b.state : null, x: b ? b.pos.x : 0, z: b ? b.pos.z : 0 }, state.boss); })() : null,
        combo: state.combo, lockTarget: !!lockTarget, time: Math.round(state.time * 10) / 10, paused: state.paused, fps: state.fps,
        checkpoint: state.cp, enemies: enemies.filter((e) => !e.dead).length,
        target: state.target ? { x: state.target.pos.x, y: state.target.pos.y, z: state.target.pos.z, enemy: state.target.enemy } : null, camYaw: cam.yaw, pos: p ? { x: p.pos.x, y: p.pos.y, z: p.pos.z } : null,
      };
    },
    dispose() {
      cancelAnimationFrame(raf); removeEventListener('resize', winResize); document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
      faceCache.forEach((t) => t.dispose()); renderer.dispose();
      for (const k in listeners) delete listeners[k];
    },
    cheat: {
      god(on = true) { god = !!on; },
      render(on = true) { renderOn = !!on; },
      grimoires(ids = 'all') { grims = (ids === 'all' ? GRIMOIRES.map((g) => g.id) : ids).filter((id) => GRIM(id)); if (!grims.includes(equipped)) equipped = grims[0] || null; return grims.slice(); },
      difficulty(d) { if (DIFFICULTY[d]) settings.difficulty = d; return settings.difficulty; },
      aura(full = true) { if (player) player.aura = full ? 100 : 0; },
      chapter(n) { startChapter(n, { powers: CHAPTERS.slice(0, n - 1).map((c) => c.power.id) }); },
      boss() { const n = state.chapter || 1; startChapter(n, { fromCheckpoint: 2, powers: CHAPTERS.slice(0, n).map((c) => c.power.id) }); },
      killAll() { for (const e of enemies.slice()) if (!e.dead) { if (e.boss) { e.hp = 1; e.iframe = 0; if (e.state === 'evade' || e.state === 'guard') e.state = 'idle'; damageEnemy(e, 999, { heavy: true }); } else killEnemy(e); } },
      skip() { api.skipScene(); },
      view(p, l, fov = 40) { if (!p) { cam.mode = 'follow'; return; } cam.mode = 'fixed'; const o = player ? player.pos : new THREE.Vector3(); cam.pos.set(o.x + p[0], o.y + p[1], o.z + p[2]); cam.look.set(o.x + l[0], o.y + l[1], o.z + l[2]); cam.fov = fov; },
      pose(anim, emo, yaw) { if (!player) return; if (anim) play(player.rig, anim, 99); if (emo) setEmotion(player.rig, emo); if (yaw != null) player.yaw = yaw; },
      // test hooks for part 2: force a boss move, set the boss's HP fraction (opens later phases)
      bossAttack(a) { const b = enemies.find((e) => e.boss && !e.dead); if (b && bossActive) { endBossAttackFx(b); b.lastAtk = a; startBossAttack(b, a); return true; } return false; },
      bossHp(f) { const b = enemies.find((e) => e.boss && !e.dead); if (b) b.hp = Math.max(1, Math.round(b.maxHp * f)); },
      step(dt = 1 / 30, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); }, // test-only: deterministic frames while paused
      ult() { return ultSeq ? { t: ultSeq.t, phase: ultSeq.phase, domain: ultSeq.domain } : null; },
      teleport(z) { if (player) { player.pos.z = z; player.pos.y = groundAt(0, z, 10); player.pos.x = 0; } },
    },
  };
  if (typeof window !== 'undefined' && !window.__aura) window.__aura = { game: api, state: () => api.getState(), cheat: api.cheat };
  return api;
}
