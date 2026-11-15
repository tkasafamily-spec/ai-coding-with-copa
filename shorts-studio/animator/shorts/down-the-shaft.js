// Down The Shaft — the DON'T button, the long fall, Granny Volt's rocket rescue.
export const worldOpts = { bg: 0x0b0a10 };

export function build(E, world, data) {
  const { THREE, v3, lerp, seg, ease, easeOut, easeIn, pop, clamp, pose, blinkAt, toy, place } = E;
  const { scene } = world;
  const S = data.timings.map((s) => s.start), END = data.timings.at(-1).start + data.timings.at(-1).len;
  const talk = E.talker(data); const sfx = []; const fx = (t, name, vol = 1) => sfx.push({ t: +t.toFixed(3), name, vol });

  // ── elevator car at the top of the shaft ──────────────
  const brass = toy(0xc9a45c, { metal: 0.65, rough: 0.35 }), dark = toy(0x2a2420, { rough: 0.6 });
  const car = new THREE.Group(); scene.add(car);
  const CW = 2.6, CH = 2.8;
  [[0, CH / 2, -CW / 2, CW, CH, 0.1], [-CW / 2, CH / 2, 0, 0.1, CH, CW], [CW / 2, CH / 2, 0, 0.1, CH, CW], [0, CH, 0, CW, 0.1, CW]].forEach(([x, y, z, w, h, d]) => car.add(place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brass), { position: v3(x, y, z), receiveShadow: true })));
  // wood panel strips
  [-0.6, 0.6].forEach((x) => car.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.02), toy(0x6b3a1f, { rough: 0.5 })), { position: v3(x, 1.3, -CW / 2 + 0.06) })));
  car.add(place(new THREE.Mesh(new THREE.BoxGeometry(CW, 0.05, 0.06), brass), { position: v3(0, 0.95, -CW / 2 + 0.1) }));
  const ceilLight = new THREE.PointLight(0xffe2b0, 6, 6); ceilLight.position.set(0, CH - 0.3, 0); car.add(ceilLight);
  const ceilPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0xfff2d0 })); ceilPanel.rotation.x = Math.PI / 2; ceilPanel.position.set(0, CH - 0.06, 0); car.add(ceilPanel);
  // trapdoor floor: two halves hinged at the side walls
  const doorL = new THREE.Group(), doorR = new THREE.Group(); doorL.position.set(-CW / 2, 0, 0); doorR.position.set(CW / 2, 0, 0); car.add(doorL, doorR);
  const floorM = toy(0x3a3330, { rough: 0.5 });
  doorL.add(place(new THREE.Mesh(new THREE.BoxGeometry(CW / 2, 0.08, CW), floorM), { position: v3(CW / 4, -0.04, 0), receiveShadow: true }));
  doorR.add(place(new THREE.Mesh(new THREE.BoxGeometry(CW / 2, 0.08, CW), floorM), { position: v3(-CW / 4, -0.04, 0), receiveShadow: true }));
  // the DON'T button on the right wall
  const btnPanel = new THREE.Group(); btnPanel.position.set(CW / 2 - 0.06, 1.25, -0.35); btnPanel.rotation.y = -Math.PI / 2; car.add(btnPanel);
  btnPanel.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.04), brass), { position: v3(0, 0, 0) }));
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 0.9, roughness: 0.3 }));
  btn.rotation.x = Math.PI / 2; btn.position.set(0, 0.1, 0.05); btnPanel.add(btn);
  btnPanel.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 32), toy(0xdddddd, { metal: 0.8 })), { position: v3(0, 0.1, 0.03) }));
  const label = E.textPanel(0.4, 0.14, (ctx, w, h) => { ctx.fillStyle = "#1a1a1a"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#ffd23a"; ctx.font = `900 ${h * 0.7}px Montserrat, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("DON'T", w / 2, h * 0.55); }, { px: 512, glow: 0.8 });
  label.position.set(0, -0.18, 0.025); btnPanel.add(label);
  const alarm = new THREE.PointLight(0xff1a1a, 0, 7); alarm.position.set(0, CH - 0.4, 0.5); car.add(alarm);

  // ── the shaft ─────────────────────────────────────────
  const shaft = new THREE.Group(); scene.add(shaft);
  const wallM = toy(0x3c3a44, { rough: 0.85, coat: 0 });
  const SH = 110;
  [[0, -CW / 2 - 0.2, CW + 0.6, 0.1], [-CW / 2 - 0.2, 0, 0.1, CW + 0.6], [CW / 2 + 0.2, 0, 0.1, CW + 0.6], [0, CW / 2 + 0.2, CW + 0.6, 0.1]].forEach(([x, z, w, d]) => shaft.add(place(new THREE.Mesh(new THREE.BoxGeometry(w, SH, d), wallM), { position: v3(x, -SH / 2, z) })));
  const floors = [];
  for (let k = 1; k <= 30; k++) {
    const y = -k * 3.4 + 0.2;
    const door = new THREE.Group(); door.position.set(0, y, -CW / 2 - 0.12); shaft.add(door);
    door.add(place(new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.06), toy(0x9aa0aa, { metal: 0.7, rough: 0.35 })), { position: v3(0, 1.1, 0) }));
    door.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.2, 0.07), toy(0x444444)), { position: v3(0, 1.1, 0.01) }));
    const num = E.textPanel(0.6, 0.3, (ctx, w, h) => { ctx.fillStyle = "#120c06"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#ffb43a"; ctx.font = `900 ${h * 0.75}px Montserrat, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(51 - k), w / 2, h * 0.55); }, { px: 256, glow: 1.4 });
    num.position.set(0, 2.5, 0.04); door.add(num);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xffe6a8 })); lamp.position.set(0, y + 3.0, -CW / 2 - 0.1); shaft.add(lamp);
    floors.push(y);
  }
  // cables
  [-0.5, 0.5].forEach((x) => shaft.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, SH), toy(0x111111)), { position: v3(x, -SH / 2, CW / 2 - 0.1) })));
  const shaftLight = new THREE.PointLight(0xffd9a0, 18, 10); scene.add(shaftLight);
  const speed = new THREE.InstancedMesh(new THREE.BoxGeometry(0.015, 1.2, 0.015), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), 60);
  speed.frustumCulled = false; scene.add(speed); const R = E.rand(9); const SP = Array.from({ length: 60 }, () => [(R() - 0.5) * 2.4, R() * 8, (R() - 0.5) * 2.4]);

  // ── lobby (x = 100) ───────────────────────────────────
  const LOB = v3(100, 0, 0);
  scene.add(place(new THREE.Mesh(new THREE.PlaneGeometry(20, 20), toy(0xf1ece4, { rough: 0.15, coat: 1 })), { position: LOB.clone(), rotation: new THREE.Euler(-Math.PI / 2, 0, 0), receiveShadow: true }));
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(20, 6, 0.3), toy(0x8fb7c9, { rough: 0.6 })), { position: v3(LOB.x, 3, LOB.z - 3), receiveShadow: true }));
  const lobDoors = new THREE.Group(); lobDoors.position.set(LOB.x - 1.6, 0, LOB.z - 2.83); scene.add(lobDoors);
  lobDoors.add(place(new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 0.08), brass), { position: v3(0, 1.4, 0) }));
  lobDoors.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.8, 0.09), dark), { position: v3(0, 1.4, 0.01) }));
  const big = new THREE.Group(); big.position.set(LOB.x + 1.5, 1.7, LOB.z - 2.8); scene.add(big);
  big.add(place(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.08), brass), {}));
  const bigBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 40), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 1.1, roughness: 0.3 }));
  bigBtn.rotation.x = Math.PI / 2; bigBtn.position.z = 0.12; big.add(bigBtn);
  const bigLight = new THREE.PointLight(0xff3030, 0, 4); bigLight.position.set(0, 0, 0.8); big.add(bigLight);
  [[-4, 0x6ab04c], [5, 0x6ab04c]].forEach(([x, c]) => { const pot = new THREE.Group(); pot.position.set(LOB.x + x, 0, LOB.z - 2.2); scene.add(pot);
    pot.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 16), toy(0xffffff)), { position: v3(0, 0.25, 0) }));
    pot.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), toy(c, { rough: 0.8 })), { position: v3(0, 1.0, 0), castShadow: true })); });

  // ── cast ──────────────────────────────────────────────
  const pip = E.makePip(), mo = E.makeMo(), granny = E.makeGranny();
  [pip, mo, granny].forEach((c) => scene.add(c.root));
  const sparks = E.makeDrops(160, 21); sparks.material = new THREE.MeshBasicMaterial({ color: 0xffb03a }); scene.add(sparks);
  const offFx = () => sparks.userData.spray(0, v3(0, -999, 0), v3(0, 1, 0), { on: false });

  // falling: both start falling when the floor opens
  const T0 = S[2] + 0.35, CATCH = S[5] + 0.45;
  const fallY = (t) => { const d = Math.max(0, t - T0); return d < 0.8 ? -0.5 * 10 * d * d : -3.2 - (d - 0.8) * 8.2; };
  const yCatch = fallY(CATCH);
  const grannyY = (t) => { // rockets up from far below, meets them, then carries them up
    if (t < CATCH) return yCatch - 2.2 - Math.max(0, CATCH - t) * 22;
    return yCatch - 2.2 + (t - CATCH) * 12 * seg(t, CATCH, CATCH + 0.4);
  };

  fx(0, "sting", 0.4); fx(S[0] + 3.05, "boing", 0.25);
  fx(S[1] + 0.4, "click"); fx(S[1] + 0.45, "alarm");
  fx(S[2] + 0.3, "crumble"); fx(S[2] + 0.4, "whoosh"); fx(S[3], "whistle", 0.6); fx(S[3] + 0.9, "whoosh", 0.7);
  fx(S[4] + 1.3, "rocket", 0.8); fx(S[5] + 0.45, "boing", 0.6); fx(S[5] + 0.5, "rocket"); fx(S[6] + 2.2, "ding", 0.6); fx(S[6] + 3.1, "sting", 0.5);

  function update(t) {
    const { i, lt } = E.sceneOf(data, t);
    offFx(); speed.visible = false; alarm.intensity = 0; scene.background = new THREE.Color(0x0b0a10);
    doorL.rotation.z = 0; doorR.rotation.z = 0; btn.position.z = 0.05; bigLight.intensity = 0;
    pose(granny, { visible: false, t });
    E.lightAt(world, v3(0, 0, 0));
    const shake = (a) => world.shake(a, t);

    if (i <= 1) { // ── in the elevator
      pose(mo, { pos: v3(-0.65, 0, -0.5), rotY: 0.35, blink: blinkAt(t, 4) * 0.5, armLx: -0.35, armRx: -0.35, armLz: -0.25, armRz: -0.25, mouth: talk("Mo", t), lookY: i === 0 ? Math.sin(t * 7) * 0.22 * seg(t, 3.0, 3.2) * (1 - seg(t, 3.7, 3.9)) : 0 });
      if (i === 0) {
        const reach = ease(seg(lt, 1.0, 3.9));
        pose(pip, { pos: v3(0.45, 0, 0.1), rotY: 1.0 + 0.2 * reach, blink: blinkAt(t, 1), armRx: -1.6 * reach, armRz: 0.35 + 0.4 * reach, lookX: 0.05, eyeScale: 1 + 0.1 * reach, mouth: 0 });
        const k = ease(seg(lt, 0, 4.1));
        world.cam(v3(lerp(-0.7, -0.8, k), lerp(1.6, 1.45, k), lerp(4.4, 3.4, k)), v3(0.45, 1.0, -0.35), 40);
      } else {
        const press = seg(lt, 0.3, 0.45) * (1 - seg(lt, 0.7, 0.9));
        btn.position.z = 0.05 - 0.04 * press;
        pose(pip, { pos: v3(0.62, 0, -0.1), rotY: 1.35, blink: 0, armRx: -1.75, armRz: 0.75 + 0.15 * press, eyeScale: 1.1 + 0.2 * seg(lt, 0.45, 0.6), mouth: 0.4 * seg(lt, 0.5, 0.7) });
        if (lt > 0.45) { alarm.intensity = Math.floor(lt * 6) % 2 ? 12 : 2; ceilLight.intensity = 2; } else ceilLight.intensity = 6;
        const bp = btn.getWorldPosition(new THREE.Vector3());
        world.cam(v3(bp.x - 0.75, bp.y + 0.12, bp.z + 0.75), v3(bp.x - 0.05, bp.y - 0.02, bp.z), 36);
        if (lt > 0.45 && lt < 0.8) shake(0.01);
      }
    }
    else if (i === 2) { // ── the floor drops away
      alarm.intensity = Math.floor(lt * 6) % 2 ? 12 : 2;
      const open = easeIn(seg(lt, 0.25, 0.5));
      doorL.rotation.z = -open * 1.6; doorR.rotation.z = open * 1.6;
      const y = fallY(t);
      pose(pip, { pos: v3(0.35, y, -0.1), rotY: 0.3, blink: 0, eyeScale: 1.35, mouth: 0.9, armLz: 2.6 + Math.sin(lt * 24) * 0.4, armRz: 2.6 + Math.cos(lt * 24) * 0.4, walk: lt * 4, walkAmt: 0.8 });
      pose(mo, { pos: v3(-0.5, y, -0.4), rotY: 0.35, blink: 0.5, armLx: -0.35, armRx: -0.35, armLz: -0.25, armRz: -0.25 });
      world.cam(v3(0.25, 2.4, 0.9), v3(0, Math.min(-0.5, y), -0.25), 62, 0, { raw: true });
      if (lt > 0.25 && lt < 0.6) shake(0.03);
    }
    else if (i === 3 || i === 4) { // ── falling down the shaft / Granny coming up
      const y = fallY(t);
      pose(pip, { pos: v3(0.35, y, -0.1), rotY: 0.3, blink: 0, eyeScale: 1.35, mouth: 0.9, armLz: 2.6 + Math.sin(t * 24) * 0.4, armRz: 2.6 + Math.cos(t * 24) * 0.4, walk: t * 4, walkAmt: 0.8, sway: Math.sin(t * 3) * 0.2 });
      pose(mo, { pos: v3(-0.55, y + 0.3, -0.45), rotY: 0.35, blink: 0.5, armLx: -0.35, armRx: -0.35, armLz: -0.25, armRz: -0.25, tilt: Math.sin(t * 1.3) * 0.15 });
      speed.visible = true; const o = new THREE.Object3D();
      SP.forEach(([x, oy, z], k) => { o.position.set(x, y - 6 + ((oy + t * 30) % 8), z); o.updateMatrix(); speed.setMatrixAt(k, o.matrix); }); speed.instanceMatrix.needsUpdate = true;
      shaftLight.position.set(0, y - 1, 0.5);
      E.lightAt(world, v3(0, y, 0));
      if (i === 3) {
        world.cam(v3(0.6, y - 2.6, 0.9), v3(0.1, y + 0.6, -0.2), 66, Math.sin(t * 2) * 0.1, { raw: true });
      } else {
        const gy = grannyY(t);
        pose(granny, { visible: lt > 0.9, pos: v3(0.1, gy, -0.1), rotY: 0, t, flame: 1, blink: blinkAt(t, 6), mouth: talk("Granny Volt", t), lookX: -0.5, armLz: 0.3, armRz: 0.3 });
        granny.root.rotation.x = -Math.PI / 2 * 0.98; // nose up, rocket down
        if (lt < 1.2) world.cam(v3(0.6, y + 1.6, 0.9), v3(0, y - 6, -0.2), 62, 0, { raw: true });
        else { world.cam(v3(0.55, gy + 2.6, 0.75), v3(0.1, gy + 0.3, -0.1), 62, 0, { raw: true }); }
        shaftLight.position.set(0, (y + gy) / 2, 0.5);
        if (granny.root.visible) sparks.userData.spray(t, v3(0.1, gy - 1.2, -0.1), v3(0, -1, 0), { spread: 0.8, speed: 4, life: 0.4, gravity: 0 });
      }
    }
    else if (i === 5) { // ── caught! rocketing back up
      const gy = grannyY(t), riding = t >= CATCH;
      const fy = riding ? gy + 2.2 : fallY(t);
      pose(granny, { visible: true, pos: v3(0.1, gy, -0.1), rotY: 0, t, flame: 1.2, blink: blinkAt(t, 6), lookX: -0.4, armLz: 0.3, armRz: 0.3 });
      granny.root.rotation.x = -Math.PI / 2 * 0.98;
      const land = pop(t, CATCH, 0.3);
      pose(pip, { pos: v3(0.1, riding ? gy + 1.15 : fy, riding ? 0.35 : -0.1), rotY: 0, blink: 0, eyeScale: riding ? 1.2 : 1.35, mouth: riding ? 0.5 : 0.9, armLz: riding ? 1.8 : 2.6, armRz: riding ? 1.8 : 2.6, squash: riding ? Math.sin(seg(t, CATCH, CATCH + 0.3) * Math.PI) * 0.25 : 0 });
      pose(mo, { pos: v3(0.15, riding ? gy - 0.55 : fy + 0.3, riding ? -0.55 : -0.45), rotY: 0, blink: 0.5, armLx: -0.35, armRx: -0.35, armLz: -0.25, armRz: -0.25 });
      if (riding) { pip.root.rotation.x = -Math.PI / 2 * 0.6; mo.root.rotation.x = -Math.PI / 2 * 0.98; } else { pip.root.rotation.x = 0; mo.root.rotation.x = 0; }
      shaftLight.position.set(0, gy + 1, 0.8); E.lightAt(world, v3(0, gy, 0));
      sparks.userData.spray(t, v3(0.1, gy - 1.2, -0.1), v3(0, -1, 0), { spread: 0.8, speed: 4, life: 0.4, gravity: 0 });
      speed.visible = true; const o = new THREE.Object3D();
      SP.forEach(([x, oy, z], k) => { o.position.set(x, gy + 6 - ((oy + t * 30) % 8), z); o.updateMatrix(); speed.setMatrixAt(k, o.matrix); }); speed.instanceMatrix.needsUpdate = true;
      world.cam(v3(0.7, gy + 3.4, 0.85), v3(0.1, gy + 0.6, -0.1), 66, 0, { raw: true });
      if (t > CATCH && t < CATCH + 0.3) shake(0.04);
    }
    else { // ── the lobby: "Don't press that button, sweetie." / "Wait. What button?"
      pip.root.rotation.x = 0; mo.root.rotation.x = 0; granny.root.rotation.x = 0;
      E.lightAt(world, LOB); scene.background = new THREE.Color(0x8fb7c9);
      const wag = Math.sin(lt * 14) * 0.35 * (1 - seg(lt, 1.9, 2.1));
      pose(granny, { visible: true, pos: v3(LOB.x - 1.2, 0, LOB.z + 0.4), rotY: 0.7, t, flame: 0, blink: blinkAt(t, 6), mouth: talk("Granny Volt", t), armRx: -1.4, armRz: 0.6 + wag, lookY: 0.2 });
      const turn = ease(seg(lt, 2.15, 2.6));
      bigLight.intensity = 6 * turn + Math.sin(lt * 8) * 1.5 * turn;
      pose(pip, { pos: v3(LOB.x + 0.3, 0, LOB.z + 0.6), rotY: lerp(-0.6, 0.15, turn), lookY: lerp(0, 0.8, ease(seg(lt, 2.7, 3.0))), headTilt: 0, blink: blinkAt(t, 1), mouth: talk("Pip", t), lookX: lt < 2 ? Math.abs(Math.sin(lt * 6)) * 0.15 : 0, eyeScale: 1 });
      pose(mo, { pos: v3(LOB.x + 1.3, 0, LOB.z + 0.2), rotY: -0.4, blink: blinkAt(t, 4) * 0.5, armLx: -0.35, armRx: -0.35, armLz: -0.25, armRz: -0.25, squash: lt > 3.0 ? 0.04 * Math.sin(seg(lt, 3.0, 3.5) * Math.PI) : 0, lookX: lt > 3.0 ? 0.25 : 0 });
      if (lt < 2.1) world.cam(v3(LOB.x - 0.1, 1.5, LOB.z + 4.6), v3(LOB.x - 0.3, 0.9, LOB.z + 0.3), 42);
      else { const k = ease(seg(lt, 2.1, 3.0)); world.cam(v3(lerp(LOB.x + 0.0, LOB.x + 0.2, k), lerp(1.3, 1.1, k), lerp(LOB.z + 3.6, LOB.z + 3.0, k)), v3(lerp(LOB.x + 0.3, LOB.x + 1.0, k), lerp(0.85, 1.2, k), LOB.z - 0.3), 42); }
    }
  }
  return { update, duration: END, sfx };
}
