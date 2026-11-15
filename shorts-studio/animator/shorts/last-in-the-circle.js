// Last One In The Circle — pizza, a thunderstorm, a goose, a sleepy Pip, and Granny wins.
export const worldOpts = { bg: 0x9fd8ff };

export function build(E, world, data) {
  const { THREE, v3, lerp, seg, ease, easeOut, easeIn, pop, clamp, pose, blinkAt, toy, place } = E;
  const { scene } = world;
  const S = data.timings.map((s) => s.start), END = data.timings.at(-1).start + data.timings.at(-1).len;
  const talk = E.talker(data); const sfx = []; const fx = (t, name, vol = 1) => sfx.push({ t: +t.toFixed(3), name, vol });
  const DAY = new THREE.Color(0x9fd8ff), STORM = new THREE.Color(0x3a4252), NIGHT = new THREE.Color(0x0b1030), DAWN = new THREE.Color(0xffb38a);

  // ── field ─────────────────────────────────────────────
  const grassM = toy(0x5cc96b, { rough: 0.9, coat: 0 });
  scene.add(place(new THREE.Mesh(new THREE.CircleGeometry(60, 64), grassM), { rotation: new THREE.Euler(-Math.PI / 2, 0, 0), receiveShadow: true }));
  const R0 = 1.6; // circle radius
  const ring = new THREE.Mesh(new THREE.RingGeometry(R0 - 0.06, R0 + 0.06, 96), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  // hills + trees + clouds
  [[-14, -22, 9, 0x4fb85e], [10, -26, 12, 0x46ad55], [24, -18, 8, 0x55c064]].forEach(([x, z, r, c]) => scene.add(place(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), toy(c, { rough: 0.9, coat: 0 })), { position: v3(x, -r * 0.55, z) })));
  const treeAt = (x, z, s) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 10), toy(0x8a5a33, { rough: 0.8 })), { position: v3(0, 0.6, 0), castShadow: true }));
    g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), toy(0x3fae5a, { rough: 0.8 })), { position: v3(0, 1.7, 0), castShadow: true })); };
  [[-6, -6, 1.3], [7, -7, 1.6], [-9, 2, 1.2], [9, 1, 1.4], [-3, -10, 1.8], [3, -12, 2]].forEach(([x, z, s]) => treeAt(x, z, s));
  const clouds = new THREE.Group(); scene.add(clouds);
  const cloudM = toy(0xffffff, { rough: 0.9, coat: 0 });
  [[-8, 9, -16], [6, 10, -18], [14, 8, -12], [-15, 7, -10]].forEach(([x, y, z]) => { const c = new THREE.Group(); c.position.set(x, y, z); clouds.add(c); [[0, 0, 1.4], [1.3, -0.2, 1.0], [-1.3, -0.2, 1.1], [0.5, 0.5, 0.9]].forEach(([a, b, r]) => c.add(place(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), cloudM), { position: v3(a, b, 0) }))); });
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, k) => { const R = E.rand(k + 1); return k % 3 === 1 ? 6 + R() * 25 : (R() - 0.5) * 80; }).map((v, k) => (k % 3 === 2 ? -Math.abs(v) - 12 : v)), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
  scene.add(stars);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d6 })); moon.position.set(8, 13, -30); scene.add(moon);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe08a })); scene.add(sun);
  // rain
  const RAIN = 700, rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.35, 0.012), new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.6 }), RAIN); rain.frustumCulled = false; scene.add(rain);
  const RR = E.rand(77), RP = Array.from({ length: RAIN }, () => [(RR() - 0.5) * 12, RR() * 8, (RR() - 0.5) * 10 + 1]);
  const flash = new THREE.AmbientLight(0xdfe8ff, 0); scene.add(flash);
  const nightLight = new THREE.PointLight(0xfff0c0, 0, 6); nightLight.position.set(0.3, 2.2, 1.5); scene.add(nightLight);

  // ── props ─────────────────────────────────────────────
  const pizza = new THREE.Group(); scene.add(pizza);
  pizza.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 32), toy(0xf2b45a, { rough: 0.6 })), {}));
  pizza.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.045, 32), toy(0xe8452e, { rough: 0.5 })), { position: v3(0, 0.005, 0) }));
  [[0.1, 0.08], [-0.12, 0.05], [0.02, -0.13], [-0.05, 0.15], [0.15, -0.08]].forEach(([x, z]) => pizza.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), toy(0xb3261e)), { position: v3(x, 0.01, z) })));
  const steam = E.makeDrops(60, 3); steam.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }); scene.add(steam);
  const umbrella = new THREE.Group(); scene.add(umbrella);
  umbrella.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.22, 12), toy(0xff5ab8)), { position: v3(0, 0.55, 0) }));
  umbrella.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6), toy(0x333333)), { position: v3(0, 0.25, 0) }));
  const bigUmb = new THREE.Group(); scene.add(bigUmb);
  bigUmb.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.3, 14), toy(0x2f7df6)), { position: v3(0, 1.6, 0) }));
  bigUmb.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), toy(0x333333)), { position: v3(0, 0.9, 0) }));
  const tea = new THREE.Group(); scene.add(tea);
  tea.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.07, 14), toy(0xffffff)), {}));
  tea.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 12), toy(0xffffff)), { position: v3(0.05, 0, 0), rotation: new THREE.Euler(0, 0, Math.PI / 2) }));
  const brief = E.makeBriefcase(); brief.scale.setScalar(0.7); scene.add(brief);
  const fireworks = [E.makeConfetti(220, 51, [0xffd23a, 0xff4f8a, 0x45d6e5]), E.makeConfetti(220, 52, [0x7ee08a, 0xffffff, 0xff9a3d])]; fireworks.forEach((f) => scene.add(f));
  // the goose
  const goose = new THREE.Group(); scene.add(goose);
  const white = toy(0xf8f8f8, { rough: 0.6 });
  const gBody = place(new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), white), { position: v3(0, 0.4, 0), castShadow: true }); gBody.scale.set(0.8, 0.75, 1.2); goose.add(gBody);
  const neck = place(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 6, 10), white), { position: v3(0, 0.72, 0.25) }); neck.rotation.x = 0.35; goose.add(neck);
  const gHead = new THREE.Group(); gHead.position.set(0, 0.98, 0.34); goose.add(gHead);
  gHead.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), white), {}));
  const gBeak = place(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 10), toy(0xff8a1a)), { position: v3(0, -0.01, 0.13) }); gBeak.rotation.x = Math.PI / 2; gHead.add(gBeak);
  [-1, 1].forEach((k) => gHead.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), toy(0x111111, { rough: 0.1 })), { position: v3(k * 0.06, 0.03, 0.07) })));
  [-0.1, 0.1].forEach((x) => goose.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), toy(0xff8a1a)), { position: v3(x, 0.1, 0) })));
  const wings = [-1, 1].map((k) => { const w = new THREE.Group(); w.position.set(k * 0.22, 0.48, 0); goose.add(w); const m = place(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), white), { position: v3(k * 0.12, 0, -0.05) }); m.scale.set(0.9, 0.2, 1.1); w.add(m); return w; });
  const zzz = [0, 1, 2].map((k) => { const p = E.textPanel(0.25, 0.25, (ctx, w, h) => { ctx.fillStyle = "#ffffff"; ctx.font = `900 ${h * 0.8}px Montserrat, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 10; ctx.strokeStyle = "#1a1a40"; ctx.strokeText("Z", w / 2, h / 2); ctx.fillText("Z", w / 2, h / 2); }, { px: 128, transparent: true, glow: 1 }); scene.add(p); return p; });

  // ── cast ──────────────────────────────────────────────
  const pip = E.makePip(), mo = E.makeMo(), quack = E.makeQuack(), granny = E.makeGranny(), bucks = E.makeBucks();
  [pip, mo, quack, granny, bucks].forEach((c) => scene.add(c.root));
  const P = { pip: v3(0.45, 0, 0.35), mo: v3(-0.7, 0, 0.1), quack: v3(0.0, 0, 0.8), granny: v3(-0.15, 0, -0.65), bucks: v3(1.7, 0, 1.6) };

  fx(0.1, "sting", 0.5); fx(S[1] + 0.1, "pop", 0.5); fx(S[1] + 3.0, "step", 0.6); fx(S[1] + 3.3, "munch");
  fx(S[2] + 0.2, "thunder"); fx(S[2] + 1.6, "thunder", 0.7);
  fx(S[3] + 1.0, "honk"); fx(S[3] + 1.5, "honk"); fx(S[3] + 2.1, "squeak"); fx(S[3] + 2.3, "honk"); fx(S[3] + 2.6, "squeak", 0.8);
  fx(S[4] + 0.6, "snore", 0.4);
  fx(S[5] + 0.2, "snore", 0.6); fx(S[5] + 1.95, "ding");
  fx(S[6] + 0.1, "sting", 0.6); fx(S[6] + 1.2, "cash", 0.6); fx(S[6] + 2.7, "rocket", 0.8); fx(S[6] + 2.9, "fireworks"); fx(S[6] + 3.3, "fireworks", 0.8); fx(S[6] + 3.0, "cheer", 0.4);

  function update(t) {
    const { i, lt } = E.sceneOf(data, t);
    // sky / time of day
    let sky = DAY, keyI = 2.4;
    if (i === 2) { sky = STORM; keyI = 0.6; }
    if (i === 4 || i === 5) { sky = NIGHT; keyI = 0.25; }
    if (i === 6) { sky = new THREE.Color().lerpColors(NIGHT, DAWN, seg(lt, 0, 1.0)); keyI = lerp(0.3, 2.0, seg(lt, 0, 1.0)); }
    scene.background = sky; world.key.intensity = keyI;
    const hemi = scene.children.find((o) => o.isHemisphereLight); hemi.intensity = i === 2 ? 0.45 : (i === 4 || i === 5) ? 0.25 : i === 6 ? lerp(0.3, 0.9, seg(lt, 0, 1)) : 0.9;
    stars.visible = i === 4 || i === 5 || (i === 6 && lt < 0.8); moon.visible = stars.visible; clouds.visible = i !== 4 && i !== 5;
    sun.visible = i === 6; sun.position.set(-10, lerp(-2, 6, seg(lt, 0, 3)), -35);
    clouds.children.forEach((c) => c.children.forEach((m) => (m.material = i === 2 ? toy(0x5b6273, { rough: 0.9, coat: 0 }) : cloudM)));
    nightLight.intensity = i === 4 || i === 5 ? 7 : 0;
    const strike = i === 2 && ((lt > 0.2 && lt < 0.32) || (lt > 1.6 && lt < 1.7));
    flash.intensity = strike ? 4 : 0;
    rain.visible = i === 2;
    if (rain.visible) { const o = new THREE.Object3D(); RP.forEach(([x, y, z], k) => { o.position.set(x, 8 - ((y + t * 14) % 8), z); o.updateMatrix(); rain.setMatrixAt(k, o.matrix); }); rain.instanceMatrix.needsUpdate = true; }
    pizza.visible = false; umbrella.visible = false; bigUmb.visible = false; tea.visible = false; brief.visible = false; goose.visible = false; zzz.forEach((z) => (z.visible = false));
    steam.userData.spray(0, v3(0, -99, 0), v3(0, 1, 0), { on: false });
    fireworks[0].userData.at(t - (S[6] + 2.9), v3(-1.5, 4.5, -2)); fireworks[1].userData.at(t - (S[6] + 3.3), v3(1.8, 5, -2.5));
    E.lightAt(world, v3(0, 0, 0));

    const drawAmt = i === 0 ? ease(seg(lt, 0, 2.0)) : 1;
    if (ring.userData.d !== drawAmt) { ring.geometry.dispose(); ring.geometry = new THREE.RingGeometry(R0 - 0.06, R0 + 0.06, 96, 1, 0, Math.max(0.01, drawAmt * Math.PI * 2)); ring.userData.d = drawAmt; }
    // defaults: everyone standing in the circle
    pose(pip, { pos: P.pip, rotY: -0.2, blink: blinkAt(t, 1), mouth: talk("Pip", t) });
    pose(mo, { pos: P.mo, rotY: 0.3, blink: blinkAt(t, 4) * 0.5, armLx: -0.35, armRx: -0.35, armLz: -0.25, armRz: -0.25 });
    pose(quack, { pos: P.quack, rotY: 0, blink: blinkAt(t, 3) });
    pose(granny, { pos: P.granny, rotY: 0.2, t, flame: 0, blink: blinkAt(t, 6), mouth: talk("Granny Volt", t) });
    pose(bucks, { pos: P.bucks, rotY: -0.8, blink: blinkAt(t, 2), mouth: talk("Mr. Bucks", t), visible: i <= 1 });
    const out = (c) => pose(c, { visible: false });

    if (i === 0) { // ── "Last one in the circle wins one hundred thousand dollars!"
      const draw = ease(seg(lt, 0, 2.0));
      const a = draw * Math.PI * 2;
      pose(bucks, { pos: v3(Math.sin(a) * (R0 + 0.45), 0, Math.cos(a) * (R0 + 0.45)), rotY: a + Math.PI / 2, walk: lt * 1.8, walkAmt: draw < 1 ? 1 : 0, mouth: talk("Mr. Bucks", t), blink: blinkAt(t, 2), armRx: -0.6, armRz: 0.3 });
      bucks.cane.rotation.x = draw < 1 ? 0.7 : 0;
      const k = ease(seg(lt, 0, 4.34));
      world.cam(v3(lerp(0.5, 0.3, k), lerp(5.5, 3.2, k), lerp(6.5, 5.0, k)), v3(0, 0.4, 0.1), 42);
    }
    else if (i === 1) { // ── "Hour one. Mr. Bucks offered pizza to leave." "Mo left instantly."
      bucks.cane.rotation.x = 0;
      pose(bucks, { pos: v3(-1.3, 0, 1.9), rotY: Math.PI * 0.85, blink: blinkAt(t, 2), mouth: 0.2, armLx: -1.3, armLz: 0.3 });
      pizza.visible = true; bucks.root.updateMatrixWorld(true); const hp = bucks.armL.children[1].getWorldPosition(new THREE.Vector3()); pizza.position.set(hp.x, hp.y + 0.05, hp.z + 0.15);
      steam.userData.spray(t, pizza.position.clone().add(v3(0, 0.05, 0)), v3(0, 1, 0), { spread: 0.6, speed: 0.4, life: 1.2, gravity: -0.1 });
      const go = seg(lt, 3.0, 4.2);
      const mp = new THREE.Vector3().lerpVectors(P.mo, v3(-1.25, 0, 1.45), ease(go));
      pose(mo, { pos: mp, rotY: lerp(0.3, Math.PI * 0.85 + Math.PI, 0) + (go > 0 ? 2.4 : 0), walk: lt * 1.5, walkAmt: go > 0 && go < 1 ? 1 : 0, blink: blinkAt(t, 4) * 0.5, armLx: -0.35, armRx: go >= 1 ? -1.5 : -0.35, armLz: -0.25, armRz: -0.25, mouth: go >= 1 ? 0.4 * Math.abs(Math.sin(lt * 9)) : 0 });
      if (go >= 1) { pizza.position.set(mp.x + 0.15, 1.5, mp.z + 0.3); }
      pose(pip, { pos: P.pip, rotY: -0.9, blink: blinkAt(t, 1), lookY: -0.3, eyeScale: 1.15 });
      world.cam(v3(0.6, 1.9, 4.6), v3(-0.6, 0.7, 0.9), 44);
    }
    else if (i === 2) { // ── "Hour five. A thunderstorm."
      out(mo);
      umbrella.visible = true; pip.root.updateMatrixWorld(true); const hp = pip.handR.getWorldPosition(new THREE.Vector3()); umbrella.position.set(0.12, 0.38, 0.62); umbrella.rotation.z = 0.15;
      pose(pip, { pos: P.pip, rotY: -0.5, blink: 0.3, armRx: -0.9, armRz: 0.9, eyeScale: 0.95, sway: Math.sin(t * 8) * 0.03 });
      pose(quack, { pos: v3(0.15, 0, 0.55), rotY: 0.3, blink: blinkAt(t, 3), sway: Math.sin(t * 20) * 0.03 });
      bigUmb.visible = true; bigUmb.position.copy(P.granny);
      pose(granny, { pos: P.granny, rotY: 0.2, t, flame: 0, blink: 0.4, armLx: -0.8 + Math.sin(t * 10) * 0.1, armRx: -0.8 - Math.sin(t * 10) * 0.1, armLz: 0.2, armRz: 0.2 });
      world.cam(v3(0.4, 1.6, 3.8), v3(0.1, 0.6, 0.1), 44);
      if (strike) world.shake(0.03, t);
    }
    else if (i === 3) { // ── "Hour ten. He let loose a goose." "Quack ran."
      out(mo);
      goose.visible = true;
      const gIn = seg(lt, 0.3, 1.6), chase = seg(lt, 1.9, 3.3);
      const qRun = seg(lt, 2.0, 3.3);
      const qp = new THREE.Vector3().lerpVectors(P.quack, v3(2.6, 0, 2.2), ease(qRun));
      const gp = qRun > 0 ? qp.clone().add(v3(-0.75, 0, -0.55)) : new THREE.Vector3().lerpVectors(v3(-3.2, 0, 2.2), v3(-0.55, 0, 0.75), ease(gIn));
      goose.position.copy(gp); goose.rotation.y = qRun > 0 ? Math.atan2(qp.x - gp.x, qp.z - gp.z) : Math.atan2(P.quack.x - gp.x, P.quack.z - gp.z);
      goose.position.y = Math.abs(Math.sin(lt * 14)) * 0.05;
      wings.forEach((w, k) => (w.rotation.z = (k ? -1 : 1) * (0.2 + Math.abs(Math.sin(lt * 18)) * 0.9)));
      gHead.position.z = 0.34 + Math.sin(lt * 16) * 0.05;
      pose(quack, { pos: qp, rotY: qRun > 0 ? Math.atan2(2.6 - P.quack.x, 2.2 - P.quack.z) : -2.4, blink: 0, eyeScale: lt > 1.0 ? 1.45 : 1, hop: Math.abs(Math.sin(lt * 18)) * 0.08 * (qRun > 0 ? 1 : 0), sway: Math.sin(lt * 18) * 0.3 * (qRun > 0 ? 1 : 0), squash: lt > 1.0 && lt < 1.3 ? 0.15 : 0 });
      pose(pip, { pos: P.pip, rotY: -0.6, blink: 0, eyeScale: 1.2, lookY: -0.3, mouth: 0.3 });
      world.cam(v3(1.4, 1.5, 4.4), v3(0.2, 0.4, 0.9), 46);
    }
    else if (i === 4) { // ── "Hour twenty. Just Pip and Granny left."
      out(mo); out(quack);
      const yawn = Math.max(0, Math.sin(seg(lt, 0.4, 1.6) * Math.PI));
      pose(pip, { pos: P.pip, rotY: -0.3, blink: 0.55 + 0.4 * yawn, mouth: yawn * 1.1, mouthSize: 1 + yawn * 0.3, sway: Math.sin(lt * 2.4) * 0.12, armLz: 0.35 + yawn * 1.8, armRz: 0.35 + yawn * 1.8 });
      tea.visible = true; granny.root.updateMatrixWorld(true); const hp = granny.armR.children[1].getWorldPosition(new THREE.Vector3()); tea.position.set(hp.x, hp.y + 0.04, hp.z);
      const sip = Math.max(0, Math.sin(seg(lt, 1.5, 2.6) * Math.PI));
      pose(granny, { pos: P.granny, rotY: 0.3, t, flame: 0, blink: 0, eyeScale: 1.15, armRx: -1.2 - sip * 0.6, armRz: 0.35 });
      const k = ease(seg(lt, 0, 3));
      world.cam(v3(lerp(0.8, 0.6, k), lerp(1.4, 1.2, k), lerp(3.6, 3.0, k)), v3(0.1, 0.6, -0.1), 42);
    }
    else if (i === 5) { // ── "Pip fell asleep… and rolled out."
      out(mo); out(quack);
      const lie = ease(seg(lt, 0.0, 0.35)), roll = seg(lt, 0.4, 1.9);
      const start = P.pip, end = v3(1.85, 0, 0.75);
      const pp = new THREE.Vector3().lerpVectors(start, end, roll);
      pose(pip, { pos: v3(pp.x, 0.4 * lie, pp.z), rotY: -0.25, blink: 1, mouth: 0.15 + 0.1 * Math.sin(lt * 4) });
      pip.root.rotation.z = -Math.PI / 2 * lie - roll * Math.PI * 4;
      zzz.forEach((z, k) => { const a = ((lt * 0.8 + k / 3) % 1); z.visible = true; z.position.set(pp.x + 0.2 + a * 0.4, 0.8 + a * 0.9, pp.z); z.scale.setScalar(0.5 + a); z.lookAt(world.camera.position); });
      pose(granny, { pos: P.granny, rotY: 0.6, t, flame: 0, blink: 0, eyeScale: 1.1, lookY: 0.4, lookX: 0.15 });
      world.cam(v3(1.2, 1.6, 3.4), v3(0.9, 0.3, 0.4), 44);
    }
    else { // ── "Granny Volt won." Granny: "I've been sitting still for eighty years, sweetie."
      out(mo); pip.root.rotation.z = 0;
      const hold = ease(seg(lt, 0.2, 0.6));
      const blast = seg(lt, 2.7, 4.2);
      const gp = v3(P.granny.x, easeIn(blast) * 6, P.granny.z - easeIn(blast) * 4);
      pose(granny, { pos: gp, rotY: 0.15, t, flame: blast > 0 ? 1.3 : 0, blink: blinkAt(t, 6), mouth: talk("Granny Volt", t), armLx: -1.6 * hold, armLz: 0.3 + 0.9 * hold, lookY: lt > 1.4 && lt < 2.6 ? 0.35 : 0, headTilt: lt > 2.2 && lt < 2.5 ? 0.25 : 0 });
      granny.root.rotation.x = -0.6 * blast;
      brief.visible = true; granny.root.updateMatrixWorld(true); const hp = granny.armL.children[1].getWorldPosition(new THREE.Vector3()); brief.position.set(hp.x - 0.05, hp.y - 0.05, hp.z + 0.05); brief.rotation.set(0.3, 0.2, 0);
      // Pip wakes up outside the circle, confused
      pose(pip, { pos: v3(1.85, 0, 0.75), rotY: -0.9, blink: lt < 2.5 ? 0.6 : 0, eyeScale: lt > 2.5 ? 1.25 : 1, lookY: lt > 2.8 ? -0.5 : 0, lookX: lt > 2.8 ? -0.3 : 0, mouth: lt > 2.9 ? 0.5 : 0 });
      pose(quack, { pos: v3(2.4, 0, 1.2), rotY: -1.2, blink: blinkAt(t, 3) });
      if (lt < 2.6) world.cam(v3(0.4, 1.2, 2.3), v3(-0.1, 0.7, -0.55), 40);
      else world.cam(v3(1.6, 1.4, 4.6), v3(-0.1, 1.2 + gp.y * 0.6, -0.6 - gp.z * 0.2), 50);
    }
  }
  return { update, duration: END, sfx };
}
