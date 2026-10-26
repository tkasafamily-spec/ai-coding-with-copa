/*
 * Recipe Reel — render engine (window.ReelEngine)
 *
 * Everything happens on the device: planning, drawing every frame on a <canvas>,
 * mixing clip sound + music with Web Audio, and recording with MediaRecorder.
 * Plain JS, no modules, no network. Primary target: Safari on iPad.
 *
 * Public API
 *   ReelEngine.LOOKS                -> [{ id, name, accent, accentInk, bg1, bg2 }]
 *   ReelEngine.canvasSize(settings) -> { width, height }
 *   ReelEngine.supported()          -> { ok, reason, mimeType, ext }
 *   ReelEngine.plan(project)        -> Plan (pure, synchronous)
 *   ReelEngine.begin({ project, media, musicBlob, canvas }) -> Session
 *        call synchronously inside the "Edit my video" tap handler
 *   Session.run({ onProgress, onStatus }) -> Promise<Result>
 *   Session.cancel()
 *   Session.setMonitor(on)
 *   Session.resumeFromTap()   call from a tap when a 'paused' status has needsTap: true
 */
(function (root) {
  'use strict';

  var VERSION = '1.0.0';
  var noop = function () {};

  // ------------------------------------------------------------------ looks
  var LOOKS = [
    { id: 'tomato', name: 'Tomato', accent: '#E4572E', accentInk: '#FFFFFF', bg1: '#2A0D07', bg2: '#A3361A' },
    { id: 'basil', name: 'Basil', accent: '#3E9F5A', accentInk: '#FFFFFF', bg1: '#0B1B11', bg2: '#2D6B41' },
    { id: 'cocoa', name: 'Cocoa', accent: '#D29A5E', accentInk: '#22140B', bg1: '#1B100A', bg2: '#6A4226' },
    { id: 'berry', name: 'Berry', accent: '#D9457F', accentInk: '#FFFFFF', bg1: '#1D0817', bg2: '#83235B' }
  ];

  var FONT_DISPLAY = '"Fraunces", Georgia, "Times New Roman", serif';
  var FONT_TEXT = '"Figtree", "Avenir Next", "Helvetica Neue", Arial, sans-serif';

  var FPS = 30;
  var XFADE = 0.35;          // crossfade between segments (s)
  var FADE_IN = 0.5;         // from black at the start (s)
  var FADE_OUT = 0.5;        // to black at the end (s)
  var TAIL = 0.3;            // keep drawing after the last frame (s)
  var STALL_SECS = 6;        // a clip with no progress for this long is skipped

  // ------------------------------------------------------------------ small utils
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function num(v, d) {
    if (typeof v === 'string' && v.trim() !== '') v = Number(v);
    return (typeof v === 'number' && isFinite(v)) ? v : d;
  }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function txt(v) {
    if (v == null) return '';
    if (typeof v === 'number' && isFinite(v)) return String(v);
    if (typeof v !== 'string') return '';
    return v.replace(/\s+/g, ' ').trim();
  }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutBack(t) { t = clamp(t, 0, 1); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function hexRgb(hex) {
    var h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) { var c = hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mkErr(code, message) { var e = new Error(message); e.code = code; return e; }
  function deferred() {
    var d = {};
    d.promise = new Promise(function (res, rej) { d.resolve = res; d.reject = rej; });
    return d;
  }
  function now() { return (root.performance && performance.now) ? performance.now() : Date.now(); }
  function mkCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }
  function freeCanvas(c) { try { if (c) { c.width = 0; c.height = 0; } } catch (e) { /* ignore */ } }
  function dbg() {
    if (!ReelEngine.debug) return;
    try { console.log.apply(console, ['[ReelEngine]'].concat([].slice.call(arguments))); } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------ settings
  var SHAPES = { tall: 1, square: 1, wide: 1 };
  var MUSIC = { off: 1, chill: 1, happy: 1, mine: 1 };

  function lookById(id) {
    for (var i = 0; i < LOOKS.length; i++) if (LOOKS[i].id === id) return LOOKS[i];
    return LOOKS[0];
  }

  function normSettings(s) {
    s = (s && typeof s === 'object') ? s : {};
    var outro = txt(s.outroText);
    return {
      shape: SHAPES[s.shape] ? s.shape : 'tall',
      quality: String(s.quality) === '720' ? '720' : '1080',
      fit: Math.max(0, num(s.fit, 60)),
      look: lookById(s.look).id,
      music: MUSIC[s.music] ? s.music : 'chill',
      musicVolume: clamp(num(s.musicVolume, 0.5), 0, 1),
      clipSound: s.clipSound !== false,
      showTitle: s.showTitle !== false,
      showIngredients: s.showIngredients !== false,
      showOutro: s.showOutro !== false,
      outroText: outro || 'Enjoy!'
    };
  }

  function canvasSize(settings) {
    var s = normSettings(settings);
    var hd = s.quality !== '720';
    if (s.shape === 'square') return hd ? { width: 1080, height: 1080 } : { width: 720, height: 720 };
    if (s.shape === 'wide') return hd ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
    return hd ? { width: 1080, height: 1920 } : { width: 720, height: 1280 };
  }

  // ------------------------------------------------------------------ planning
  function textCardDur(t) { return r3(clamp(2.5 + 0.035 * t.length, 3, 5.5)); }

  function ingredientList(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var t = (it && typeof it === 'object') ? txt(it.text) : txt(it);
      if (t) out.push(t);
    }
    return out;
  }

  function normMedia(m) {
    if (!m || typeof m !== 'object') return null;
    if (m.id == null || m.id === '') return null;
    var type = typeof m.type === 'string' ? m.type : '';
    var kind = (m.kind === 'video' || m.kind === 'image') ? m.kind :
      (/^video\//i.test(type) ? 'video' : (/^image\//i.test(type) ? 'image' : null));
    if (!kind) return null;
    var out = { id: String(m.id), kind: kind, sound: m.sound !== false };
    if (kind === 'image') {
      out.photoSeconds = r3(clamp(num(m.photoSeconds, 3), 1, 30));
      return out;
    }
    var d = num(m.duration, NaN);
    var ts = num(m.trimStart, 0), te = num(m.trimEnd, NaN);
    if (!(d > 0)) {
      if (te > 0) d = te; else return null;
    }
    ts = clamp(ts, 0, d);
    te = isFinite(te) ? clamp(te, 0, d) : d;
    if (te < ts) { var tmp = te; te = ts; ts = tmp; }
    if (te - ts < 0.1) { ts = 0; te = d; }
    if (te - ts < 0.05) return null;
    out.duration = d;
    out.trimStart = r3(ts);
    out.trimEnd = r3(te);
    var sp = m.speed;
    if (sp === 'auto' || sp == null || sp === '') out.speed = 'auto';
    else {
      var n = num(sp, NaN);
      out.speed = n > 0 ? clamp(n, 0.5, 4) : 'auto';
    }
    return out;
  }

  function emptyPlan(fit) {
    return { segments: [], total: 0, rawTotal: 0, autoSpeed: null, trimmed: false, overBy: 0, fit: fit };
  }

  function planProject(project) {
    var p = (project && typeof project === 'object') ? project : {};
    var s = normSettings(p.settings);
    var dish = (p.dish && typeof p.dish === 'object') ? p.dish : {};
    var dishName = txt(dish.name), subtitle = txt(dish.subtitle);
    var items = ingredientList(p.ingredients);
    var segs = [];

    if (s.showTitle && dishName) {
      segs.push({ type: 'title', dur: 2.5, label: 'Title', text: dishName, subtitle: subtitle, _min: 1.5 });
    }
    if (s.showIngredients && items.length) {
      var ing = { type: 'ingredients', dur: r3(clamp(2 + 0.55 * items.length, 3.5, 10)), label: 'Ingredients',
        text: 'Ingredients', items: items, _min: 3 };
      var im = normMedia(p.ingredientsMedia);
      if (im) {
        ing.mediaId = im.id;
        ing.kind = im.kind;
        if (im.kind === 'video') {
          ing.trimStart = im.trimStart;
          ing.trimEnd = im.trimEnd;
          ing.speed = im.speed === 'auto' ? 1 : im.speed;
          ing.sound = !!(s.clipSound && im.sound);
        }
      }
      segs.push(ing);
    }

    var steps = [];
    var list = Array.isArray(p.steps) ? p.steps : [];
    for (var i = 0; i < list.length; i++) {
      var st = list[i];
      if (!st || typeof st !== 'object') continue;
      var t = txt(st.text), m = normMedia(st.media), seg = null;
      if (m && m.kind === 'video') {
        seg = { type: 'step-clip', text: t, mediaId: m.id, kind: 'video', trimStart: m.trimStart, trimEnd: m.trimEnd,
          speed: m.speed === 'auto' ? 1 : m.speed, sound: !!(s.clipSound && m.sound),
          _L: m.trimEnd - m.trimStart, _auto: m.speed === 'auto' };
      } else if (m && m.kind === 'image') {
        seg = { type: 'step-photo', dur: m.photoSeconds, text: t, mediaId: m.id, kind: 'image' };
      } else if (t) {
        seg = { type: 'step-text', dur: textCardDur(t), text: t };
      }
      if (seg) {
        seg.stepId = st.id != null ? String(st.id) : '';
        steps.push(seg);
      }
    }
    for (var k = 0; k < steps.length; k++) {
      steps[k].stepNumber = k + 1;
      steps[k].stepCount = steps.length;
      steps[k].label = String(k + 1);
      segs.push(steps[k]);
    }
    if (!segs.length) return emptyPlan(s.fit);
    if (s.showOutro) segs.push({ type: 'outro', dur: 2.5, label: 'End', text: s.outroText, dishName: dishName, _min: 1.5 });

    // what it would be with every clip at 1x, untouched by fitting
    var rawTotal = 0;
    segs.forEach(function (sg) { rawTotal += sg.type === 'step-clip' ? sg._L : sg.dur; });

    var fitRes = applyFit(segs, s.fit);

    var total = 0;
    segs.forEach(function (sg) {
      sg.dur = r3(sg.dur);
      sg.start = r3(total);
      total += sg.dur;
      delete sg._L; delete sg._auto; delete sg._min;
    });
    total = r3(total);
    var over = s.fit > 0 ? total - s.fit : 0;
    return {
      segments: segs,
      total: total,
      rawTotal: r3(rawTotal),
      autoSpeed: fitRes.autoSpeed,
      trimmed: fitRes.trimmed,
      overBy: over > 0.1 ? r2(over) : 0,
      fit: s.fit
    };
  }

  // The shortest an auto clip may get when it must also be shortened: long enough to read its
  // caption (1 s plus a little per character, 1–3.5 s), and never more than the whole clip at 4x.
  function clipFloor(a) {
    var need = a.text ? clamp(1 + 0.045 * a.text.length, 1, 3.5) : 1;
    return Math.min(a._L / 4, need);
  }

  function applyFit(segs, fit) {
    var cards = [], autos = [], others = 0;
    segs.forEach(function (sg) {
      if (sg._min != null) cards.push(sg);
      else if (sg.type === 'step-clip' && sg._auto) autos.push(sg);
      else {
        if (sg.type === 'step-clip') sg.dur = sg._L / sg.speed;
        others += sg.dur;
      }
    });
    var res = { autoSpeed: null, trimmed: false };
    if (!(fit > 0)) {
      autos.forEach(function (a) { a.speed = 1; a.dur = a._L; });
      res.autoSpeed = autos.length ? 1 : null;
      return res;
    }
    var cardSum = 0, shrinkable = 0, floorAuto = 0;
    cards.forEach(function (c) { cardSum += c.dur; shrinkable += c.dur - c._min; });
    autos.forEach(function (a) { floorAuto += clipFloor(a); });
    // Shrink the cards (toward their minimums) only when the fixed parts can't fit otherwise.
    var need = cardSum + others + floorAuto - fit;
    if (need > 1e-9 && shrinkable > 0) {
      var k = Math.min(1, need / shrinkable);
      cardSum = 0;
      cards.forEach(function (c) { c.dur = c.dur - k * (c.dur - c._min); cardSum += c.dur; });
    }
    if (!autos.length) return res;

    var room = fit - (cardSum + others);
    var sumL = 0;
    autos.forEach(function (a) { sumL += a._L; });
    var raw = room > 0 ? sumL / room : Infinity;
    var sp = r2(clamp(raw, 1, 4));
    res.autoSpeed = sp;
    if (raw > 4 + 1e-9) {
      // Even at 4x it doesn't fit: shorten every auto clip by the same factor (keep the middle),
      // never below the time needed to read its caption (see clipFloor). What's left is overBy.
      var outs = autos.map(function (a) { return a._L / 4; });
      var floors = autos.map(clipFloor);
      var floorSum = floors.reduce(function (x, y) { return x + y; }, 0);
      var target = Math.max(room, floorSum);
      var lo = 0, hi = 1;
      for (var it = 0; it < 60; it++) {
        var mid = (lo + hi) / 2, g = 0;
        for (var j = 0; j < outs.length; j++) g += Math.max(outs[j] * mid, floors[j]);
        if (g > target) hi = mid; else lo = mid;
      }
      autos.forEach(function (a, j) {
        var o2 = Math.max(outs[j] * lo, floors[j]);
        var L2 = o2 * 4;
        if (L2 < a._L - 1e-3) {
          res.trimmed = true;
          var c = (a.trimStart + a.trimEnd) / 2;
          a.trimStart = r3(c - L2 / 2);
          a.trimEnd = r3(c + L2 / 2);
          a._L = a.trimEnd - a.trimStart;
        }
        a.speed = 4;
        a.dur = a._L / 4;
      });
    } else {
      autos.forEach(function (a) { a.speed = sp; a.dur = a._L / sp; });
    }
    return res;
  }

  // ------------------------------------------------------------------ feature detection
  function isAppleWebKit() {
    var ua = (root.navigator && navigator.userAgent) || '';
    if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return true;
    return /AppleWebKit/.test(ua) && !/Chrome\/|Chromium|Edg\/|Android/.test(ua);
  }
  // Before Safari 27, WebKit's MediaElementAudioSourceNode did no sample-rate conversion for a
  // media element playing at a rate other than 1x (WebKit bug 240405, fixed in Safari 27), so a
  // sped-up clip's own sound came out choppy and out of step. There, only 1x clips keep their sound.
  // (Home Screen apps and other iOS browsers have no Version/: treat them as older.)
  function webkitMajor() {
    var ua = (root.navigator && navigator.userAgent) || '';
    var m = /Version\/(\d+)/.exec(ua) || /OS (\d+)_\d+(?:_\d+)? like Mac OS X/.exec(ua);
    return m ? Number(m[1]) : 0;
  }
  var RATE_SOUND_OK = !isAppleWebKit() || webkitMajor() >= 27;

  function pickMime() {
    var MR = root.MediaRecorder;
    if (!MR || typeof MR.isTypeSupported !== 'function') return '';
    var list = [
      'video/mp4;codecs=avc1.640028,mp4a.40.2',
      'video/mp4;codecs=avc1.4D401F,mp4a.40.2',
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1'
    ];
    if (isAppleWebKit()) list.push('video/mp4');
    list.push('video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4');
    for (var i = 0; i < list.length; i++) {
      try { if (MR.isTypeSupported(list[i])) return list[i]; } catch (e) { /* ignore */ }
    }
    return '';
  }

  function extFor(mime) {
    if (/mp4|quicktime/i.test(mime || '')) return 'mp4';
    if (/webm|matroska/i.test(mime || '')) return 'webm';
    return isAppleWebKit() ? 'mp4' : 'webm';
  }

  function supported() {
    var res = { ok: false, reason: '', mimeType: '', ext: '' };
    try {
      var AC = root.AudioContext || root.webkitAudioContext;
      var cap = root.HTMLCanvasElement && (HTMLCanvasElement.prototype.captureStream || HTMLCanvasElement.prototype.mozCaptureStream);
      if (!root.MediaRecorder) {
        res.reason = 'This browser can’t make videos. On an iPad, update it and use Safari. On a computer, use Chrome, Edge or Firefox.';
      } else if (!cap) {
        res.reason = 'This browser can’t record the video. Please update your iPad, or try Chrome on a computer.';
      } else if (!AC || !AC.prototype || typeof AC.prototype.createMediaStreamDestination !== 'function') {
        res.reason = 'This browser can’t record sound for the video. Please update your iPad, or try Chrome on a computer.';
      } else if (!root.MediaStream) {
        res.reason = 'This browser can’t record video. Please update your iPad, or try Chrome on a computer.';
      } else {
        res.ok = true;
        res.mimeType = pickMime();
        res.ext = extFor(res.mimeType);
      }
    } catch (e) {
      res.ok = false;
      res.reason = 'This browser can’t make videos.';
    }
    return res;
  }

  // ------------------------------------------------------------------ module singletons (audio + pool videos)
  var shared = { ctx: null, pool: null, active: null };

  function getAudioContext() {
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    // iOS can leave a context stuck in 'interrupted' (resume() never brings it back, WebKit bug
    // 273511): start the next render with a fresh one, made inside this tap. getPool follows it.
    if (shared.ctx && shared.ctx.state === 'interrupted') {
      try { var c = shared.ctx.close(); if (c && c.catch) c.catch(noop); } catch (e) { /* ignore */ }
      shared.ctx = null;
    }
    if (shared.ctx && shared.ctx.state !== 'closed') return shared.ctx;
    try { shared.ctx = new AC(); } catch (e) { shared.ctx = null; }
    return shared.ctx;
  }

  function getPool(ctx) {
    if (shared.pool && shared.pool.ctx === ctx) return shared.pool.slots;
    if (shared.pool) {
      shared.pool.slots.forEach(function (s) {
        try { s.el.pause(); s.el.removeAttribute('src'); s.el.load(); } catch (e) { /* ignore */ }
        try { if (s.el.parentNode) s.el.parentNode.removeChild(s.el); } catch (e) { /* ignore */ }
      });
    }
    var slots = [0, 1].map(function (k) {
      var el = document.createElement('video');
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      el.setAttribute('x-webkit-airplay', 'deny');
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('data-reel-pool', String(k));
      el.playsInline = true;
      el.preload = 'auto';
      el.muted = false;
      el.defaultMuted = false;
      el.volume = 1;
      el.controls = false;
      try { el.disableRemotePlayback = true; } catch (e) { /* ignore */ }
      el.tabIndex = -1;
      el.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;';
      (document.body || document.documentElement).appendChild(el);
      var gain = ctx.createGain();
      gain.gain.value = 0;
      var src = null;
      try { src = ctx.createMediaElementSource(el); src.connect(gain); } catch (e) { src = null; }
      return { el: el, src: src, gain: gain, url: null };
    });
    shared.pool = { ctx: ctx, slots: slots };
    return slots;
  }

  // An AudioParam ramp whose current value we can always compute ourselves
  // (reading AudioParam.value during automation isn't reliable everywhere).
  function makeRamp(ctx, param, initial) {
    var st = { v0: initial, v1: initial, t0: 0, t1: 0 };
    try { param.cancelScheduledValues(0); } catch (e) { /* ignore */ }
    try { param.setValueAtTime(initial, ctx.currentTime); } catch (e) { /* ignore */ }
    try { param.value = initial; } catch (e) { /* ignore */ }
    function valueAt(t) {
      if (t >= st.t1) return st.v1;
      if (t <= st.t0) return st.v0;
      return st.v0 + (st.v1 - st.v0) * (t - st.t0) / (st.t1 - st.t0);
    }
    return {
      to: function (target, secs) {
        var t = ctx.currentTime, cur = valueAt(t);
        secs = Math.max(0, secs || 0);
        try {
          param.cancelScheduledValues(t);
          param.setValueAtTime(cur, t);
          if (secs > 0) param.linearRampToValueAtTime(target, t + secs);
          else param.setValueAtTime(target, t);
        } catch (e) {
          try { param.value = target; } catch (e2) { /* ignore */ }
        }
        st = { v0: cur, v1: target, t0: t, t1: t + secs };
      },
      value: function () { return valueAt(ctx.currentTime); }
    };
  }

  function decodeAudio(ctx, ab) {
    return new Promise(function (resolve, reject) {
      var done = false;
      function ok(b) { if (!done) { done = true; resolve(b); } }
      function bad(e) { if (!done) { done = true; reject(e || new Error('decode failed')); } }
      try {
        var p = ctx.decodeAudioData(ab, ok, bad);
        if (p && typeof p.then === 'function') p.then(ok, bad);
      } catch (e) { bad(e); }
    });
  }

  function blobToArrayBuffer(blob) {
    if (blob && typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    return new Promise(function (resolve, reject) {
      try {
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = function () { reject(fr.error || new Error('read failed')); };
        fr.readAsArrayBuffer(blob);
      } catch (e) { reject(e); }
    });
  }

  // ------------------------------------------------------------------ WebM duration fix
  // Chrome's MediaRecorder writes WebM without a Duration, so players can't seek. Insert one.
  function readVint(b, pos) {
    var first = b[pos];
    if (first === undefined || first === 0) return null;
    var len = 1, mask = 0x80;
    while (!(first & mask)) { len++; mask >>= 1; }
    var value = first & (mask - 1), allOnes = value === mask - 1;
    for (var i = 1; i < len; i++) {
      var x = b[pos + i];
      if (x === undefined) return null;
      value = value * 256 + x;
      if (x !== 0xff) allOnes = false;
    }
    return { len: len, value: value, unknown: allOnes };
  }
  function readId(b, pos) {
    var first = b[pos];
    if (first === undefined || first === 0) return null;
    var len = 1, mask = 0x80;
    while (len <= 4 && !(first & mask)) { len++; mask >>= 1; }
    if (len > 4) return null;
    var id = 0;
    for (var i = 0; i < len; i++) { if (b[pos + i] === undefined) return null; id = id * 256 + b[pos + i]; }
    return { len: len, id: id };
  }
  function encodeSize(v, len) {
    if (v >= Math.pow(2, 7 * len) - 1) len = 8;
    var out = new Uint8Array(len), x = v;
    for (var i = len - 1; i >= 0; i--) { out[i] = x % 256; x = Math.floor(x / 256); }
    out[0] |= (0x80 >> (len - 1));
    return out;
  }
  function fixWebmDuration(blob, durMs) {
    if (!blob || !(durMs > 0)) return Promise.resolve(blob);
    var headLen = Math.min(blob.size, 512 * 1024);
    return blobToArrayBuffer(blob.slice(0, headLen)).then(function (ab) {
      var b = new Uint8Array(ab);
      var id = readId(b, 0);
      if (!id || id.id !== 0x1A45DFA3) return blob;
      var sz = readVint(b, id.len);
      if (!sz) return blob;
      var pos = id.len + sz.len + sz.value;
      id = readId(b, pos);
      if (!id || id.id !== 0x18538067) return blob;
      sz = readVint(b, pos + id.len);
      if (!sz || !sz.unknown) return blob;
      pos = pos + id.len + sz.len;
      while (pos < b.length) {
        id = readId(b, pos);
        if (!id) return blob;
        sz = readVint(b, pos + id.len);
        if (!sz || sz.unknown) return blob;
        var dataStart = pos + id.len + sz.len, end = dataStart + sz.value;
        if (id.id === 0x114D9B74 || id.id === 0x1F43B675) return blob; // SeekHead / Cluster first: leave it
        if (id.id === 0x1549A966) {
          if (end > b.length) return blob;
          var p = dataStart, scale = 1000000;
          while (p < end) {
            var cid = readId(b, p);
            if (!cid) return blob;
            var csz = readVint(b, p + cid.len);
            if (!csz) return blob;
            var cds = p + cid.len + csz.len;
            if (cid.id === 0x4489) return blob; // already has a duration
            if (cid.id === 0x2AD7B1) {
              var sc = 0;
              for (var q = 0; q < csz.value; q++) sc = sc * 256 + b[cds + q];
              if (sc > 0) scale = sc;
            }
            p = cds + csz.value;
          }
          var durEl = new Uint8Array(11);
          durEl[0] = 0x44; durEl[1] = 0x89; durEl[2] = 0x88;
          new DataView(durEl.buffer).setFloat64(3, durMs * 1e6 / scale);
          var head = new Uint8Array(id.len);
          for (var h = 0; h < id.len; h++) head[h] = b[pos + h];
          var size = encodeSize(sz.value + durEl.length, sz.len);
          return new Blob([blob.slice(0, pos), head, size, blob.slice(dataStart, end), durEl, blob.slice(end)], { type: blob.type });
        }
        pos = end;
      }
      return blob;
    }).catch(function () { return blob; });
  }

  function probeDuration(blob) {
    return new Promise(function (resolve) {
      var v, url, done = false;
      function end(d) {
        if (done) return;
        done = true;
        try { v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ }
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        resolve(d);
      }
      try {
        v = document.createElement('video');
        url = URL.createObjectURL(blob);
        v.preload = 'metadata';
        v.muted = true;
        v.setAttribute('playsinline', '');
        v.onloadedmetadata = function () { end(isFinite(v.duration) && v.duration > 0 ? v.duration : null); };
        v.onerror = function () { end(null); };
        setTimeout(function () { end(null); }, 3000);
        v.src = url;
      } catch (e) { end(null); }
    });
  }

  // ------------------------------------------------------------------ session
  function createSession(opts) {
    opts = opts || {};
    var project = opts.project || {};
    var media = opts.media || {};
    var musicBlob = opts.musicBlob || null;
    var plan = planProject(project);
    var segs = plan.segments;
    var settings = normSettings(project.settings);
    var size = canvasSize(settings);
    var W = size.width, H = size.height, u = Math.min(W, H) / 1080;
    var shape = settings.shape;
    var look = lookById(settings.look);
    var sup = supported();

    var initError = null;
    var aborted = null;        // Error once cancelled / failed
    var cancelled = false;
    var finished = false;
    var cleaned = false;
    var runPromise = null;
    var waiters = [];
    var onProgress = noop, onStatus = noop;
    var monitorOn = true;

    var canvas = opts.canvas || mkCanvas(W, H);
    var g = null;
    try {
      canvas.width = W;
      canvas.height = H;
      g = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
    } catch (e) { g = null; }
    if (g) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }

    if (!sup.ok) initError = mkErr('unsupported', sup.reason);
    else if (!g) initError = mkErr('unsupported', 'This browser can’t draw the video.');

    // ---- audio context + pool (gesture-sensitive, synchronous) ----
    var actx = null, pool = null, sslots = [], unlocks = [];
    var urls = {};
    function urlFor(id) {
      if (id == null) return null;
      if (urls[id]) return urls[id];
      var b = media[id];
      if (!b) return null;
      try { urls[id] = URL.createObjectURL(b); } catch (e) { return null; }
      return urls[id];
    }

    var videoIdx = [];
    segs.forEach(function (sg, i) { if (sg.kind === 'video') videoIdx.push(i); });

    if (!initError) {
      actx = getAudioContext();
      if (!actx) initError = mkErr('unsupported', 'This browser can’t record sound for the video.');
    }
    if (!initError) {
      try { var rp = actx.resume(); if (rp && rp.catch) rp.catch(noop); } catch (e) { /* ignore */ }
      try {
        // a silent blip fully wakes Web Audio on older iOS
        var blip = actx.createBufferSource();
        blip.buffer = actx.createBuffer(1, 1, 22050);
        blip.connect(actx.destination);
        blip.start(0);
      } catch (e) { /* ignore */ }
      try { if (root.navigator && navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
      try {
        pool = getPool(actx);
        sslots = pool.map(function (p) {
          return { pool: p, ramp: makeRamp(actx, p.gain.gain, 0), segIndex: -1, state: 'idle', ready: null, token: 0 };
        });
        for (var k = 0; k < sslots.length; k++) {
          var vi = videoIdx[k] != null ? videoIdx[k] : videoIdx[0];
          if (vi == null) break;
          var url = urlFor(segs[vi].mediaId);
          if (!url) continue;
          var el = sslots[k].pool.el;
          el.muted = !sslots[k].pool.src; // without a Web Audio route, keep it quiet
          el.src = url;
          sslots[k].pool.url = url;
          try {
            var pp = el.play();
            if (pp && typeof pp.catch === 'function') pp.catch(noop); // never an unhandled rejection (e.g. cancelled early)
            unlocks.push(pp && typeof pp.then === 'function' ? pp : Promise.resolve());
          } catch (e) { /* ignore */ }
        }
      } catch (e) {
        dbg('pool setup failed', e);
      }
    }

    // ---- wake lock ----
    var wakeLock = null;
    function requestWakeLock() {
      try {
        if (finished || !root.navigator || !navigator.wakeLock || !navigator.wakeLock.request) return;
        if (wakeLock && !wakeLock.released) return;
        navigator.wakeLock.request('screen').then(function (s) {
          if (finished || cleaned) { try { s.release(); } catch (e) { /* ignore */ } return; }
          wakeLock = s;
        }, noop);
      } catch (e) { /* ignore */ }
    }
    function releaseWakeLock() {
      try { if (wakeLock) wakeLock.release().catch(noop); } catch (e) { /* ignore */ }
      wakeLock = null;
    }
    if (!initError) requestWakeLock();

    // ---- abort plumbing: every await goes through guard() so cancel never hangs ----
    function abort(err) {
      if (aborted) return;
      aborted = err;
      var list = waiters.splice(0);
      list.forEach(function (w) { try { w(err); } catch (e) { /* ignore */ } });
    }
    function checkAbort() { if (aborted) throw aborted; }
    function guard(p, ms) {
      return new Promise(function (resolve, reject) {
        if (aborted) { reject(aborted); return; }
        var t = 0, settled = false;
        function done() {
          settled = true;
          if (t) clearTimeout(t);
          var k = waiters.indexOf(onAbort);
          if (k >= 0) waiters.splice(k, 1);
        }
        function onAbort(e) { if (!settled) { done(); reject(e); } }
        waiters.push(onAbort);
        if (ms) t = setTimeout(function () { if (!settled) { done(); reject(new Error('timeout')); } }, ms);
        Promise.resolve(p).then(function (v) { if (!settled) { done(); resolve(v); } },
          function (e) { if (!settled) { done(); reject(e); } });
      });
    }
    function softly(p) { // ignore errors unless we were cancelled/failed
      return p.catch(function (e) { if (aborted) throw aborted; dbg('soft error', e && e.message); return null; });
    }
    function sleepClock(sec) { // waits on wall time, interruptible
      return guard(new Promise(function (r) { setTimeout(r, sec * 1000); }));
    }

    function waitEl(el, events, pred, ms) {
      return new Promise(function (resolve, reject) {
        if (aborted) { reject(aborted); return; }
        var done = false, iv = 0, to = 0;
        function finish(err) {
          if (done) return;
          done = true;
          clearInterval(iv); clearTimeout(to);
          events.forEach(function (ev) { el.removeEventListener(ev, check); });
          el.removeEventListener('error', onErr);
          var k = waiters.indexOf(onAbort);
          if (k >= 0) waiters.splice(k, 1);
          if (err) reject(err); else resolve();
        }
        function check() {
          try {
            if (el.error) { finish(new Error('media error ' + el.error.code)); return; }
            if (pred()) finish();
          } catch (e) { finish(e); }
        }
        function onErr() { finish(new Error('media error')); }
        function onAbort(e) { finish(e); }
        waiters.push(onAbort);
        events.forEach(function (ev) { el.addEventListener(ev, check); });
        el.addEventListener('error', onErr);
        iv = setInterval(check, 120);
        to = setTimeout(function () { finish(new Error('timeout')); }, ms);
        check();
      });
    }

    var curState = 'preparing';
    function status(state, message, extra) {
      if (!extra || !extra.warning) curState = state;
      var s = { state: state, message: message };
      if (extra) for (var k in extra) s[k] = extra[k];
      try { onStatus(s); } catch (e) { /* ignore */ }
    }
    // A heads-up (e.g. a clip was skipped). Keeps the current state; UI can show it as a toast.
    function notify(message) { status(paused ? 'paused' : curState, message, { warning: true }); }

    // ================================================================ drawing kit
    var snap = null, snapG = null, snapValid = false;
    var blurA = null, blurB = null, blurBG = null, liveTiny = null;
    var titleTiny = null, lastTiny = null, lastTinyValid = false;
    var vignette = null, topScrim = null, noisePattern = null;
    var BW = Math.max(12, Math.round(W / 30)), BH = Math.max(12, Math.round(H / 30));

    function setupCanvases() {
      snap = mkCanvas(W, H); snapG = snap.getContext('2d');
      blurB = mkCanvas(BW, BH); blurBG = blurB.getContext('2d');
      liveTiny = mkCanvas(BW, BH);
      titleTiny = mkCanvas(BW, BH);
      lastTiny = mkCanvas(BW, BH);
      var R = Math.sqrt(W * W + H * H) / 2;
      vignette = g.createRadialGradient(W / 2, H / 2, R * 0.35, W / 2, H / 2, R);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
      topScrim = g.createLinearGradient(0, 0, 0, H * 0.16);
      topScrim.addColorStop(0, 'rgba(0,0,0,0.42)');
      topScrim.addColorStop(1, 'rgba(0,0,0,0)');
      try {
        var nc = mkCanvas(160, 160), ng = nc.getContext('2d');
        var id = ng.createImageData(160, 160);
        for (var i = 0; i < id.data.length; i += 4) {
          var v = Math.random() * 255;
          id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
          id.data[i + 3] = 255;
        }
        ng.putImageData(id, 0, 0);
        noisePattern = g.createPattern(nc, 'repeat');
      } catch (e) { noisePattern = null; }
    }

    function framing(sw, sh) {
      var r = (sw / sh) / (W / H);
      if (r < 1) r = 1 / r;
      return r <= 1.35 ? 'cover' : 'fit';
    }

    // Draw-small-then-upscale blur (Safari has no ctx.filter). Writes into `target` (BWxBH).
    function blurInto(target, src, sw, sh) {
      if (!src || !(sw > 0) || !(sh > 0)) return false;
      var tg = target.getContext('2d');
      var s = Math.max(BW / sw, BH / sh) * 1.12;
      var dw = sw * s, dh = sh * s;
      tg.globalAlpha = 1;
      tg.imageSmoothingEnabled = true;
      try { tg.imageSmoothingQuality = 'high'; } catch (e) { /* ignore */ }
      tg.drawImage(src, (BW - dw) / 2, (BH - dh) / 2, dw, dh);
      for (var pass = 0; pass < 3; pass++) {
        blurBG.globalAlpha = 1;
        blurBG.clearRect(0, 0, BW, BH);
        blurBG.drawImage(target, 0, 0);
        tg.globalAlpha = 0.5; tg.drawImage(blurB, -1, 0);
        tg.globalAlpha = 1 / 3; tg.drawImage(blurB, 1, 0);
        blurBG.clearRect(0, 0, BW, BH);
        blurBG.drawImage(target, 0, 0);
        tg.globalAlpha = 0.5; tg.drawImage(blurB, 0, -1);
        tg.globalAlpha = 1 / 3; tg.drawImage(blurB, 0, 1);
      }
      tg.globalAlpha = 1;
      return true;
    }

    function drawTiny(tiny, zoom) {
      zoom = zoom || 1;
      var dw = W * zoom, dh = H * zoom;
      g.imageSmoothingEnabled = true;
      try { g.imageSmoothingQuality = 'high'; } catch (e) { /* ignore */ }
      // inset by a pixel so the edge pixels (less blurred) don't show
      g.drawImage(tiny, 1, 1, BW - 2, BH - 2, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }

    function dim(a) { g.fillStyle = 'rgba(0,0,0,' + a + ')'; g.fillRect(0, 0, W, H); }
    function drawVignette() { g.fillStyle = vignette; g.fillRect(0, 0, W, H); }

    function paintGradient(t) {
      g.fillStyle = look.bg1;
      g.fillRect(0, 0, W, H);
      var big = Math.max(W, H);
      var cx = W * (0.78 + 0.06 * Math.sin(t * 0.45)), cy = H * (0.18 + 0.05 * Math.cos(t * 0.35));
      var gr = g.createRadialGradient(cx, cy, 0, cx, cy, big * 0.95);
      gr.addColorStop(0, rgba(look.bg2, 0.95));
      gr.addColorStop(0.55, rgba(look.bg2, 0.35));
      gr.addColorStop(1, rgba(look.bg2, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      var cx2 = W * (0.12 + 0.05 * Math.cos(t * 0.3)), cy2 = H * (0.92 - 0.04 * Math.sin(t * 0.4));
      var gr2 = g.createRadialGradient(cx2, cy2, 0, cx2, cy2, big * 0.6);
      gr2.addColorStop(0, rgba(look.accent, 0.42));
      gr2.addColorStop(1, rgba(look.accent, 0));
      g.fillStyle = gr2;
      g.fillRect(0, 0, W, H);
      if (noisePattern) {
        g.globalAlpha = 0.045;
        g.fillStyle = noisePattern;
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }
    }

    function drawMedia(src, sw, sh, zoom, panX, panY, tinyBg, forceCover) {
      zoom = zoom || 1;
      if (forceCover || framing(sw, sh) === 'cover') {
        var s = Math.max(W / sw, H / sh) * zoom, dw = sw * s, dh = sh * s;
        var ox = (W - dw) / 2 + (panX || 0) * (dw - W) / 2;
        var oy = (H - dh) / 2 + (panY || 0) * (dh - H) / 2;
        g.drawImage(src, ox, oy, dw, dh);
        return;
      }
      var tiny = tinyBg;
      if (!tiny) { blurInto(liveTiny, src, sw, sh); tiny = liveTiny; }
      drawTiny(tiny, 1.04 + (zoom - 1) * 0.5);
      dim(0.38);
      var s2 = Math.min(W / sw, H / sh) * zoom, w2 = sw * s2, h2 = sh * s2;
      g.drawImage(src, (W - w2) / 2, (H - h2) / 2, w2, h2);
    }

    // ---- text helpers ----
    function fnt(weight, size, family) { return weight + ' ' + Math.max(1, Math.round(size)) + 'px ' + family; }
    function mw(s) { return g.measureText(s).width; }

    function wrapLines(text, maxW) {
      var words = String(text).split(/\s+/).filter(Boolean), lines = [], line = '';
      for (var i = 0; i < words.length; i++) {
        var w = words[i], test = line ? line + ' ' + w : w;
        if (mw(test) <= maxW) { line = test; continue; }
        if (line) { lines.push(line); line = ''; }
        if (mw(w) <= maxW) { line = w; continue; }
        var chars = Array.from(w), part = '';
        for (var c = 0; c < chars.length; c++) {
          if (part && mw(part + chars[c]) > maxW) { lines.push(part); part = chars[c]; } else part += chars[c];
        }
        line = part;
      }
      if (line) lines.push(line);
      return lines;
    }
    // Same number of lines, but as even as possible (no lonely last word).
    function balance(text, maxW, lines) {
      if (lines.length < 2) return lines;
      var n = lines.length, lo = maxW * 0.4, hi = maxW, best = lines;
      for (var i = 0; i < 9; i++) {
        var mid = (lo + hi) / 2, l = wrapLines(text, mid);
        if (l.length <= n) { best = l; hi = mid; } else lo = mid;
      }
      return best;
    }
    function truncate(lines, maxLines, maxW) {
      if (lines.length <= maxLines) return lines;
      var keep = lines.slice(0, maxLines);
      var last = lines.slice(maxLines - 1).join(' ');
      var chars = Array.from(last);
      while (chars.length && mw(chars.join('') + '…') > maxW) chars.pop();
      var s = chars.join(''), sp = s.lastIndexOf(' ');
      if (sp > s.length * 0.6) s = s.slice(0, sp);   // end on a whole word
      keep[maxLines - 1] = s.replace(/[\s,.;:–-]+$/, '') + '…';
      return keep;
    }
    function fitText(text, family, weight, maxSize, minSize, maxW, maxLines, doBalance) {
      var size = maxSize, lines, cut = false;
      for (;;) {
        g.font = fnt(weight, size, family);
        lines = wrapLines(text, maxW);
        var widest = 0;
        for (var i = 0; i < lines.length; i++) widest = Math.max(widest, mw(lines[i]));
        if (lines.length <= maxLines && widest <= maxW + 0.5) break;
        if (size <= minSize) { cut = lines.length > maxLines; lines = truncate(lines, maxLines, maxW); break; }
        size = Math.max(minSize, Math.floor(size * 0.93));
      }
      if (doBalance !== false && !cut) lines = balance(text, maxW, lines);
      var width = 0;
      for (var j = 0; j < lines.length; j++) width = Math.max(width, mw(lines[j]));
      return { size: size, lines: lines, font: fnt(weight, size, family), width: width, cut: cut };
    }
    // Split a caption that won't fit in two, at the sentence (else clause, else word) break nearest the middle.
    function splitText(text) {
      var n = text.length;
      function nearest(re) {
        var m, best = -1, bd = Infinity;
        while ((m = re.exec(text))) {
          var at = m.index + m[0].length, d = Math.abs(at - n / 2);
          if (at > n * 0.25 && at < n * 0.75 && d < bd) { bd = d; best = at; }
        }
        return best;
      }
      var at = nearest(/[.!?]\s+/g);
      if (at < 0) at = nearest(/[,;:]\s+|\s[–—]\s+/g);
      if (at < 0) at = nearest(/\s+/g);
      return at < 0 ? null : [text.slice(0, at).trim(), text.slice(at).trim()];
    }
    function spaced(text, family, weight, size, spacingEm, maxW, minSize) {
      var sz = size, res;
      for (;;) {
        g.font = fnt(weight, sz, family);
        var chars = Array.from(text), widths = [], total = 0, sp = sz * spacingEm;
        for (var i = 0; i < chars.length; i++) { widths.push(mw(chars[i])); total += widths[i]; }
        total += sp * Math.max(0, chars.length - 1);
        res = { chars: chars, widths: widths, w: total, font: fnt(weight, sz, family), size: sz, sp: sp };
        if (!maxW || total <= maxW || sz <= (minSize || sz)) break;
        sz = Math.max(minSize, Math.floor(sz * 0.93));
      }
      if (maxW && res.w > maxW) { // still too long: trim with an ellipsis
        while (res.chars.length > 1 && res.w > maxW) {
          var dropped = res.chars.pop(); res.w -= res.widths.pop() + res.sp;
          if (dropped === undefined) break;
        }
        g.font = res.font;
        res.chars.push('…'); res.widths.push(mw('…')); res.w += res.widths[res.widths.length - 1] + res.sp;
      }
      return res;
    }
    function drawSpaced(S, cx, baseline) {
      g.font = S.font;
      g.textAlign = 'left';
      var x = cx - S.w / 2;
      for (var i = 0; i < S.chars.length; i++) { g.fillText(S.chars[i], x, baseline); x += S.widths[i] + S.sp; }
      g.textAlign = 'center';
    }
    function rr(x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }
    // Baseline that visually centres a line of text of `size` on `cy`.
    function base(cy, size) { return cy + size * 0.35; }

    function makePill(text, size) {
      var S = spaced(text, FONT_TEXT, 800, size, 0.14);
      return { S: S, h: Math.round(size * 1.95), w: Math.round(S.w + size * 1.7), size: size };
    }
    function drawPill(P, cx, cy) {
      g.fillStyle = look.accent;
      rr(cx - P.w / 2, cy - P.h / 2, P.w, P.h, P.h / 2);
      g.fill();
      g.fillStyle = look.accentInk;
      drawSpaced(P.S, cx, base(cy, P.size));
    }
    function drawCheck(cx, cy, r, alpha) {
      g.globalAlpha = alpha;
      g.fillStyle = look.accent;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = look.accentInk;
      g.lineWidth = Math.max(2, r * 0.24);
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(cx - r * 0.45, cy + r * 0.02);
      g.lineTo(cx - r * 0.13, cy + r * 0.32);
      g.lineTo(cx + r * 0.47, cy - r * 0.3);
      g.stroke();
    }
    function drawHeart(cx, cy, s) {
      g.beginPath();
      g.moveTo(cx, cy + s * 0.32);
      g.bezierCurveTo(cx - s * 0.62, cy - s * 0.05, cx - s * 0.42, cy - s * 0.55, cx, cy - s * 0.22);
      g.bezierCurveTo(cx + s * 0.42, cy - s * 0.55, cx + s * 0.62, cy - s * 0.05, cx, cy + s * 0.32);
      g.closePath();
      g.fill();
    }

    // ---- per-shape metrics ----
    var M = (function () {
      if (shape === 'tall') {
        // Step captions and text cards stay clear of the TikTok / Shorts / Reels buttons on the
        // right (capW, capX) and of their caption area at the bottom (capBottom, listBottom).
        return { maxW: 0.84, capW: 0.76, capX: 0.45, capBottom: 0.72, capMax: 64, capMin: 40, pill: 32, titleMax: 150, titleLines: 4,
          textMax: 112, textLines: 7, outroMax: 180, centerY: 0.47, barY: 0.032, listTop: 0.10, listBottom: 0.74 };
      }
      if (shape === 'square') {
        return { maxW: 0.84, capBottom: 0.90, capMax: 56, capMin: 36, pill: 30, titleMax: 130, titleLines: 3,
          textMax: 92, textLines: 5, outroMax: 160, centerY: 0.5, barY: 0.045, listTop: 0.07, listBottom: 0.94 };
      }
      return { maxW: 0.70, capBottom: 0.90, capMax: 54, capMin: 34, pill: 30, titleMax: 124, titleLines: 3,
        textMax: 96, textLines: 4, outroMax: 160, centerY: 0.5, barY: 0.05, listTop: 0.07, listBottom: 0.94 };
    })();

    // ---- layouts (computed once per segment) ----
    function captionBox(text, stepNumber) {
      var L = { pill: makePill('STEP ' + (stepNumber || ''), M.pill * u), cx: W * (M.capX || 0.5) };
      var maxW = W * (M.capW || M.maxW), padX = 36 * u, padY = 24 * u;
      var bottom = H * M.capBottom;
      if (text) {
        var F = fitText(text, FONT_TEXT, 800, M.capMax * u, M.capMin * u, maxW - 2 * padX, 3);
        var lh = F.size * 1.2;
        var bw = Math.min(maxW, Math.max(F.width + 2 * padX, L.pill.w + 2 * padX)), bh = F.lines.length * lh + 2 * padY;
        L.box = { x: L.cx - bw / 2, y: bottom - bh, w: bw, h: bh, r: Math.min(30 * u, bh / 2) };
        L.F = F; L.lh = lh; L.padY = padY;
        L.pillY = L.box.y - L.pill.h * 0.12;
      } else {
        L.pillY = bottom - L.pill.h / 2;
      }
      return L;
    }
    // A caption too long for 3 lines is shown in two parts (first half of the step, then the rest)
    // instead of being cut off, so nothing like "bake at 180°C for 25 min" goes missing.
    function layoutCaption(seg) {
      var L = captionBox(seg.text, seg.stepNumber);
      var parts = L.F && L.F.cut ? splitText(seg.text) : null;
      if (!parts) return L;
      return { pages: [captionBox(parts[0], seg.stepNumber), captionBox(parts[1], seg.stepNumber)],
        split: parts[0].length / (parts[0].length + parts[1].length) };
    }
    function drawCaption(L, alpha, rise, t, dur) {
      if (L.pages) {
        var m = dur * L.split, f = 0.12;
        drawCaption(L.pages[0], alpha * clamp((m - t) / f, 0, 1), rise);
        drawCaption(L.pages[1], alpha * clamp((t - m) / f, 0, 1), 0);
        return;
      }
      if (alpha <= 0.001) return;
      g.save();
      g.globalAlpha = alpha;
      g.translate(0, rise);
      if (L.box) {
        g.fillStyle = 'rgba(14,10,8,0.74)';
        rr(L.box.x, L.box.y, L.box.w, L.box.h, L.box.r);
        g.fill();
        g.fillStyle = '#FFFFFF';
        g.font = L.F.font;
        g.textAlign = 'center';
        var top = L.box.y + L.padY;
        for (var i = 0; i < L.F.lines.length; i++) g.fillText(L.F.lines[i], L.cx, base(top + L.lh * (i + 0.5), L.F.size));
      }
      drawPill(L.pill, L.cx, L.pillY);
      g.restore();
    }

    function drawProgressBar(seg, frac) {
      var n = seg.stepCount || 0, k = seg.stepNumber || 0;
      if (!n) return;
      var x0 = W * 0.06, x1 = W * 0.94, y = H * M.barY, h = Math.max(3, Math.round(7 * u));
      var gap = Math.min(8 * u, (x1 - x0) / n * 0.3);
      var sw = ((x1 - x0) - gap * (n - 1)) / n;
      g.fillStyle = topScrim;
      g.fillRect(0, 0, W, H * 0.16);
      for (var j = 1; j <= n; j++) {
        var x = x0 + (j - 1) * (sw + gap);
        g.fillStyle = 'rgba(255,255,255,0.32)';
        rr(x, y, sw, h, h / 2); g.fill();
        var f = j < k ? 1 : (j === k ? clamp(frac, 0, 1) : 0);
        if (f > 0) {
          g.fillStyle = 'rgba(255,255,255,0.96)';
          rr(x, y, Math.max(h, sw * f), h, h / 2); g.fill();
        }
      }
    }

    function layoutTitle(seg) {
      var maxW = W * M.maxW;
      var L = {};
      L.kick = spaced('LET’S MAKE', FONT_TEXT, 800, 34 * u, 0.3, maxW * 0.7, 22 * u);
      L.name = fitText(seg.text, FONT_DISPLAY, 800, M.titleMax * u, 66 * u, maxW, M.titleLines);
      L.nameLh = L.name.size * 1.04;
      if (seg.subtitle) L.sub = fitText(seg.subtitle, FONT_TEXT, 600, 42 * u, 28 * u, maxW, 2);
      var subH = L.sub ? L.sub.lines.length * L.sub.size * 1.28 : 0;
      var total = 34 * u + 40 * u + L.name.lines.length * L.nameLh + 40 * u + 8 * u + (L.sub ? 34 * u + subH : 0);
      L.top = H * M.centerY - total / 2;
      return L;
    }
    function paintTitle(v, tc) {
      var seg = v.seg, D = v.dur, k = Math.min(1, D / 2.5), t = tc / k;
      var L = v.L || (v.L = layoutTitle(seg));
      var p = clamp(tc / D, 0, 1);
      if (hasTitleBg) { drawTiny(titleTiny, 1.14 - 0.1 * easeOut(p)); dim(0.48); }
      else paintGradient(tc);
      drawVignette();
      g.textAlign = 'center';
      var y = L.top;
      // kicker with accent rules
      var a1 = easeOut((t - 0.1) / 0.45);
      g.globalAlpha = a1;
      var ky = y + 17 * u + (1 - a1) * -14 * u;
      g.fillStyle = 'rgba(255,255,255,0.92)';
      drawSpaced(L.kick, W / 2, base(ky, L.kick.size));
      g.fillStyle = look.accent;
      var rule = 54 * u * a1, rh = Math.max(2, 4 * u), gx = L.kick.w / 2 + 22 * u;
      g.fillRect(W / 2 - gx - rule, ky - rh / 2, rule, rh);
      g.fillRect(W / 2 + gx, ky - rh / 2, rule, rh);
      y += 34 * u + 40 * u;
      // dish name
      var a2 = easeOut((t - 0.22) / 0.6);
      var sc = 0.92 + 0.08 * easeOut((t - 0.22) / 0.75);
      var nameH = L.name.lines.length * L.nameLh;
      g.save();
      g.globalAlpha = a2;
      g.translate(W / 2, y + nameH / 2);
      g.scale(sc, sc);
      g.font = L.name.font;
      g.fillStyle = '#FFFFFF';
      g.shadowColor = 'rgba(0,0,0,0.35)';
      g.shadowBlur = 30 * u;
      g.shadowOffsetY = 4 * u;
      for (var i = 0; i < L.name.lines.length; i++) {
        g.fillText(L.name.lines[i], 0, base(-nameH / 2 + L.nameLh * (i + 0.5), L.name.size));
      }
      g.restore();
      y += nameH + 40 * u;
      // accent bar
      var a3 = easeOut((t - 0.55) / 0.5);
      g.globalAlpha = 1;
      g.fillStyle = look.accent;
      var bw = 96 * u * a3, bh = Math.max(3, 8 * u);
      if (bw > 1) { rr(W / 2 - bw / 2, y, bw, bh, bh / 2); g.fill(); }
      y += bh + 34 * u;
      if (L.sub) {
        var a4 = easeOut((t - 0.7) / 0.5);
        g.globalAlpha = a4;
        g.font = L.sub.font;
        g.fillStyle = 'rgba(255,255,255,0.9)';
        var lh = L.sub.size * 1.28;
        for (var j = 0; j < L.sub.lines.length; j++) {
          g.fillText(L.sub.lines[j], W / 2, base(y + (1 - a4) * 12 * u + lh * (j + 0.5), L.sub.size));
        }
      }
      g.globalAlpha = 1;
    }

    // Chips laid out down the columns (col-major). One column: chips as wide as the widest item.
    function listLayout(items, cols, s, maxW) {
      var colGap = 22 * u, rowGap = 14 * u;
      var colW = (maxW - colGap * (cols - 1)) / cols;
      g.font = fnt(700, s, FONT_TEXT);
      var padX = s * 0.62, padY = s * 0.42, dot = s * 0.5;
      var textX = padX + dot * 2 + s * 0.45;
      var textW = colW - textX - padX;
      var perCol = Math.ceil(items.length / cols), rows = [], colH = [], widest = 0;
      for (var c = 0; c < cols; c++) colH.push(0);
      for (var i = 0; i < items.length; i++) {
        var c2 = Math.floor(i / perCol);
        var lines = truncate(wrapLines(items[i], textW), 2, textW);
        for (var k = 0; k < lines.length; k++) widest = Math.max(widest, mw(lines[k]));
        var h = lines.length * s * 1.18 + padY * 2;
        rows.push({ col: c2, lines: lines, h: h, y: colH[c2] });
        colH[c2] += h + rowGap;
      }
      if (cols === 1) colW = Math.min(colW, Math.max(W * 0.5, widest + textX + padX));
      return {
        cols: cols, colW: colW, colGap: colGap, size: s, padX: padX, padY: padY, dot: dot, textX: textX, rows: rows,
        h: Math.max.apply(null, colH) - rowGap, fullW: cols * colW + (cols - 1) * colGap
      };
    }

    function layoutIngredients(seg) {
      var items = seg.items || [], n = items.length;
      var maxW = W * (shape === 'wide' ? 0.80 : (shape === 'tall' ? 0.76 : 0.86));   // tall: clear of the app buttons
      var L = {};
      L.kick = spaced('YOU’LL NEED', FONT_TEXT, 800, 30 * u, 0.26);
      var headSize = (shape === 'tall' ? 108 : 92) * u;
      g.font = fnt(800, headSize, FONT_DISPLAY);
      L.headSize = headSize;
      L.headH = 30 * u + 22 * u + headSize * 1.0 + 26 * u + 8 * u;
      var availTop = H * M.listTop, availBottom = H * M.listBottom;
      var gapAfterHead = 40 * u;
      var availH = availBottom - availTop - L.headH - gapAfterHead;
      var oneMax = shape === 'tall' ? 10 : (shape === 'square' ? 5 : 4);
      var colOpts = n <= 1 ? [1] : (n <= oneMax ? [1, 2, 3] : [2, 3]);
      var chosen = null, smallest = null;
      for (var ci = 0; ci < colOpts.length && !chosen; ci++) {
        var cols = colOpts[ci];
        var sMax = (cols === 1 ? (n <= 3 ? 64 : (n <= 5 ? 58 : 52)) : (cols === 2 ? 42 : 34)) * u;
        var sMin = (cols === 1 ? 38 : (cols === 2 ? 28 : 20)) * u;
        for (var s = sMax; ;) {
          var lay = listLayout(items, cols, s, maxW);
          smallest = lay;
          if (lay.h <= availH) { chosen = lay; break; }
          if (s <= sMin) break;
          s = Math.max(sMin, Math.floor(s * 0.94));
        }
      }
      L.list = chosen || smallest; // (very long lists: smallest layout, clipped)
      var listH = Math.min(L.list.h, availH);
      var groupH = L.headH + gapAfterHead + listH;
      L.top = availTop + Math.max(0, (availBottom - availTop - groupH) / 2);
      L.listTop = L.top + L.headH + gapAfterHead;
      L.listX = (W - L.list.fullW) / 2;
      L.listBottom = availBottom;
      // pop-in timing
      var D = seg.dur || 4;
      L.stagger = clamp((D * 0.5 - 0.45) / Math.max(1, n), 0.05, 0.22);
      return L;
    }
    function paintIngredients(v, tc) {
      var seg = v.seg, L = v.L || (v.L = layoutIngredients(seg));
      var p = clamp(tc / v.dur, 0, 1);
      // background
      if (v.slot) {
        var el = v.slot.pool.el;
        if (el.readyState >= 2 && el.videoWidth) { drawMedia(el, el.videoWidth, el.videoHeight, 1.02 + 0.05 * p, 0, 0, null, true); dim(0.62); }
        else if (snapValid) { g.drawImage(snap, 0, 0); dim(0.5); } else paintGradient(tc);
      } else if (v.img) {
        drawMedia(v.img.canvas, v.img.w, v.img.h, 1.02 + 0.06 * easeInOut(p), 0, 0, null, true);
        dim(0.62);
      } else paintGradient(tc);
      drawVignette();
      // heading
      var a = easeOut(tc / 0.45);
      g.globalAlpha = a;
      g.textAlign = 'center';
      var y = L.top + (1 - a) * 16 * u;
      g.fillStyle = look.accent;
      drawSpaced(L.kick, W / 2, base(y + 15 * u, L.kick.size));
      y += 30 * u + 22 * u;
      g.font = fnt(800, L.headSize, FONT_DISPLAY);
      g.fillStyle = '#FFFFFF';
      g.textAlign = 'center';
      g.fillText('Ingredients', W / 2, base(y + L.headSize * 0.5, L.headSize));
      y += L.headSize + 26 * u;
      g.fillStyle = look.accent;
      var bw = 84 * u * easeOut((tc - 0.15) / 0.5), bh = Math.max(3, 8 * u);
      if (bw > 1) { rr(W / 2 - bw / 2, y, bw, bh, bh / 2); g.fill(); }
      g.globalAlpha = 1;
      // items
      var Ls = L.list;
      if (!Ls) return;
      g.save();
      g.beginPath();
      g.rect(0, L.listTop - 20 * u, W, L.listBottom - L.listTop + 40 * u);
      g.clip();
      for (var i = 0; i < Ls.rows.length; i++) {
        var r = Ls.rows[i];
        var t0 = 0.45 + i * L.stagger;
        var q = clamp((tc - t0) / 0.38, 0, 1);
        if (q <= 0) continue;
        var x = L.listX + r.col * (Ls.colW + Ls.colGap);
        var ry = L.listTop + r.y;
        var sc = 0.86 + 0.14 * easeOutBack(q);
        g.save();
        g.globalAlpha = easeOut(q * 1.4);
        g.translate(x + Ls.colW / 2, ry + r.h / 2);
        g.scale(sc, sc);
        g.translate(-Ls.colW / 2, -r.h / 2);
        g.fillStyle = 'rgba(255,255,255,0.13)';
        rr(0, 0, Ls.colW, r.h, Math.min(r.h / 2, Ls.size * 0.9));
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.16)';
        g.lineWidth = Math.max(1, 1.5 * u);
        g.stroke();
        var lh = Ls.size * 1.18;
        var firstC = Ls.padY + lh / 2;
        drawCheck(Ls.padX + Ls.dot, firstC, Ls.dot, g.globalAlpha);
        g.font = fnt(700, Ls.size, FONT_TEXT);
        g.fillStyle = '#FFFFFF';
        g.textAlign = 'left';
        for (var j = 0; j < r.lines.length; j++) g.fillText(r.lines[j], Ls.textX, base(Ls.padY + lh * (j + 0.5), Ls.size));
        g.restore();
      }
      g.restore();
    }

    function captionAlpha(v, tc, local) {
      var a = easeOut((tc - 0.12) / 0.35);
      var remain = v.dur - local;
      if (remain < 0.22) a *= clamp(remain / 0.22, 0, 1);
      return a;
    }

    function paintClip(v, tc) {
      var el = v.slot.pool.el, seg = v.seg;
      if (el.readyState >= 2 && el.videoWidth) drawMedia(el, el.videoWidth, el.videoHeight, 1);
      else if (snapValid) g.drawImage(snap, 0, 0);
      else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
      var local = v.local || 0;
      drawProgressBar(seg, local / v.dur);
      var L = v.L || (v.L = layoutCaption(seg));
      var a = captionAlpha(v, tc, local);
      drawCaption(L, a, (1 - easeOut((tc - 0.12) / 0.35)) * 40 * u, local, v.dur);
    }

    function paintPhoto(v, tc) {
      var I = v.img, seg = v.seg, p = clamp(tc / v.dur, 0, 1);
      var dir = (seg.stepNumber || 1) % 2 ? 1 : -1;
      var z = 1.02 + 0.1 * easeInOut(p);
      drawMedia(I.canvas, I.w, I.h, z, dir * (0.6 - 1.2 * easeInOut(p)), 0.3 - 0.6 * easeInOut(p), I.tiny);
      drawProgressBar(seg, p);
      var L = v.L || (v.L = layoutCaption(seg));
      drawCaption(L, captionAlpha(v, tc, tc), (1 - easeOut((tc - 0.12) / 0.35)) * 40 * u, tc, v.dur);
    }

    function layoutTextStep(seg) {
      var L = { pill: makePill('STEP ' + (seg.stepNumber || ''), 36 * u), cx: W * (M.capX || 0.5) };
      L.F = fitText(seg.text, FONT_DISPLAY, 700, M.textMax * u, 50 * u, W * (M.capW || M.maxW), M.textLines);
      L.lh = L.F.size * 1.14;
      var total = L.pill.h + 48 * u + L.F.lines.length * L.lh;
      L.top = H * (shape === 'tall' ? 0.46 : 0.5) - total / 2;
      return L;
    }
    function paintTextStep(v, tc) {
      var seg = v.seg, L = v.L || (v.L = layoutTextStep(seg)), p = clamp(tc / v.dur, 0, 1);
      if (lastTinyValid) { drawTiny(lastTiny, 1.1 - 0.05 * p); dim(0.5); } else paintGradient(tc);
      drawVignette();
      drawProgressBar(seg, p);
      var a1 = easeOut((tc - 0.08) / 0.4);
      g.globalAlpha = a1;
      drawPill(L.pill, L.cx, L.top + L.pill.h / 2 + (1 - a1) * 20 * u);
      var a2 = easeOut((tc - 0.2) / 0.5);
      g.globalAlpha = a2 * (v.dur - tc < 0.22 ? clamp((v.dur - tc) / 0.22, 0, 1) : 1);
      g.font = L.F.font;
      g.fillStyle = '#FFFFFF';
      g.textAlign = 'center';
      var y = L.top + L.pill.h + 48 * u + (1 - a2) * 26 * u;
      for (var i = 0; i < L.F.lines.length; i++) g.fillText(L.F.lines[i], L.cx, base(y + L.lh * (i + 0.5), L.F.size));
      g.globalAlpha = 1;
    }

    function layoutOutro(seg) {
      var maxW = W * M.maxW, L = {};
      L.heart = 92 * u;
      L.F = fitText(seg.text || 'Enjoy!', FONT_DISPLAY, 900, M.outroMax * u, 80 * u, maxW, 2);
      L.lh = L.F.size * 1.02;
      if (seg.dishName) L.dish = spaced(seg.dishName.toUpperCase(), FONT_TEXT, 800, 34 * u, 0.2, maxW, 22 * u);
      var total = L.heart + 44 * u + L.F.lines.length * L.lh + (L.dish ? 44 * u + 34 * u : 0);
      L.top = H * M.centerY - total / 2;
      return L;
    }
    function paintOutro(v, tc) {
      var seg = v.seg, L = v.L || (v.L = layoutOutro(seg)), D = v.dur, k = Math.min(1, D / 2.5), t = tc / k;
      var p = clamp(tc / D, 0, 1);
      if (lastTinyValid) { drawTiny(lastTiny, 1.06 + 0.06 * p); dim(0.48); } else paintGradient(tc);
      drawVignette();
      var y = L.top;
      var hs = easeOutBack((t - 0.05) / 0.45);
      if (hs > 0) {
        g.save();
        g.translate(W / 2, y + L.heart / 2);
        g.scale(Math.max(0.01, hs), Math.max(0.01, hs));
        g.fillStyle = look.accent;
        drawHeart(0, L.heart * 0.08, L.heart);
        g.restore();
      }
      y += L.heart + 44 * u;
      var a = easeOut((t - 0.18) / 0.55), sc = 0.9 + 0.1 * easeOut((t - 0.18) / 0.7);
      var h = L.F.lines.length * L.lh;
      g.save();
      g.globalAlpha = a;
      g.translate(W / 2, y + h / 2);
      g.scale(sc, sc);
      g.font = L.F.font;
      g.fillStyle = '#FFFFFF';
      g.textAlign = 'center';
      g.shadowColor = 'rgba(0,0,0,0.3)';
      g.shadowBlur = 28 * u;
      for (var i = 0; i < L.F.lines.length; i++) g.fillText(L.F.lines[i], 0, base(-h / 2 + L.lh * (i + 0.5), L.F.size));
      g.restore();
      y += h + 44 * u;
      if (L.dish) {
        var a2 = easeOut((t - 0.45) / 0.5);
        g.globalAlpha = a2 * 0.85;
        g.fillStyle = '#FFFFFF';
        drawSpaced(L.dish, W / 2, base(y + 17 * u + (1 - a2) * 12 * u, L.dish.size));
        g.globalAlpha = 1;
      }
    }

    // ================================================================ images
    var images = {};
    var lastUse = {};
    segs.forEach(function (sg, i) { if (sg.kind === 'image') lastUse[sg.mediaId] = i; });

    function rasterize(img) {
      var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      // Big enough to fill the frame with a slow zoom, never bigger than the photo,
      // and capped in memory (iPad Safari has a tight total canvas budget).
      var s = Math.min(1, Math.max(W / iw, H / ih) * 1.18);
      var maxPx = W * H * 2.2;
      if (iw * s * ih * s > maxPx) s = Math.sqrt(maxPx / (iw * ih));
      var c = mkCanvas(iw * s, ih * s);
      var cg = c.getContext('2d');
      cg.imageSmoothingEnabled = true;
      try { cg.imageSmoothingQuality = 'high'; } catch (e) { /* ignore */ }
      cg.drawImage(img, 0, 0, c.width, c.height);
      var tiny = mkCanvas(BW, BH);
      blurInto(tiny, c, c.width, c.height);
      return { canvas: c, w: c.width, h: c.height, tiny: tiny };
    }
    function loadImage(blob) {
      return new Promise(function (resolve, reject) {
        if (!blob) { reject(new Error('missing image')); return; }
        var url;
        try { url = URL.createObjectURL(blob); } catch (e) { reject(e); return; }
        var img = new Image(), settled = false;
        function fin() { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }
        function fail(e) { if (settled) return; settled = true; fin(); reject(e || new Error('image failed')); }
        function ok() {
          if (settled) return;
          if (!(img.naturalWidth > 0)) { fail(new Error('image empty')); return; }
          settled = true;
          try { resolve(rasterize(img)); } catch (e) { reject(e); } finally { fin(); }
        }
        img.onload = function () {
          if (typeof img.decode === 'function') img.decode().then(ok, ok); else ok();
        };
        img.onerror = function () { fail(new Error('image error')); };
        setTimeout(function () { fail(new Error('image timeout')); }, 15000);
        try { img.decoding = 'async'; } catch (e) { /* ignore */ }
        img.src = url;
      });
    }
    function getImage(id) {
      if (!images[id]) {
        var rec = images[id] = { data: null, p: null };
        rec.p = loadImage(media[id]).then(function (d) { rec.data = d; return d; });
        rec.p.catch(noop);
      }
      return images[id].p;
    }
    function prefetchImages(fromIndex) {
      var count = 0;
      for (var i = fromIndex; i < segs.length && count < 2; i++) {
        if (segs[i].kind === 'image') { getImage(segs[i].mediaId); count++; }
      }
    }
    function releaseImages(afterIndex) {
      Object.keys(images).forEach(function (id) {
        if (lastUse[id] != null && lastUse[id] <= afterIndex && images[id].data) {
          freeCanvas(images[id].data.canvas);
          freeCanvas(images[id].data.tiny);
          images[id].data = null;
        }
      });
    }

    // ================================================================ video slots
    function setRate(el, r) {
      r = r || 1;
      try { el.defaultPlaybackRate = r; } catch (e) { /* ignore */ }
      try { el.playbackRate = r; } catch (e) { /* ignore */ }
      try { el.preservesPitch = true; } catch (e) { /* ignore */ }
      try { el.webkitPreservesPitch = true; } catch (e) { /* ignore */ }
      try { el.mozPreservesPitch = true; } catch (e) { /* ignore */ }
    }
    var soundBlocked = false;
    function playEl(el) {
      try {
        var p = el.play();
        if (p && p.catch) {
          p.catch(function (e) {
            dbg('play() rejected', e && e.name);
            if (e && e.name === 'NotAllowedError' && !el.muted && !aborted) {
              // The browser wouldn't play it with sound: keep the pictures, lose the sound.
              el.muted = true;
              if (!soundBlocked) { soundBlocked = true; notify('This device blocked the clips’ sound, so the video has music only.'); }
              try { var p2 = el.play(); if (p2 && p2.catch) p2.catch(noop); } catch (x) { /* ignore */ }
            }
          });
        }
      } catch (e) { /* ignore */ }
    }
    function hasAudio(el) {
      try {
        if (el.audioTracks && typeof el.audioTracks.length === 'number') return el.audioTracks.length > 0;
        if (typeof el.mozHasAudio === 'boolean') return el.mozHasAudio;
      } catch (e) { /* ignore */ }
      return true;
    }
    // Browsers without audioTracks (Chrome): once a clip has played a little, no decoded audio
    // bytes while video bytes flow means the clip has no sound, so the music needn't duck.
    function provedSilent(el) {
      try {
        if (el.audioTracks && typeof el.audioTracks.length === 'number') return false;
        var ab = el.webkitAudioDecodedByteCount, vb = el.webkitVideoDecodedByteCount;
        return typeof ab === 'number' && typeof vb === 'number' && ab === 0 && vb > 50000;
      } catch (e) { return false; }
    }
    function checkSilent(v, tc, el) {
      if (!v.audible || v.silentChecked || tc < 0.8) return;
      v.silentChecked = true;
      if (provedSilent(el)) { v.audible = false; duck(false); }
    }
    function clipGain(speed) { return speed <= 1.25 ? 1.0 : (speed <= 2 ? 0.55 : 0.25); }

    var vCursor = 0;
    function assign(s, i) {
      s.segIndex = i;
      s.state = 'loading';
      var token = ++s.token;
      s.ready = loadInto(s, segs[i], token);
      s.ready.then(function () { if (s.token === token && s.state === 'loading') s.state = 'ready'; }, noop);
    }
    function fillSlots() {
      for (var k = 0; k < sslots.length; k++) {
        var s = sslots[k];
        if (s.state !== 'idle') continue;
        while (vCursor < videoIdx.length && videoIdx[vCursor] < currentIndex) vCursor++;
        if (vCursor >= videoIdx.length) return;
        assign(s, videoIdx[vCursor++]);
      }
    }
    function loadInto(s, seg, token) {
      var el = s.pool.el;
      var url = urlFor(seg.mediaId);
      if (!url) return Promise.reject(new Error('missing media'));
      function alive() { if (aborted) throw aborted; if (s.token !== token) throw new Error('stale'); }
      try { el.pause(); } catch (e) { /* ignore */ }
      if (s.pool.url !== url || el.error || !el.getAttribute('src')) {
        s.pool.url = url;
        el.src = url;
      }
      return waitEl(el, ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange'], function () { return el.readyState >= 1; }, 15000)
        .then(function () {
          alive();
          setRate(el, seg.speed || 1);
          var target = seg.trimStart || 0;
          var d = el.duration;
          if (isFinite(d) && d > 0) target = Math.min(target, Math.max(0, d - 0.1));
          if (Math.abs(el.currentTime - target) < 0.02 && el.readyState >= 2 && !el.seeking) return null;
          // iOS may not buffer a frame for a paused element: once 'seeked' fired, that's good enough.
          var seekedFired = false;
          var onSeeked = function () { seekedFired = true; };
          el.addEventListener('seeked', onSeeked);
          try { el.currentTime = target; } catch (e) { /* ignore */ }
          return waitEl(el, ['seeked', 'loadeddata', 'canplay', 'canplaythrough'], function () {
            return !el.seeking && (el.readyState >= 2 || seekedFired);
          }, 8000).then(function () { el.removeEventListener('seeked', onSeeked); }, function (e) {
            el.removeEventListener('seeked', onSeeked);
            alive();
            if (el.error) throw e;
            dbg('seek wait soft-timeout', seg.mediaId);
            return null;
          });
        })
        .then(function () { alive(); });
    }
    function acquireSlot(i) {
      var s = null;
      for (var k = 0; k < sslots.length; k++) if (sslots[k].segIndex === i && sslots[k].state !== 'idle') s = sslots[k];
      if (!s) {
        fillSlots();
        for (k = 0; k < sslots.length; k++) if (sslots[k].segIndex === i && sslots[k].state !== 'idle') s = sslots[k];
      }
      if (!s) {
        for (k = 0; k < sslots.length; k++) if (sslots[k].state !== 'playing') { s = sslots[k]; break; }
        if (!s) return Promise.resolve(null);
        assign(s, i);
      }
      var slot = s;
      return guard(slot.ready, 25000).then(function () { return slot; }, function (e) {
        if (aborted) throw aborted;
        dbg('clip failed to load', segs[i].mediaId, e && e.message);
        slot.token++;
        slot.state = 'idle';
        slot.segIndex = -1;
        try { slot.pool.el.pause(); } catch (x) { /* ignore */ }
        return null;
      });
    }

    // ================================================================ audio graph
    var mix = null, limiter = null, master = null, monitor = null, dest = null;
    var masterRamp = null, monitorRamp = null, musicGain = null, musicRamp = null, player = null;
    function buildAudioGraph() {
      mix = actx.createGain();
      master = actx.createGain();
      monitor = actx.createGain();
      try {
        limiter = actx.createDynamicsCompressor();
        limiter.threshold.value = -3;
        limiter.knee.value = 2;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.2;
        mix.connect(limiter);
        limiter.connect(master);
      } catch (e) {
        limiter = null;
        mix.connect(master);
      }
      masterRamp = makeRamp(actx, master.gain, 1);
      monitorRamp = makeRamp(actx, monitor.gain, monitorOn ? 1 : 0);
      master.connect(monitor);
      monitor.connect(actx.destination);
      dest = actx.createMediaStreamDestination();
      master.connect(dest);
      sslots.forEach(function (s) {
        try { s.pool.gain.disconnect(); } catch (e) { /* ignore */ }
        s.ramp.to(0, 0);
        s.pool.gain.connect(mix);
      });
      musicGain = actx.createGain();
      musicRamp = makeRamp(actx, musicGain.gain, 0);
      musicGain.connect(mix);
    }

    function prepareMusic() {
      var RM = root.ReelMusic;
      if (settings.music === 'off' || !RM) return Promise.resolve();
      var make;
      if (settings.music === 'mine') {
        if (!musicBlob || typeof RM.fromBuffer !== 'function') return Promise.resolve();
        make = guard(blobToArrayBuffer(musicBlob), 20000)
          .then(function (ab) { return guard(decodeAudio(actx, ab), 30000); })
          .then(function (buf) { return RM.fromBuffer(actx, buf); });
      } else {
        if (typeof RM.create !== 'function') return Promise.resolve();
        make = new Promise(function (resolve) { resolve(RM.create(actx, settings.music)); });
      }
      return make.then(function (pl) {
        if (pl && pl.output && typeof pl.output.connect === 'function') {
          pl.output.connect(musicGain);
          player = pl;
        }
      }).catch(function (e) {
        if (aborted) throw aborted;
        dbg('music failed', e && e.message);
        player = null;
        if (settings.music === 'mine') notify('We couldn’t play your song, so the video has no music.');
      });
    }
    var musicFadeStarted = false;
    function startMusic() {
      if (!player) return;
      try { player.start(actx.currentTime + 0.02); } catch (e) { dbg('music start failed', e); player = null; return; }
      musicRamp.to(settings.musicVolume, FADE_IN);
    }
    function duck(on) {
      if (!player || musicFadeStarted) return;
      musicRamp.to(settings.musicVolume * (on ? 0.35 : 1), 0.3);
    }

    // ================================================================ recorder
    var rec = null, chunks = [], recMime = '', vTrack = null;
    var recStarted = deferred(), recStopped = deferred();
    var recStartT = 0, pausedMs = 0, pauseBegan = 0, stopT = 0, stopping = false;
    function startRecorder() {
      var stream;
      try {
        var vs = canvas.captureStream ? canvas.captureStream(FPS) : canvas.mozCaptureStream(FPS);
        vTrack = vs.getVideoTracks()[0];
        var tracks = [vTrack];
        var aT = dest && dest.stream.getAudioTracks()[0];
        if (aT) tracks.push(aT);
        stream = new MediaStream(tracks);
      } catch (e) {
        throw mkErr('unsupported', 'This browser can’t record the video. Please update your iPad, or try Chrome on a computer.');
      }
      var hd = settings.quality !== '720';
      var long = plan.total > 100;
      var vbps = hd ? (long ? 9000000 : 12000000) : (long ? 4500000 : 6000000);
      var mime = sup.mimeType;
      var tries = [
        mime ? { mimeType: mime, videoBitsPerSecond: vbps, audioBitsPerSecond: 128000 } : { videoBitsPerSecond: vbps, audioBitsPerSecond: 128000 },
        mime ? { mimeType: mime } : null,
        {}
      ];
      for (var i = 0; i < tries.length && !rec; i++) {
        if (!tries[i]) continue;
        try { rec = new MediaRecorder(stream, tries[i]); } catch (e) { rec = null; }
      }
      if (!rec) throw mkErr('unsupported', 'This browser can’t record video in a format we can save.');
      rec.ondataavailable = function (e) {
        if (!e.data || !(e.data.size > 0)) return;
        // iOS 16/17 Safari could hand over the same chunk again at every timeslice while paused
        // (WebKit bug 261964); one flush on pause is real, repeats of it are not.
        var last = chunks[chunks.length - 1];
        if (rec && rec.state === 'paused' && last && (e.data === last || e.data.size === last.size)) return;
        chunks.push(e.data);
      };
      rec.onstart = function () { recStartT = now(); recStarted.resolve(); };
      rec.onstop = function () {
        recStopped.resolve();
        if (!stopping && !aborted) abort(mkErr('failed', 'Recording stopped by itself. Keep this screen open and try again.'));
      };
      rec.onerror = function (e) {
        dbg('recorder error', e && (e.error || e));
        if (!stopping && !aborted) abort(mkErr('failed', 'Recording hit a problem. Please try again.'));
      };
      recStartT = now();
      rec.start(1000);
      recMime = rec.mimeType || mime || '';
    }
    function stopRecorder() {
      stopping = true;
      stopT = now();
      if (pauseBegan) { pausedMs += stopT - pauseBegan; pauseBegan = 0; }
      if (rec && rec.state !== 'inactive') {
        try { rec.stop(); } catch (e) { recStopped.resolve(); }
      } else recStopped.resolve();
      return guard(recStopped.promise, 8000).catch(function (e) {
        if (cancelled) throw aborted;
        dbg('stop event never arrived; using what we have');
      }).then(function () {
        // a final dataavailable can trail the stop event in some browsers
        return sleepClock(0.05);
      }).then(function () {
        if (!chunks.length) throw mkErr('failed', 'The video came out empty. Please try again.');
        var type = (rec && rec.mimeType) || recMime || sup.mimeType || (isAppleWebKit() ? 'video/mp4' : 'video/webm');
        recMime = type;
        return new Blob(chunks, { type: type });
      });
    }

    // ================================================================ timeline + painter
    var clock = 0;               // seconds of recorded (active) time
    var cur = null;              // the segment being shown (null = hold the last frame)
    var currentIndex = 0;
    var paused = false, running = false;
    var rafId = 0, ivId = 0, lastTick = 0, lastPaint = 0, lastProg = 0;
    var fadeOutStart = null, fadeOutDur = FADE_OUT;
    var lastIndex = segs.length - 1;
    var tailWait = null;
    var stats = { paints: 0, paintMs: 0 };

    function startFadeOut(d) {
      if (fadeOutStart != null) return;
      fadeOutStart = clock;
      fadeOutDur = Math.max(0.12, d);
      masterRamp.to(0, fadeOutDur);
      if (!musicFadeStarted) { musicFadeStarted = true; musicRamp.to(0, fadeOutDur); }
    }

    function finishView(v, reason) {
      if (v.finished) return;
      v.finished = true;
      v.reason = reason;
      try { snapG.drawImage(canvas, 0, 0); snapValid = true; } catch (e) { /* ignore */ }
      if (cur === v) cur = null;
      v.done.resolve(reason);
    }

    function update() {
      var v = cur;
      if (!v) return;
      var tc = clock - v.start, local = tc, el, ct;
      if (v.type === 'step-clip') {
        el = v.slot.pool.el;
        ct = el.currentTime;
        var seg = v.seg, sp = seg.speed || 1;
        local = Math.max(0, (ct - seg.trimStart) / sp);
        if (el.error) { finishView(v, 'error'); return; }
        if (ct >= seg.trimEnd - 0.03 || el.ended) { finishView(v, 'end'); return; }
        if (!v.fadingOut && (seg.trimEnd - ct) / sp <= 0.1) { v.fadingOut = true; v.slot.ramp.to(0, 0.08); }
        if (ct > v.lastCT + 0.004) { v.lastCT = ct; v.lastProgress = clock; }
        else if (clock - v.lastProgress > STALL_SECS) { finishView(v, 'stalled'); return; }
        if (el.paused && !paused && clock - v.lastPlayTry > 0.8) { v.lastPlayTry = clock; setRate(el, sp); playEl(el); }
        checkSilent(v, tc, el);
        if (tc > v.dur * 2.5 + 15) { finishView(v, 'timeout'); return; }
      } else {
        if (v.slot && !v.held) {
          el = v.slot.pool.el;
          ct = el.currentTime;
          if (ct >= v.seg.trimEnd - 0.03 || el.ended || el.error) {
            v.held = true;
            try { el.pause(); } catch (e) { /* ignore */ }
            v.slot.ramp.to(0, 0.08);
            if (v.audible) duck(false);
          } else {
            if (ct > v.lastCT + 0.004) { v.lastCT = ct; v.lastProgress = clock; }
            else if (clock - v.lastProgress > STALL_SECS) { v.held = true; try { el.pause(); } catch (e) { /* ignore */ } }
            if (!v.held && el.paused && !paused && clock - v.lastPlayTry > 0.8) { v.lastPlayTry = clock; playEl(el); }
            checkSilent(v, tc, el);
          }
        }
        if (v.slot && !v.held && v.dur - tc <= 0.1 && !v.fadingOut) { v.fadingOut = true; v.slot.ramp.to(0, 0.08); }
        if (tc >= v.dur - 0.5 / FPS) { finishView(v, 'end'); return; }
      }
      v.local = local;
      if (v.i === lastIndex) {
        var remaining = Math.max(0, v.dur - local);
        if (!musicFadeStarted && remaining <= 1.2 && player) { musicFadeStarted = true; musicRamp.to(0, Math.max(0.1, remaining)); }
        if (fadeOutStart == null && remaining <= FADE_OUT) startFadeOut(remaining);
      }
    }

    function paint() {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)'; g.shadowOffsetX = 0; g.shadowOffsetY = 0;
      g.textBaseline = 'alphabetic';
      var v = cur;
      if (!v) {
        if (snapValid) g.drawImage(snap, 0, 0); else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
      } else {
        var tc = clock - v.start;
        g.save();
        switch (v.type) {
          case 'title': paintTitle(v, tc); break;
          case 'ingredients': paintIngredients(v, tc); break;
          case 'step-clip': paintClip(v, tc); break;
          case 'step-photo': paintPhoto(v, tc); break;
          case 'step-text': paintTextStep(v, tc); break;
          case 'outro': paintOutro(v, tc); break;
          default: g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        }
        g.restore();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)'; g.shadowOffsetY = 0;
        if (snapValid && v.xfade && tc < XFADE) {
          g.globalAlpha = 1 - easeInOut(tc / XFADE);
          g.drawImage(snap, 0, 0);
          g.globalAlpha = 1;
        }
      }
      var black = clamp(1 - clock / FADE_IN, 0, 1);
      if (fadeOutStart != null) black = Math.max(black, clamp((clock - fadeOutStart) / fadeOutDur, 0, 1));
      if (black > 0.001) {
        g.globalAlpha = black;
        g.fillStyle = '#000';
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }
    }

    function labelFor(seg) {
      if (!seg) return '';
      if (seg.type === 'title') return 'Title';
      if (seg.type === 'ingredients') return 'Ingredients';
      if (seg.type === 'outro') return 'The end';
      return 'Step ' + seg.stepNumber + ' of ' + seg.stepCount;
    }
    function emitProgress(force) {
      var t = now();
      if (!force && t - lastProg < 120) return;
      lastProg = t;
      var i = Math.min(currentIndex, segs.length - 1);
      var v = cur, remainCur;
      if (v && v.i === i) remainCur = Math.max(0, v.dur - (v.local || 0));
      else remainCur = (segs[i] && !(tailWait)) ? segs[i].dur : 0;
      var rest = 0;
      for (var j = i + 1; j < segs.length; j++) rest += segs[j].dur;
      var total = tailWait ? clock + Math.max(0, tailWait.until - clock) : clock + remainCur + rest + TAIL;
      var p = {
        fraction: clamp(total > 0 ? clock / total : 0, 0, 1),
        elapsed: r2(clock),
        total: r2(total),
        segmentIndex: i,
        segmentCount: segs.length,
        label: labelFor(v ? v.seg : segs[i])
      };
      try { onProgress(p); } catch (e) { /* ignore */ }
    }

    function tick(t, fromTimer) {
      if (!running) return;
      var dt = (t - lastTick) / 1000;
      lastTick = t;
      if (!paused) clock += clamp(dt, 0, 1);
      if (paused) return;
      if (!fromTimer && t - lastPaint < 1000 / FPS - 3) return;
      lastPaint = t;
      try { update(); } catch (e) { dbg('update error', e); }
      var p0 = now();
      try { paint(); } catch (e) { dbg('paint error', e); }
      stats.paints++; stats.paintMs += now() - p0;
      if (tailWait && clock >= tailWait.until) { var tw = tailWait; tailWait = null; tw.d.resolve(); }
      emitProgress(false);
    }
    function startLoop() {
      running = true;
      lastTick = now();
      lastPaint = 0;
      var raf = root.requestAnimationFrame ? root.requestAnimationFrame.bind(root) : function (f) { return setTimeout(function () { f(now()); }, 16); };
      function frame() {
        if (!running) return;
        rafId = raf(frame);
        tick(now(), false);
      }
      rafId = raf(frame);
      // backup ticker: keeps time moving if rAF stalls while the page is visible
      ivId = setInterval(function () {
        if (running && !paused && now() - lastPaint > 150) tick(now(), true);
      }, 100);
    }
    function stopLoop() {
      running = false;
      try { if (root.cancelAnimationFrame) cancelAnimationFrame(rafId); else clearTimeout(rafId); } catch (e) { /* ignore */ }
      clearInterval(ivId);
    }

    // ================================================================ pause / resume (page hidden)
    var resumeToken = 0, pauseWhy = '', tapWaiter = null;
    var MSG_HIDDEN = 'Come back to this page to keep going';
    var MSG_AUDIO = 'Paused while something else is using the sound';
    var MSG_TAP = 'The sound stopped. Tap “Keep going” to carry on.';
    function isHidden() { return document.hidden === true || document.visibilityState === 'hidden'; }
    function settle(p, ms) { return Promise.race([Promise.resolve(p).catch(noop), new Promise(function (r) { setTimeout(r, ms); })]); }
    // Is the sound really running? iOS can report 'running' with a frozen clock after a lock or a
    // call (WebKit bug 263627), and the music and clip sound would then be missing from the video.
    // `kick`: if not, try suspend() + resume() once (often brings a stuck context back).
    function audioAlive(kick) {
      return new Promise(function (resolve) {
        var kicked = !kick;
        (function probe() {
          var t0 = actx.currentTime;
          setTimeout(function () {
            if (actx.state === 'running' && actx.currentTime > t0) { resolve(true); return; }
            if (kicked || aborted || finished) { resolve(false); return; }
            kicked = true;
            var sp = null; try { sp = actx.suspend(); } catch (e) { /* ignore */ }
            settle(sp, 600).then(function () { var r = null; try { r = actx.resume(); } catch (e) { /* ignore */ } return settle(r, 800); }).then(probe);
          }, 160);
        })();
      });
    }
    function pauseVideos() {
      sslots.forEach(function (s) { try { if (!s.pool.el.paused) s.pool.el.pause(); } catch (e) { /* ignore */ } });
    }
    // why: 'hidden' (page hidden) or 'audio' (iOS took the sound away while the page is on screen)
    function pauseAll(why) {
      if (finished || aborted) return;
      resumeToken++;   // a resume still on its way must not go ahead
      if (paused) {
        pauseVideos();
        if (why === 'hidden' && pauseWhy !== 'hidden') {
          pauseWhy = 'hidden';
          try { var sp0 = actx.suspend(); if (sp0 && sp0.catch) sp0.catch(noop); } catch (e) { /* ignore */ }
          status('paused', MSG_HIDDEN);
        }
        return;
      }
      paused = true;
      pauseWhy = why || 'hidden';
      pauseBegan = now();
      try { if (rec && rec.state === 'recording' && rec.pause) rec.pause(); } catch (e) { /* ignore */ }
      pauseVideos();
      // An interrupted context comes back by itself when the interruption ends, but not one we suspended.
      if (pauseWhy === 'hidden') { try { var sp = actx.suspend(); if (sp && sp.catch) sp.catch(noop); } catch (e) { /* ignore */ } }
      status('paused', pauseWhy === 'hidden' ? MSG_HIDDEN : MSG_AUDIO);
    }
    function resumeAll(kick) {
      if (!paused || finished || aborted || isHidden()) return;
      var token = ++resumeToken;
      var r = null;
      try { r = actx.resume(); } catch (e) { r = null; }
      requestWakeLock();
      function live() { return token === resumeToken && paused && !aborted && !finished && !isHidden(); }
      settle(r, 600).then(function () { return live() ? audioAlive(kick) : false; }).then(function (ok) {
        if (!live()) return;
        if (!ok) { status('paused', MSG_TAP, { needsTap: true }); return; }
        // the recorder, the clock and the clip all start again together
        try { if (rec && rec.state === 'paused' && rec.resume) rec.resume(); } catch (e) { /* ignore */ }
        if (pauseBegan) pausedMs += now() - pauseBegan;
        pauseBegan = 0;
        paused = false;
        pauseWhy = '';
        lastTick = now();
        if (cur) {
          cur.lastProgress = clock; cur.lastPlayTry = clock;
          if (cur.slot && !cur.held && !cur.finished) { setRate(cur.slot.pool.el, cur.seg.speed || 1); playEl(cur.slot.pool.el); }
        }
        status('recording', 'Making your video…');
      });
    }
    // Called by the UI straight from a "Keep going" tap, so iOS lets the sound start again.
    function resumeFromTap() {
      if (finished || aborted) return;
      try { var r = actx.resume(); if (r && r.catch) r.catch(noop); } catch (e) { /* ignore */ }
      requestWakeLock();
      if (tapWaiter) { var w = tapWaiter; tapWaiter = null; status('preparing', 'Getting your clips ready…'); w(); return; }
      resumeAll(true);
    }
    // Before recording starts: make sure the sound runs, or wait for a tap.
    function waitAudio() {
      return guard(audioAlive(true)).then(function (ok) {
        if (ok) return null;
        status('paused', MSG_TAP, { needsTap: true });
        return guard(new Promise(function (res) { tapWaiter = res; })).then(waitAudio);
      });
    }
    function onVisibility() {
      if (!running && !recStartT) return;
      if (isHidden()) pauseAll('hidden'); else resumeAll(true);
    }
    function onCtxState() {
      if (!running || aborted || finished) return;
      if (paused) {
        // iOS gave the sound back (call or Siri over): carry on by ourselves
        if (pauseWhy === 'audio' && actx.state === 'running' && !isHidden()) resumeAll(false);
        return;
      }
      if (actx.state !== 'running' && !isHidden()) {
        // A call, Siri or another app took the sound while this page stays on screen. Pause the
        // recording, the clips and the clock until it comes back, so no step is skipped as stuck.
        pauseAll('audio');
        try { var r = actx.resume(); if (r && r.catch) r.catch(noop); } catch (e) { /* ignore */ }
      }
    }

    // ================================================================ the director
    function textFallback(seg, what) {
      var n = seg.stepNumber;
      if (seg.text) {
        notify('Step ' + n + '’s ' + what + ' wouldn’t open, so it shows just the words.');
        var s2 = {};
        for (var k in seg) s2[k] = seg[k];
        s2.type = 'step-text';
        s2.dur = textCardDur(seg.text);
        s2.kind = null;
        s2.mediaId = null;
        return s2;
      }
      notify('Step ' + n + '’s ' + what + ' wouldn’t open, so we skipped it.');
      return null;
    }

    function playSegment(i) {
      var seg = segs[i];
      currentIndex = i;
      emitProgress(true);
      var view = { i: i, seg: seg, type: seg.type, dur: seg.dur, slot: null, img: null };
      var prep;
      if (seg.kind === 'video') {
        prep = acquireSlot(i).then(function (slot) {
          if (slot) { view.slot = slot; return view; }
          if (seg.type === 'step-clip') {
            var fb = textFallback(seg, 'clip');
            if (!fb) return null;
            return { i: i, seg: fb, type: fb.type, dur: fb.dur, slot: null, img: null };
          }
          return view; // ingredients card without its video
        });
      } else if (seg.kind === 'image') {
        prep = guard(getImage(seg.mediaId), 20000).then(function (img) { view.img = img; return view; }, function (e) {
          if (aborted) throw aborted;
          dbg('image failed', seg.mediaId, e && e.message);
          if (seg.type === 'step-photo') {
            var fb = textFallback(seg, 'photo');
            if (!fb) return null;
            return { i: i, seg: fb, type: fb.type, dur: fb.dur, slot: null, img: null };
          }
          return view;
        });
      } else prep = Promise.resolve(view);

      return prep.then(function (v) {
        checkAbort();
        if (!v) { fillSlots(); return null; }
        startView(v);
        return guard(v.done.promise).then(function (reason) {
          endView(v, reason);
        });
      });
    }

    function startView(v) {
      dbg('segment', v.i, v.type, 'starts at clock', clock.toFixed(3), 'plan start', v.seg.start, 'wall', ((now() - recStartT) / 1000).toFixed(3));
      v.start = clock;
      v.local = 0;
      v.done = deferred();
      v.lastCT = -1;
      v.lastProgress = clock;
      v.lastPlayTry = clock;
      v.xfade = v.i > 0 && snapValid;
      var audible = false;
      if (v.slot) {
        var el = v.slot.pool.el, sp = v.seg.speed || 1;
        v.slot.state = 'playing';
        setRate(el, sp);
        var gt = (v.seg.sound && v.slot.pool.src && !el.muted && (RATE_SOUND_OK || Math.abs(sp - 1) < 0.01)) ? clipGain(sp) : 0;
        v.slot.ramp.to(gt, 0.08);
        audible = gt > 0 && hasAudio(el);
        playEl(el);
      }
      v.audible = audible;
      duck(audible);
      cur = v;
      fillSlots();
      prefetchImages(v.i + 1);
    }

    function endView(v, reason) {
      dbg('segment', v.i, 'ended:', reason, 'clock', clock.toFixed(3), 'shown for', (clock - v.start).toFixed(3), 'planned', v.dur);
      if (v.slot) {
        var el = v.slot.pool.el;
        v.slot.ramp.to(0, 0.03);
        try { el.pause(); } catch (e) { /* ignore */ }
        if (el.readyState >= 2 && el.videoWidth) { if (blurInto(lastTiny, el, el.videoWidth, el.videoHeight)) lastTinyValid = true; }
        v.slot.state = 'idle';
        v.slot.segIndex = -1;
        v.slot.token++;
        if (v.type === 'step-clip' && (reason === 'stalled' || reason === 'error' || reason === 'timeout')) {
          notify('Step ' + v.seg.stepNumber + '’s clip got stuck, so we moved on.');
        }
      } else if (v.img && v.img.canvas && v.img.canvas.width) {
        if (blurInto(lastTiny, v.img.canvas, v.img.w, v.img.h)) lastTinyValid = true;
      }
      if (v.audible && !musicFadeStarted) duck(false);
      releaseImages(v.i);
      fillSlots();
    }

    function settleUnlocks() {
      if (!unlocks.length) return Promise.resolve();
      return Promise.all(unlocks.map(function (p) { return guard(p, 2500).catch(function (e) { if (aborted) throw aborted; }); }))
        .then(function () {
          sslots.forEach(function (s) { try { s.pool.el.pause(); } catch (e) { /* ignore */ } });
        });
    }

    function loadFonts() {
      if (!document.fonts || typeof document.fonts.load !== 'function') return Promise.resolve();
      var specs = ['700 64px "Fraunces"', '800 64px "Fraunces"', '900 64px "Fraunces"',
        '600 32px "Figtree"', '700 32px "Figtree"', '800 32px "Figtree"'];
      return Promise.all(specs.map(function (s) { try { return document.fonts.load(s).catch(noop); } catch (e) { return null; } }));
    }

    var hasTitleBg = false;
    function prepareTitleBg() {
      // The first step's picture (or the ingredients media), blurred, behind the title.
      if (!segs.length || segs[0].type !== 'title') return Promise.resolve();
      var src = null;
      for (var i = 0; i < segs.length; i++) {
        if ((segs[i].type === 'step-clip' || segs[i].type === 'step-photo') && segs[i].mediaId) { src = i; break; }
      }
      if (src == null) for (i = 0; i < segs.length; i++) if (segs[i].mediaId) { src = i; break; }
      if (src == null) return Promise.resolve();
      var seg = segs[src];
      if (seg.kind === 'image') {
        return guard(getImage(seg.mediaId), 8000).then(function (img) {
          if (img && blurInto(titleTiny, img.canvas, img.w, img.h)) hasTitleBg = true;
        }).catch(function (e) { if (aborted) throw aborted; });
      }
      var slot = null;
      for (var k = 0; k < sslots.length; k++) if (sslots[k].segIndex === src) slot = sslots[k];
      if (!slot) return Promise.resolve();
      return guard(slot.ready, 8000).then(function () {
        var el = slot.pool.el;
        if (el.readyState >= 2 && el.videoWidth && blurInto(titleTiny, el, el.videoWidth, el.videoHeight)) hasTitleBg = true;
      }).catch(function (e) { if (aborted) throw aborted; });
    }

    function waitVisible() {
      if (!isHidden()) return Promise.resolve();
      status('paused', 'Come back to this page to keep going');
      return guard(new Promise(function (resolve) {
        var iv = setInterval(function () { if (!isHidden()) { clearInterval(iv); resolve(); } }, 250);
        waiters.push(function () { clearInterval(iv); });
      }));
    }

    function doRun() {
      if (initError) return Promise.reject(initError);
      if (aborted) return Promise.reject(aborted);
      if (!segs.length) return Promise.reject(mkErr('failed', 'There’s nothing to put in the video yet — add a step first.'));
      status('preparing', 'Getting your clips ready…');
      document.addEventListener('visibilitychange', onVisibility);
      try { actx.addEventListener('statechange', onCtxState); } catch (e) { /* ignore */ }
      setupCanvases();
      buildAudioGraph();

      return settleUnlocks()
        .then(function () {
          if (actx.state !== 'running') return softly(guard(actx.resume(), 2500));
          return null;
        })
        .then(function () {
          fillSlots();
          prefetchImages(0);
          return Promise.all([
            softly(guard(loadFonts(), 3000)),
            prepareMusic(),
            softly(prepareTitleBg())
          ]);
        })
        .then(function () {
          checkAbort();
          return waitVisible();
        })
        .then(function () {
          checkAbort();
          return waitAudio();
        })
        .then(function () {
          checkAbort();
          clock = 0;
          paint(); // first frame (black: we fade in from it)
          startRecorder();
          return softly(guard(recStarted.promise, 2000));
        })
        .then(function () {
          checkAbort();
          startMusic();
          startLoop();
          status('recording', 'Making your video…');
          var i = 0;
          function next() {
            checkAbort();
            if (i >= segs.length) return null;
            var idx = i++;
            return playSegment(idx).then(next);
          }
          return next();
        })
        .then(function () {
          checkAbort();
          currentIndex = segs.length - 1;
          if (fadeOutStart == null) startFadeOut(0.4);
          var d = deferred();
          tailWait = { until: fadeOutStart + fadeOutDur + TAIL, d: d };
          return guard(d.promise, 60000).catch(function (e) { if (aborted) throw aborted; });
        })
        .then(function () {
          checkAbort();
          status('finishing', 'Finishing up…');
          dbg('paints', stats.paints, 'avg paint ms', (stats.paintMs / Math.max(1, stats.paints)).toFixed(1), 'fps', (stats.paints / Math.max(0.1, clock)).toFixed(1));
          stopLoop();
          return stopRecorder();
        })
        .then(function (blob) {
          checkAbort();
          var measured = Math.max(0, (stopT - recStartT - pausedMs) / 1000);
          var isWebm = /webm|matroska/i.test(blob.type);
          var fixed = isWebm ? fixWebmDuration(blob, measured * 1000) : Promise.resolve(blob);
          return guard(fixed, 10000).catch(function () { return blob; }).then(function (b2) {
            return guard(probeDuration(b2), 4000).catch(function () { return null; }).then(function (probed) {
              var duration = (probed && probed > measured * 0.5 && probed < measured * 2 + 1) ? probed : measured;
              var mime = recMime || b2.type;
              return {
                blob: b2,
                mimeType: mime,
                ext: extFor(mime),
                duration: r2(duration),
                width: W,
                height: H,
                size: b2.size
              };
            });
          });
        });
    }

    // ================================================================ cleanup
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      finished = true;
      stopLoop();
      document.removeEventListener('visibilitychange', onVisibility);
      try { actx && actx.removeEventListener('statechange', onCtxState); } catch (e) { /* ignore */ }
      if (tailWait) { tailWait = null; }
      try { if (rec && rec.state !== 'inactive') { stopping = true; rec.stop(); } } catch (e) { /* ignore */ }
      try { if (vTrack) vTrack.stop(); } catch (e) { /* ignore */ }
      sslots.forEach(function (s) {
        s.token++;
        s.state = 'idle';
        s.segIndex = -1;
        try { s.ramp.to(0, 0); } catch (e) { /* ignore */ }
        try { s.pool.el.pause(); } catch (e) { /* ignore */ }
        try { s.pool.el.removeAttribute('src'); s.pool.el.load(); } catch (e) { /* ignore */ }
        s.pool.url = null;
        try { s.pool.gain.disconnect(); } catch (e) { /* ignore */ }
      });
      try { if (player) player.stop(actx.currentTime + 0.05); } catch (e) { /* ignore */ }
      var pl = player;
      player = null;
      setTimeout(function () {
        try { if (pl && pl.output) pl.output.disconnect(); } catch (e) { /* ignore */ }
        [musicGain, mix, limiter, master, monitor].forEach(function (n) { try { if (n) n.disconnect(); } catch (e) { /* ignore */ } });
        try { if (dest) dest.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ }
        if (shared.active === api && actx && actx.state === 'running') {
          try { var p = actx.suspend(); if (p && p.catch) p.catch(noop); } catch (e) { /* ignore */ }
        }
      }, 150);
      Object.keys(urls).forEach(function (id) { try { URL.revokeObjectURL(urls[id]); } catch (e) { /* ignore */ } });
      urls = {};
      Object.keys(images).forEach(function (id) {
        if (images[id].data) { freeCanvas(images[id].data.canvas); freeCanvas(images[id].data.tiny); }
      });
      images = {};
      [snap, blurB, liveTiny, titleTiny, lastTiny].forEach(freeCanvas);
      snap = null; snapG = null; snapValid = false;
      releaseWakeLock();
    }

    // ================================================================ public session
    function run(handlers) {
      if (runPromise) return runPromise;
      handlers = handlers || {};
      onProgress = typeof handlers.onProgress === 'function' ? handlers.onProgress : noop;
      onStatus = typeof handlers.onStatus === 'function' ? handlers.onStatus : noop;
      runPromise = new Promise(function (resolve, reject) {
        var p;
        try { p = doRun(); } catch (e) { p = Promise.reject(e); }
        p.then(function (result) {
          finished = true;
          cleanup();
          try { onProgress({ fraction: 1, elapsed: result.duration, total: result.duration, segmentIndex: segs.length - 1, segmentCount: segs.length, label: 'The end' }); } catch (e) { /* ignore */ }
          status('done', 'All done!');
          resolve(result);
        }, function (e) {
          var err;
          if (cancelled) err = mkErr('cancelled', 'Stopped.');
          else if (e && (e.code === 'unsupported' || e.code === 'failed' || e.code === 'cancelled')) err = e;
          else {
            dbg('run failed', e);
            err = mkErr('failed', 'Something went wrong while making your video. Please try again.');
            err.cause = e;
          }
          abort(err);
          cleanup();
          reject(err);
        });
      });
      return runPromise;
    }

    function cancel() {
      if (finished || cancelled) return;
      cancelled = true;
      abort(mkErr('cancelled', 'Stopped.'));
      // Stop sound + recording right away. If run() is in flight it rejects with code 'cancelled'.
      cleanup();
    }

    function setMonitor(on) {
      monitorOn = !!on;
      if (monitorRamp) monitorRamp.to(monitorOn ? 1 : 0, 0.05);
    }

    var api = { run: run, cancel: cancel, setMonitor: setMonitor, resumeFromTap: resumeFromTap, plan: plan, width: W, height: H };
    return api;
  }

  function begin(opts) {
    // Only one render at a time: stop any previous one first (it shares the audio + video pool).
    if (shared.active) { try { shared.active.cancel(); } catch (e) { /* ignore */ } }
    var s = createSession(opts);
    shared.active = s;
    return s;
  }

  var ReelEngine = {
    version: VERSION,
    debug: false,
    LOOKS: LOOKS,
    canvasSize: canvasSize,
    supported: supported,
    plan: planProject,
    begin: begin,
    rateSoundOK: RATE_SOUND_OK,   // false: sped-up (or slowed) clips play without their own sound here
    _fixWebmDuration: fixWebmDuration
  };
  root.ReelEngine = ReelEngine;
})(typeof window !== 'undefined' ? window : this);
