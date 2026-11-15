// The Trap — cross the room, the floor falls behind you, Quack the trampoline, chocolate coins.
export const worldOpts = { bg: 0x0a0710 };

export function build(E, world, data) {
  const { THREE, v3, lerp, seg, ease, easeOut, easeIn, pop, clamp, pose, blinkAt, toy, place } = E;
  const { scene } = world;
  const S = data.timings.map((s) => s.start), END = data.timings.at(-1).start + data.timings.at(-1).len;
  const talk = E.talker(data); const sfx = []; const fx = (t, name, vol = 1) => sfx.push({ t: +t.toFixed(3), name, vol });
  scene.fog = new THREE.Fog(0x0a0710, 9, 26);

  // ── room ──────────────────────────────────────────────
  const stone = toy(0x3b3346, { rough: 0.85, coat: 0 }), trim = E.gold();
  const ROWS = 8, COLS = 3, T = 1.0; // tiles: row 0 at z=0, row 7 at z=-7
  [[-3.3, 0.3, 14], [3.3, 0.3, 14]].forEach(([x, w, d]) => scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(w, 16, d), stone), { position: v3(x, -3, -3.5), receiveShadow: true })));
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(7, 16, 0.3), stone), { position: v3(0, -3, -10.2) }));
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(7, 16, 0.3), stone), { position: v3(0, -3, 3.3) }));
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 14), stone), { position: v3(0, 5, -3.5) }));
  // doorway ledge + far platform
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(COLS, 0.3, 2.2), toy(0x5a4f66, { rough: 0.7 })), { position: v3(0, -0.15, 1.6), receiveShadow: true, castShadow: true }));
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(COLS, 0.3, 2.4), toy(0x5a4f66, { rough: 0.7 })), { position: v3(0, -0.15, -8.7), receiveShadow: true, castShadow: true }));
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(COLS + 0.6, 0.12, 0.12), trim), { position: v3(0, 0.02, -7.5) }));
  // door frame behind the start
  const doorFrame = new THREE.Group(); doorFrame.position.set(0, 0, 2.6); scene.add(doorFrame);
  [[-1.0, 1.4, 0.3, 2.8], [1.0, 1.4, 0.3, 2.8], [0, 2.85, 2.3, 0.3]].forEach(([x, y, w, h]) => doorFrame.add(place(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), trim), { position: v3(x, y, 0) })));
  // checkered tiles
  const tiles = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(T * 0.98, 0.18, T * 0.98), toy((r + c) % 2 ? 0x15151a : 0xf4f1ea, { rough: 0.2, coat: 1 }));
    m.castShadow = m.receiveShadow = true; m.userData = { r, c, home: v3((c - 1) * T, -0.09, -r * T), spin: v3(Math.sin(r * 7 + c) * 1.5, 0, Math.cos(r * 3 + c * 5) * 1.5) };
    scene.add(m); tiles.push(m);
  }
  // pit glow far below
  const pitGlow = new THREE.PointLight(0xff3d00, 6, 14); pitGlow.position.set(0, -9, -4); scene.add(pitGlow);
  scene.add(place(new THREE.Mesh(new THREE.PlaneGeometry(7, 14), new THREE.MeshBasicMaterial({ color: 0x2a0800 })), { position: v3(0, -12, -3.5), rotation: new THREE.Euler(-Math.PI / 2, 0, 0) }));
  // torches
  [[-3.12, -1.0], [3.12, -1.5], [3.12, -5.5], [-3.12, -6.5]].forEach(([x, z], k) => {
    const g = new THREE.Group(); g.position.set(x, 1.8, z); scene.add(g);
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.4, 8), toy(0x5c3a1e)), {}));
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 10), new THREE.MeshBasicMaterial({ color: 0xffa133 })); fl.position.y = 0.32; g.add(fl); g.userData.fl = fl;
    const l = new THREE.PointLight(0xff9a3d, 3.5, 6); l.position.set(x > 0 ? -0.3 : 0.3, 0.4, 0); g.add(l);
  });
  // Mr. Bucks' balcony on the left wall
  const BAL = v3(-2.6, 2.3, -3.2);
  const balcony = new THREE.Group(); balcony.position.copy(BAL); scene.add(balcony);
  balcony.add(place(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.6), toy(0x4a2a6b, { rough: 0.5 })), { castShadow: true, receiveShadow: true }));
  balcony.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.6), trim), { position: v3(0.68, 0.35, 0) }));
  for (let k = 0; k < 6; k++) balcony.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5), trim), { position: v3(0.68, 0.2, -0.7 + k * 0.28) }));
  const balLight = new THREE.PointLight(0xffd9a0, 5, 4); balLight.position.set(0.5, 1.8, 0.4); balcony.add(balLight);
  // the glass case of "gold" coins
  const CASE = v3(0, 0, -8.6);
  const caseG = new THREE.Group(); caseG.position.copy(CASE); scene.add(caseG);
  caseG.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.7), toy(0x2a1840, { rough: 0.5 })), { position: v3(0, 0.35, 0), castShadow: true }));
  caseG.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 0.74), trim), { position: v3(0, 0.71, 0) }));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.5, 0.66), new THREE.MeshPhysicalMaterial({ color: 0xcfefff, transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1 }));
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.74, -0.33); caseG.add(lidPivot); glass.position.set(0, 0.25, 0.33); lidPivot.add(glass);
  const coinGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.018, 20), coins = new THREE.InstancedMesh(coinGeo, E.gold(), 70);
  { const o = new THREE.Object3D(), R = E.rand(4); for (let k = 0; k < 70; k++) { const a = R() * 6.28, r = Math.sqrt(R()) * 0.3; o.position.set(Math.cos(a) * r, 0.76 + (0.3 - r) * 0.5 * R() + R() * 0.03, Math.sin(a) * r * 0.75); o.rotation.set(R() * 0.6, R() * 3, R() * 0.6); o.updateMatrix(); coins.setMatrixAt(k, o.matrix); } }
  caseG.add(coins);
  const caseLight = new THREE.SpotLight(0xffe6a0, 18, 6, 0.5, 0.5); caseLight.position.set(0, 3.5, -7.6); caseLight.target.position.copy(CASE); scene.add(caseLight, caseLight.target);
  // the coin in Pip's hand
  const coin = new THREE.Group(); scene.add(coin);
  const coinGold = new THREE.Mesh(coinGeo, E.gold()); coinGold.rotation.x = Math.PI / 2; coin.add(coinGold);
  const choco = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.02, 20, 1, false, 0.6, Math.PI * 2 - 1.2), toy(0x5a2e12, { rough: 0.6 })); choco.rotation.x = Math.PI / 2; coin.add(choco);
  const sweat = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), toy(0x8fd8ff, { rough: 0.05 })); sweat.scale.set(0.8, 1.3, 0.8); scene.add(sweat);

  // ── cast ──────────────────────────────────────────────
  const pip = E.makePip(), quack = E.makeQuack(), mo = E.makeMo(), bucks = E.makeBucks();
  [pip, quack, mo, bucks].forEach((c) => scene.add(c.root));
  const dust = E.makeDrops(200, 31); dust.material = toy(0x9c8c7a, { rough: 0.9 }); scene.add(dust);

  // when each row of tiles falls
  const STEP = S[1] + 0.45;                 // Pip steps onto row 1
  const JUMP = [S[3] + 0.25, S[3] + 1.05, S[3] + 1.85]; // row1→2, 2→3, 3→4
  const fallAt = [S[1] + 1.55, JUMP[0] + 0.35, JUMP[1] + 0.35, JUMP[2] + 0.35, 1e9, S[3] + 2.75, S[3] + 2.85, S[3] + 2.95];
  // Pip's z over time
  const rowZ = (r) => -r * T;
  function pipZ(t) {
    if (t < STEP - 0.3) return 0;
    if (t < STEP) return lerp(0, rowZ(1), ease(seg(t, STEP - 0.3, STEP)));
    for (let k = 0; k < 3; k++) if (t < JUMP[k] + 0.45) return t < JUMP[k] ? rowZ(k + 1) : lerp(rowZ(k + 1), rowZ(k + 2), ease(seg(t, JUMP[k], JUMP[k] + 0.45)));
    return rowZ(4);
  }
  const jumpH = (t) => { for (const j of JUMP) if (t >= j && t < j + 0.45) return Math.sin(seg(t, j, j + 0.45) * Math.PI) * 0.45; return 0; };

  fx(0, "sting", 0.5); fx(STEP, "step"); fx(fallAt[0], "crumble"); fx(fallAt[0] + 0.1, "rumble", 0.7);
  fx(S[2] + 1.2, "boing", 0.3);
  JUMP.forEach((j, k) => { fx(j, "boing", 0.6); fx(fallAt[k + 1], "crumble", 0.8); }); fx(S[3] + 2.75, "rumble");
  fx(S[4] + 0.2, "whoosh", 0.4);
  fx(S[5] + 0.3, "squeak"); fx(S[5] + 0.62, "boing"); fx(S[5] + 0.65, "squeak", 0.8); fx(S[5] + 0.7, "zoom", 0.5); fx(S[5] + 1.95, "step");
  fx(S[6] + 0.3, "click", 0.6); fx(S[6] + 0.95, "munch"); fx(S[6] + 1.2, "scratch", 0.6); fx(S[6] + 3.1, "munch"); fx(S[6] + 3.4, "munch");

  function update(t) {
    const { i, lt } = E.sceneOf(data, t);
    const shake = (a) => world.shake(a, t);
    // tiles
    tiles.forEach((m) => {
      const ft = t - fallAt[m.userData.r], h = m.userData.home;
      if (ft < 0) { m.position.copy(h); m.rotation.set(0, 0, 0); m.visible = true; if (ft > -0.25) { m.position.x += Math.sin(t * 90 + m.userData.c) * 0.015; } }
      else { m.position.set(h.x, h.y - 4.9 * ft * ft, h.z); m.rotation.set(m.userData.spin.x * ft, 0, m.userData.spin.z * ft); m.visible = ft < 2.2; }
    });
    scene.children.forEach((o) => o.userData.fl && (o.userData.fl.scale.y = 1 + Math.sin(t * 20 + o.position.x) * 0.15));
    dust.userData.spray(0, v3(0, -99, 0), v3(0, 1, 0), { on: false });
    sweat.visible = false; coin.visible = false; lidPivot.rotation.x = 0;
    pose(bucks, { pos: v3(BAL.x - 0.15, BAL.y + 0.1, BAL.z), rotY: 1.35, blink: blinkAt(t, 2), mouth: talk("Mr. Bucks", t), armRx: -0.4, armRz: 0.5 });
    pose(mo, { pos: v3(i === 0 ? -0.95 : 0, 0, 2.0), rotY: Math.PI * 0.0, blink: blinkAt(t, 4) * 0.5, armLx: -0.35, armRx: -0.35, armLz: -0.25, armRz: -0.25, mouth: talk("Mo", t) });
    mo.root.rotation.y = Math.PI; // facing into the room
    pose(quack, { visible: false });
    const z = pipZ(t);
    const pipBase = { pos: v3(0, 0, z), rotY: Math.PI, blink: blinkAt(t, 1), mouth: talk("Pip", t) };
    E.lightAt(world, v3(0, 0, -3.5));

    if (i === 0) { // ── Bucks: "Walk across this room, and the million dollars is yours!"
      const twirl = Math.sin(lt * 9) * 0.2;
      pose(bucks, { pos: v3(BAL.x - 0.15, BAL.y + 0.1, BAL.z), rotY: 1.3, blink: blinkAt(t, 2), mouth: talk("Mr. Bucks", t), armRx: lt < 1.9 ? -2.2 : -1.5, armRz: lt < 1.9 ? 1.0 + twirl : 0.9, armLx: lt > 1.9 ? -1.3 : 0, armLz: lt > 1.9 ? 1.2 : 0.5, lookY: lt > 1.9 ? 0.4 : 0 });
      pose(pip, { ...pipBase, lookY: lt > 2 ? 0 : -0.5, lookX: -0.1 });
      if (lt < 1.9) world.cam(v3(BAL.x + 1.6, BAL.y + 1.5, BAL.z + 2.2), v3(BAL.x - 0.1, BAL.y + 1.0, BAL.z), 40);
      else { const k = ease(seg(lt, 1.9, 4.16)); world.cam(v3(0.7, lerp(2.0, 1.7, k), lerp(2.6, 2.0, k)), v3(0, 0.5, -5.5), 44, 0, { raw: true }); }
    }
    else if (i === 1) { // ── "Pip took one step." "The tile behind him fell into a pit."
      const look = ease(seg(lt, 1.7, 2.1));
      pose(pip, { ...pipBase, walk: seg(t, STEP - 0.3, STEP) * 0.5, walkAmt: t < STEP ? 1 : 0, lookY: look * 2.2, eyeScale: 1 + 0.35 * look, mouth: 0.4 * look, blink: look > 0 ? 0 : blinkAt(t, 1) });
      if (lt > 1.4) dust.userData.spray(t, v3(0, -0.2, 0), v3(0, -0.6, 0), { spread: 2.5, speed: 1.2, life: 0.8, on: lt < 2.8 });
      const k = ease(seg(lt, 0, 3.76));
      world.cam(v3(lerp(2.6, 2.2, k), lerp(1.0, 1.25, k), lerp(0.6, 0.0, k)), v3(0, 0.15, -0.5), 44);
      if (lt > 1.45 && lt < 1.9) shake(0.02);
    }
    else if (i === 2) { // ── Mo: "Bad idea."  Pip: "I KNOW!"
      const cut = data.timings[2].lines[1].start - S[2] - 0.1;
      if (lt < cut) {
        pose(pip, { ...pipBase, lookY: 2.2 });
        world.cam(v3(0.7, 1.7, 0.4), v3(0, 1.35, 2.0), 40);
      } else {
        const wob = Math.sin(lt * 9) * 0.18;
        pose(pip, { ...pipBase, rotY: Math.PI, sway: wob, armLz: 1.2 + wob * 2, armRz: 1.2 - wob * 2, eyeScale: 1.2, mouth: Math.max(talk("Pip", t), 0.2) });
        sweat.visible = true; sweat.position.set(0.25, 0.95 - seg(lt, cut, cut + 1.2) * 0.3, z + 0.1);
        world.cam(v3(0.5, 1.0, z - 1.6), v3(0, 0.6, z), 40);
      }
    }
    else if (i === 3) { // ── leaping tile to tile
      const jh = jumpH(t);
      pose(pip, { ...pipBase, pos: v3(0, jh, z), lean: 0.3 * (jh > 0 ? 1 : 0), armLz: jh > 0 ? 2.2 : 0.6, armRz: jh > 0 ? 2.2 : 0.6, eyeScale: 1.2, mouth: 0.5, squash: jh > 0 ? -0.08 : 0.06 });
      dust.userData.spray(t, v3(0, -0.4, z + 1.0), v3(0, -0.4, 0), { spread: 2.2, speed: 1.4, life: 0.7 });
      world.cam(v3(2.6, 1.2, z + 0.6), v3(0, 0.35, z - 0.6), 46);
      if (lt > 2.75 && lt < 3.1) shake(0.02);
    }
    else if (i === 4) { // ── "One tile left. But it was way too far."
      const look = ease(seg(lt, 0.3, 0.8));
      pose(pip, { ...pipBase, lookX: 0.5 * look, eyeScale: 1.25, mouth: 0.25, armLz: 0.6, armRz: 0.6, sway: Math.sin(lt * 4) * 0.05 });
      sweat.visible = lt > 1.0; sweat.position.set(-0.25, 1.0 - seg(lt, 1.0, 2.5) * 0.35, z - 0.05);
      const k = ease(seg(lt, 0, 2.79));
      world.cam(v3(0.4, lerp(2.9, 2.3, k), z + lerp(2.4, 1.6, k)), v3(0, -0.4, z - 2.4), 46);
    }
    else if (i === 5) { // ── Quack the trampoline
      const qIn = ease(seg(lt, 0, 0.45));
      const bounce = Math.sin(seg(lt, 0.55, 0.75) * Math.PI);
      pose(quack, { pos: v3(lerp(0.9, 0, qIn), 0, z + 0.05), rotY: Math.PI + lerp(1.2, 0, qIn), squash: bounce * 0.45, blink: blinkAt(t, 3), sway: Math.sin(lt * 14) * 0.2 * (1 - seg(lt, 0.45, 0.5)) });
      const air = seg(lt, 0.7, 1.95); // slow-mo flight
      let pp;
      if (lt < 0.55) pp = v3(0, 0, z + 0.2);
      else if (lt < 0.7) pp = v3(0, 0.45 + Math.sin(seg(lt, 0.55, 0.7) * Math.PI) * 0.1 - bounce * 0.15, z + 0.05);
      else { pp = new THREE.Vector3().lerpVectors(v3(0, 0.45, z), v3(0, 0, CASE.z + 0.8), air); pp.y += Math.sin(air * Math.PI) * 1.6; }
      pose(pip, { ...pipBase, pos: pp, lean: lt > 0.7 && air < 1 ? 0.4 : 0, armLz: air > 0 && air < 1 ? 2.6 : 0.6, armRz: air > 0 && air < 1 ? 2.6 : 0.6, eyeScale: 1.3, mouth: air > 0 && air < 1 ? 0.7 : 0.2, squash: lt > 1.95 && lt < 2.2 ? Math.sin(seg(lt, 1.95, 2.2) * Math.PI) * 0.2 : 0 });
      if (lt < 0.75) world.cam(v3(1.6, 0.8, z + 1.4), v3(0, 0.35, z), 42);
      else world.cam(v3(2.8, lerp(1.4, 1.8, air), lerp(z + 0.4, CASE.z + 2.4, ease(air))), v3(0, pp.y * 0.7 + 0.3, pp.z), 48);
    }
    else { // ── "The coins… were chocolate."  Bucks: "I never said they were REAL!"
      const P = v3(0, 0, CASE.z + 0.75);
      lidPivot.rotation.x = -1.4 * ease(seg(lt, 0.15, 0.5));
      const bite = seg(lt, 0.85, 1.0);
      const happy = seg(lt, 2.9, 3.3);
      pose(pip, { pos: P, rotY: lt < 0.55 ? Math.PI : lt < 2.9 ? lerp(Math.PI, 0.35 + Math.PI * 2, ease(seg(lt, 0.55, 0.8))) : 0.2, blink: lt < 2.9 ? blinkAt(t, 1) : 0.65, armRx: -1.2 - 0.8 * ease(seg(lt, 0.5, 0.85)) + (lt > 2.9 ? Math.abs(Math.sin(lt * 8)) * 0.6 : 0), armRz: 0.5, mouth: lt < 1.1 ? 0.6 * bite : (lt > 2.9 ? 0.25 + 0.25 * Math.abs(Math.sin(lt * 10)) : 0), eyeScale: lt > 1.0 && lt < 2.9 ? 1.3 : 1, armLz: lt > 2.9 ? 0.8 : 0.4 });
      pip.root.updateMatrixWorld(true); const hp = pip.handR.getWorldPosition(new THREE.Vector3());
      coin.visible = lt > 0.45; coin.position.copy(hp); coin.lookAt(world.camera.position);
      coinGold.visible = lt < 1.0; choco.visible = lt >= 1.0;
      const laugh = lt > 1.55 && lt < 2.9;
      pose(bucks, { pos: v3(BAL.x - 0.15, BAL.y + 0.1, BAL.z), rotY: 1.2, blink: laugh ? 0.7 : blinkAt(t, 2), mouth: talk("Mr. Bucks", t), hop: laugh ? Math.abs(Math.sin(lt * 12)) * 0.08 : 0, lean: laugh ? -0.25 : 0, armLz: laugh ? 1.4 : 0.5, armRz: laugh ? 1.4 : 0.5 });
      if (lt < 1.55) world.cam(v3(0.9, 1.15, P.z + 1.6), v3(0, 0.7, P.z - 0.2), 40);
      else if (lt < 2.9) world.cam(v3(BAL.x + 2.2, BAL.y + 1.2, BAL.z - 1.2), v3(BAL.x, BAL.y + 1.0, BAL.z), 40);
      else world.cam(v3(0.5, 1.0, P.z + 1.5), v3(0, 0.6, P.z), 40);
    }
  }
  return { update, duration: END, sfx };
}
