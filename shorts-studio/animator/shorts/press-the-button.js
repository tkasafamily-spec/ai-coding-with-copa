// Would You Press It? — every press = $1M for Pip, and Mo shrinks. Then Mo finds the other button.
export const worldOpts = { bg: 0x07060c };

export function build(E, world, data) {
  const { THREE, v3, lerp, seg, ease, easeOut, easeIn, pop, clamp, pose, blinkAt, toy, place } = E;
  const { scene } = world;
  const S = data.timings.map((s) => s.start), END = data.timings.at(-1).start + data.timings.at(-1).len;
  const talk = E.talker(data); const sfx = []; const fx = (t, name, vol = 1) => sfx.push({ t: +t.toFixed(3), name, vol });
  scene.fog = new THREE.Fog(0x07060c, 6, 16);

  // ── dark room, spotlight, the mystery box ─────────────
  scene.add(place(new THREE.Mesh(new THREE.CircleGeometry(20, 48), toy(0x16121f, { rough: 0.2, coat: 1 })), { rotation: new THREE.Euler(-Math.PI / 2, 0, 0), receiveShadow: true }));
  const glowRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.65, 80), new THREE.MeshBasicMaterial({ color: 0x45d6e5 })); glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = 0.005; scene.add(glowRing);
  const spot = new THREE.SpotLight(0xfff1d0, 60, 14, 0.5, 0.5); spot.position.set(0, 7, 1.5); spot.target.position.set(0, 0, 0); spot.castShadow = true; scene.add(spot, spot.target);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1d0, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.set(0, 3.5, 0.6); scene.add(beam);
  const box = new THREE.Group(); scene.add(box);
  box.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), toy(0x1d1a2b, { rough: 0.3, coat: 1 })), { position: v3(0, 0.375, 0), castShadow: true, receiveShadow: true }));
  const edgeM = new THREE.MeshBasicMaterial({ color: 0x45d6e5 });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.76, 0.76, 0.76)), new THREE.LineBasicMaterial({ color: 0x45d6e5 })); edges.position.y = 0.375; box.add(edges);
  const green = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0x2bd96b, emissive: 0x15ff5a, emissiveIntensity: 0.9, roughness: 0.3 })); green.position.y = 0.79; box.add(green);
  box.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 32), toy(0xbfc3cc, { metal: 0.8 })), { position: v3(0, 0.765, 0) }));
  const greenLight = new THREE.PointLight(0x2bff6b, 2, 2.5); greenLight.position.set(0, 1.1, 0); box.add(greenLight);
  const blue = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x2f7df6, emissive: 0x1f6dff, emissiveIntensity: 1.0, roughness: 0.3 }));
  blue.rotation.x = Math.PI / 2; blue.position.set(0, 0.2, -0.41); box.add(blue);
  const blueLight = new THREE.PointLight(0x3f8dff, 0, 2); blueLight.position.set(0, 0.25, -0.8); box.add(blueLight);

  // ── money ─────────────────────────────────────────────
  const billTex = (() => { const cv = document.createElement("canvas"); cv.width = 128; cv.height = 64; const c = cv.getContext("2d");
    c.fillStyle = "#6fbf73"; c.fillRect(0, 0, 128, 64); c.strokeStyle = "#2e7d32"; c.lineWidth = 6; c.strokeRect(4, 4, 120, 56);
    c.fillStyle = "#2e7d32"; c.beginPath(); c.arc(64, 32, 16, 0, 7); c.fill(); c.fillStyle = "#c8e6c9"; c.font = "900 24px Montserrat, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("$", 64, 34);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const billMat = new THREE.MeshStandardMaterial({ map: billTex, side: THREE.DoubleSide, roughness: 0.7 });
  const RAIN = 260, rain = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.1), billMat, RAIN); rain.frustumCulled = false; scene.add(rain);
  const RR = E.rand(5), RP = Array.from({ length: RAIN }, () => ({ x: (RR() - 0.5) * 3.2, z: (RR() - 0.5) * 2.4 + 0.3, ph: RR(), sp: 0.8 + RR() * 0.6, w: RR() * 6 }));
  const PILE = v3(1.35, 0, 0.05);
  const pile = new THREE.Group(); pile.position.copy(PILE); scene.add(pile);
  const heap = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 40, 6), new THREE.MeshStandardMaterial({ color: 0x5fae63, roughness: 0.8 })); heap.position.y = 0.5; heap.castShadow = heap.receiveShadow = true; pile.add(heap);
  const stacks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.05, 0.1), [billMat, billMat, billMat, billMat, billMat, billMat].length ? billMat : billMat, 160); pile.add(stacks);
  const SR_ = E.rand(8), SPOS = Array.from({ length: 160 }, () => { const a = SR_() * 6.28, h = SR_(); return { a, h, rot: SR_() * 3, tilt: (SR_() - 0.5) * 0.8 }; });
  function setPile(h) { // h = height in metres
    pile.visible = h > 0.02; const r = h * 0.75 + 0.12; heap.scale.set(r, Math.max(0.01, h), r); heap.position.y = h / 2;
    const o = new THREE.Object3D();
    SPOS.forEach((p, k) => { const y = p.h * h, rr = (1 - p.h) * r * 0.98; o.position.set(Math.cos(p.a) * rr, y + 0.02, Math.sin(p.a) * rr); o.rotation.set(p.tilt, p.rot, Math.atan2(h, r) * 0.7); o.scale.setScalar(h > 0.02 ? 1 : 0.001); o.updateMatrix(); stacks.setMatrixAt(k, o.matrix); });
    stacks.instanceMatrix.needsUpdate = true;
  }
  const poofs = E.makeDrops(200, 17); poofs.material = new THREE.MeshBasicMaterial({ color: 0xe8e8f0, transparent: true, opacity: 0.8 }); poofs.geometry = new THREE.SphereGeometry(0.03, 8, 6); poofs.material.opacity = 0.6; scene.add(poofs);
  const magic = E.makeConfetti(160, 41, [0x45d6e5, 0xffffff, 0x9f7bff]); scene.add(magic);

  // ── cast ──────────────────────────────────────────────
  const pip = E.makePip(), mo = E.makeMo(), quack = E.makeQuack();
  [pip, mo, quack].forEach((c) => scene.add(c.root));
  const dollarEyes = [-0.13, 0.13].map((x) => { const p = E.textPanel(0.2, 0.24, (ctx, w, h) => { ctx.fillStyle = "#2bd96b"; ctx.font = `900 ${h * 0.95}px Montserrat, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 10; ctx.strokeStyle = "#0b3d1a"; ctx.strokeText("$", w / 2, h * 0.55); ctx.fillText("$", w / 2, h * 0.55); }, { px: 128, transparent: true, glow: 1.2 }); p.position.set(x, 0.66, 0.42); pip.head.add(p); return p; });
  const popcorn = new THREE.Group(); scene.add(popcorn);
  popcorn.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 16), toy(0xe8302e)), { position: v3(0, 0.08, 0) }));
  { const R = E.rand(3); for (let k = 0; k < 10; k++) popcorn.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toy(0xfff2c0, { rough: 0.8 })), { position: v3((R() - 0.5) * 0.12, 0.17 + R() * 0.04, (R() - 0.5) * 0.12) })); }

  // presses: green ones make money + shrink Mo; blue ones take it away
  const greenPress = [S[2] + 0.45, ...Array.from({ length: 7 }, (_, k) => S[3] + 0.25 + k * 0.32)];
  const bluePress = Array.from({ length: 6 }, (_, k) => S[6] + 0.25 + k * 0.32);
  const count = (arr, t) => arr.filter((p) => t >= p).length;
  const moScale = (t) => { const n = count(greenPress, t); const target = Math.pow(0.82, n); const last = greenPress[n - 1] ?? -9; return lerp(target / 0.82, target, n ? easeOut(seg(t, last, last + 0.15)) : 1); };
  const pileH = (t) => { const g = count(greenPress, t), b = count(bluePress, t); return Math.max(0, Math.min(1.15, g * 0.15) * (1 - b / 6)); };

  fx(0.05, "magic"); fx(0.1, "poof", 0.6);
  fx(S[1] + 0.3, "sting", 0.4);
  greenPress.forEach((p, k) => { fx(p, "click", 0.8); fx(p + 0.05, k === 0 ? "cash" : "pop", k === 0 ? 1 : 0.5); });
  fx(S[2] + 2.3, "pop", 0.7);
  fx(S[4] + 0.2, "cash", 0.6);
  fx(S[5] + 0.3, "step", 0.4); fx(S[5] + 0.7, "step", 0.4); fx(S[5] + 1.6, "magic", 0.5);
  bluePress.forEach((p) => { fx(p, "click", 0.8); fx(p + 0.05, "poof", 0.8); });
  fx(S[6] + 1.44, "whistle", 0.4);

  function update(t) {
    const { i, lt } = E.sceneOf(data, t);
    const ms = moScale(t), ph = pileH(t);
    setPile(ph);
    green.position.y = 0.79 - 0.04 * (greenPress.some((p) => t >= p && t < p + 0.12) ? 1 : 0);
    blue.position.z = -0.41 + 0.03 * (bluePress.some((p) => t >= p && t < p + 0.12) ? 1 : 0);
    blueLight.intensity = i >= 5 ? 3 : 0;
    dollarEyes.forEach((d) => (d.visible = false)); popcorn.visible = false;
    poofs.userData.spray(0, v3(0, -99, 0), v3(0, 1, 0), { on: false });
    magic.userData.at(t - 0.05, v3(0, 0.6, 0));
    // the box pops into existence
    const appear = pop(t, 0.05, 0.4); box.scale.setScalar(Math.max(0.001, appear));
    // money rain (after the first press, while presses happen)
    const raining = t > greenPress[0] && t < S[4] + 0.8;
    const o = new THREE.Object3D();
    RP.forEach((p, k) => { const age = ((t * p.sp * 0.45 + p.ph) % 1); o.position.set(p.x + PILE.x * 0.5 + Math.sin(t * 2 + p.w) * 0.2, 3.5 - age * 3.5, p.z); o.rotation.set(t * p.w, t * p.w * 0.7, Math.sin(t * 3 + p.w)); o.scale.setScalar(raining ? 1 : 0.001); o.updateMatrix(); rain.setMatrixAt(k, o.matrix); });
    rain.instanceMatrix.needsUpdate = true;

    mo.root.scale.setScalar(ms);
    const moBase = { pos: v3(-0.85, 0, 0.45), rotY: 0.85, blink: blinkAt(t, 4) * 0.5, armLx: -0.35, armRx: -0.35, armLz: -0.25, armRz: -0.25, mouth: talk("Mo", t) };
    const pipTop = ph;
    const pipBase = { pos: v3(0.62, 0, 0.42), rotY: -0.95, blink: blinkAt(t, 1), mouth: talk("Pip", t) };
    pose(quack, { visible: false });

    if (i === 0) { // ── "A box appeared. Press the button, get one million dollars."
      pose(pip, { ...pipBase, eyeScale: 1 + 0.25 * pop(t, 0.3, 0.3), lookX: 0.2 });
      pose(mo, { ...moBase, lookX: 0.2 });
      const k = ease(seg(lt, 0, 3.77));
      world.cam(v3(lerp(0.3, 0.2, k), lerp(2.0, 1.5, k), lerp(4.6, 3.4, k)), v3(0, 0.6, 0), 40);
    }
    else if (i === 1) { // ── "But every time you press it, Mo shrinks one inch." Mo: "Bad idea."
      const look = ease(seg(lt, 0.6, 1.0));
      pose(mo, { ...moBase, lookX: 0.45 * look * (1 - seg(lt, 2.6, 2.9)), lookY: lt > 2.6 ? -0.5 : 0, eyeScale: 1 + 0.15 * look });
      const greedy = seg(lt, 1.8, 2.1);
      pose(pip, { ...pipBase, rotY: lerp(-0.95, -1.3, greedy), blink: greedy > 0 ? 0 : blinkAt(t, 1), mouth: Math.max(0.3 * greedy, talk("Pip", t)) });
      dollarEyes.forEach((d) => { d.visible = greedy > 0; d.scale.setScalar(pop(lt, 1.8, 0.3)); });
      if (lt < 1.75) world.cam(v3(-0.3, 1.7, 2.6), v3(-0.85, 1.2 * ms, 0.45), 40);
      else if (lt < 2.85) world.cam(v3(-0.55, 0.8, 0.95), v3(0.62, 0.62, 0.42), 38);
      else world.cam(v3(-0.4, 1.6, 2.4), v3(-0.85, 1.25, 0.45), 40);
    }
    else if (i <= 3) { // ── pressing: money rains, Mo shrinks
      const mash = greenPress.some((p) => t >= p - 0.08 && t < p + 0.1);
      pose(pip, { ...pipBase, pos: v3(0.62, Math.min(pipTop * 0.3, 0.3), 0.42), armRx: mash ? -1.9 : -1.3, armRz: 0.6, eyeScale: 1.1, mouth: 0.35 + 0.2 * Math.sin(t * 10), blink: 0 });
      dollarEyes.forEach((d) => { d.visible = true; d.scale.setScalar(1); });
      const shrunk = greenPress.some((p) => t >= p && t < p + 0.2);
      pose(mo, { ...moBase, squash: shrunk ? 0.12 : 0, eyeScale: 1.2, lookX: 0.3, lookY: 0.4 });
      if (i === 2) world.cam(v3(0.4, 1.7, 3.2), v3(0, 0.75, 0.2), 42);
      else world.cam(v3(1.2, 1.4, 2.9), v3(0.2, 0.6, 0.2), 44);
    }
    else if (i === 4) { // ── "Now Pip was rich… and Mo was the size of Quack."
      pose(pip, { ...pipBase, pos: v3(PILE.x, pipTop - 0.02, PILE.z), rotY: -0.3, blink: 0.6, mouth: 0.3, armLz: 1.2, armRz: 1.2, lean: -0.3, sway: Math.sin(lt * 2) * 0.05 });
      dollarEyes.forEach((d) => (d.visible = true));
      pose(mo, { ...moBase, pos: v3(-0.75, 0, 0.95), rotY: 0.35, armLx: -1.0, armRx: -1.0, armLz: 0.9, armRz: 0.9, lookX: 0.35, eyeScale: 1 });
      pose(quack, { pos: v3(-0.4, 0, 1.0), rotY: -0.4, blink: blinkAt(t, 3) });
      if (lt < 1.4) world.cam(v3(0.9, 1.7, 3.4), v3(PILE.x, pipTop * 0.8, PILE.z), 42);
      else world.cam(v3(-0.5, 0.45, 2.1), v3(-0.58, 0.25, 0.95), 40);
    }
    else if (i === 5) { // ── "Then Mo found a second button."
      const walk = seg(lt, 0.15, 1.3);
      const path = (u) => { const a = lerp(Math.PI * 1.66, Math.PI * 1.0, u); return v3(Math.sin(a) * 0.75, 0, Math.cos(a) * 0.75); };
      const mp = path(ease(walk)), nx = path(Math.min(1, ease(walk) + 0.02));
      const grin = seg(lt, 1.6, 2.0);
      pose(mo, { ...moBase, pos: mp, rotY: walk < 1 ? Math.atan2(nx.x - mp.x, nx.z - mp.z) : lerp(Math.PI * 0.5, -2.5, ease(seg(lt, 1.3, 1.6))), walk: lt * 1.6, walkAmt: walk > 0 && walk < 1 ? 1 : 0, mouth: 0.15 * grin, eyeScale: 1 - 0.2 * grin, headTilt: 0.15 * grin, lookX: -0.15 });
      pose(pip, { ...pipBase, pos: v3(PILE.x, pipTop - 0.02, PILE.z), rotY: -0.3, blink: 0.6, mouth: 0.3, armLz: 1.2, armRz: 1.2, lean: -0.3 });
      dollarEyes.forEach((d) => (d.visible = true));
      pose(quack, { pos: v3(-0.4, 0, 1.0), rotY: -0.4, blink: blinkAt(t, 3) });
      if (lt < 1.4) world.cam(v3(-1.3, 0.9, -1.6), v3(0, 0.25, -0.4), 42);
      else { const k = ease(seg(lt, 1.4, 2.4)); world.cam(v3(lerp(-0.8, -0.3, k), lerp(0.7, 0.45, k), lerp(-1.9, -1.55, k)), v3(mp.x, 0.25, mp.z), 38); }
    }
    else { // ── Mo: "Bad idea, man."  Pip: "NOOO!"
      const mp = v3(Math.sin(Math.PI * 1.95) * 0.75, 0, Math.cos(Math.PI * 1.95) * 0.75);
      const slam = bluePress.some((p) => t >= p - 0.08 && t < p + 0.08);
      pose(mo, { ...moBase, pos: v3(0.0, slam ? 0.05 : 0, -0.66), rotY: 0, mouth: talk("Mo", t), armRx: slam ? -1.6 : -0.9, armRz: 0.3, hop: slam ? 0.06 : 0 });
      const slide = seg(lt, 1.3, 2.2);
      pose(pip, { ...pipBase, pos: v3(lerp(PILE.x, PILE.x + 0.7, slide), Math.max(0, pipTop - 0.02), lerp(PILE.z, PILE.z + 0.5, slide)), rotY: -0.3, blink: 0, eyeScale: 1.35, mouth: Math.max(talk("Pip", t), 0.7), mouthSize: 1.25, armLz: 2.4 + Math.sin(lt * 20) * 0.3, armRz: 2.4 + Math.cos(lt * 20) * 0.3, tilt: -0.3 * slide });
      poofs.userData.spray(t, v3(PILE.x, ph * 0.6 + 0.2, PILE.z), v3(0, 1, 0), { spread: 3, speed: 1.2, life: 0.5, gravity: -0.5, on: lt > 0.25 && lt < 2.3 });
      popcorn.visible = true;
      pose(quack, { pos: v3(-0.65, 0, 0.95), rotY: 0.5, blink: blinkAt(t, 3), lookX: Math.sin(lt * 9) * 0.1 });
      quack.root.updateMatrixWorld(true); popcorn.position.set(-0.65 + 0.12, 0.12, 0.95 + 0.25);
      world.cam(v3(-1.7, 1.25, -1.9), v3(0.45, 0.45, -0.1), 46);
    }
  }
  return { update, duration: END, sfx };
}
