// Pool Day Gone Wrong — water park, whirlpool, pipes, town fountain, splash landing.
export const worldOpts = { bg: 0x8fd6ff };

export function build(E, world, data) {
  const { THREE, v3, lerp, seg, ease, easeOut, easeIn, pop, clamp, pose, blinkAt, toy, place } = E;
  const { scene } = world;
  const S = data.timings.map((s) => s.start), END = data.timings.at(-1).start + data.timings.at(-1).len;
  const talk = E.talker(data); const sfx = []; const fx = (t, name, vol = 1) => sfx.push({ t: +t.toFixed(3), name, vol });
  const SKY = new THREE.Color(0x8fd6ff), UNDER = new THREE.Color(0x0d5f8a);

  // ── WATER PARK (origin) ───────────────────────────────
  const PW = 8, PL = 10, DEEP = 1.6;
  const gShape = new THREE.Shape(); gShape.absarc(0, 0, 60, 0, Math.PI * 2);
  const hole = new THREE.Path(); hole.moveTo(-PW / 2, -PL / 2); hole.lineTo(PW / 2, -PL / 2); hole.lineTo(PW / 2, PL / 2); hole.lineTo(-PW / 2, PL / 2); hole.lineTo(-PW / 2, -PL / 2); gShape.holes.push(hole);
  const grass = new THREE.Mesh(new THREE.ShapeGeometry(gShape, 48), toy(0x5cc96b, { rough: 0.9, coat: 0 })); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; grass.receiveShadow = true; scene.add(grass);
  const deckM = toy(0xf3e2c3, { rough: 0.7, coat: 0.1 });
  [[0, -(PL / 2 + 2), PW + 8, 4], [0, PL / 2 + 2, PW + 8, 4], [-(PW / 2 + 2), 0, 4, PL], [PW / 2 + 2, 0, 4, PL]].forEach(([x, z, w, d]) => scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), deckM), { position: v3(x, 0.0, z), receiveShadow: true })));
  const tileM = toy(0x7fd4f0, { rough: 0.3 });
  const floorP = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL), tileM); floorP.rotation.x = -Math.PI / 2; floorP.position.y = -DEEP; floorP.receiveShadow = true; scene.add(floorP);
  [[0, -PL / 2, PW, 0], [0, PL / 2, PW, Math.PI], [-PW / 2, 0, PL, Math.PI / 2], [PW / 2, 0, PL, -Math.PI / 2]].forEach(([x, z, w, r]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, DEEP + 0.1), tileM); m.position.set(x, -DEEP / 2, z); m.rotation.y = r; scene.add(m); });
  // drain + plug
  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), toy(0x222831)); drain.rotation.x = -Math.PI / 2; drain.position.y = -DEEP + 0.01; scene.add(drain);
  scene.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.05, 10, 32), toy(0xbfc3cc, { metal: 0.8 })), { position: v3(0, -DEEP + 0.02, 0), rotation: new THREE.Euler(Math.PI / 2, 0, 0) }));
  const plug = new THREE.Group(); scene.add(plug);
  plug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.18, 32), toy(0xe8302e)));
  plug.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 20), toy(0xe8302e)), { position: v3(0, 0.16, 0) }));
  // water surface (shared geometry for water + swirl overlay)
  const wGeo = new THREE.PlaneGeometry(PW, PL, 80, 100); const wBase = wGeo.attributes.position.array.slice();
  const water = new THREE.Mesh(wGeo, toy(0x2bb5f0, { rough: 0.05, coat: 1, opacity: 0.78, side: THREE.DoubleSide, emissive: 0x0a5a8a, ei: 0.35 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.05; scene.add(water);
  const swirlTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 512; const c = cv.getContext("2d");
    c.translate(256, 256); c.strokeStyle = "rgba(255,255,255,.9)"; c.lineCap = "round";
    for (let arm = 0; arm < 6; arm++) { c.beginPath(); for (let k = 0; k < 120; k++) { const r = k * 2.1, a = arm * Math.PI / 3 + k * 0.06; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.lineWidth = 7; c.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.center.set(0.5, 0.5); return t; })();
  const swirl = new THREE.Mesh(wGeo, new THREE.MeshBasicMaterial({ map: swirlTex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  swirl.rotation.x = -Math.PI / 2; swirl.position.y = -0.04; scene.add(swirl);
  // repeat the swirl texture only over the middle of the pool
  { const uv = wGeo.attributes.uv; for (let k = 0; k < uv.count; k++) { const x = (uv.getX(k) - 0.5) * PW / 6 + 0.5, y = (uv.getY(k) - 0.5) * PL / 6 + 0.5; uv.setXY(k, x, y); } swirlTex.wrapS = swirlTex.wrapT = THREE.ClampToEdgeWrapping; }
  function waterShape(t, vortex) {
    const p = wGeo.attributes.position.array;
    for (let k = 0; k < p.length; k += 3) {
      const x = wBase[k], y = wBase[k + 1], r2 = x * x + y * y;
      p[k + 2] = Math.sin(x * 2.2 + t * 2) * 0.04 + Math.cos(y * 1.8 - t * 1.6) * 0.03 - vortex * 1.4 * Math.exp(-r2 / 3.2);
    }
    wGeo.attributes.position.needsUpdate = true; wGeo.computeVertexNormals();
  }
  // palms, umbrellas, loungers
  [[-7, -6], [7, -7], [-7.5, 4], [8, 5], [-3, -9], [4, -9.5]].forEach(([x, z], k) => { const p = E.makePalm(k + 2); p.position.set(x, 0, z); p.scale.setScalar(1.3); scene.add(p); });
  [[-6.5, -1, 0xff5a5a], [6.6, -2.5, 0x45d6e5]].forEach(([x, z, c]) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4), toy(0xffffff)), { position: v3(0, 1.2, 0) }));
    g.add(place(new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 12), toy(c)), { position: v3(0, 2.5, 0), castShadow: true })); });
  const LOUNGE = v3(5.3, 0.1, 1.2);
  const lounger = new THREE.Group(); lounger.position.copy(LOUNGE); scene.add(lounger);
  lounger.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 2.0), toy(0xffffff)), { position: v3(0, 0.35, 0.1), castShadow: true }));
  lounger.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 1.9), toy(0x45a3ff)), { position: v3(0, 0.45, 0.1) }));
  lounger.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.12), toy(0x45a3ff)), { position: v3(0, 0.8, -0.85), rotation: new THREE.Euler(-0.5, 0, 0), castShadow: true }));
  [[-0.35, -0.8], [0.35, -0.8], [-0.35, 1], [0.35, 1]].forEach(([x, z]) => lounger.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35), toy(0xdddddd)), { position: v3(x, 0.17, z) })));
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff4b0 })); sun.position.set(-20, 26, -45); scene.add(sun);

  // ── PIPES (x = 200) ───────────────────────────────────
  const PIPE0 = v3(200, 0, 0);
  const curve = new THREE.CatmullRomCurve3([0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => v3(PIPE0.x + Math.sin(k * 1.1) * 3, -k * 1.6, PIPE0.z - k * 5 + Math.cos(k * 0.9) * 2)));
  const ringTex = (() => { const cv = document.createElement("canvas"); cv.width = 64; cv.height = 256; const c = cv.getContext("2d");
    c.fillStyle = "#0b3d66"; c.fillRect(0, 0, 64, 256); c.fillStyle = "#45e6ff"; c.fillRect(0, 0, 64, 26); c.fillStyle = "#1c6fa8"; c.fillRect(0, 120, 64, 8);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 30); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 300, 1.15, 24, false), new THREE.MeshStandardMaterial({ map: ringTex, emissive: 0xffffff, emissiveMap: ringTex, emissiveIntensity: 0.8, side: THREE.BackSide, roughness: 0.3 }));
  tube.material.map.rotation = Math.PI / 2; scene.add(tube);
  const tubeWater = new THREE.Mesh(new THREE.TubeGeometry(curve, 300, 1.0, 24, false), new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false })); scene.add(tubeWater);
  const pipeLight = new THREE.PointLight(0x7fe8ff, 25, 8); scene.add(pipeLight);

  // ── TOWN (x = -200) ───────────────────────────────────
  const TOWN = v3(-200, 0, 0);
  scene.add(place(new THREE.Mesh(new THREE.CircleGeometry(40, 48), toy(0xd8c7a8, { rough: 0.85, coat: 0 })), { position: v3(TOWN.x, 0, TOWN.z), rotation: new THREE.Euler(-Math.PI / 2, 0, 0), receiveShadow: true }));
  [0xffb3a7, 0xa7d8ff, 0xfff0a7, 0xc9b3ff, 0xb3ffcf, 0xffd0a7, 0xa7fff0, 0xffa7d8].forEach((c, k) => { const h = E.makeHouse(c, k + 3); const a = (k / 8) * Math.PI * 2; h.position.set(TOWN.x + Math.sin(a) * 11, 0, TOWN.z + Math.cos(a) * 11); h.rotation.y = a + Math.PI; scene.add(h); });
  const fountain = new THREE.Group(); fountain.position.copy(TOWN); scene.add(fountain);
  const stone = toy(0xbfb8ad, { rough: 0.8, coat: 0 });
  fountain.add(place(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.7, 40), stone), { position: v3(0, 0.35, 0), castShadow: true, receiveShadow: true }));
  fountain.add(place(new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.05, 40), toy(0x35b8f0, { rough: 0.05, opacity: 0.85 })), { position: v3(0, 0.62, 0) }));
  fountain.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.8, 20), stone), { position: v3(0, 1.4, 0), castShadow: true }));
  fountain.add(place(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.4, 0.4, 30), stone), { position: v3(0, 2.4, 0), castShadow: true }));
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8f6ff, transparent: true, opacity: 0.75, roughness: 0.1, emissive: 0x6fbfff, emissiveIntensity: 0.3 }));
  scene.add(jet);
  const people = [0xff8ad8, 0x7ee08a, 0x7fb2ff, 0xffd23a, 0xc58aff, 0xff9a3d, 0x45d6e5].map((c, k) => { const b = E.makeBean(c, k + 1); const a = (k / 7) * Math.PI * 2 + 0.3; b.root.position.set(TOWN.x + Math.sin(a) * 5, 0, TOWN.z + Math.cos(a) * 5); b.root.rotation.y = a + Math.PI; scene.add(b.root); return b; });

  // ── cast ──────────────────────────────────────────────
  const raft = new THREE.Group(); scene.add(raft);
  const float = E.makeQuack({ mask: false }); float.root.scale.setScalar(3.4); raft.add(float.root);
  const pip = E.makePip(), quack = E.makeQuack(), mo = E.makeMo();
  raft.add(pip.root); raft.add(quack.root); scene.add(mo.root);
  const juice = new THREE.Group(); juice.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.06), toy(0xff9a3d))); juice.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12), toy(0xffffff)), { position: v3(0.02, 0.1, 0) })); scene.add(juice);
  const drops = E.makeDrops(300, 4), splash = E.makeDrops(260, 8), bubbles = E.makeDrops(140, 12); scene.add(drops, splash, bubbles);
  const off = (d) => d.userData.spray(0, v3(0, -99, 0), v3(0, 1, 0), { on: false });

  // raft (float + Pip + Quack) local poses
  function ride(t, { panic = 0, wet = 0 } = {}) {
    pose(float, { pos: v3(0, -0.35, 0), blink: blinkAt(t, 5) });
    pose(pip, { pos: v3(0, 1.1, -0.45), rotY: 0, blink: panic ? 0 : blinkAt(t, 1), sunglasses: !panic && !wet, mouth: Math.max(talk("Pip", t), panic * 0.6), eyeScale: 1 + panic * 0.35 - wet * 0.15, armLz: panic ? 2.4 + Math.sin(t * 20) * 0.3 : 0.6, armRz: panic ? 2.4 + Math.cos(t * 20) * 0.3 : 1.6, armRx: panic ? 0 : -1.4, lookX: panic ? -0.1 : 0.15 });
    pip.root.rotation.x = panic ? -0.15 : -0.85;
    pose(quack, { pos: v3(0.55, 0.95, -0.1), rotY: -0.4, blink: blinkAt(t, 3), eyeScale: 1 + panic * 0.3, hop: panic ? Math.abs(Math.sin(t * 16)) * 0.05 : 0 });
  }

  // sound cues
  fx(0.1, "pop", 0.5); fx(S[1] + 0.3, "pop"); fx(S[1] + 0.35, "splash", 0.5); fx(S[1] + 0.6, "bubbles", 0.8);
  fx(S[2] + 0.1, "whoosh", 0.4); fx(S[3] + 0.1, "whoosh"); fx(S[3] + 1.2, "zoom", 0.7);
  [0.1, 0.8, 1.5, 2.1].forEach((d) => fx(S[4] + d, "whoosh", 0.8)); fx(S[4] + 0.4, "splash", 0.5); fx(S[4] + 1.6, "splash", 0.5);
  fx(S[5] + 0.3, "splash"); fx(S[5] + 0.32, "whoosh"); fx(S[5] + 0.9, "cheer", 0.35);
  fx(S[6] - 0.1, "whistle"); fx(S[6] + 0.6, "splash", 1.2); fx(S[6] + 0.62, "boing", 0.4); fx(S[6] + 1.95, "pop", 0.4);

  function update(t) {
    const { i, lt } = E.sceneOf(data, t);
    let vortex = 0; scene.fog = null; scene.background = SKY;
    off(drops); off(splash); off(bubbles); jet.visible = false; juice.visible = false;
    raft.scale.setScalar(1); raft.rotation.set(0, 0, 0); raft.visible = true;
    plug.position.set(0, -DEEP + 0.09, 0); plug.rotation.set(0, 0, 0);
    pose(mo, { pos: v3(LOUNGE.x, LOUNGE.y + 0.55, LOUNGE.z + 0.2), headphones: true, blink: 1, armLx: -0.5, armRx: -0.5, mouth: talk("Mo", t), lookX: 0.3 });
    mo.root.rotation.x = -1.15;
    people.forEach((p) => { p.body.rotation.x = 0; p.body.position.y = 0; });
    E.lightAt(world, v3(0, 0, 0));

    if (i === 0) { // ── relaxing on the giant duck
      raft.position.set(-0.4, 0, 0.6); raft.rotation.y = 0.5 + Math.sin(t * 0.8) * 0.06; raft.position.y = Math.sin(t * 1.6) * 0.04;
      ride(t);
      juice.visible = true; pip.root.updateMatrixWorld(true); const hp = pip.handR.getWorldPosition(new THREE.Vector3()); juice.position.copy(hp); juice.rotation.set(0.3, 0.5, 0.4);
      const k = ease(seg(lt, 0, 2.6));
      world.cam(v3(lerp(4.5, 3.2, k), lerp(3.2, 2.4, k), lerp(7.5, 5.6, k)), v3(-0.3, 1.0, 0.4), 40);
    }
    else if (i === 1) { // ── underwater: the plug pops out
      scene.fog = new THREE.Fog(UNDER, 1, 9); scene.background = UNDER;
      const p = seg(lt, 0.3, 1.4);
      plug.position.set(0, -DEEP + 0.09 + easeOut(p) * 1.2, 0); plug.rotation.set(p * 2.5, 0, p * 1.2);
      vortex = 0.15 * seg(lt, 0.6, 2.6);
      bubbles.userData.spray(t, v3(0, -DEEP + 0.05, 0), v3(0, 1, 0), { spread: 0.5, speed: 1.2, life: 1.2, gravity: -1.5, on: lt > 0.3 });
      raft.position.set(-0.4, 0, 0.6); ride(t);
      world.cam(v3(0.9, -0.95, 2.3), v3(0, -DEEP + 0.35 + p * 0.4, 0), 42);
      if (lt > 0.3 && lt < 0.55) world.shake(0.03, t);
    }
    else if (i === 2) { // ── "Help! Mo, help me!" / "Mo was busy."
      vortex = lerp(0.2, 0.45, seg(lt, 0, 2.6));
      const cut = data.timings[2].lines[1].start - S[2] - 0.1;
      const a = 0.5 + t * 1.6;
      raft.position.set(Math.sin(a) * 1.6, -vortex * 0.5, Math.cos(a) * 1.6); raft.rotation.y = a + 1.2; raft.rotation.z = 0.12;
      ride(t, { panic: 1 });
      if (lt < cut) { world.cam(v3(raft.position.x * 0.6 + 2.0, 2.4, raft.position.z * 0.6 + 4.6), v3(raft.position.x, 1.0, raft.position.z), 40); }
      else { world.cam(v3(LOUNGE.x - 1.2, 1.5, LOUNGE.z + 3.0), v3(LOUNGE.x, 0.8, LOUNGE.z), 38); }
    }
    else if (i === 3) { // ── sucked down the drain (top-down)
      vortex = lerp(0.5, 1, seg(lt, 0, 1.2));
      const k = easeIn(seg(lt, 0, 2.3)), r = lerp(1.7, 0, k), a = 0.5 + S[3] * 1.6 + lt * lerp(2, 7, k);
      raft.position.set(Math.sin(a) * r, -vortex * 0.5 - k * 2.2, Math.cos(a) * r); raft.rotation.y = a * 1.3; raft.rotation.z = 0.25 * k;
      raft.scale.setScalar(Math.max(0.01, 1 - seg(lt, 1.6, 2.4)));
      ride(t, { panic: 1 });
      world.cam(v3(0.4, 9.5, 2.6), v3(0, -0.5, 0), 40, lt * 0.6);
      drops.userData.spray(t, v3(raft.position.x, 0.2, raft.position.z), v3(0, 1, 0), { spread: 1.4, speed: 2, life: 0.5, on: lt < 2 });
    }
    else if (i === 4) { // ── through the pipes
      E.lightAt(world, PIPE0); scene.background = new THREE.Color(0x02101e);
      const u = clamp(0.06 + lt / 2.6 * 0.8, 0, 0.98);
      const pos = curve.getPointAt(u), ahead = curve.getPointAt(Math.min(0.999, u + 0.02)), tan = curve.getTangentAt(u);
      raft.position.copy(pos).add(v3(0, -0.55, 0)); raft.lookAt(ahead.x, raft.position.y, ahead.z); raft.rotateY(Math.PI); raft.rotateY(Math.PI); raft.scale.setScalar(0.32); raft.rotation.z += Math.sin(lt * 5) * 0.25;
      ride(t, { panic: 1 });
      const behind = curve.getPointAt(Math.max(0, u - 0.035));
      world.cam(behind.clone().add(v3(0, 0.15, 0)), pos.clone().add(v3(0, -0.25, 0)), 55, Math.sin(lt * 4) * 0.15);
      pipeLight.position.copy(pos);
      drops.userData.spray(t, raft.position.clone().add(v3(0, 0.05, 0)), v3(-tan.x, 0.6, -tan.z), { spread: 1.0, speed: 1.6, life: 0.4 });
    }
    else if (i === 5) { // ── shot out of the town fountain
      E.lightAt(world, TOWN);
      const blast = seg(lt, 0.3, 2.4);
      const h = 2.6 + easeOut(blast) * 13;
      jet.visible = lt > 0.25; const jh = Math.max(0.01, h - 2.6); jet.scale.set(1, jh, 1); jet.position.set(TOWN.x, 2.6 + jh / 2, TOWN.z);
      raft.position.set(TOWN.x, h + 0.2, TOWN.z); raft.rotation.y = lt * 4; raft.rotation.x = Math.sin(lt * 3) * 0.3; raft.scale.setScalar(0.75);
      raft.visible = lt > 0.25;
      ride(t, { panic: 1 });
      people.forEach((p, k) => { p.body.rotation.x = -0.45 * seg(lt, 0.5 + k * 0.05, 0.8 + k * 0.05); p.body.position.y = Math.abs(Math.sin(lt * 10 + k)) * 0.15 * seg(lt, 0.6, 0.9); });
      splash.userData.spray(t, v3(TOWN.x, 2.7, TOWN.z), v3(0, 1, 0), { spread: 1.6, speed: 6, life: 0.9, on: lt > 0.25 });
      world.cam(v3(TOWN.x + 4.5, 1.1, TOWN.z + 9.5), v3(TOWN.x, lerp(3, Math.min(h, 11), seg(lt, 0.3, 1.8)), TOWN.z), 46);
    }
    else { // ── lands back in the pool; Mo: "Oh, you're back. Did I miss anything?"
      const LAND = v3(3.0, 0, 1.4);
      const fall = seg(lt, 0, 0.6);
      raft.position.set(LAND.x, lerp(12, 0, easeIn(fall)), LAND.z); raft.rotation.y = -1.57 + (1 - fall) * 3;
      const land = seg(lt, 0.6, 1.0);
      raft.position.y += -Math.sin(land * Math.PI) * 0.4;
      ride(t, { wet: lt > 0.6 ? 1 : 0 });
      pip.root.rotation.x = -0.2; pose(pip, { pos: v3(0, 1.1, -0.45), rotY: 2.3, blink: 0, eyeScale: 0.85, mouth: 0, armLz: 0.2, armRz: 0.2, lookY: 0.4 });
      splash.userData.spray(t, v3(LAND.x, 0.1, LAND.z), v3(0, 1, 0), { spread: 1.8, speed: 5, life: 0.8, on: lt > 0.6 && lt < 1.5 });
      drops.userData.spray(t, v3(LAND.x - 0.1, 1.9, LAND.z - 0.5), v3(0, -1, 0), { spread: 1.2, speed: 0.4, life: 0.6, on: lt > 1.0 });
      const lift = ease(seg(lt, 1.75, 2.0));
      pose(mo, { pos: v3(LOUNGE.x, LOUNGE.y + 0.55, LOUNGE.z + 0.2), headphones: true, liftPhone: lift, blink: lift > 0.5 ? blinkAt(t, 4) * 0.5 : 1, armLx: -0.5, armRx: -0.5 - lift * 1.6, armRz: 0.12 + lift * 0.6, mouth: talk("Mo", t), lookY: -0.5 * lift, lookX: 0.3 });
      mo.root.rotation.x = -1.15;
      const k = ease(seg(lt, 1.6, 2.2));
      world.cam(v3(lerp(5.5, 4.6, k), lerp(2.4, 1.9, k), lerp(6.8, 5.4, k)), v3(lerp(3.6, 4.3, k), 0.9, 1.2), 42);
      if (lt > 0.6 && lt < 0.9) world.shake(0.04, t);
    }
    waterShape(t, vortex);
    swirl.material.opacity = clamp(vortex * 1.2, 0, 0.8); swirlTex.rotation = -t * (1 + vortex * 5);
    if (i === 4) { tube.visible = true; }
  }
  return { update, duration: END, sfx };
}
