// The $500 Million Bucket — 7 scenes in Mr. Bucks' gold game-show studio.
export const worldOpts = { bg: 0x12081f };

export function build(E, world, data) {
  const { THREE, v3, lerp, seg, ease, easeOut, back, pop, clamp, pose, blinkAt, toy } = E;
  const { scene } = world;
  const S = data.timings.map((s) => s.start); // scene start times
  const END = data.timings.at(-1).start + data.timings.at(-1).len;
  const talk = E.talker(data);
  const sfx = [];
  const fx = (t, name, vol = 1) => sfx.push({ t: +t.toFixed(3), name, vol });

  // ── studio set ─────────────────────────────────────────
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), toy(0x2b1650, { rough: 0.22, coat: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // floor light rings
  [3.2, 4.4].forEach((r, i) => { const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.06, 96), new THREE.MeshBasicMaterial({ color: i ? 0x45d6e5 : 0xffd23a })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring); });
  // stage
  const stage = new THREE.Group(); scene.add(stage);
  stage.add(E.place(new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 0.14, 64), E.gold()), { receiveShadow: true, castShadow: true }));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.02, 64), toy(0x7b2fd6, { rough: 0.25 })); top.position.y = 0.075; top.receiveShadow = true; stage.add(top);
  stage.position.y = 0.07;
  const SY = 0.15; // stage height
  // curved back wall with light bulbs
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 12, 80, 1, true, Math.PI * 0.62, Math.PI * 0.76), toy(0x3d1670, { rough: 0.5, side: THREE.BackSide }));
  wall.position.set(0, 6, 0.5); scene.add(wall);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), 600);
  { const o = new THREE.Object3D(); let n = 0;
    for (let row = 0; row < 8; row++) for (let k = 0; k < 70 && n < 600; k++) {
      const a = Math.PI * 0.64 + (k / 69) * Math.PI * 0.72; const r = 9.85;
      if (row > 1 && row < 6 && Math.abs(Math.cos(a)) < 0.33) continue; // gap behind the sign
      o.position.set(Math.sin(a) * r, 0.9 + row * 1.15, Math.cos(a) * r + 0.5); o.updateMatrix(); bulbs.setMatrixAt(n++, o.matrix);
    } bulbs.count = n; }
  scene.add(bulbs);
  // the giant sign
  const sign = E.textPanel(7, 1.9, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#fff6c9"); g.addColorStop(0.5, "#ffc83d"); g.addColorStop(1, "#d48a00");
    ctx.fillStyle = "#1a0b33"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffd23a"; ctx.lineWidth = 14; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.font = `900 ${h * 0.56}px Montserrat, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = g; ctx.fillText("$500,000,000", w / 2, h * 0.54);
  }, { glow: 0.9 });
  sign.position.set(0, 5.3, -8.9); scene.add(sign);
  // clock tower beside the pool
  const tower = new THREE.Group(); tower.position.set(5.2, 0, -1.8); tower.rotation.y = -0.45; scene.add(tower);
  tower.add(E.place(new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), E.gold()), { position: v3(0, 1.1, 0), castShadow: true }));
  tower.add(E.place(new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.05, 0.22), toy(0x111111, { rough: 0.4 })), { position: v3(0, 2.6, 0) }));
  const clockFace = E.textPanel(1.84, 0.9, (ctx, w, h, secs = 60, flash = 0) => {
    ctx.fillStyle = flash ? "#3b0000" : "#050505"; ctx.fillRect(0, 0, w, h);
    ctx.font = `900 ${h * 0.78}px Montserrat, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "#ff2a2a"; ctx.shadowBlur = 30; ctx.fillStyle = secs <= 10 ? "#ff3b3b" : "#ffd23a";
    ctx.fillText(`0:${String(secs).padStart(2, "0")}`, w / 2, h * 0.54);
  }, { px: 512, glow: 1.2 });
  clockFace.position.set(0, 2.6, 0.12); tower.add(clockFace);
  // pool
  const POOL = v3(4.1, 0, 1.4);
  const pool = new THREE.Group(); pool.position.copy(POOL); scene.add(pool);
  const tile = toy(0xf2f5ff, { rough: 0.35 });
  [[0, -1.15, 3.2, 0.3], [0, 1.15, 3.2, 0.3], [-1.6, 0, 0.3, 2.6], [1.6, 0, 0.3, 2.6]].forEach(([x, z, w, d]) => pool.add(E.place(new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), tile), { position: v3(x, 0.11, z), castShadow: true, receiveShadow: true })));
  const waterGeo = new THREE.PlaneGeometry(2.9, 2.0, 40, 28);
  const water = new THREE.Mesh(waterGeo, toy(0x29b6f6, { rough: 0.08, coat: 1, emissive: 0x0a4a7a, ei: 0.6 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.16; water.receiveShadow = true; pool.add(water);
  const wpos = waterGeo.attributes.position, wbase = wpos.array.slice();
  // speaker box Mo leans on
  const speaker = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.6), toy(0x1b1b22, { rough: 0.5 })); speaker.position.set(-2.95, 0.6, 1.2); speaker.castShadow = true; scene.add(speaker);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), toy(0x444450)); cone.rotation.x = Math.PI / 2; cone.position.set(-2.95, 0.75, 1.51); scene.add(cone);
  // light beams
  const beamMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beams = [[-4, 0xff4fd8], [4, 0x45d6e5], [-1.5, 0xffd23a], [1.5, 0xffd23a]].map(([x, c]) => { const b = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 24, 1, true), beamMat(c)); b.position.set(x, 5, -2); scene.add(b); return b; });
  const spot = new THREE.SpotLight(0xfff1d0, 30, 14, 0.45, 0.6); spot.position.set(0, 7, 2); spot.target.position.set(0, 0, 0); scene.add(spot, spot.target);

  // pedestal (open stand so you can see under the bucket) + bucket
  const PED = v3(0.2, SY, 0.15);
  const stand = new THREE.Group(); stand.position.copy(PED); scene.add(stand);
  stand.add(E.place(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 10, 32), E.gold()), { rotation: new THREE.Euler(Math.PI / 2, 0, 0), position: v3(0, 0.42, 0) }));
  [0, 2.09, 4.19].forEach((a) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.44, 8), E.gold()); l.position.set(Math.sin(a) * 0.22, 0.21, Math.cos(a) * 0.22); l.castShadow = true; stand.add(l); });
  const bucket = E.makeBucket(); bucket.position.set(PED.x, PED.y + 0.42, PED.z); scene.add(bucket);
  const BTOP = PED.y + 0.42 + 0.38, BBOT = PED.y + 0.42;
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32), toy(0x4fc3f7, { rough: 0.05, opacity: 0.7 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(PED.x, SY + 0.004, PED.z); scene.add(puddle);

  // ── cast + props ───────────────────────────────────────
  const pip = E.makePip(), quack = E.makeQuack(), mo = E.makeMo(), bucks = E.makeBucks();
  [pip, quack, mo, bucks].forEach((c) => scene.add(c.root));
  const brief = E.makeBriefcase(); scene.add(brief);
  const cup = E.makeCup(); scene.add(cup);
  const confA = E.makeConfetti(420, 11), confB = E.makeConfetti(520, 23); scene.add(confA, confB);
  const drops = E.makeDrops(160, 5), drops2 = E.makeDrops(120, 9); scene.add(drops, drops2);
  const bulb = new THREE.Group(); scene.add(bulb); // idea light bulb
  bulb.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff27a })));
  bulb.add(E.place(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), toy(0xaaaaaa, { metal: 0.8 })), { position: v3(0, -0.14, 0) }));
  const bulbLight = new THREE.PointLight(0xfff27a, 0, 2); bulb.add(bulbLight);

  // hand position helper (world coords of a character's hand)
  const handPos = (c, side = "R") => { c.root.updateMatrixWorld(true); return (c["hand" + side] || c["arm" + side]).getWorldPosition(new THREE.Vector3()); };
  const clockSecs = (t) => Math.max(0, Math.ceil(60 - (t - S[1]) / (S[5] + 1.9 - S[1]) * 60));

  // ── sound cues ─────────────────────────────────────────
  fx(0, "sting"); fx(3.55, "confetti"); fx(3.6, "cheer", 0.5);
  fx(S[1] + 0.05, "whoosh"); for (let t = S[1] + 0.3; t < S[1] + 2.9; t += 0.19) fx(t, "step", 0.5);
  for (let t = S[1]; t < S[5] + 1.9; t += 0.5) fx(t, "tick", 0.35);
  fx(S[1] + 3.1, "pop", 0.6);
  fx(S[2] + 0.35, "splash", 0.8); fx(S[2] + 1.1, "scratch");
  fx(S[3] + 2.15, "whoosh", 0.6); fx(S[3] + 2.2, "spray", 0.7);
  fx(S[4] + 0.1, "ding"); fx(S[4] + 1.35, "boing", 0.7); fx(S[4] + 1.55, "squeak");
  for (let k = 0; k < 6; k++) fx(S[5] + 0.15 + k * 0.28, "splash", 0.45);
  [S[5] + 1.0, S[5] + 1.3, S[5] + 1.6].forEach((t) => fx(t, "beep", 0.7)); fx(S[5] + 1.9, "horn"); fx(S[5] + 1.9, "confetti"); fx(S[5] + 1.95, "cheer", 0.7);
  fx(S[6] + 1.45, "cash"); fx(S[6] + 1.8, "squeak", 0.8); fx(S[6] + 2.62, "zoom");

  // ── per-frame ──────────────────────────────────────────
  function update(t) {
    const sc = E.sceneOf(data, t), i = sc.i, lt = sc.lt;
    const tw = t; // for wobble
    // water ripples
    for (let k = 0; k < wpos.count; k++) { const x = wbase[k * 3], y = wbase[k * 3 + 1]; wpos.array[k * 3 + 2] = Math.sin(x * 3 + tw * 2.2) * 0.02 + Math.cos(y * 4 - tw * 1.7) * 0.015; }
    wpos.needsUpdate = true; waterGeo.computeVertexNormals();
    beams.forEach((b, k) => { b.rotation.z = Math.sin(tw * 0.6 + k * 1.7) * 0.35; });
    clockFace.userData.redraw(clockSecs(t), clockSecs(t) === 0 && Math.floor(t * 6) % 2 === 0 ? 1 : 0);
    // defaults
    let lvl = 0, pud = 0;
    confA.userData.at(t - 3.55, v3(0.1, 2.3, 0.6));
    confB.userData.at(t - (S[5] + 1.9), v3(0.3, 2.2, 0.5));
    drops.userData.spray(0, v3(0, -50, 0), v3(0, 1, 0), { on: false }); drops2.userData.spray(0, v3(0, -50, 0), v3(0, 1, 0), { on: false });
    bulb.visible = false; cup.visible = false; brief.visible = true;
    const m = (c) => talk(c, t);

    // Mr. Bucks base pose (scenes 1, 7)
    const bucksBase = { pos: v3(-0.85, SY, -0.35), rotY: 0.45, blink: blinkAt(t, 2), mouth: m("Mr. Bucks"), visible: true };
    const pipBase = { pos: v3(0.95, SY, 0.75), rotY: -0.3, blink: blinkAt(t, 1), mouth: m("Pip") };
    const quackBase = { pos: v3(1.45, SY, 1.05), rotY: -0.5, blink: blinkAt(t, 3) };
    const moBase = { pos: v3(-2.55, 0, 1.45), rotY: 0.55, tilt: -0.1, blink: blinkAt(t, 4) * 0.5, armLx: -0.35, armRx: -0.35, armLz: -0.25, armRz: -0.25, mouth: m("Mo") };

    if (i === 0) { // ── "Mr. Bucks said: fill this bucket in 60 seconds, win $500 million"
      const point = ease(seg(lt, 1.0, 1.5)) * (1 - ease(seg(lt, 3.2, 3.7)));
      const cheer = pop(lt, 3.5, 0.4);
      pose(bucks, { ...bucksBase, armRx: -1.9 * point, armRz: 0.5 + 0.3 * point, lookY: 0.3 * point, armLx: -0.6 * cheer, armLz: 0.5 + 1.2 * cheer, hop: 0.05 * Math.abs(Math.sin(lt * 9)) * (lt > 3.5 ? 1 : 0), squash: Math.sin(lt * 9) * 0.03 });
      const excited = seg(lt, 3.4, 3.7);
      pose(pip, { ...pipBase, eyeScale: 1 + 0.3 * pop(lt, 3.45, 0.3) * (1 - seg(lt, 4.8, 5.3)), hop: Math.abs(Math.sin(lt * 10)) * 0.16 * excited, mouth: 0.6 * excited * (1 - seg(lt, 4.6, 5)), armLz: 0.35 + 2.3 * excited, armRz: 0.35 + 2.3 * excited, lookX: -0.1 });
      pose(quack, { ...quackBase, hop: Math.abs(Math.sin(lt * 12)) * 0.1 * excited });
      pose(mo, { ...moBase, visible: false });
      // briefcase in Bucks' left hand, open
      const hp = handPos(bucks, "L"); brief.position.set(hp.x - 0.12, hp.y - 0.2, hp.z + 0.12); brief.rotation.set(0.25, 0.45, 0.3 * cheer);
      const k = ease(seg(lt, 0, 5.5));
      world.cam(v3(lerp(0.9, 0.55, k), lerp(1.75, 1.35, k), lerp(6.8, 4.7, k)), v3(0.05, lerp(1.25, 1.0, k), 0.1), 40);
    }
    else if (i === 1) { // ── "Easy, right? Pip grabbed a cup and ran to the pool."  "Easy money!"
      const run = seg(lt, 0.25, 2.7);
      const p0 = v3(0.95, SY, 0.75), p1 = v3(3.0, 0, 1.0);
      const p = new THREE.Vector3().lerpVectors(p0, p1, ease(run)); p.y = lerp(SY, 0, seg(run, 0.55, 0.75)) + Math.sin(seg(run, 0.5, 0.8) * Math.PI) * 0.25;
      const turn = ease(seg(lt, 2.75, 3.1));
      pose(pip, { pos: p, rotY: lerp(Math.PI / 2 - 0.1, 0.25, turn), walk: lt * 2.8, walkAmt: run > 0 && run < 1 ? 1 : 0, lean: 0.15 * (run < 1 ? 1 : 0), blink: blinkAt(t, 1), mouth: m("Pip") + (lt > 3 ? 0.15 : 0), armRx: lt > 2.9 ? -1.2 : null, armRz: lt > 2.9 ? 0.6 : null, eyeScale: 1 + 0.1 * turn });
      const q = new THREE.Vector3().lerpVectors(v3(1.45, SY, 1.05), v3(2.35, 0, 1.25), ease(seg(lt, 0.6, 3.2))); q.y = lerp(SY, 0, seg(lt, 1.6, 1.9));
      pose(quack, { pos: q, rotY: Math.PI / 2 - 0.2, sway: Math.sin(lt * 14) * 0.25, hop: Math.abs(Math.sin(lt * 14)) * 0.05, blink: blinkAt(t, 3) });
      pose(bucks, { ...bucksBase, rotY: 1.0 }); pose(mo, { ...moBase, visible: false });
      brief.position.set(-0.4, SY + 0.02, -0.4); brief.rotation.set(0, 0.5, 0);
      cup.visible = true; const hp = handPos(pip, "R"); cup.position.set(hp.x, hp.y - 0.04, hp.z); cup.rotation.set(0, 0, 0);
      // tracking camera
      const camT = v3(p.x + 0.35, 0.75, p.z);
      const close = ease(seg(lt, 2.7, 3.2));
      world.cam(v3(lerp(p.x - 0.4, p.x + 0.15, close), lerp(1.15, 0.95, close), lerp(p.z + 3.4, p.z + 2.0, close)), lerpV(camT, v3(p.x, 0.75, p.z), close), 40);
    }
    else if (i === 2) { // ── "But the bucket had a hole. A big one."
      const PIP = v3(PED.x, SY, PED.z - 0.62);
      const shock = pop(lt, 1.05, 0.3);
      pose(pip, { pos: PIP, rotY: 0, blink: 0, armRx: -2.3, armRz: 0.25, armLz: 0.35 + shock * 1.2, armLx: -shock * 0.6, eyeScale: 1 + 0.45 * shock, mouth: 0.9 * shock, lookX: 0.25 - shock * 0.25 });
      cup.visible = true; const hp = handPos(pip, "R"); cup.position.set(hp.x, hp.y + 0.02, hp.z + 0.05); cup.rotation.set(1.9, 0, 0);
      const pouring = lt > 0.2 && lt < 1.6;
      drops2.userData.spray(t, v3(hp.x, hp.y + 0.02, hp.z + 0.14), v3(0, -1, 0.15), { spread: 0.15, speed: 0.8, life: 0.4, on: pouring });
      drops.userData.spray(t, v3(PED.x, BBOT, PED.z), v3(0, -1, 0.1), { spread: 0.6, speed: 1.4, life: 0.35, on: lt > 0.35 });
      pud = ease(seg(lt, 0.4, 2.6)) * 0.6;
      pose(quack, { ...quackBase, pos: v3(0.75, SY, 0.55), rotY: -0.3 }); pose(bucks, { ...bucksBase, visible: false }); pose(mo, { ...moBase, visible: false });
      brief.visible = false;
      const k = ease(seg(lt, 0, 2.6));
      world.cam(v3(PED.x + lerp(0.5, 0.35, k), lerp(0.55, 0.62, k), PED.z + lerp(2.0, 1.55, k)), v3(PED.x, lerp(0.75, 0.72, k), PED.z), 40);
      if (lt > 1.05 && lt < 1.4) world.shake(0.02, t);
    }
    else if (i === 3) { // ── Mo: "Bad idea, man. Just give up."  Narrator: "Pip did not give up."
      const cut = data.timings[3].lines[1].start - S[3] - 0.1;
      pud = 0.6 + 0.2 * seg(lt, cut, 3.7);
      if (lt < cut) {
        pose(mo, { ...moBase, lookY: Math.sin(lt * 7) * 0.25 * seg(lt, 0.1, 0.4), headTilt: 0.1 });
        pose(pip, { ...pipBase, pos: v3(PED.x + 0.3, SY, PED.z - 0.6), rotY: -0.2 });
        world.cam(v3(-2.0, 1.55, 3.3), v3(-2.5, 1.35, 1.4), 38);
        drops.userData.spray(t, v3(PED.x, BBOT, PED.z), v3(0, -1, 0.1), { spread: 0.6, speed: 1.4, life: 0.35 });
      } else {
        const l2 = lt - cut;
        pose(mo, { ...moBase, visible: false });
        // Pip crouched, finger in the hole, water spraying around it
        pose(pip, { pos: v3(PED.x + 0.05, SY, PED.z - 0.45), rotY: 0.15, squash: 0.18, armRx: -2.9, armRz: 0.15, armLz: 0.9 + Math.sin(l2 * 30) * 0.15, armLx: -0.4, eyeScale: 1.15, lookX: -0.35, mouth: 0.35 + 0.1 * Math.sin(l2 * 25), sway: Math.sin(l2 * 24) * 0.05 });
        drops.userData.spray(t, v3(PED.x, BBOT - 0.03, PED.z), v3(0, 0.2, 0), { spread: 2.6, speed: 1.6, life: 0.45 });
        world.cam(v3(PED.x + 0.75, 0.48, PED.z + 1.3), v3(PED.x, 0.55, PED.z - 0.1), 42);
        world.shake(0.008, t);
      }
      pose(quack, { ...quackBase, visible: false }); pose(bucks, { ...bucksBase, visible: false }); brief.visible = false;
    }
    else if (i === 4) { // ── "Then Quack had an idea."
      const idea = pop(lt, 0.1, 0.35);
      const jump = seg(lt, 0.85, 1.4);
      const start = v3(PED.x + 0.55, SY, PED.z + 0.35), end = v3(PED.x, BBOT + 0.06, PED.z);
      const q = new THREE.Vector3().lerpVectors(start, end, ease(jump)); q.y += Math.sin(jump * Math.PI) * 0.55;
      const land = seg(lt, 1.4, 1.75);
      pose(quack, { pos: q, rotY: lerp(-0.9, 0, jump), squash: (lt < 0.85 ? 0.15 * seg(lt, 0.6, 0.85) : 0) + Math.sin(land * Math.PI) * 0.22 - Math.sin(jump * Math.PI) * 0.1, blink: blinkAt(t, 3), lookX: -0.2 * (1 - jump), eyeScale: 1 + 0.25 * idea * (1 - jump) });
      quack.root.scale.setScalar(lerp(1, 0.72, jump));
      bulb.visible = lt < 1.0; bulb.position.set(start.x, start.y + 0.85 + Math.sin(lt * 6) * 0.03, start.z); bulb.scale.setScalar(Math.max(0.001, idea * (1 - seg(lt, 0.85, 1.0)))); bulbLight.intensity = 3 * idea;
      const gasp = pop(lt, 1.6, 0.3);
      pose(pip, { pos: v3(PED.x - 0.75, SY, PED.z + 0.15), rotY: 1.2, eyeScale: 1 + 0.35 * gasp, mouth: 0.9 * gasp, armLz: 0.35 + 1.6 * gasp, armRz: 0.35 + 1.6 * gasp, blink: blinkAt(t, 1) });
      pud = 0.8; drops.userData.spray(t, v3(PED.x, BBOT, PED.z), v3(0, -1, 0.1), { spread: 0.6, speed: 1.4, life: 0.35, on: lt < 1.45 });
      pose(mo, { ...moBase, visible: false }); pose(bucks, { ...bucksBase, visible: false }); brief.visible = false;
      world.cam(v3(PED.x + 0.35, 0.95, PED.z + 2.4), v3(PED.x + 0.15, 0.75, PED.z), 40);
    }
    else if (i === 5) { // ── "Pip filled it with three seconds left!"
      quack.root.scale.setScalar(0.72);
      lvl = ease(seg(lt, 0.15, 1.85));
      pose(quack, { pos: v3(PED.x, BBOT + 0.06 + lvl * 0.12, PED.z), rotY: 0, sway: Math.sin(lt * 5) * 0.08, blink: blinkAt(t, 3) });
      const pump = Math.sin(lt * 22);
      const win = pop(lt, 1.9, 0.35);
      pose(pip, { pos: v3(PED.x + 0.55, SY, PED.z - 0.3), rotY: -1.1, armRx: lt < 1.9 ? -2.1 - pump * 0.4 : -0.3, armRz: lt < 1.9 ? 0.3 : 2.4 * win, armLz: lt < 1.9 ? 0.4 : 2.4 * win, hop: lt > 1.9 ? Math.abs(Math.sin(lt * 10)) * 0.15 : 0, mouth: lt > 1.9 ? 0.7 : 0.25, eyeScale: lt > 1.9 ? 1.25 : 1.1, blink: 0 });
      cup.visible = lt < 1.9; const hp = handPos(pip, "R"); cup.position.set(hp.x, hp.y, hp.z); cup.rotation.set(1.6 + pump * 0.4, -1.1, 0);
      drops2.userData.spray(t, v3(hp.x - 0.05, hp.y, hp.z), v3(-0.5, -0.6, 0.2), { spread: 0.25, speed: 1.2, life: 0.35, on: lt < 1.85 });
      pud = 0.8;
      pose(mo, { ...moBase, visible: false }); pose(bucks, { ...bucksBase, visible: false }); brief.visible = false;
      // orbit, then cut to the clock, then wide for confetti
      if (lt < 1.0) { const a = lerp(0.9, 0.2, lt); world.cam(v3(PED.x + Math.sin(a) * 1.9, 1.0, PED.z + Math.cos(a) * 1.9), v3(PED.x, 0.75, PED.z), 40); }
      else if (lt < 1.9) { const tp = clockFace.getWorldPosition(new THREE.Vector3()); world.cam(v3(tp.x - 0.9, tp.y - 0.3, tp.z + 3.4), tp, 38); world.shake(0.012 * seg(lt, 1.0, 1.9), t); }
      else { world.cam(v3(PED.x + 0.9, 1.45, PED.z + 3.6), v3(PED.x + 0.2, 0.95, PED.z), 42); }
    }
    else { // ── "Mr. Bucks handed over the money… to Quack."  Pip: "Wait, WHAT?!"
      quack.root.scale.setScalar(0.72); lvl = 1; pud = 0.8;
      const walk = seg(lt, 0, 1.0), give = ease(seg(lt, 1.0, 1.5));
      const bp = new THREE.Vector3().lerpVectors(v3(-0.85, SY, -0.35), v3(PED.x - 0.75, SY, PED.z - 0.1), ease(walk));
      pose(bucks, { pos: bp, rotY: lerp(0.9, 1.45, walk), walk: lt * 2, walkAmt: walk < 1 ? 1 : 0, lean: 0.35 * give * (1 - seg(lt, 2.3, 2.8)), armLx: -1.3 * give, armLz: 0.3, blink: blinkAt(t, 2), mouth: 0.2 * give });
      const hp = handPos(bucks, "L");
      const restOnRim = v3(PED.x, BTOP + 0.02, PED.z + 0.32);
      brief.position.copy(new THREE.Vector3().lerpVectors(v3(hp.x, hp.y - 0.15, hp.z + 0.1), restOnRim, give)); brief.rotation.set(0, lerp(0.4, 0, give), 0);
      pose(quack, { pos: v3(PED.x, BBOT + 0.18, PED.z), rotY: 0, sunglasses: lt > 1.2, squash: Math.sin(seg(lt, 1.5, 1.9) * Math.PI) * 0.15, blink: 0 });
      const shock = pop(lt, 2.62, 0.25);
      pose(pip, { pos: v3(PED.x + 0.85, SY, PED.z + 0.6), rotY: -0.9 + shock * 0.6, eyeScale: 1 + 0.55 * shock, mouth: Math.max(m("Pip"), 1.1 * shock), mouthSize: 1 + 0.3 * shock, armLz: 0.35 + 2.0 * shock, armRz: 0.35 + 2.0 * shock, blink: blinkAt(t, 1) * (1 - shock), hop: 0.1 * Math.sin(seg(lt, 2.62, 2.9) * Math.PI) });
      pose(mo, { ...moBase, pos: v3(-1.2, 0, 1.6), rotY: 0.4, tilt: 0, squash: Math.abs(Math.sin(lt * 14)) * 0.05 * seg(lt, 2.7, 3.0), mouth: 0.4 * seg(lt, 2.7, 3.0) * Math.abs(Math.sin(lt * 14)) });
      if (lt < 2.6) { const k = ease(seg(lt, 0, 2.6)); world.cam(v3(lerp(1.4, 1.0, k), lerp(1.5, 1.3, k), PED.z + lerp(4.0, 3.2, k)), v3(PED.x - 0.1, 0.95, PED.z), 40); }
      else { // punch-in on Pip's shocked face
        const z = ease(seg(lt, 2.6, 2.85)); const pp = pip.root.position;
        world.cam(v3(lerp(1.0, pp.x - 0.35, z), lerp(1.3, 0.9, z), lerp(PED.z + 3.2, pp.z + 1.7, z)), v3(lerp(PED.x - 0.1, pp.x, z), lerp(0.95, 0.72, z), lerp(PED.z, pp.z, z)), lerp(40, 36, z));
        world.shake(0.01 * (1 - seg(lt, 2.7, 3.2)), t);
      }
    }
    bucket.userData.setWater(lvl);
    puddle.visible = pud > 0.01; puddle.scale.setScalar(Math.max(0.01, pud));
  }
  const lerpV = E.lerpV;
  return { update, duration: END, sfx };
}
