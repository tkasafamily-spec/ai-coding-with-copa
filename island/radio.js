// Car radio: three stations of music made on the fly with Web Audio, so nothing has to download.
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI note number -> Hz

// chords as MIDI roots + chord tones
const STATIONS = [
  { // synthwave
    name: 'NEON FM', bpm: 106, swing: 0,
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], // Am F C G
    kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], openHat: [],
    bass: 'eighths', lead: 'arp', pad: true, leadType: 'square', leadOct: 12,
  },
  { // laid-back beats
    name: 'PALM BEATS', bpm: 86, swing: 0.16,
    chords: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [57, 60, 64, 67]], // Dm7 G7 Cmaj7 Am7
    kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], openHat: [14],
    bass: 'roots', lead: 'keys', pad: false, leadType: 'triangle', leadOct: 0,
  },
  { // island dance
    name: 'SUNSET LATINO', bpm: 96, swing: 0,
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]], // Am F C E
    kick: [0, 4, 8, 12], snare: [3, 6, 11, 14], hat: [2, 10], openHat: [],
    bass: 'dembow', lead: 'pluck', pad: false, leadType: 'sine', leadOct: 12,
  },
];

export function makeRadio(ctx, out, noiseBuf) {
  const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(out);
  const comp = ctx.createDynamicsCompressor(); comp.connect(bus);
  let station = -1, playing = false, step = 0, nextT = 0;
  const melodySeed = [0, 2, 1, 2, 3, 2, 1, 0, 1, 2, 3, 1, 2, 0, 2, 3];

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f, t, dur, peak, a, cutoff, detune = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    let node = o;
    if (cutoff) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; o.connect(lp); node = lp; }
    node.connect(g); g.connect(comp);
    env(g, t, a, peak, dur);
    o.start(t); o.stop(t + a + dur + 0.05);
    return o;
  }
  function noise(t, dur, peak, type, freq) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    s.connect(f); f.connect(g); g.connect(comp);
    env(g, t, 0.002, peak, dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    o.connect(g); g.connect(comp); env(g, t, 0.003, 0.9, 0.32); o.start(t); o.stop(t + 0.4);
  }

  function schedule(S, s, t) {
    const sixteenth = 60 / S.bpm / 4;
    const bar = Math.floor(s / 16) % S.chords.length, pos = s % 16;
    const ch = S.chords[bar];
    if (S.kick.includes(pos)) kick(t);
    if (S.snare.includes(pos)) { noise(t, 0.16, S.name === 'SUNSET LATINO' ? 0.25 : 0.35, 'bandpass', 1900); osc('triangle', 190, t, 0.07, 0.15, 0.002); }
    if (S.hat.includes(pos)) noise(t, 0.035, 0.12, 'highpass', 7500);
    if (S.openHat.includes(pos)) noise(t, 0.16, 0.08, 'highpass', 6500);
    const root = ch[0] - 24;
    if (S.bass === 'eighths' && pos % 2 === 0) osc('sawtooth', NOTE(root + (pos % 4 === 2 ? 12 : 0)), t, sixteenth * 1.6, 0.22, 0.004, 420);
    if (S.bass === 'roots' && (pos === 0 || pos === 7 || pos === 10)) osc('sine', NOTE(root + 12), t, sixteenth * 5, 0.5, 0.01);
    if (S.bass === 'dembow' && (pos === 0 || pos === 3 || pos === 8 || pos === 11)) osc('sine', NOTE(root + 12), t, sixteenth * 2.5, 0.55, 0.005);
    if (S.pad && pos === 0) for (const n of ch) { osc('sawtooth', NOTE(n), t, sixteenth * 15, 0.035, 0.25, 1100, -8); osc('sawtooth', NOTE(n), t, sixteenth * 15, 0.035, 0.25, 1100, 8); }
    if (S.lead === 'arp') {
      const n = ch[[0, 1, 2, 1][pos % 4]] + S.leadOct + (pos >= 8 ? 12 : 0);
      osc(S.leadType, NOTE(n), t, sixteenth * 0.9, 0.05, 0.003, 2600);
    } else if (S.lead === 'keys' && (pos === 0 || pos === 6 || pos === 11)) {
      for (const n of ch) osc('triangle', NOTE(n + 12), t, sixteenth * 5, 0.06, 0.006);
      if (pos === 0) for (const n of ch) osc('sine', NOTE(n + 24), t, sixteenth * 3, 0.025, 0.004);
    } else if (S.lead === 'pluck' && [0, 2, 3, 6, 8, 10, 11, 14].includes(pos)) {
      const n = ch[melodySeed[(pos + bar * 3) % 16] % ch.length] + S.leadOct + (melodySeed[pos] === 3 ? 12 : 0);
      osc('sine', NOTE(n), t, sixteenth * 1.5, 0.16, 0.002); osc('triangle', NOTE(n + 12), t, sixteenth * 0.6, 0.04, 0.002);
    }
  }

  return {
    get name() { return station < 0 ? 'RADIO OFF' : STATIONS[station].name; },
    get station() { return station; },
    count: STATIONS.length,
    setStation(i) { station = i; step = 0; nextT = ctx.currentTime + 0.08; },
    next() { this.setStation(station + 1 >= STATIONS.length ? -1 : station + 1); return this.name; },
    setPlaying(on) {
      if (on === playing) return;
      playing = on;
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.08);
      if (on) { nextT = ctx.currentTime + 0.08; }
    },
    tick() { // call every frame; schedules notes a little ahead
      if (!playing || station < 0) return;
      const S = STATIONS[station], sixteenth = 60 / S.bpm / 4;
      if (nextT < ctx.currentTime - 0.2) nextT = ctx.currentTime + 0.05; // after a long pause
      while (nextT < ctx.currentTime + 0.3) {
        const sw = (step % 2 === 1) ? S.swing * sixteenth : 0;
        schedule(S, step, nextT + sw);
        nextT += sixteenth; step++;
      }
    },
  };
}
