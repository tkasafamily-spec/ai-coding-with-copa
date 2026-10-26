/*
 * Recipe Reel - music.js
 * window.ReelMusic: built-in background music, synthesised live with the Web Audio API
 * (no files, no network, no keys), plus seamless looping of the user's own song.
 *
 *   ReelMusic.styles                       [{id:'chill', name:'Chill'}, {id:'happy', name:'Happy'}]
 *   ReelMusic.create(ctx, styleId)   -> Player   generated music, loops forever
 *   ReelMusic.fromBuffer(ctx, buf)   -> Player   loops a decoded AudioBuffer
 *   Player = { output, start(when?), stop(when?) }   (output is not connected; the caller connects it)
 *   ReelMusic.preview(styleId, seconds = 8) -> { stop(), ended, onended }   (own AudioContext; call from a tap)
 *
 * How it works: a classic look-ahead scheduler (setInterval every 25 ms, notes are scheduled
 * ~0.3 s ahead of ctx.currentTime), so ctx.suspend() simply pauses the music. With an
 * OfflineAudioContext the whole rendered length is scheduled up front.
 * Every sound has a ramped envelope (no clicks); the chain ends in a DynamicsCompressor and an
 * output GainNode (peaks around -12 dBFS).
 */
(function (global) {
  'use strict';

  var FLOOR = 0.0001;          // "silence" for exponential ramps (-80 dB)
  var LOOKAHEAD = 0.3;         // seconds scheduled ahead of ctx.currentTime
  var MAX_LOOKAHEAD = 0.9;     // grows up to this when the main thread is busy (video work)
  var HIDDEN_LOOKAHEAD = 1.5;  // timers are throttled in background tabs
  var TICK_MS = 25;
  var STOP_FADE = 0.12;        // seconds

  function noop() {}
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function isOffline(ctx) { return !!ctx && typeof ctx.startRendering === 'function'; }
  function getAC() { return global.AudioContext || global.webkitAudioContext || null; }
  function pageHidden() {
    try { return !!(global.document && global.document.hidden); } catch (e) { return false; }
  }
  function safeDisconnect(n) { try { n.disconnect(); } catch (e) { /* already gone */ } }

  // Small deterministic PRNG (mulberry32) so the same style always sounds the same.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(a, b) {
    var h = Math.imul(a ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(b + 0x7F4A7C15, 0xC2B2AE35);
    h = Math.imul(h ^ (h >>> 13), 0x27D4EB2F);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // ---------------------------------------------------------------------------------------------
  // Per-context resources (created once per AudioContext and reused by every player)
  // ---------------------------------------------------------------------------------------------
  var resMap = typeof WeakMap === 'function' ? new WeakMap() : null;
  function res(ctx) {
    var r = resMap ? resMap.get(ctx) : ctx.__reelMusicRes;
    if (!r) {
      r = { waves: {} };
      if (resMap) resMap.set(ctx, r); else { try { ctx.__reelMusicRes = r; } catch (e) { /* ignore */ } }
    }
    return r;
  }

  // 2 s of white noise; percussion plays random slices of it.
  function noiseBuf(ctx) {
    var r = res(ctx);
    if (!r.noise) {
      var len = Math.floor(ctx.sampleRate * 2), b = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = b.getChannelData(0), R = rng(12345);
      for (var i = 0; i < len; i++) d[i] = R() * 2 - 1;
      r.noise = b;
    }
    return r.noise;
  }

  // Small, warm room: stereo decaying noise that gets darker as it decays.
  function irBuf(ctx) {
    var r = res(ctx);
    if (!r.ir) {
      var sr = ctx.sampleRate, secs = 1.3, len = Math.floor(sr * secs), pre = Math.floor(sr * 0.014);
      var b = ctx.createBuffer(2, len, sr);
      for (var ch = 0; ch < 2; ch++) {
        var d = b.getChannelData(ch), R = rng(777 + ch * 31), lp = 0;
        for (var i = pre; i < len; i++) {
          var t = (i - pre) / sr;
          var c = 0.2 + 0.72 * Math.min(1, t / 1.1);           // one-pole low-pass, darker over time
          lp = lp * c + (R() * 2 - 1) * (1 - c);
          var fadeIn = Math.min(1, t / 0.004);
          var fadeOut = Math.min(1, (len - i) / (sr * 0.08));
          d[i] = lp * Math.exp(-t * 4.6) * fadeIn * fadeOut * (1 + 1.6 * c);
        }
      }
      r.ir = b;
    }
    return r.ir;
  }

  // Seamless 5 s loop of soft record hiss + a few gentle crackles (chill only).
  function vinylBuf(ctx) {
    var r = res(ctx);
    if (!r.vinyl) {
      var sr = ctx.sampleRate, len = Math.floor(sr * 5), b = ctx.createBuffer(1, len, sr);
      var d = b.getChannelData(0), R = rng(4242), i, lp = 0, white = new Float32Array(len);
      for (i = 0; i < len; i++) white[i] = R() * 2 - 1;
      for (var pass = 0; pass < 2; pass++) {             // circular filtering -> seamless loop
        for (i = 0; i < len; i++) { lp = lp * 0.82 + white[i] * 0.18; if (pass) d[i] = lp * 0.5; }
      }
      var n = 34;
      for (var k = 0; k < n; k++) {
        var pos = Math.floor(R() * (len - 600)), amp = (0.25 + 0.75 * R() * R()) * (R() < 0.5 ? -1 : 1);
        var w = 24 + Math.floor(R() * 90);                  // 0.5 - 2.5 ms raised-cosine "tick"
        for (var j = 0; j < w; j++) {
          var win = 0.5 - 0.5 * Math.cos(2 * Math.PI * j / w);
          d[pos + j] += amp * win * (R() * 2 - 1);
        }
      }
      r.vinyl = b;
    }
    return r.vinyl;
  }

  var WAVES = {
    cos:   { re: [0, 1], im: [0, 0] },                                   // cosine (phase-mod EP)
    sub:   { re: null, im: [0, 1, 0.5, 0.2, 0.07] },                    // warm sub bass
    flute: { re: null, im: [0, 1, 0.16, 0.06, 0.025] },                   // soft lead
    pbass: { re: null, im: [0, 1, 0.55, 0.32, 0.2, 0.12, 0.07, 0.04] },  // pluck bass
    pluck: { re: null, im: [0, 1, 0.55, 0.36, 0.26, 0.2, 0.16, 0.13, 0.11, 0.09, 0.08, 0.07, 0.06] }  // bright pluck
  };
  function setWave(ctx, osc, name) {
    var r = res(ctx);
    try {
      if (!r.waves[name]) {
        var w = WAVES[name], n = w.im.length, re = new Float32Array(n), im = new Float32Array(n);
        for (var i = 0; i < n; i++) { re[i] = w.re ? (w.re[i] || 0) : 0; im[i] = w.im[i] || 0; }
        r.waves[name] = ctx.createPeriodicWave(re, im);
      }
      osc.setPeriodicWave(r.waves[name]);
    } catch (e) {
      osc.type = name === 'pbass' ? 'triangle' : 'sine';
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Envelope helpers. Every gain starts at 0, ramps up, and decays exponentially to FLOOR before
  // its source stops, so nothing ever jumps.
  // ---------------------------------------------------------------------------------------------
  function perc(p, t, peak, att, tau) {
    peak = Math.max(peak, FLOOR * 4);
    var end = t + att + tau * Math.log(peak / FLOOR);
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + att);
    p.exponentialRampToValueAtTime(FLOOR, end);
    return end;
  }
  // attack -> fast decay to peak*k1 over d1 -> slow decay (time constant tau2) -> release at r
  function held(p, t, peak, att, d1, k1, tau2, r, relTau) {
    peak = Math.max(peak, FLOOR * 4);
    var a1 = t + att, a2 = a1 + d1, vr;
    if (r < a1 + 0.01) r = a1 + 0.01;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, a1);
    if (r <= a2) {
      vr = peak * Math.pow(k1, (r - a1) / d1);
      p.exponentialRampToValueAtTime(vr, r);
    } else {
      p.exponentialRampToValueAtTime(peak * k1, a2);
      vr = peak * k1 * Math.exp(-(r - a2) / tau2);
      p.exponentialRampToValueAtTime(Math.max(vr, FLOOR * 2), r);
    }
    vr = Math.max(vr, FLOOR * 2);
    var end = r + relTau * Math.log(vr / FLOOR);
    p.exponentialRampToValueAtTime(FLOOR, end);
    return end;
  }

  // ---------------------------------------------------------------------------------------------
  // Generated player
  // ---------------------------------------------------------------------------------------------
  function GenPlayer(ctx, style, opts) {
    opts = opts || {};
    this.ctx = ctx;
    this.style = style;
    this.offline = isOffline(ctx);
    this.nodes = [];      // fixed graph nodes (disconnected on cleanup)
    this.persist = [];    // long-running sources (LFOs, vinyl loop)
    this.live = [];       // per-note sources still playing / scheduled
    this.lv = {};         // per-instrument level gains
    this.b = {};          // instrument inputs
    this.spb = 60 / style.bpm;
    this.s16 = this.spb / 4;
    this.barDur = this.spb * 4;
    this.swing = style.swing;
    this.startBar = isNum(opts.startBar) ? Math.max(0, Math.floor(opts.startBar)) : 0;
    this.look = LOOKAHEAD;
    this.stopAt = Infinity;
    this.R = rng(style.seed);
    this.noise = noiseBuf(ctx);

    // master: mix -> highpass (no rumble / DC) -> tone low-pass -> compressor -> output
    this.level = style.outGain;
    this.out = ctx.createGain();
    this.out.gain.value = this.level;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -24;
    this.comp.knee.value = 10;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.15;
    this.nodes.push(this.comp);
    this.mix = this.gain(1);
    var hp = this.filter('highpass', 32, -3);
    this.tone = this.filter('lowpass', style.tone, -3);
    var last = hp;
    this.mix.connect(hp);
    for (var e = 0; e < style.eq.length; e++) {        // gentle tone shaping: [freq, gainDb, Q]
      var pk = this.filter('peaking', style.eq[e][0], style.eq[e][2]);
      pk.gain.value = style.eq[e][1];
      last.connect(pk); last = pk;
    }
    last.connect(this.tone); this.tone.connect(this.comp); this.comp.connect(this.out);

    // shared reverb
    this.rev = this.gain(1);
    var conv = ctx.createConvolver();
    conv.buffer = irBuf(ctx);
    this.nodes.push(conv);
    var revOut = this.gain(style.reverb);
    this.rev.connect(conv); conv.connect(revOut); revOut.connect(this.mix);

    style.build(this);

    if (opts.solo && opts.solo.length) {
      for (var k in this.lv) {
        if (Object.prototype.hasOwnProperty.call(this.lv, k) && opts.solo.indexOf(k) < 0) this.lv[k].gain.value = 0;
      }
    }
    this.output = this.out;
  }

  GenPlayer.prototype.gain = function (v) {
    var g = this.ctx.createGain(); g.gain.value = v; this.nodes.push(g); return g;
  };
  GenPlayer.prototype.filter = function (type, f, q) {
    var b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f;
    if (q != null) b.Q.value = q;
    this.nodes.push(b); return b;
  };
  // equal-power mono panner from a ChannelMerger (works in every browser)
  GenPlayer.prototype.pan = function (pan, dest) {
    var input = this.gain(1), m = this.ctx.createChannelMerger(2);
    var a = (clamp(pan, -1, 1) + 1) * Math.PI / 4;
    var gl = this.gain(Math.cos(a) * Math.SQRT2), gr = this.gain(Math.sin(a) * Math.SQRT2);
    this.nodes.push(m);
    input.connect(gl); input.connect(gr);
    gl.connect(m, 0, 0); gr.connect(m, 0, 1);
    m.connect(dest);
    return input;
  };
  // instrument bus: [filters...] -> level -> (pan) -> mix, plus optional reverb send
  GenPlayer.prototype.bus = function (name, level, filters, pan, send, dest) {
    var lv = this.gain(level);
    var head = lv;
    if (filters && filters.length) {
      head = filters[0];
      for (var i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
      filters[filters.length - 1].connect(lv);
    }
    var target = dest || this.mix;
    if (pan) lv.connect(this.pan(pan, target)); else lv.connect(target);
    if (send) { var s = this.gain(send); lv.connect(s); s.connect(this.rev); }
    this.lv[name] = lv;
    this.b[name] = head;
    return head;
  };
  GenPlayer.prototype.lfo = function (freq, depth, param, type) {
    var o = this.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    var g = this.gain(depth);
    o.connect(g); g.connect(param);
    this.nodes.push(o);
    this.persist.push(o);
    return o;
  };
  GenPlayer.prototype.track = function (srcs, nodes, end) {
    var rec = { srcs: srcs, nodes: nodes, end: end, done: false };
    srcs[0].onended = function () {
      rec.done = true;
      for (var i = 0; i < nodes.length; i++) safeDisconnect(nodes[i]);
    };
    this.live.push(rec);
  };
  GenPlayer.prototype.noiseSrc = function (t) {
    var s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.start(t, this.R() * 1.6);
    return s;
  };

  // ----- instruments ---------------------------------------------------------------------------

  // Electric piano: sine carrier phase-modulated (via a cosine on .frequency) by its own pitch.
  // The modulation index decays, so each note starts with a soft "bark" and mellows out.
  GenPlayer.prototype.ep = function (t, midi, vel, len, bus) {
    var ctx = this.ctx, f = mtof(midi);
    var car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), a = ctx.createGain();
    car.frequency.value = f;
    mod.frequency.value = f;
    setWave(ctx, mod, 'cos');
    var bright = clamp(1.15 - (midi - 55) * 0.03, 0.45, 1.3);
    var b0 = (0.8 + 1.5 * vel) * bright, b1 = 0.22 * bright;
    mg.gain.setValueAtTime(b0 * 2.6 * f, t);                 // short bright "bark" ...
    mg.gain.exponentialRampToValueAtTime(b0 * f, t + 0.09);
    mg.gain.exponentialRampToValueAtTime(b1 * f, t + 1.1);   // ... mellowing into a round tone
    var peak = 0.14 * (0.3 + 0.7 * vel) * clamp(1.25 - (midi - 48) * 0.012, 0.8, 1.25);
    var end = held(a.gain, t, peak, 0.004, 0.35, 0.5, 2.6, t + len, 0.075);
    mod.connect(mg); mg.connect(car.frequency); car.connect(a); a.connect(bus || this.b.ep);
    car.start(t); mod.start(t); car.stop(end + 0.02); mod.stop(end + 0.02);
    this.track([car, mod], [car, mod, mg, a], end);
  };

  // Vibraphone-ish bell (goes through the EP tremolo)
  GenPlayer.prototype.vibe = function (t, midi, vel, len) {
    var ctx = this.ctx, f = mtof(midi);
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g1 = ctx.createGain(), g2 = ctx.createGain();
    o1.frequency.value = f; o2.frequency.value = f * 4;
    var end = held(g1.gain, t, 0.11 * vel, 0.003, 0.12, 0.6, 1.8, t + len, 0.12);
    var end2 = perc(g2.gain, t, 0.03 * vel, 0.001, 0.045);
    o1.connect(g1); o2.connect(g2); g1.connect(this.b.vibe); g2.connect(this.b.vibe);
    o1.start(t); o2.start(t); o1.stop(end + 0.02); o2.stop(end2 + 0.02);
    this.track([o1, o2], [o1, o2, g1, g2], end);
  };

  // Soft flute-like lead with delayed vibrato
  GenPlayer.prototype.flute = function (t, midi, vel, len) {
    var ctx = this.ctx, f = mtof(midi);
    var o = ctx.createOscillator(), a = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain();
    setWave(ctx, o, 'flute');
    o.frequency.value = f;
    v.frequency.value = 5.1;
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(0, t + 0.2);
    vg.gain.linearRampToValueAtTime(13, t + 0.7);
    v.connect(vg); vg.connect(o.detune);
    var end = held(a.gain, t, 0.1 * vel, 0.05, 0.25, 0.78, 5, t + len, 0.06);
    o.connect(a); a.connect(this.b.lead);
    o.start(t); v.start(t); o.stop(end + 0.02); v.stop(end + 0.02);
    this.track([o, v], [o, v, vg, a], end);
  };

  // Sub bass (sine + a few harmonics so it is audible on tablet speakers)
  GenPlayer.prototype.sub = function (t, midi, vel, len) {
    var ctx = this.ctx, o = ctx.createOscillator(), a = ctx.createGain();
    setWave(ctx, o, 'sub');
    o.frequency.value = mtof(midi);
    var end = held(a.gain, t, 0.36 * vel, 0.012, 0.35, 0.72, 3, t + len, 0.045);
    o.connect(a); a.connect(this.b.bass);
    o.start(t); o.stop(end + 0.02);
    this.track([o], [o, a], end);
  };

  // Pluck bass with a closing low-pass
  GenPlayer.prototype.pbass = function (t, midi, vel, len) {
    var ctx = this.ctx, f = mtof(midi), o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), a = ctx.createGain();
    setWave(ctx, o, 'pbass');
    o.frequency.value = f;
    lp.type = 'lowpass';
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(Math.min(f * 14, 1800), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 2.4, 140), t + 0.22);
    var end = held(a.gain, t, 0.42 * vel, 0.004, 0.14, 0.62, 1.4, t + len, 0.035);
    o.connect(lp); lp.connect(a); a.connect(this.b.bass);
    o.start(t); o.stop(end + 0.02);
    this.track([o], [o, lp, a], end);
  };

  // Soft kick: sine with a pitch drop, plus a small low-passed "knock"
  GenPlayer.prototype.kick = function (t, vel, f0, f1, tau, knock) {
    var ctx = this.ctx, o = ctx.createOscillator(), a = ctx.createGain();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + 0.09);
    var end = perc(a.gain, t, 0.95 * vel, 0.003, tau);
    o.connect(a); a.connect(this.b.kick);
    o.start(t); o.stop(end + 0.02);
    this.track([o], [o, a], end);
    if (knock > 0) {
      var n = this.noiseSrc(t), g = ctx.createGain();
      var e2 = perc(g.gain, t, knock * vel, 0.001, 0.006);
      n.connect(g); g.connect(this.b.knock);
      n.stop(e2 + 0.02);
      this.track([n], [n, g], e2);
    }
  };

  // Snare: band-passed noise + a short tonal body
  GenPlayer.prototype.snare = function (t, vel, tauN, bodyF) {
    var ctx = this.ctx, n = this.noiseSrc(t), g = ctx.createGain();
    var e1 = perc(g.gain, t, 0.7 * vel, 0.0015, tauN);
    n.connect(g); g.connect(this.b.snare);
    n.stop(e1 + 0.02);
    this.track([n], [n, g], e1);
    var o = ctx.createOscillator(), gb = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(bodyF * 1.12, t);
    o.frequency.exponentialRampToValueAtTime(bodyF, t + 0.05);
    var e2 = perc(gb.gain, t, 0.38 * vel, 0.002, 0.035);
    o.connect(gb); gb.connect(this.b.body);
    o.start(t); o.stop(e2 + 0.02);
    this.track([o], [o, gb], e2);
  };

  // Generic noise hit (hats, brushes, shaker, rim noise)
  GenPlayer.prototype.hit = function (bus, t, vel, att, tau) {
    var n = this.noiseSrc(t), g = this.ctx.createGain();
    var end = perc(g.gain, t, vel, att, tau);
    n.connect(g); g.connect(bus);
    n.stop(end + 0.02);
    this.track([n], [n, g], end);
  };

  // Hand clap: three quick slaps and a tail
  GenPlayer.prototype.clap = function (t, vel) {
    var n = this.noiseSrc(t), g = this.ctx.createGain(), p = g.gain, pk = 0.85 * vel, tt = t;
    p.setValueAtTime(0, t);
    for (var i = 0; i < 3; i++) {
      p.linearRampToValueAtTime(pk * (0.75 + 0.1 * i), tt + 0.0008);
      p.exponentialRampToValueAtTime(pk * 0.1, tt + 0.0095);
      tt += 0.0105;
    }
    p.linearRampToValueAtTime(pk, tt + 0.001);
    var end = tt + 0.001 + 0.048 * Math.log(pk / FLOOR);
    p.exponentialRampToValueAtTime(FLOOR, end);
    n.connect(g); g.connect(this.b.clap);
    n.stop(end + 0.02);
    this.track([n], [n, g], end);
  };

  // Marimba: fundamental + 4th partial (mallet) with pitch-dependent decay
  GenPlayer.prototype.marimba = function (t, midi, vel) {
    var ctx = this.ctx, f = mtof(midi), tau = clamp(0.3 * Math.pow(262 / f, 0.55), 0.08, 0.42);
    var o1 = ctx.createOscillator(), g1 = ctx.createGain();
    o1.frequency.value = f;
    var end = perc(g1.gain, t, 0.2 * vel, 0.0015, tau);
    o1.connect(g1); g1.connect(this.b.mar);
    var srcs = [o1], nodes = [o1, g1];
    if (f * 4 < 9000) {
      var o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.frequency.value = f * 3.98;
      var e2 = perc(g2.gain, t, 0.1 * vel, 0.0008, tau * 0.18);
      o2.connect(g2); g2.connect(this.b.mar);
      o2.start(t); o2.stop(e2 + 0.02);
      srcs.push(o2); nodes.push(o2, g2);
    }
    o1.start(t); o1.stop(end + 0.02);
    this.track(srcs, nodes, end);
  };

  // Celesta-like bell for the happy hook
  GenPlayer.prototype.bell = function (t, midi, vel, len) {
    var ctx = this.ctx, f = mtof(midi);
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    var g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
    o1.frequency.value = f; o2.frequency.value = f * 2; o3.frequency.value = f * 3;
    var end = held(g1.gain, t, 0.13 * vel, 0.002, 0.15, 0.55, 1.2, t + len, 0.09);
    var e2 = perc(g2.gain, t, 0.04 * vel, 0.002, 0.16);
    var e3 = perc(g3.gain, t, 0.018 * vel, 0.001, 0.045);
    o1.connect(g1); o2.connect(g2); o3.connect(g3);
    g1.connect(this.b.bell); g2.connect(this.b.bell); g3.connect(this.b.bell);
    o1.start(t); o2.start(t); o3.start(t);
    o1.stop(end + 0.02); o2.stop(Math.min(end, e2) + 0.02); o3.stop(Math.min(end, e3) + 0.02);
    this.track([o1, o2, o3], [o1, o2, o3, g1, g2, g3], end);
  };

  // Bright filtered pluck (happy hook)
  GenPlayer.prototype.pluck = function (t, midi, vel, len) {
    var ctx = this.ctx, f = mtof(midi), o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), a = ctx.createGain();
    setWave(ctx, o, 'pluck');
    o.frequency.value = f;
    o.detune.value = (this.R() - 0.5) * 6;
    lp.type = 'lowpass';
    lp.Q.value = 3;
    lp.frequency.setValueAtTime(Math.min(f * 9, 7000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 2.2, 700), t + 0.35);
    var end = held(a.gain, t, 0.085 * vel, 0.003, 0.18, 0.5, 0.9, t + len, 0.07);
    o.connect(lp); lp.connect(a); a.connect(this.b.pluck);
    o.start(t); o.stop(end + 0.02);
    this.track([o], [o, lp, a], end);
  };

  // Soft pad note (slow attack)
  GenPlayer.prototype.pad = function (t, midi, vel, len) {
    var ctx = this.ctx, o = ctx.createOscillator(), a = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = mtof(midi);
    o.detune.value = (this.R() - 0.5) * 12;
    var end = held(a.gain, t, 0.05 * vel, 0.3, 0.6, 0.8, 8, t + len, 0.14);
    o.connect(a); a.connect(this.b.pad);
    o.start(t); o.stop(end + 0.02);
    this.track([o], [o, a], end);
  };

  // Noise riser that sweeps up into the next section
  GenPlayer.prototype.riser = function (t, dur) {
    var ctx = this.ctx, n = this.noiseSrc(t), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    n.loop = true;
    bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(6000, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + dur - 0.03);
    var end = t + dur + 0.12;
    g.gain.exponentialRampToValueAtTime(FLOOR, end);
    n.connect(bp); bp.connect(g); g.connect(this.b.fx);
    n.stop(end + 0.02);
    this.track([n], [n, bp, g], end);
  };

  // ----- scheduling ----------------------------------------------------------------------------

  GenPlayer.prototype.start = function (when) {
    if (this.started || this.dead) return;
    var ctx = this.ctx, now = ctx.currentTime, self = this;
    when = isNum(when) ? Math.max(when, now) : now + 0.05;
    this.started = true;
    this.t0 = when;
    this.n = 0;
    for (var i = 0; i < this.persist.length; i++) {
      try { this.persist[i].start(when); } catch (e) { /* ignore */ }
    }
    if (this.style.onStart) this.style.onStart(this, when);
    if (this.offline) {
      var len = ctx.length > 0 ? ctx.length / ctx.sampleRate : 180;
      this.schedule(Math.min(len + 0.2, this.stopAt));
    } else {
      this.tick();
      this.timer = setInterval(function () { self.tick(); }, TICK_MS);
    }
  };

  GenPlayer.prototype.tick = function () {
    if (this.dead) return;
    var ctx = this.ctx;
    try {
      if (ctx.state === 'closed') { this.cleanup(); return; }
      var now = ctx.currentTime;
      if (this.stopping && now >= this.stopAt + STOP_FADE + 0.15) { this.cleanup(); return; }
      // If timer callbacks arrive late (busy main thread), look further ahead.
      var wall = Date.now();
      if (this.lastWall) {
        var gap = (wall - this.lastWall) / 1000;
        if (gap * 1.5 > this.look) this.look = Math.min(MAX_LOOKAHEAD, gap * 1.5);
        else this.look = Math.max(LOOKAHEAD, this.look * 0.998);
      }
      this.lastWall = wall;
      var horizon = now + (pageHidden() ? HIDDEN_LOOKAHEAD : this.look);
      this.schedule(Math.min(horizon, this.stopAt));
      if (this.live.length > 160) this.prune();
    } catch (e) {
      if (global.console && console.warn) console.warn('ReelMusic:', e);
    }
  };

  GenPlayer.prototype.prune = function () {
    var keep = [], now = this.ctx.currentTime;
    for (var i = 0; i < this.live.length; i++) {
      var r = this.live[i];
      if (!r.done && r.end > now - 1) keep.push(r);
    }
    this.live = keep;
  };

  GenPlayer.prototype.schedule = function (until) {
    var now = this.offline ? -1 : this.ctx.currentTime;
    for (var guard = 0; guard < 20000; guard++) {
      var tStep = this.t0 + this.n * this.s16;
      if (tStep >= until) break;
      var bar = this.startBar + Math.floor(this.n / 16), s = this.n % 16;
      if (!this.cur || this.cur.bar !== bar) this.cur = this.composeBar(bar, tStep, now);
      var evs = this.cur.steps[s];
      if (evs) {
        var base = tStep + (s % 2 ? this.swing * this.s16 : 0);
        for (var i = 0; i < evs.length; i++) {
          var e = evs[i], t0 = base + (e.o || 0), t = t0;
          if (t < now + 0.004) {                       // late: only possible in real time
            if (now - t0 > (e.lng ? 1.2 : 0.05)) continue;
            t = now + 0.004;
          }
          try { e.f(t, t0); } catch (err) { /* never break the music for one note */ }
        }
      }
      this.n++;
    }
  };

  GenPlayer.prototype.composeBar = function (bar, tBar, now) {
    var R = rng(hash2(this.style.seed, bar));
    this.R = R;
    var c = this.style.compose(this, bar, R), steps = [];
    for (var i = 0; i < c.ev.length; i++) {
      var e = c.ev[i];
      (steps[e.s] || (steps[e.s] = [])).push(e);
    }
    if (c.auto) { try { c.auto(Math.max(tBar, now + 0.004)); } catch (e2) { /* ignore */ } }
    return { bar: bar, steps: steps };
  };

  GenPlayer.prototype.stop = function (when) {
    if (this.dead) return;
    var ctx = this.ctx, now = ctx.currentTime, self = this;
    when = isNum(when) ? Math.max(when, now) : now;
    if (!this.started) { this.cleanup(); return; }
    if (this.stopping && (when >= this.stopAt || now >= this.stopAt)) return;
    var g = this.out.gain;
    if (this.stopping) { try { g.cancelScheduledValues(when); } catch (e) { /* ignore */ } }
    this.stopping = true;
    this.stopAt = when;
    g.setValueAtTime(this.level, when);
    g.linearRampToValueAtTime(0, when + STOP_FADE);
    var kill = when + STOP_FADE + 0.02, i, j;
    for (i = 0; i < this.live.length; i++) {
      var r = this.live[i];
      if (r.done || r.end <= kill) continue;
      for (j = 0; j < r.srcs.length; j++) { try { r.srcs[j].stop(kill); } catch (e) { /* ignore */ } }
    }
    for (i = 0; i < this.persist.length; i++) { try { this.persist[i].stop(kill); } catch (e) { /* ignore */ } }
    if (!this.offline) {
      // Fallback cleanup if the context never reaches the stop time (suspended / closed).
      clearTimeout(this.killTimer);
      this.killTimer = setTimeout(function () {
        if (!self.dead && self.ctx.state !== 'running') self.cleanup();
      }, (when - now + STOP_FADE) * 1000 + 4000);
    }
  };

  GenPlayer.prototype.cleanup = function () {
    if (this.dead) return;
    this.dead = true;
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    clearTimeout(this.killTimer);
    this.timer = null;
    var i, j;
    for (i = 0; i < this.live.length; i++) {
      var r = this.live[i];
      if (!r.done) {
        for (j = 0; j < r.srcs.length; j++) { try { r.srcs[j].onended = null; r.srcs[j].stop(); } catch (e) { /* ignore */ } }
      }
      for (j = 0; j < r.nodes.length; j++) safeDisconnect(r.nodes[j]);
    }
    this.live = [];
    for (i = 0; i < this.persist.length; i++) { try { this.persist[i].stop(); } catch (e) { /* ignore */ } }
    for (i = 0; i < this.nodes.length; i++) safeDisconnect(this.nodes[i]);
    safeDisconnect(this.out);
    this.cur = null;
  };

  // event helper: at(list, step, offsetSeconds, fn(t, t0), long?)
  function at(E, s, o, f, lng) { E.push({ s: s, o: o, f: f, lng: !!lng }); }

  // ---------------------------------------------------------------------------------------------
  // CHILL - 84 BPM lo-fi: electric piano 9th chords, sub bass, soft swung drums, vinyl
  // Progression (8 bars, planing voicings):  Fmaj9 | Em9 | Dm9 | Cmaj9 | Fmaj9 | E7(b9 b13) | Am9 | Gm9 C13
  // Form after a one-bar intro: A (groove) - B (flute melody) - A' (filtered breakdown) - B' (vibes)
  // ---------------------------------------------------------------------------------------------
  var CH_PROG = [
    [{ s: 0, r: 41, v: [57, 60, 64, 67] }],                                      // Fmaj9
    [{ s: 0, r: 40, v: [55, 59, 62, 66] }],                                      // Em9
    [{ s: 0, r: 38, v: [53, 57, 60, 64] }],                                      // Dm9
    [{ s: 0, r: 36, v: [52, 55, 59, 62] }],                                      // Cmaj9
    [{ s: 0, r: 41, v: [57, 60, 64, 67] }],                                      // Fmaj9
    [{ s: 0, r: 40, v: [56, 60, 62, 65] }],                                      // E7(b9 b13)
    [{ s: 0, r: 33, v: [55, 59, 60, 64] }],                                      // Am9
    [{ s: 0, r: 31, v: [58, 62, 65, 69] }, { s: 8, r: 36, v: [58, 62, 64, 69] }] // Gm9 | C13
  ];
  // melody [step, midi, lengthInSteps]
  var CH_MEL = [
    [[2, 69, 2], [4, 72, 2], [6, 76, 6], [12, 74, 2], [14, 72, 2]],
    [[0, 71, 8], [10, 67, 5]],
    [[2, 69, 2], [4, 72, 2], [6, 76, 4], [10, 77, 2], [12, 76, 4]],
    [[0, 74, 6], [6, 71, 2], [8, 67, 7]],
    [[0, 72, 2], [2, 76, 2], [4, 79, 8], [12, 76, 4]],
    [[0, 77, 4], [4, 76, 4], [8, 74, 4], [12, 72, 4]],
    [[0, 71, 8], [8, 72, 4], [12, 76, 4]],
    [[0, 74, 4], [4, 70, 4], [8, 69, 7]]
  ];
  var CH_MEL2 = CH_MEL.slice();
  CH_MEL2[4] = [[0, 72, 2], [2, 76, 2], [4, 79, 4], [8, 81, 4], [12, 79, 4]];
  CH_MEL2[6] = [[0, 71, 4], [4, 72, 4], [8, 76, 4], [12, 79, 4]];
  CH_MEL2[7] = [[0, 77, 3], [3, 74, 3], [6, 70, 2], [8, 69, 7]];

  function chillFilterCurve(sec, pos) {
    // [startHz, endHz, rampLengthInBars]
    if (sec === 2) {
      if (pos === 0) return [9000, 1300, 0.5];
      if (pos === 1) return [1300, 1300, 0];
      if (pos === 2) return [1300, 3400, 1];
      if (pos === 3) return [3400, 9000, 1];
    }
    return [9000, 9000, 0];
  }

  var CHILL = {
    id: 'chill', name: 'Chill', bpm: 84, swing: 0.17, seed: 8411, tone: 9000,
    outGain: 0.36, reverb: 0.9, previewBar: 9, eq: [[320, -2, 0.9], [2200, 3, 0.7]],
    build: function (P) {
      var ctx = P.ctx;
      // tape bus: gentle pitch "wow" from a slowly modulated short delay
      var tape = P.gain(1), wow = ctx.createDelay(0.05);
      P.nodes.push(wow);
      wow.delayTime.value = 0.006;
      P.lfo(0.32, 0.0016, wow.delayTime);
      var tapeOut = P.filter('lowpass', 10000, -3);
      tape.connect(wow); wow.connect(tapeOut); tapeOut.connect(P.mix);
      var tapeSend = P.gain(0.32); tapeOut.connect(tapeSend); tapeSend.connect(P.rev);

      // EP with stereo tremolo
      var epIn = P.gain(1), m = ctx.createChannelMerger(2), gl = P.gain(0.8), gr = P.gain(0.8);
      P.nodes.push(m);
      epIn.connect(gl); epIn.connect(gr); gl.connect(m, 0, 0); gr.connect(m, 0, 1);
      var trem = P.lfo(3.0, 0.16, gl.gain);
      var inv = P.gain(-0.16); trem.connect(inv); inv.connect(gr.gain);
      var epLv = P.gain(1); m.connect(epLv); epLv.connect(tape);
      P.lv.ep = epLv; P.b.ep = epIn;
      P.b.vibe = epIn;

      P.bus('lead', 1.0, null, -0.2, 0.25, tape);
      P.bus('bass', 0.42, [P.filter('lowpass', 900, -3)], 0, 0);
      P.bus('kick', 0.55, null, 0, 0);
      P.bus('knock', 0.5, [P.filter('lowpass', 2200, -3)], 0, 0, P.lv.kick);   // follows the kick level
      P.bus('snare', 1.15, [P.filter('bandpass', 1900, 0.8), P.filter('lowpass', 7000, -3)], 0.05, 0.3);
      P.bus('body', 0.6, null, 0.05, 0.12);
      P.bus('rim', 0.7, [P.filter('bandpass', 2600, 2.2)], 0.1, 0.25);
      P.bus('hat', 0.5, [P.filter('highpass', 6000, -3), P.filter('lowpass', 11000, -3)], 0.28, 0.05);
      P.bus('brush', 0.38, [P.filter('bandpass', 5200, 0.6)], 0.28, 0.1);
      // vinyl hiss + crackle, very quiet
      var vin = ctx.createBufferSource();
      vin.buffer = vinylBuf(ctx); vin.loop = true;
      P.nodes.push(vin); P.persist.push(vin);
      var vbp = P.filter('bandpass', 2800, 0.55), vg = P.gain(0);
      vin.connect(vbp); vbp.connect(vg);
      P.vinylGain = vg;
      P.bus('vinyl', 1, null, 0, 0);
      vg.connect(P.b.vinyl);
    },
    onStart: function (P, when) {
      var g = P.vinylGain.gain;
      g.setValueAtTime(0, when);
      g.linearRampToValueAtTime(0.035, when + 1.5);
    },
    compose: function (P, bar, R) {
      var E = [], q = P.s16;
      var intro = bar === 0;
      var k = bar - 1, sec = intro ? -1 : Math.floor(k / 8) % 4, pos = intro ? 7 : k % 8;
      var ch = CH_PROG[pos], next = CH_PROG[(pos + 1) % 8][0];
      var brk = sec === 2 && pos < 2;
      var i, s;

      // ----- keys
      function chord(c, step, steps, vel, upperOnly) {
        var notes = upperOnly ? c.v.slice(1) : [c.r + 12].concat(c.v);
        var off = 0;
        for (var n = 0; n < notes.length; n++) {
          var nv = vel * (n === 0 && !upperOnly ? 0.62 : (n === notes.length - 1 ? 1 : 0.84)) * (0.9 + 0.2 * R());
          (function (m, v, o) {
            at(E, step, o, function (t, t0) { P.ep(t, m, v, t0 + steps * q - 0.02 - o - t); }, true);
          })(notes[n], nv, off);
          off += 0.009 + R() * 0.008;            // gentle strum, low to high
        }
      }
      if (ch.length === 2) {
        chord(ch[0], 0, 8, intro ? 0.6 : 0.72);
        chord(ch[1], 8, 8, intro ? 0.62 : 0.7);
      } else if (!brk && (sec === 1 || sec === 3) && pos % 2 === 1) {
        chord(ch[0], 0, 10, 0.74);
        chord(ch[0], 10, 6, 0.48, true);
      } else {
        chord(ch[0], 0, 16, brk ? 0.62 : 0.74);
      }

      // ----- bass
      function bass(step, midi, steps, vel) {
        at(E, step, 0, function (t, t0) { P.sub(t, midi, vel, t0 + steps * q - 0.03 - t); }, steps > 4);
      }
      var r = ch[0].r;
      var appr = next.r + (next.r >= r ? -1 : 1);
      if (appr === r) appr = next.r - 5;
      if (intro) { bass(0, ch[0].r, 7, 0.7); bass(8, ch[1].r, 8, 0.75); }
      else if (pos === 7) { bass(0, ch[0].r, 7, 1); bass(8, ch[1].r, 6, 0.9); bass(14, appr, 2, 0.6); }
      else if (brk) { bass(0, r, 15, 0.9); }
      else if (pos % 2 === 0) { bass(0, r, 7, 1); bass(10, r, 5, 0.8); }
      else { bass(0, r, 6, 1); bass(7, r, 2, 0.55); bass(10, r + 7, 3, 0.72); bass(14, appr, 2, 0.62); }

      // ----- drums
      if (intro) {
        at(E, 4, 0.012, function (t) { P.hit(P.b.brush, t, 0.35, 0.012, 0.05); });
        at(E, 12, 0.012, function (t) { P.hit(P.b.brush, t, 0.42, 0.012, 0.05); });
        at(E, 14, 0, function (t) { P.hit(P.b.brush, t, 0.22, 0.01, 0.035); });
      } else {
        var drop = pos === 7 && (sec === 0 || sec === 2);
        var fill = pos === 7 && (sec === 1 || sec === 3);
        var kicks;
        if (brk) kicks = [];
        else if (pos === 7) kicks = [[0, 1], [8, 0.78]];
        else if (pos % 2 === 1) kicks = [[0, 1], [7, 0.5], [10, 0.85]];
        else if (pos === 2 && sec !== 0) kicks = [[0, 1], [3, 0.42], [10, 0.85]];
        else kicks = [[0, 1], [10, 0.85]];
        for (i = 0; i < kicks.length; i++) {
          (function (v) { at(E, kicks[i][0], 0, function (t) { P.kick(t, v, 118, 52, 0.09, 0.7); }); })(kicks[i][1] * (0.94 + 0.08 * R()));
        }
        var lay = 0.014;   // laid-back backbeat
        if (brk) {
          at(E, 4, lay, function (t) { P.hit(P.b.rim, t, 0.55, 0.001, 0.018); });
          at(E, 12, lay, function (t) { P.hit(P.b.rim, t, 0.6, 0.001, 0.018); });
        } else {
          at(E, 4, lay, function (t) { P.snare(t, 0.82 + 0.06 * R(), 0.055, 185); });
          at(E, 12, lay, function (t) { P.snare(t, 0.9 + 0.06 * R(), drop ? 0.09 : 0.055, 185); });
        }
        if (fill) {
          at(E, 13, lay, function (t) { P.snare(t, 0.16, 0.035, 200); });
          at(E, 14, lay, function (t) { P.snare(t, 0.26, 0.04, 200); });
          at(E, 15, lay, function (t) { P.snare(t, 0.4, 0.045, 200); });
        } else if (pos === 3 && sec !== 2) {
          at(E, 15, lay, function (t) { P.snare(t, 0.18, 0.035, 200); });
        }
        // hats: straight 8ths, softer offbeats, swung 16th ghosts in the B sections
        for (s = 0; s < 16; s += 2) {
          if (drop && s > 12) continue;
          var hv = (s % 4 === 0 ? 0.62 : 0.46) * (0.85 + 0.3 * R());
          if (brk) hv *= 0.7;
          if (s === 14 && pos % 2 === 1 && !drop) {
            (function (v) { at(E, s, 0.004, function (t) { P.hit(P.b.brush, t, v * 1.1, 0.006, 0.07); }); })(hv);
          } else {
            (function (v) { at(E, s, 0.002 * R(), function (t) { P.hit(P.b.hat, t, v, 0.0015, 0.022); }); })(hv);
          }
        }
        if ((sec === 1 || sec === 3) && !fill) {
          for (s = 3; s < 16; s += 4) {
            if (s === 7 || s === 15 || R() < 0.3) {
              (function (v) { at(E, s, 0, function (t) { P.hit(P.b.hat, t, v, 0.002, 0.016); }); })(0.2 + 0.08 * R());
            }
          }
        }
      }

      // ----- melody
      if (sec === 1 || sec === 3) {
        var mel = (sec === 1 ? CH_MEL : CH_MEL2)[pos];
        for (i = 0; i < mel.length; i++) {
          (function (n, v) {
            if (sec === 1) at(E, n[0], 0.006, function (t, t0) { P.flute(t, n[1], v, t0 + n[2] * q - 0.05 - t); }, n[2] > 3);
            else at(E, n[0], 0.004, function (t, t0) { P.vibe(t, n[1], v, t0 + n[2] * q - 0.04 - t); }, n[2] > 3);
          })(mel[i], (sec === 1 ? 0.8 : 0.9) * (0.88 + 0.2 * R()));
        }
      }

      var fc = chillFilterCurve(sec, pos);
      return {
        ev: E,
        auto: function (tb) {
          var f = P.tone.frequency;
          f.setValueAtTime(fc[0], tb);
          if (fc[2] > 0) f.exponentialRampToValueAtTime(fc[1], tb + fc[2] * P.barDur);
        }
      };
    }
  };

  // ---------------------------------------------------------------------------------------------
  // HAPPY - 112 BPM bright cafe pop: marimba arpeggios, pluck bass, claps, shaker, bell hook
  // Progression (8 bars, D major):  D(add9) | A/C# | Bm7 | G(add9) | D | A/C# | Em7 | A7sus4 A7
  // Form after a one-bar intro: A (groove) - B (hook) - C (breakdown + build) - B' (hook + harmony)
  // ---------------------------------------------------------------------------------------------
  var HP_PROG = [
    [{ s: 0, r: 38, arp: [62, 66, 69, 74, 76], pad: [54, 57, 62, 64] }],
    [{ s: 0, r: 37, arp: [61, 64, 69, 73, 76], pad: [52, 57, 61, 64] }],
    [{ s: 0, r: 35, arp: [62, 66, 69, 71, 74], pad: [54, 57, 59, 62] }],
    [{ s: 0, r: 31, arp: [62, 67, 69, 71, 74], pad: [55, 59, 62, 66] }],
    [{ s: 0, r: 38, arp: [62, 66, 69, 74, 76], pad: [54, 57, 62, 64] }],
    [{ s: 0, r: 37, arp: [61, 64, 69, 73, 76], pad: [52, 57, 61, 64] }],
    [{ s: 0, r: 40, arp: [64, 67, 71, 74, 76], pad: [55, 59, 62, 64] }],
    [{ s: 0, r: 33, arp: [64, 67, 69, 74, 76], pad: [55, 57, 62, 64] },
     { s: 8, r: 33, arp: [61, 64, 67, 69, 73], pad: [55, 57, 61, 64] }]
  ];
  var HP_HOOK = [
    [[0, 69, 2], [2, 74, 2], [4, 78, 4], [8, 76, 2], [10, 74, 2], [12, 76, 4]],
    [[0, 76, 6], [6, 73, 2], [8, 69, 7]],
    [[0, 71, 2], [2, 74, 2], [4, 78, 4], [8, 76, 2], [10, 74, 2], [12, 78, 4]],
    [[0, 76, 4], [4, 74, 4], [8, 71, 7]],
    [[0, 69, 2], [2, 74, 2], [4, 78, 4], [8, 81, 4], [12, 78, 4]],
    [[0, 76, 8], [8, 73, 4], [12, 76, 4]],
    [[0, 79, 4], [4, 78, 2], [6, 76, 2], [8, 74, 4], [12, 71, 4]],
    [[0, 76, 4], [4, 74, 4], [8, 73, 7]]
  ];
  // marimba patterns [step, chordToneIndex, velocity]
  var PAT_A = [[0, 0, 0.9], [2, 2, 0.55], [3, 3, 0.5], [6, 1, 0.62], [8, 4, 0.8], [10, 2, 0.55], [11, 3, 0.5], [14, 2, 0.6]];
  var PAT_B = [[0, 0, 0.65], [3, 2, 0.45], [6, 1, 0.45], [10, 3, 0.45], [12, 2, 0.4]];
  var PAT_C = [];
  (function () {
    var shape = [0, 2, 4, 3, 1, 3, 4, 2];
    for (var s = 0; s < 16; s++) PAT_C.push([s, shape[s % 8], s % 2 ? 0.42 : 0.68]);
  })();
  var D_MAJOR = [2, 4, 6, 7, 9, 11, 1];
  function thirdBelow(m) {
    var pc = ((m % 12) + 12) % 12, idx = D_MAJOR.indexOf(pc);
    if (idx < 0) return m - 3;
    var below = D_MAJOR[(idx + 5) % 7];               // two scale steps down
    var d = (pc - below + 12) % 12;
    return m - d;
  }
  function happyFilterCurve(sec, pos) {
    if (sec === 2) {
      if (pos === 0) return [13000, 2200, 0.5];
      if (pos === 1) return [2200, 2200, 0];
      if (pos === 2) return [2200, 5350, 1];
      if (pos === 3) return [5350, 13000, 1];
    }
    return [13000, 13000, 0];
  }

  var HAPPY = {
    id: 'happy', name: 'Happy', bpm: 112, swing: 0.08, seed: 11206, tone: 13000,
    outGain: 0.37, reverb: 0.7, previewBar: 9, eq: [[300, -1.5, 0.9], [3000, 2, 0.7]],
    build: function (P) {
      var ctx = P.ctx;
      // tempo-synced dotted-eighth echo for the bell + marimba
      var dl = ctx.createDelay(1.5), fb = P.gain(0.3), dlf = P.filter('lowpass', 3200, -3);
      P.nodes.push(dl);
      dl.delayTime.value = P.spb * 0.75;
      var echoIn = P.gain(1), echoOut = P.gain(0.55);
      echoIn.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(echoOut);
      echoOut.connect(P.pan(0.35, P.mix));
      P.echo = echoIn;

      P.bus('mar', 1.2, null, -0.12, 0.18);
      P.bus('bell', 0.75, null, 0.15, 0.25);
      P.bus('pluck', 1.7, null, 0.1, 0.22);
      P.bus('pad', 0.65, [P.filter('lowpass', 1700, -3)], 0, 0.3);
      P.bus('bass', 0.5, null, 0, 0);
      P.bus('kick', 0.65, null, 0, 0);
      P.bus('knock', 0.6, [P.filter('lowpass', 3500, -3)], 0, 0, P.lv.kick);
      P.bus('clap', 0.95, [P.filter('bandpass', 1250, 1.0), P.filter('highpass', 600, -3)], 0.04, 0.3);
      P.bus('shk', 0.3, [P.filter('highpass', 4200, -3), P.filter('lowpass', 10000, -3)], 0.38, 0.03);
      P.bus('oh', 0.24, [P.filter('highpass', 6500, -3), P.filter('lowpass', 12500, -3)], -0.3, 0.06);
      P.bus('fx', 0.55, null, 0, 0.3);
      var se = P.gain(0.22); P.lv.mar.connect(se); se.connect(echoIn);
      var be = P.gain(0.3); P.lv.bell.connect(be); be.connect(echoIn);
      var pe = P.gain(0.4); P.lv.pluck.connect(pe); pe.connect(echoIn);
    },
    compose: function (P, bar, R) {
      var E = [], q = P.s16;
      var intro = bar === 0;
      var k = bar - 1, sec = intro ? -1 : Math.floor(k / 8) % 4, pos = intro ? 7 : k % 8;
      var ch = HP_PROG[pos];
      var brk = sec === 2 && pos < 4, build = sec === 2 && pos >= 4;
      var i, s;
      function chordAt(st) { return ch.length > 1 && st >= ch[1].s ? ch[1] : ch[0]; }

      // ----- pad
      for (i = 0; i < ch.length; i++) {
        var c = ch[i], steps = (i + 1 < ch.length ? ch[i + 1].s : 16) - c.s;
        var pv = intro ? 0.6 : brk ? 1 : (sec === 1 || sec === 3) ? 0.6 : 0.75;
        for (var n = 0; n < c.pad.length; n++) {
          (function (m, st, len, v) {
            at(E, st, 0, function (t, t0) { P.pad(t, m, v, t0 + len * q - 0.05 - t); }, true);
          })(c.pad[n], c.s, steps, pv);
        }
      }

      // ----- marimba
      var pat = intro ? PAT_A : (sec === 1 ? PAT_B : sec === 3 ? PAT_B : build ? PAT_C : PAT_A);
      var mv = intro ? 0.8 : (sec === 1 || sec === 3) ? 0.75 : brk ? 0.9 : 1;
      var fillRun = pos === 7 && !intro;
      for (i = 0; i < pat.length; i++) {
        var p = pat[i];
        if (fillRun && p[0] >= 12) continue;
        (function (st, m, v) {
          at(E, st, 0.003 * R(), function (t) { P.marimba(t, m, v); });
        })(p[0], chordAt(p[0]).arp[p[1]], p[2] * mv * (0.9 + 0.2 * R()));
      }
      if (fillRun) {
        var run = chordAt(12).arp;
        for (i = 0; i < 4; i++) {
          (function (st, m, v) { at(E, st, 0, function (t) { P.marimba(t, m, v); }); })(12 + i, run[i + 1], 0.45 + 0.12 * i);
        }
      }

      // ----- bass
      function bass(st, midi, len, vel) {
        at(E, st, 0, function (t, t0) { P.pbass(t, midi, vel, t0 + len * q - 0.03 - t); }, len > 4);
      }
      if (!intro) {
        if (brk) {
          for (i = 0; i < ch.length; i++) bass(ch[i].s, ch[i].r, (i + 1 < ch.length ? ch[i + 1].s : 16) - ch[i].s - 1, 0.85);
        } else if (build) {
          for (s = 0; s < 16; s += 2) bass(s, chordAt(s).r + (s % 4 ? 12 : 0), 2, s % 4 ? 0.62 : 0.9);
        } else {
          var PB = [[0, 0, 3, 1], [3, 0, 2, 0.62], [6, 12, 2, 0.78], [8, 0, 3, 0.92], [11, 0, 2, 0.6], [14, 12, 2, 0.74]];
          for (i = 0; i < PB.length; i++) bass(PB[i][0], chordAt(PB[i][0]).r + PB[i][1], PB[i][2], PB[i][3]);
        }
      }

      // ----- drums
      if (intro) {
        for (s = 2; s < 16; s += 4) {
          (function (v) { at(E, s, 0, function (t) { P.hit(P.b.shk, t, v, 0.008, 0.022); }); })(0.4);
        }
        at(E, 12, 0, function (t) { P.clap(t, 0.5); });
      } else {
        var kicks = brk ? [] : build ? [[0, 1], [4, 0.9], [8, 0.95], [12, 0.9]] :
          (pos % 4 === 3 ? [[0, 1], [8, 0.92], [10, 0.6]] : [[0, 1], [8, 0.92]]);
        for (i = 0; i < kicks.length; i++) {
          (function (v) { at(E, kicks[i][0], 0, function (t) { P.kick(t, v, 150, 50, 0.085, 0.6); }); })(kicks[i][1]);
        }
        var claps = [[4, 0.9], [12, 0.95]];
        if (pos === 7 && build) claps = [[4, 0.85], [8, 0.5], [10, 0.6], [12, 0.75], [13, 0.6], [14, 0.8], [15, 0.95]];
        else if (pos === 7) claps = [[4, 0.9], [12, 0.95], [14, 0.4], [15, 0.6]];
        for (i = 0; i < claps.length; i++) {
          (function (v) { at(E, claps[i][0], 0.004, function (t) { P.clap(t, v); }); })(claps[i][1] * (0.92 + 0.1 * R()));
        }
        for (s = 0; s < 16; s++) {
          var sv = (s % 4 === 2 ? 0.7 : s % 4 === 0 ? 0.42 : 0.28) * (0.85 + 0.3 * R());
          if (brk) sv *= 0.8;
          (function (v) { at(E, s, 0.002 * R(), function (t) { P.hit(P.b.shk, t, v, 0.007, 0.02); }); })(sv);
        }
        if (sec === 3 || build) {
          for (s = 2; s < 16; s += 4) {
            (function (v) { at(E, s, 0, function (t) { P.hit(P.b.oh, t, v, 0.002, 0.055); }); })(0.55 + 0.1 * R());
          }
        }
        if (pos === 0 && (sec === 1 || sec === 3 || (sec === 0 && bar > 1) || bar === 1)) {
          at(E, 0, 0, function (t) { P.hit(P.b.oh, t, 0.5, 0.003, 0.35); });
        }
        if (build && pos === 7) at(E, 0, 0, function (t) { P.riser(t, P.barDur); });
      }

      // ----- hook
      if (sec === 1 || sec === 3) {
        var hk = HP_HOOK[pos];
        for (i = 0; i < hk.length; i++) {
          (function (nn, v) {
            at(E, nn[0], 0.002, function (t, t0) { P.pluck(t, nn[1], v, t0 + nn[2] * q - 0.04 - t); }, nn[2] > 3);
            at(E, nn[0], 0.004, function (t, t0) { P.bell(t, nn[1] + 12, v * 0.6, t0 + nn[2] * q - 0.04 - t); }, nn[2] > 3);
            if (sec === 3) {
              at(E, nn[0], 0.012, function (t, t0) { P.pluck(t, thirdBelow(nn[1]), v * 0.6, t0 + nn[2] * q - 0.05 - t); }, nn[2] > 3);
            }
          })(hk[i], 0.85 * (0.9 + 0.2 * R()));
        }
      }

      var fc = happyFilterCurve(sec, pos);
      return {
        ev: E,
        auto: function (tb) {
          var f = P.tone.frequency;
          f.setValueAtTime(fc[0], tb);
          if (fc[2] > 0) f.exponentialRampToValueAtTime(fc[1], tb + fc[2] * P.barDur);
        }
      };
    }
  };

  var STYLE_DEFS = { chill: CHILL, happy: HAPPY };

  // ---------------------------------------------------------------------------------------------
  // Silent player (for 'off' / missing input) - same interface, does nothing.
  // ---------------------------------------------------------------------------------------------
  function silentPlayer(ctx) {
    var out = ctx.createGain();
    out.gain.value = 0;
    return { output: out, start: noop, stop: function () { safeDisconnect(out); } };
  }

  // ---------------------------------------------------------------------------------------------
  // User song: trim silence, crossfade the end into the start, loop forever.
  // ---------------------------------------------------------------------------------------------
  var loopInfo = typeof WeakMap === 'function' ? new WeakMap() : null;

  function prepareLoop(buf) {
    var known = loopInfo ? loopInfo.get(buf) : buf.__reelLoop;
    if (known) return known;
    var sr = buf.sampleRate, n = buf.length, chs = buf.numberOfChannels, c, i;
    var data = [];
    for (c = 0; c < chs; c++) data.push(buf.getChannelData(c));
    var peak = 0, sum = 0, cnt = 0;
    for (c = 0; c < chs; c++) {
      var d = data[c];
      for (i = 0; i < n; i += 3) { var v = d[i] < 0 ? -d[i] : d[i]; if (v > peak) peak = v; sum += v * v; cnt++; }
    }
    var rms = cnt ? Math.sqrt(sum / cnt) : 0;
    var thr = Math.max(Math.min(0.004, peak * 0.05), 1e-6);
    var first = 0, last = n - 1, found = false;
    for (i = 0; i < n && !found; i++) { for (c = 0; c < chs; c++) { if (Math.abs(data[c][i]) > thr) { first = i; found = true; break; } } }
    found = false;
    for (i = n - 1; i >= 0 && !found; i--) { for (c = 0; c < chs; c++) { if (Math.abs(data[c][i]) > thr) { last = i; found = true; break; } } }
    var s = Math.max(0, first - Math.floor(sr * 0.005));
    var e = Math.min(n, last + Math.floor(sr * 0.03));
    var L = e - s;
    var info;
    var X = Math.min(Math.floor(sr * 0.35), Math.floor(L / 4));
    if (L < sr * 0.5 || X < 64) {
      info = { offset: 0, loopStart: 0, loopEnd: n / sr, peak: peak, rms: rms };
    } else {
      // Equal-power crossfade of the song's last X samples with its first X samples.
      // Playback: start at s, play through, loop back to s + X. The seam is continuous.
      for (c = 0; c < chs; c++) {
        var dd = data[c];
        for (var j = 0; j < X; j++) {
          var w = (j + 0.5) / X;
          dd[e - X + j] = dd[e - X + j] * Math.cos(w * Math.PI / 2) + dd[s + j] * Math.sin(w * Math.PI / 2);
        }
      }
      info = { offset: s / sr, loopStart: (s + X) / sr, loopEnd: e / sr, peak: peak, rms: rms };
    }
    if (loopInfo) loopInfo.set(buf, info); else { try { buf.__reelLoop = info; } catch (e2) { /* ignore */ } }
    return info;
  }

  function BufferPlayer(ctx, buf) {
    this.ctx = ctx;
    this.info = prepareLoop(buf);
    this.buf = buf;
    // Bring songs to roughly the level of the built-in music.
    var norm = 1;
    if (this.info.rms > 0) norm = Math.min(0.11 / this.info.rms, 0.5 / Math.max(this.info.peak, 1e-6));
    this.norm = ctx.createGain(); this.norm.gain.value = clamp(norm, 0.02, 8);
    this.fade = ctx.createGain(); this.fade.gain.value = 0;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 8; this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004; this.comp.release.value = 0.25;
    this.level = 0.55;
    this.out = ctx.createGain(); this.out.gain.value = this.level;
    this.norm.connect(this.fade); this.fade.connect(this.comp); this.comp.connect(this.out);
    this.output = this.out;
  }
  BufferPlayer.prototype.start = function (when) {
    if (this.started || this.dead) return;
    var ctx = this.ctx, now = ctx.currentTime, self = this, info = this.info;
    when = isNum(when) ? Math.max(when, now) : now + 0.05;
    this.started = true;
    var src = this.src = ctx.createBufferSource();
    src.buffer = this.buf;
    src.loop = true;
    src.loopStart = info.loopStart;
    src.loopEnd = info.loopEnd;
    src.connect(this.norm);
    src.onended = function () { self.cleanup(); };
    this.fade.gain.setValueAtTime(0, when);
    this.fade.gain.linearRampToValueAtTime(1, when + 0.6);
    src.start(when, info.offset);
  };
  BufferPlayer.prototype.stop = function (when) {
    if (this.dead) return;
    var ctx = this.ctx, now = ctx.currentTime, self = this;
    when = isNum(when) ? Math.max(when, now) : now;
    if (!this.started) { this.cleanup(); return; }
    if (this.stopping && (when >= this.stopAt || now >= this.stopAt)) return;
    var g = this.out.gain;
    if (this.stopping) { try { g.cancelScheduledValues(when); } catch (e) { /* ignore */ } }
    this.stopping = true;
    this.stopAt = when;
    g.setValueAtTime(this.level, when);
    g.linearRampToValueAtTime(0, when + STOP_FADE);
    try { this.src.stop(when + STOP_FADE + 0.02); } catch (e) { /* ignore */ }
    if (!isOffline(ctx)) {
      clearTimeout(this.killTimer);
      this.killTimer = setTimeout(function () {
        if (!self.dead && self.ctx.state !== 'running') self.cleanup();
      }, (when - now + STOP_FADE) * 1000 + 4000);
    }
  };
  BufferPlayer.prototype.cleanup = function () {
    if (this.dead) return;
    this.dead = true;
    clearTimeout(this.killTimer);
    if (this.src) { try { this.src.onended = null; this.src.stop(); } catch (e) { /* ignore */ } safeDisconnect(this.src); }
    safeDisconnect(this.norm); safeDisconnect(this.fade); safeDisconnect(this.comp); safeDisconnect(this.out);
  };

  // ---------------------------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------------------------
  function wrap(p) {
    return {
      output: p.output,
      start: function (when) { p.start(when); },
      stop: function (when) { p.stop(when); },
      _impl: p
    };
  }

  function create(ctx, styleId, opts) {
    var style = STYLE_DEFS[styleId];
    if (!ctx) throw new Error('ReelMusic.create needs an AudioContext');
    if (!style) {
      if (styleId === 'off' || styleId == null) return silentPlayer(ctx);
      style = CHILL;
    }
    return wrap(new GenPlayer(ctx, style, opts));
  }

  function fromBuffer(ctx, audioBuffer) {
    if (!ctx) throw new Error('ReelMusic.fromBuffer needs an AudioContext');
    if (!audioBuffer || !(audioBuffer.length > 0)) return silentPlayer(ctx);
    return wrap(new BufferPlayer(ctx, audioBuffer));
  }

  // Let Web Audio play even when the device is in silent mode (iOS 17+ Safari; no-op elsewhere).
  function preferPlaybackSession() {
    try {
      var s = global.navigator && global.navigator.audioSession;
      if (s && (s.type === 'auto' || !s.type)) s.type = 'playback';
    } catch (e) { /* ignore */ }
  }

  var currentPreview = null;

  function preview(styleId, seconds) {
    if (currentPreview) { currentPreview.stop(); currentPreview = null; }
    var handle = { stop: noop, onended: null, ended: null };
    var resolveEnded = noop;
    if (typeof Promise === 'function') handle.ended = new Promise(function (res2) { resolveEnded = res2; });
    var style = STYLE_DEFS[styleId];
    var AC = getAC();
    if (!style || !AC) { resolveEnded(); return handle; }
    seconds = isNum(seconds) && seconds > 0 ? Math.min(seconds, 300) : 8;
    preferPlaybackSession();

    var ctx;
    try { ctx = new AC(); } catch (e) { resolveEnded(); return handle; }
    // Unlock audio on older iOS: play one silent sample inside the tap.
    try {
      var sb = ctx.createBufferSource();
      sb.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      sb.connect(ctx.destination);
      sb.start(0);
    } catch (e) { /* ignore */ }
    try { var pr = ctx.resume && ctx.resume(); if (pr && pr.then) pr.then(begin, noop); } catch (e) { /* ignore */ }

    var st = { began: false, done: false, player: null, tEnd: 0, poll: null, wait: null, guard: null };

    function closeCtx() {
      try { var c = ctx.close && ctx.close(); if (c && c.then) c.then(noop, noop); } catch (e) { /* ignore */ }
    }
    function finish(manual) {
      if (st.done) return;
      st.done = true;
      clearInterval(st.poll); clearTimeout(st.wait); clearTimeout(st.guard);
      if (currentPreview === handle) currentPreview = null;
      if (st.player) {
        try { st.player.stop(manual ? ctx.currentTime : undefined); } catch (e) { /* ignore */ }
        setTimeout(closeCtx, 400);
      } else {
        closeCtx();
      }
      try { if (typeof handle.onended === 'function') handle.onended(); } catch (e) { /* ignore */ }
      resolveEnded();
    }
    function begin() {
      if (st.began || st.done) return;
      st.began = true;
      var t0 = ctx.currentTime + 0.06, tEnd = t0 + seconds;
      var env = ctx.createGain(), g = env.gain, fo = Math.min(1.5, seconds * 0.25);
      g.setValueAtTime(0, t0);
      g.linearRampToValueAtTime(1, t0 + Math.min(0.4, seconds * 0.1));
      g.setValueAtTime(1, tEnd - fo);
      g.linearRampToValueAtTime(0, tEnd);
      var player = create(ctx, styleId, { startBar: style.previewBar });
      player.output.connect(env);
      env.connect(ctx.destination);
      player.start(t0);
      player.stop(tEnd);
      st.player = player;
      st.tEnd = tEnd;
      st.poll = setInterval(function () {
        if (ctx.state === 'closed' || ctx.currentTime >= st.tEnd + 0.1) finish(false);
      }, 200);
      st.guard = setTimeout(function () { finish(false); }, (seconds + 6) * 1000);
    }

    handle.stop = function () { finish(true); };
    currentPreview = handle;
    if (ctx.state === 'running') begin();
    else st.wait = setTimeout(begin, 300);   // schedule anyway; it plays once the context runs
    return handle;
  }

  global.ReelMusic = {
    version: 1,
    styles: [
      { id: 'chill', name: 'Chill', bpm: CHILL.bpm },
      { id: 'happy', name: 'Happy', bpm: HAPPY.bpm }
    ],
    create: create,
    fromBuffer: fromBuffer,
    preview: preview
  };
})(typeof window !== 'undefined' ? window : this);
