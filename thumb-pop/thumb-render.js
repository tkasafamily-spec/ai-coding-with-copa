/* Thumb Pop renderer: window.ThumbRender
 * Design model, templates, procedural scenes, code-drawn stickers, text effects, photos/cut-outs,
 * hit-testing and export. Plain JS, no DOM UI. Safari-safe: no ctx.filter, no ctx.letterSpacing,
 * no ctx.roundRect, no Path2D. Expensive things are cached on offscreen canvases.
 */
(function () {
  'use strict';

  var W = 1280, H = 720, DEG = Math.PI / 180;

  /* ------------------------------------------------------------------ utils */
  var idCounter = 0;
  function newId() { idCounter = (idCounter + 1) % 1679616; return 'l' + Date.now().toString(36).slice(-6) + idCounter.toString(36) + Math.random().toString(36).slice(2, 6); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function obj(v) { return v && typeof v === 'object' ? v : {}; }
  function str(v, d) { return typeof v === 'string' ? v : (d == null ? '' : d); }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function parseHex(c) {
    if (typeof c !== 'string') return null;
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function toHex(r, g, b) {
    function p(v) { v = clamp(Math.round(v), 0, 255); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + p(r) + p(g) + p(b);
  }
  /* amt < 0 mixes toward black, amt > 0 toward white */
  function shade(c, amt) {
    var p = parseHex(c); if (!p) return c;
    var t = amt < 0 ? 0 : 255, k = Math.abs(amt);
    return toHex(p[0] + (t - p[0]) * k, p[1] + (t - p[1]) * k, p[2] + (t - p[2]) * k);
  }
  function stop(g, o, c, fb) { try { g.addColorStop(o, c); } catch (e) { g.addColorStop(o, fb); } }
  function rgba(c, a) { var p = parseHex(c); return p ? 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')' : c; }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y, s) { var h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  function mk(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function free(c) { if (c && c.width) { c.width = 0; c.height = 0; } }
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }
  function smooth(c, on) { c.imageSmoothingEnabled = on; if ('webkitImageSmoothingEnabled' in c) c.webkitImageSmoothingEnabled = on; if (on && 'imageSmoothingQuality' in c) c.imageSmoothingQuality = 'high'; }

  /* ------------------------------------------------------------------ cache (LRU by pixels) */
  var cache = new Map(), cachePx = 0, BUDGET = 20e6, frame = 0;
  function cget(k) { var e = cache.get(k); if (e) { cache.delete(k); cache.set(k, e); e.f = frame; } return e; }
  function cset(k, e) {
    e.px = e.canvas ? e.canvas.width * e.canvas.height : 0; e.f = frame;
    var old = cache.get(k);
    if (old) { cachePx -= old.px; cache.delete(k); if (old.canvas !== e.canvas) free(old.canvas); }
    cache.set(k, e); cachePx += e.px;
    var it = cache.keys();
    while (cachePx > BUDGET && cache.size > 1) {
      var fk = it.next().value; if (fk === undefined || fk === k) break;
      var fe = cache.get(fk); if (fe.f === frame) break;
      cache.delete(fk); cachePx -= fe.px; free(fe.canvas);
    }
    return e;
  }
  function clearCache() { cache.forEach(function (e) { free(e.canvas); }); cache.clear(); cachePx = 0; layoutCache.clear(); }

  /* source identity: a WeakMap token per image object, so a NEW object for an imageId invalidates caches */
  var tokens = new WeakMap(), tokenN = 0;
  function tokenOf(src) {
    if (!src || typeof src !== 'object') return 0;
    var t = tokens.get(src); if (!t) { t = ++tokenN; tokens.set(src, t); } return t;
  }
  function invalidate(src) {
    if (!src) { clearCache(); return; }
    if (typeof src === 'object') { tokens.set(src, ++tokenN); }
  }
  function natSize(src) {
    if (!src) return null;
    var w = src.naturalWidth || src.videoWidth || src.width || 0, h = src.naturalHeight || src.videoHeight || src.height || 0;
    if (src.complete === false) return null;
    return w > 0 && h > 0 ? { w: w, h: h } : null;
  }

  /* ------------------------------------------------------------------ fonts */
  var FONTS = [
    { id: 'anton', label: 'Anton (tall)', family: 'Anton', weight: 400, fb: "Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif", themes: ['cooking', 'smp'] },
    { id: 'bowlby', label: 'Bowlby One (fat)', family: 'Bowlby One', weight: 400, fb: "'Arial Black', Impact, sans-serif", themes: ['cooking'] },
    { id: 'luckiest', label: 'Luckiest Guy (fun)', family: 'Luckiest Guy', weight: 400, fb: "'Arial Black', Impact, sans-serif", themes: ['cooking', 'smp'] },
    { id: 'archivo', label: 'Archivo Black (clean)', family: 'Archivo Black', weight: 400, fb: "'Arial Black', 'Helvetica Neue', sans-serif", themes: ['cooking'] },
    { id: 'lilita', label: 'Lilita One (chunky)', family: 'Lilita One', weight: 400, fb: "'Arial Rounded MT Bold', 'Arial Black', sans-serif", themes: ['cooking', 'smp'] },
    { id: 'caveat', label: 'Caveat Brush (handwritten)', family: 'Caveat Brush', weight: 400, fb: "'Marker Felt', 'Bradley Hand', 'Comic Sans MS', cursive", themes: ['cooking'] },
    { id: 'pixelify', pixel: true, label: 'Pixelify Sans (pixel)', family: 'Pixelify Sans', weight: 700, fb: "'Courier New', monospace", themes: ['smp'] },
    { id: 'silkscreen', pixel: true, label: 'Silkscreen (pixel caps)', family: 'Silkscreen', weight: 700, fb: "'Courier New', monospace", themes: ['smp'] },
    { id: 'press2p', pixel: true, label: 'Press Start 2P (arcade)', family: 'Press Start 2P', weight: 400, fb: "'Courier New', monospace", themes: ['smp'] },
    { id: 'bungee', label: 'Bungee (blocky)', family: 'Bungee', weight: 400, fb: "'Arial Black', Impact, sans-serif", themes: ['smp', 'cooking'] }
  ];
  FONTS.forEach(function (f) { f.css = "'" + f.family + "', " + f.fb; });
  var FONT_BY = {}; FONTS.forEach(function (f) { FONT_BY[f.id] = f; });
  var fontsCssUrl = 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bowlby+One&family=Bungee&family=Caveat+Brush&family=Lilita+One&family=Luckiest+Guy&family=Pixelify+Sans:wght@700&family=Press+Start+2P&family=Silkscreen:wght@400;700&display=swap';
  var UI_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, 'Helvetica Neue', Arial, sans-serif";
  var EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', sans-serif";
  function fontOf(id) { return FONT_BY[id] || FONT_BY.anton; }
  function fontStr(f, size) { return f.weight + ' ' + size + 'px ' + f.css; }

  var fontEpoch = 0;
  try { if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { fontEpoch++; layoutCache.clear(); }); } catch (e) { /* old browser */ }

  function fontLink() {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) { var h = links[i].href || ''; if (h.indexOf('fonts.googleapis.com') >= 0 && h.indexOf('Pixelify') >= 0) return links[i]; }
    return null;
  }
  function injectFontCss() {
    var l = fontLink(); if (l) return l;
    try {
      l = document.createElement('link'); l.rel = 'stylesheet'; l.href = fontsCssUrl; l.setAttribute('data-thumb-render', '1');
      (document.head || document.documentElement).appendChild(l);
    } catch (e) { return null; }
    return l;
  }
  function waitSheet(l) {
    return new Promise(function (res) {
      if (!l) return res();
      try { if (l.sheet) return res(); } catch (e) { return res(); }
      var done = false; function fin() { if (!done) { done = true; res(); } }
      l.addEventListener('load', fin); l.addEventListener('error', fin); setTimeout(fin, 2500);
    });
  }
  function ensureFonts() {
    var timeout = new Promise(function (res) { setTimeout(function () { res(false); }, 3000); });
    var work;
    try {
      if (!document.fonts || !document.fonts.load) return Promise.resolve(false);
      work = waitSheet(injectFontCss()).then(function () {
        return Promise.all(FONTS.map(function (f) {
          return document.fonts.load(f.weight + ' 48px "' + f.family + '"', 'AaBb$1!').catch(function () { return null; });
        }));
      }).then(function () {
        fontEpoch++; layoutCache.clear();
        try { return FONTS.every(function (f) { return document.fonts.check(f.weight + ' 48px "' + f.family + '"', 'A'); }); } catch (e) { return true; }
      });
    } catch (e) { return Promise.resolve(false); }
    return Promise.race([work, timeout]).catch(function () { return false; });
  }

  /* ------------------------------------------------------------------ text layout */
  var mctx = null;
  function measureCtx() { if (!mctx) mctx = mk(8, 8).getContext('2d'); return mctx; }
  var layoutCache = new Map();
  function textMetricsOf(L) {
    var f = fontOf(L.font), size = clamp(num(L.size, 100), 4, 1200);
    var lhm = clamp(num(L.lineHeight, 1), 0.5, 3), ls = num(L.letterSpacing, 0), maxW = num(L.maxWidth, 0);
    var raw = String(L.text == null ? '' : L.text); if (L.uppercase) raw = raw.toUpperCase();
    var key = [raw, f.id, size, lhm, ls, maxW, fontEpoch].join('\u0001');
    var hit = layoutCache.get(key); if (hit) return hit;
    var c = measureCtx(); var fs = fontStr(f, size); c.font = fs;
    var meas = function (t) {
      if (!ls) return c.measureText(t).width;
      var ch = Array.from(t); return c.measureText(t).width + ls * Math.max(0, ch.length - 1);
    };
    var lines = [];
    raw.split('\n').forEach(function (para) {
      if (!maxW || maxW <= 0) { lines.push(para); return; }
      var words = para.split(/ +/), line = '';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (line && meas(test) > maxW) { lines.push(line); line = words[i]; } else line = test;
      }
      lines.push(line);
    });
    var out = [], bw = 0;
    lines.forEach(function (t) {
      var ln = { t: t, w: meas(t) };
      if (ls) {
        var chars = Array.from(t), pos = [], acc = '';
        for (var i = 0; i < chars.length; i++) { pos.push(c.measureText(acc).width + i * ls); acc += chars[i]; }
        ln.chars = chars; ln.pos = pos;
      }
      bw = Math.max(bw, ln.w); out.push(ln);
    });
    var capH = size * 0.72;
    try { var m = c.measureText('HXE'); if (m.actualBoundingBoxAscent > 0) capH = m.actualBoundingBoxAscent; } catch (e) { /* ignore */ }
    if (!raw.trim()) bw = Math.max(bw, size * 0.6);
    var lay = { lines: out, size: size, lh: size * lhm, ls: ls, blockW: bw, blockH: out.length * size * lhm, capH: capH, fs: fs, font: f };
    if (layoutCache.size > 400) layoutCache.clear();
    layoutCache.set(key, lay);
    return lay;
  }
  function forLines(lay, align, fn) {
    for (var i = 0; i < lay.lines.length; i++) {
      var ln = lay.lines[i];
      var x = align === 'left' ? 0 : align === 'right' ? lay.blockW - ln.w : (lay.blockW - ln.w) / 2;
      var by = i * lay.lh + lay.lh / 2 + lay.capH / 2;
      fn(ln, x, by, i);
    }
  }
  function run(c, ln, x, by, stroke) {
    if (!ln.chars) { if (stroke) c.strokeText(ln.t, x, by); else c.fillText(ln.t, x, by); return; }
    for (var i = 0; i < ln.chars.length; i++) {
      if (ln.chars[i] === ' ') continue;
      if (stroke) c.strokeText(ln.chars[i], x + ln.pos[i], by); else c.fillText(ln.chars[i], x + ln.pos[i], by);
    }
  }
  function strokeOf(L) { var s = obj(L.stroke); return { w: clamp(num(s.width, 0), 0, 80), color: str(s.color, '#111111') }; }
  function shadowOf(o) { var s = obj(o); var b = clamp(num(s.blur, 0), 0, 200), dx = num(s.dx, 0), dy = num(s.dy, 0); return { on: !!(b > 0 || dx || dy), blur: b, dx: dx, dy: dy, color: str(s.color, 'rgba(0,0,0,0.5)') }; }
  function effectParams(L, lay) {
    var eff = L.effect || 'none', size = lay.size, es = num(L.effectSize, 0);
    var box = obj(L.box);
    return {
      eff: eff,
      ext: eff === 'extrude' ? clamp(es || size * 0.075, 2, 80) : 0,
      pix: eff === 'pixel' ? clamp(es || size * 0.085, 2, 50) : 0,
      glow: eff === 'glow' ? clamp(es || size * 0.2, 2, 120) : 0,
      bp: eff === 'box' ? clamp(num(box.padding, size * 0.22), 0, 300) : 0,
      boxColor: str(box.color, '#ffd60a'), boxR: clamp(num(box.radius, 16), 0, 400),
      color: str(L.effectColor, eff === 'glow' ? '#ffffff' : '#000000')
    };
  }
  function textBox(L) {
    var lay = textMetricsOf(L), sw = strokeOf(L).w, ep = effectParams(L, lay);
    var padW = Math.max(sw, ep.bp), padH = Math.max(sw, ep.bp);
    return { w: lay.blockW + 2 * padW, h: lay.blockH + 2 * padH, lay: lay };
  }

  /* preview caches snap their pixel width to ~4% steps so resizing a photo/sticker mostly hits the cache;
     export (and opts.exact) renders exact sizes */
  var EXACT = false, settled = true, storeKey = null, lastMiss = Object.create(null), lastMissN = 0;
  function quantPx(px) { if (!(px > 0)) return px; return Math.pow(2, Math.round(Math.log(px) / Math.LN2 * 16) / 16); }
  /* exact-size cache first; while the same layer keeps missing (being resized) use ~4% size buckets drawn scaled */
  function lookup(L, ek, bk) {
    var e = cget(ek); if (e) return e;
    var now = Date.now(), id = L && L.id;
    if (!EXACT && bk && id && now - (lastMiss[id] || 0) < 400) { lastMiss[id] = now; settled = false; storeKey = bk; return cget(bk) || null; }
    if (id) { if (++lastMissN > 600) { lastMiss = Object.create(null); lastMissN = 0; } lastMiss[id] = now; }
    storeKey = ek; return null;
  }
  /* scale clamp: keep any cache canvas within iOS canvas limits */
  function safeScale(s, dw, dh) {
    var cw = dw * s, ch = dh * s, k = 1;
    if (cw > 4000) k = Math.min(k, 4000 / cw);
    if (ch > 4000) k = Math.min(k, 4000 / ch);
    if (cw * ch * k * k > 9e6) k = Math.min(k, Math.sqrt(9e6 / (cw * ch)));
    return s * k;
  }

  function renderText(L, s) {
    var lay = textMetricsOf(L), st = strokeOf(L), sh = shadowOf(L.shadow), ep = effectParams(L, lay);
    var fill = obj(L.fill), align = L.align || 'center';
    var tail = [lay.font.id, JSON.stringify(lay.lines.map(function (l) { return l.t; })), (lay.lh / lay.size).toFixed(3), lay.ls, align, JSON.stringify(fill), st.w, st.color,
      sh.on ? [sh.blur, sh.dx, sh.dy, sh.color].join(',') : '', ep.eff, ep.ext, ep.pix, ep.glow, ep.bp, ep.boxColor, ep.boxR, ep.color, s.toFixed(3), fontEpoch].join('|');
    var hit = lookup(L, 'T|' + lay.size + '|' + tail, 'Tq|' + quantPx(lay.size * s).toFixed(2) + '|' + tail); if (hit) return hit;
    var key = storeKey;
    var pad = Math.ceil(st.w + Math.max(ep.ext + st.w * 0.5 + 2, ep.pix) + ep.glow * 1.8 + ep.bp + (sh.on ? sh.blur * 1.3 + Math.max(Math.abs(sh.dx), Math.abs(sh.dy)) : 0) + 4);
    var dw = lay.blockW + 2 * pad, dh = lay.blockH + 2 * pad;
    var es = safeScale(s, dw, dh), cw = Math.ceil(dw * es), ch = Math.ceil(dh * es);
    var C = mk(cw, ch), c = C.getContext('2d');
    var setT = function (cx) { cx.setTransform(es, 0, 0, es, pad * es, pad * es); };
    var shape = function (color, extra) {
      var S = mk(cw, ch), x = S.getContext('2d'); setT(x);
      x.font = lay.fs; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = color; x.strokeStyle = color;
      var lw = (st.w + (extra || 0)) * 2;
      if (lw > 0) { x.lineJoin = lay.font.pixel ? 'miter' : 'round'; x.lineCap = lay.font.pixel ? 'square' : 'round'; x.miterLimit = 2.5; x.lineWidth = lw; forLines(lay, align, function (ln, lx, by) { run(x, ln, lx, by, true); }); }
      forLines(lay, align, function (ln, lx, by) { run(x, ln, lx, by, false); });
      return S;
    };
    // 1) effects behind the body
    if (ep.bp || ep.eff === 'box') {
      setT(c); c.fillStyle = ep.boxColor; c.beginPath(); rr(c, -ep.bp, -ep.bp, lay.blockW + 2 * ep.bp, lay.blockH + 2 * ep.bp, ep.boxR); c.fill();
    }
    if (ep.ext) {
      var steps = Math.max(1, Math.round(ep.ext * es));
      var A = shape(st.w > 0 ? st.color : shade(ep.color, -0.5), Math.max(1.5, st.w * 0.3));
      var B = shape(ep.color, 0);
      c.setTransform(1, 0, 0, 1, 0, 0);
      for (var i = steps; i >= 1; i--) c.drawImage(A, i, i);
      for (var j = steps - 1; j >= 1; j--) c.drawImage(B, j, j);
      free(A); free(B);
    }
    if (ep.pix) {
      var P = shape(ep.color, 0), d = Math.max(1, Math.round(ep.pix * es));
      c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(P, d, d); free(P);
    }
    if (ep.glow) {
      var G = shape(ep.color, 0);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.shadowColor = ep.color; c.shadowBlur = ep.glow * es;
      c.drawImage(G, 0, 0); c.drawImage(G, 0, 0); c.shadowBlur = ep.glow * es * 0.45; c.drawImage(G, 0, 0);
      c.shadowColor = 'rgba(0,0,0,0)'; c.shadowBlur = 0; free(G);
    }
    // 2) body: outline behind fill
    setT(c);
    c.font = lay.fs; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    if (st.w > 0) {
      c.lineJoin = lay.font.pixel ? 'miter' : 'round'; c.lineCap = lay.font.pixel ? 'square' : 'round'; c.miterLimit = 2.5; c.lineWidth = st.w * 2; c.strokeStyle = st.color;
      forLines(lay, align, function (ln, lx, by) { run(c, ln, lx, by, true); });
    }
    var fc = str(fill.color, '#ffffff'), fc2 = str(fill.color2, '#ffb000');
    forLines(lay, align, function (ln, lx, by) {
      if (fill.kind === 'gradient') {
        var g = c.createLinearGradient(0, by - lay.capH, 0, by + lay.size * 0.04);
        stop(g, 0, fc, '#ffffff'); stop(g, 1, fc2, '#ffb000'); c.fillStyle = g;
      } else c.fillStyle = fc;
      run(c, ln, lx, by, false);
    });
    var out = C;
    // 3) soft drop shadow under everything
    if (sh.on) {
      out = mk(cw, ch); var o = out.getContext('2d');
      o.shadowColor = sh.color; o.shadowBlur = sh.blur * es; o.shadowOffsetX = sh.dx * es; o.shadowOffsetY = sh.dy * es;
      o.drawImage(C, 0, 0); free(C);
    }
    return cset(key, { canvas: out, ax: (pad + lay.blockW / 2) * es, ay: (pad + lay.blockH / 2) * es, m: s / es, w0: lay.size });
  }

  /* ------------------------------------------------------------------ silhouettes / outlines / glow / shadow (shared by photos + stickers) */
  function dilate(I, r, color, square) {
    var S = mk(I.width, I.height), c = S.getContext('2d');
    if (r > 0.4) {
      if (square) {
        var st = Math.max(1, r / 6);
        for (var t = -r; t <= r + 0.01; t += st) { c.drawImage(I, t, -r); c.drawImage(I, t, r); c.drawImage(I, -r, t); c.drawImage(I, r, t); }
        if (r > 6) { var r2 = r * 0.5; for (var u = -r2; u <= r2 + 0.01; u += Math.max(1, r2 / 4)) { c.drawImage(I, u, -r2); c.drawImage(I, u, r2); c.drawImage(I, -r2, u); c.drawImage(I, r2, u); } }
      } else {
        var n = clamp(Math.ceil(2 * Math.PI * r / 2), 8, 72);
        for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; c.drawImage(I, Math.cos(a) * r, Math.sin(a) * r); }
        if (r > 5) { var m = Math.max(8, n >> 1), rh = r * 0.55; for (var k = 0; k < m; k++) { var b = (k + 0.5) / m * Math.PI * 2; c.drawImage(I, Math.cos(b) * rh, Math.sin(b) * rh); } }
      }
    }
    c.drawImage(I, 0, 0);
    c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, S.width, S.height);
    return S;
  }
  function tintCopy(I, color) {
    var S = mk(I.width, I.height), c = S.getContext('2d');
    c.drawImage(I, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, S.width, S.height);
    return S;
  }
  /* I = content canvas (with padding). sil = optional outline silhouette canvas (already coloured). Returns final canvas. */
  function finishFx(I, sil, glow, sh, es) {
    var cw = I.width, ch = I.height, C = I;
    if (sil || glow.size > 0) {
      C = mk(cw, ch); var c = C.getContext('2d');
      if (glow.size > 0) {
        var G = sil ? tintCopy(sil, glow.color) : tintCopy(I, glow.color);
        c.shadowColor = glow.color; c.shadowBlur = glow.size * es;
        c.drawImage(G, 0, 0); c.drawImage(G, 0, 0);
        c.shadowBlur = glow.size * es * 0.4; c.drawImage(G, 0, 0);
        c.shadowColor = 'rgba(0,0,0,0)'; c.shadowBlur = 0; free(G);
      }
      if (sil) c.drawImage(sil, 0, 0);
      c.drawImage(I, 0, 0);
      if (sil) free(sil);
      free(I);
    }
    if (sh.on) {
      var F = mk(cw, ch), f = F.getContext('2d');
      f.shadowColor = sh.color; f.shadowBlur = sh.blur * es; f.shadowOffsetX = sh.dx * es; f.shadowOffsetY = sh.dy * es;
      f.drawImage(C, 0, 0); free(C); C = F;
    }
    return C;
  }
  function fxPad(ow, glowSize, sh) { return Math.ceil(ow + glowSize * 1.9 + (sh.on ? sh.blur * 1.3 + Math.max(Math.abs(sh.dx), Math.abs(sh.dy)) : 0) + 4); }

  /* ------------------------------------------------------------------ image layers */
  var PH_ASPECT = { none: 0.85, circle: 1, square: 1, rounded: 16 / 9 };
  function imageFrame(L, src) {
    var shape = L.shape || 'none', n = natSize(src);
    var a = num(L.aspect, 0);
    if (shape === 'circle') a = 1;
    else if (shape === 'square' && !a) a = 1;
    else if (shape === 'none' && n) a = n.w / n.h;
    else if (!a) a = n ? n.w / n.h : PH_ASPECT[shape] || 1;
    var w = clamp(num(L.w, 400), 8, 6000);
    return { w: w, h: w / a, aspect: a, shape: shape };
  }
  function shapePath(c, shape, x, y, w, h, grow) {
    c.beginPath();
    if (shape === 'circle') { c.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 + grow, 0, Math.PI * 2); c.closePath(); }
    else { var r = shape === 'rounded' ? Math.min(w, h) * 0.09 : 0; rr(c, x - grow, y - grow, w + 2 * grow, h + 2 * grow, r + (r ? grow : 0)); }
  }
  function coverDraw(c, src, n, fx, fy, zoom, x, y, w, h) {
    var a = w / h, sa = n.w / n.h, sw, sh;
    zoom = clamp(num(zoom, 1), 1, 8);
    if (sa > a) { sh = n.h / zoom; sw = sh * a; } else { sw = n.w / zoom; sh = sw / a; }
    var sx = (n.w - sw) * clamp(num(fx, 0.5), 0, 1), sy = (n.h - sh) * clamp(num(fy, 0.5), 0, 1);
    c.drawImage(src, sx, sy, sw, sh, x, y, w, h);
  }
  function phKind(label) {
    var t = String(label || '').toLowerCase();
    if (/face|you\b|\bme\b|reaction|skin|person|yourself|selfie|head|cut-?out/.test(t) && !/screenshot/.test(t)) return 'person';
    if (/dish|food|plate|meal|cookie|cake|pasta|burger|pizza|bowl|recipe|ingredient|finished|raw|snack|dessert|bread|chicken/.test(t)) return 'plate';
    return 'photo';
  }
  function strHash(t) { var h = 7; t = String(t || ''); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return Math.abs(h); }
  /* generated art for an empty image slot: 'scene:<id>[:<setPiece>]' | 'food:<dish>' | null.
     Older designs without a fill field: a scene field still shows that scene, a dish label shows food. */
  function fillOf(L) {
    var f = L.fill;
    if (typeof f === 'string') {
      if (f.indexOf('scene:') === 0) { var p = f.slice(6).split(':'); return { kind: 'scene', scene: SCENE_BY[p[0]] ? p[0] : (SCENE_BY[L.scene] ? L.scene : null), setPiece: SETPIECES[p[1]] ? p[1] : null }; }
      if (f.indexOf('food:') === 0) return { kind: 'food', dish: foodKind(f.slice(5)) };
      return null;
    }
    if (f === undefined) {
      if (L.scene && SCENE_BY[L.scene]) return { kind: 'scene', scene: L.scene, setPiece: null };
      if (L.placeholder && phKind(L.placeholder) === 'plate') return { kind: 'food', dish: foodKind(L.placeholder) };
    }
    return null;
  }
  function fillSceneCanvas(fill, theme) {
    var sid = fill.scene || THEME_SCENE[theme === 'smp' ? 'smp' : 'cooking'];
    if (!fill.setPiece) return sceneCanvas(sid);
    var key = 'SCF|' + sid + '|' + fill.setPiece, hit = cget(key); if (hit) return hit.canvas;
    var C = mk(W, H), c = C.getContext('2d'); c.drawImage(sceneCanvas(sid), 0, 0);
    try { drawSetPiece(c, fill.setPiece, 'center'); } catch (e) { /* scene alone */ }
    return cset(key, { canvas: C }).canvas;
  }
  function renderImage(L, src, s, opts, info) {
    var n = natSize(src);
    info = info || { theme: 'cooking', bgScene: null };
    var fill = n ? null : fillOf(L), empty = !n && !fill;
    if (empty && !(opts && opts.emptyOutline)) return null;
    var fr = imageFrame(L, n ? src : null), w = fr.w, h = fr.h, shape = fr.shape;
    var ol = obj(L.outline), ow = clamp(num(ol.width, 0), 0, 60), oc = str(ol.color, '#ffffff');
    var gl = obj(L.glow), glow = { size: clamp(num(gl.size, 0), 0, 120), color: str(gl.color, '#ffffff') };
    var sh = shadowOf(L.shadow);
    if (empty) { ow = 0; glow.size = 0; sh = shadowOf(null); }
    var foodBg = fill && fill.kind === 'food' ? (SCENE_BY[L.scene] ? L.scene : 'wood-board') : '';
    var what = n ? tokenOf(src) : empty ? 'empty' : [fill.kind, fill.scene || '', fill.setPiece || '', fill.dish || '', foodBg, info.theme].join(':');
    var tail = [what, (w / h).toFixed(4), shape, !!L.flipX,
      num(L.fx, 0.5), num(L.fy, 0.5), num(L.zoom, 1), ow, oc, glow.size, glow.color, sh.on ? [sh.blur, sh.dx, sh.dy, sh.color].join(',') : '', s.toFixed(3)].join('|');
    var hit = lookup(L, 'I|' + w.toFixed(2) + '|' + tail, 'Iq|' + quantPx(w * s).toFixed(2) + '|' + tail); if (hit) return hit;
    var key = storeKey;
    var pad = fxPad(ow, glow.size, sh), dw = w + 2 * pad, dh = h + 2 * pad;
    var es = safeScale(s, dw, dh), cw = Math.ceil(dw * es), ch = Math.ceil(dh * es);
    var I = mk(cw, ch), c = I.getContext('2d');
    c.setTransform(es, 0, 0, es, pad * es, pad * es);
    smooth(c, true);
    var cut = shape === 'none', food = fill && fill.kind === 'food';
    if (L.flipX) { c.translate(w, 0); c.scale(-1, 1); }
    if (n) {
      if (cut) c.drawImage(src, 0, 0, w, h);
      else { c.save(); shapePath(c, shape, 0, 0, w, h, 0); c.clip(); coverDraw(c, src, n, L.fx, L.fy, L.zoom, 0, 0, w, h); c.restore(); }
    } else if (fill && fill.kind === 'scene') {
      var sc = fillSceneCanvas(fill, info.theme);
      c.save(); shapePath(c, cut ? 'square' : shape, 0, 0, w, h, 0); c.clip(); coverDraw(c, sc, { w: W, h: H }, L.fx, L.fy, L.zoom, 0, 0, w, h); c.restore();
    } else if (food) {
      if (!cut) {
        c.save(); shapePath(c, shape, 0, 0, w, h, 0); c.clip();
        coverDraw(c, sceneCanvas(foodBg), { w: W, h: H }, 0.5, 0.5, 1, 0, 0, w, h);
        var zw = w * 1.34, zh = h * 1.34; c.translate((w - zw) / 2, (h - zh) / 2 + h * 0.06); drawFood(c, fill.dish, zw, zh, es); c.restore();
      } else drawFood(c, fill.dish, w, h, es);
    } else {
      c.save(); shapePath(c, cut ? 'rounded' : shape, 0, 0, w, h, -3); if (c.setLineDash) c.setLineDash([14, 10]);
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.4)'; c.stroke(); c.restore();
    }
    var sil = null;
    if (ow > 0) {
      if (cut && food) {
        var FS = mk(cw, ch), fx = FS.getContext('2d'); fx.setTransform(es, 0, 0, es, pad * es, pad * es); smooth(fx, true);
        if (L.flipX) { fx.translate(w, 0); fx.scale(-1, 1); }
        FOOD_SIL = true; try { drawFood(fx, fill.dish, w, h, es); } finally { FOOD_SIL = false; }
        sil = dilate(FS, ow * es, oc, false); free(FS);
      } else if (cut && n) sil = dilate(I, ow * es, oc, false);
      else {
        sil = mk(cw, ch); var x = sil.getContext('2d'); x.setTransform(es, 0, 0, es, pad * es, pad * es);
        x.fillStyle = oc; shapePath(x, cut ? 'square' : shape, 0, 0, w, h, ow); x.fill();
      }
    }
    var out = finishFx(I, sil, glow, sh, es);
    return cset(key, { canvas: out, ax: (pad + w / 2) * es, ay: (pad + h / 2) * es, m: s / es, w0: w });
  }

  /* ------------------------------------------------------------------ stickers */
  var OUTLINE = '#15161a';
  function ink(c, path, fill, ow, oc) {
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); path(c);
    if (ow > 0) { c.lineWidth = ow * 2; c.strokeStyle = oc || OUTLINE; c.stroke(); }
    c.fillStyle = fill; c.fill();
  }
  function poly(c, pts) { c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
  function fitFont(c, text, fontCss, weight, maxW, maxH) {
    var size = maxH; c.font = weight + ' ' + size + 'px ' + fontCss;
    var w = c.measureText(text).width; if (w > maxW) size = size * maxW / w;
    c.font = weight + ' ' + size + 'px ' + fontCss; return size;
  }
  var unflipText = false;
  function stickerText(c, text, cx, cy, maxW, maxH, fill, stroke, fontId) {
    if (!text) return;
    if (unflipText) { c.save(); c.translate(cx, 0); c.scale(-1, 1); c.translate(-cx, 0); }
    var f = fontOf(fontId || 'bowlby');
    var size = fitFont(c, text, f.css, f.weight, maxW, maxH);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    var capH = size * 0.72; try { var m = c.measureText(text); if (m.actualBoundingBoxAscent > 0) capH = m.actualBoundingBoxAscent; } catch (e) { /* ignore */ }
    var by = cy + capH / 2;
    if (stroke) { c.lineJoin = 'round'; c.lineWidth = size * 0.16; c.strokeStyle = stroke; c.strokeText(text, cx, by); }
    c.fillStyle = fill; c.fillText(text, cx, by);
    if (unflipText) c.restore();
  }
  function star4(c, cx, cy, r) {
    var k = r * 0.16;
    c.moveTo(cx, cy - r);
    c.quadraticCurveTo(cx + k, cy - k, cx + r, cy); c.quadraticCurveTo(cx + k, cy + k, cx, cy + r);
    c.quadraticCurveTo(cx - k, cy + k, cx - r, cy); c.quadraticCurveTo(cx - k, cy - k, cx, cy - r); c.closePath();
  }
  function bezPts(p0, p1, p2, p3, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  }

  /* vector stickers: draw(c, w, h, color, L) in design units inside [0,w]x[0,h] */
  var VEC = {
    'arrow-straight': { name: 'Arrow', aspect: 2.3, tint: true, color: '#ff2d2d', themes: ['cooking', 'smp'], draw: function (c, w, h, col) {
      var o = h * 0.075, x0 = o, x1 = w - o, y0 = o, y1 = h - o, mid = h / 2, hh = y1 - y0, sh = hh * 0.4, hx = x1 - hh * 0.92;
      var pts = [[x0, mid - sh * 0.36], [hx, mid - sh / 2], [hx - hh * 0.04, y0], [x1, mid], [hx - hh * 0.04, y1], [hx, mid + sh / 2], [x0, mid + sh * 0.36]];
      ink(c, function (x) { poly(x, pts); }, col, o);
      c.save(); c.beginPath(); poly(c, pts); c.clip(); c.fillStyle = shade(col, 0.3); c.fillRect(0, 0, w, mid - sh * 0.12); c.fillStyle = shade(col, -0.22); c.fillRect(0, mid + sh * 0.26, w, h); c.restore();
    } },
    'arrow-curved': { name: 'Curvy arrow', aspect: 1.15, tint: true, color: '#ff2d2d', themes: ['cooking', 'smp'], draw: function (c, w, h, col) {
      var m = Math.min(w, h), o = m * 0.05;
      var P = bezPts([0.08, 0.92], [0.06, 0.4], [0.36, 0.12], [0.7, 0.2], 28);
      var L = [], R = [];
      for (var i = 0; i < P.length; i++) {
        var a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        var nx = -dy / d, ny = dx / d, t = i / (P.length - 1), hw = 0.035 + 0.05 * t;
        L.push([P[i][0] + nx * hw, P[i][1] + ny * hw]); R.push([P[i][0] - nx * hw, P[i][1] - ny * hw]);
      }
      var e = P[P.length - 1], e0 = P[P.length - 3], tx = e[0] - e0[0], ty = e[1] - e0[1], td = Math.hypot(tx, ty); tx /= td; ty /= td;
      var nx2 = -ty, ny2 = tx, hl = 0.26, hw2 = 0.2;
      var tip = [e[0] + tx * hl, e[1] + ty * hl];
      var pts = L.concat([[e[0] + nx2 * hw2, e[1] + ny2 * hw2], tip, [e[0] - nx2 * hw2, e[1] - ny2 * hw2]]).concat(R.reverse());
      // fit to box
      var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
      pts.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
      var sc = Math.min((w - 2 * o) / (maxx - minx), (h - 2 * o) / (maxy - miny));
      var ox = (w - (maxx - minx) * sc) / 2 - minx * sc, oy = (h - (maxy - miny) * sc) / 2 - miny * sc;
      var q = pts.map(function (p) { return [p[0] * sc + ox, p[1] * sc + oy]; });
      ink(c, function (x) { poly(x, q); }, col, o);
      // highlight along the outer edge
      c.save(); c.beginPath(); poly(c, q); c.clip();
      c.beginPath(); for (var k = 2; k < L.length - 2; k++) { var p = P[P.length - 1 - k], r2 = R[k]; var px = (r2[0] * 0.6 + p[0] * 0.4) * sc + ox, py = (r2[1] * 0.6 + p[1] * 0.4) * sc + oy; if (k === 2) c.moveTo(px, py); else c.lineTo(px, py); }
      c.lineWidth = m * 0.035; c.strokeStyle = shade(col, 0.35); c.lineCap = 'round'; c.stroke(); c.restore();
    } },
    'circle-ring': { name: 'Red circle', aspect: 1.25, tint: true, color: '#ff2d2d', themes: ['cooking', 'smp'], draw: function (c, w, h, col) {
      var m = Math.min(w, h), t = m * 0.075, o = t * 0.3, cx = w / 2, cy = h / 2, rx = w / 2 - t - o * 2, ry = h / 2 - t - o * 2;
      var path = function (x) {
        var a0 = -2.0, n = 90;
        for (var i = 0; i <= n; i++) {
          var u = i / n, a = a0 + u * Math.PI * 2 * 1.07, k = 1 + 0.025 * Math.sin(a * 3 + 1) - 0.06 * u;
          var px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
          if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
      };
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); path(c); c.lineWidth = t + o * 2; c.strokeStyle = shade(col, -0.55); c.stroke();
      c.beginPath(); path(c); c.lineWidth = t; c.strokeStyle = col; c.stroke();
    } },
    'burst': { name: 'Burst badge', aspect: 1, tint: true, color: '#ffd60a', text: 'NEW!', textColor: '#e3121b', themes: ['cooking'], draw: function (c, w, h, col, L) {
      var m = Math.min(w, h), o = m * 0.035, cx = w / 2, cy = h / 2, R = m / 2 - o * 1.5, n = 18;
      ink(c, function (x) { for (var i = 0; i < n * 2; i++) { var a = i / (n * 2) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? R * 0.8 : R * (i % 4 ? 0.95 : 1); var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath(); }, col, o);
      c.beginPath(); c.arc(cx, cy, R * 0.66, 0, Math.PI * 2); c.lineWidth = o * 0.8; c.strokeStyle = shade(col, 0.45); c.stroke();
      stickerText(c, L.text != null ? String(L.text) : 'NEW!', cx, cy, R * 1.25, R * 0.62, str(L.textColor, '#e3121b'), null, L.font || 'bowlby');
    } },
    'badge-time': { name: 'Time badge', aspect: 2.5, tint: true, color: '#ff3b30', text: '10 MIN', themes: ['cooking'], draw: function (c, w, h, col, L) {
      var o = h * 0.06, r = (h - 2 * o) / 2;
      ink(c, function (x) { rr(x, o, o, w - 2 * o, h - 2 * o, r); }, col, o);
      c.save(); c.beginPath(); rr(c, o, o, w - 2 * o, h - 2 * o, r); c.clip(); c.fillStyle = shade(col, 0.22); c.fillRect(0, 0, w, h * 0.42); c.restore();
      var cx = o + r, cy = h / 2, cr = r * 0.66;
      ink(c, function (x) { x.arc(cx, cy, cr, 0, Math.PI * 2); }, '#ffffff', o * 0.6);
      c.lineCap = 'round'; c.strokeStyle = OUTLINE; c.lineWidth = cr * 0.16;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - cr * 0.62); c.moveTo(cx, cy); c.lineTo(cx + cr * 0.45, cy + cr * 0.12); c.stroke();
      stickerText(c, L.text != null ? String(L.text) : '10 MIN', (w + h * 0.92) / 2, cy, w - h * 1.25, h * 0.5, '#ffffff', OUTLINE, L.font || 'anton');
    } },
    'ribbon-new': { name: 'NEW ribbon', aspect: 2.7, tint: true, color: '#e8261c', text: 'NEW', themes: ['cooking'], draw: function (c, w, h, col, L) {
      var o = h * 0.06, d = shade(col, -0.35);
      ink(c, function (x) { poly(x, [[o, h * 0.32], [w * 0.2, h * 0.32], [w * 0.2, h - o], [o, h - o], [w * 0.08, h * 0.65]]); }, d, o);
      ink(c, function (x) { poly(x, [[w - o, h * 0.32], [w * 0.8, h * 0.32], [w * 0.8, h - o], [w - o, h - o], [w * 0.92, h * 0.65]]); }, d, o);
      ink(c, function (x) { poly(x, [[w * 0.13, o], [w * 0.87, o], [w * 0.87, h * 0.78], [w * 0.13, h * 0.78]]); }, col, o);
      c.fillStyle = shade(col, 0.25); c.fillRect(w * 0.13, o, w * 0.74, h * 0.16);
      stickerText(c, L.text != null ? String(L.text) : 'NEW', w / 2, h * 0.42, w * 0.62, h * 0.46, '#ffffff', OUTLINE, L.font || 'bowlby');
    } },
    'clock': { name: 'Clock', aspect: 1, tint: true, color: '#ff3b30', themes: ['cooking'], draw: function (c, w, h, col) {
      var m = Math.min(w, h), o = m * 0.035, cx = w / 2, cy = h * 0.55, R = m * 0.37;
      ink(c, function (x) { x.moveTo(cx - R * 0.55, cy + R * 0.7); x.lineTo(cx - R * 0.85, cy + R * 1.08); }, col, o); c.lineWidth = m * 0.05; c.strokeStyle = OUTLINE; c.beginPath(); c.moveTo(cx - R * 0.55, cy + R * 0.7); c.lineTo(cx - R * 0.8, cy + R * 1.05); c.moveTo(cx + R * 0.55, cy + R * 0.7); c.lineTo(cx + R * 0.8, cy + R * 1.05); c.stroke();
      [-1, 1].forEach(function (sgn) { ink(c, function (x) { x.arc(cx + sgn * R * 0.72, cy - R * 0.86, R * 0.36, 0, Math.PI * 2); }, shade(col, -0.1), o); });
      ink(c, function (x) { x.arc(cx, cy, R, 0, Math.PI * 2); }, col, o);
      ink(c, function (x) { x.arc(cx, cy, R * 0.76, 0, Math.PI * 2); }, '#ffffff', o * 0.6);
      c.strokeStyle = OUTLINE; c.lineCap = 'round';
      for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; c.lineWidth = m * (i % 3 ? 0.012 : 0.022); c.beginPath(); c.moveTo(cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62); c.lineTo(cx + Math.cos(a) * R * 0.7, cy + Math.sin(a) * R * 0.7); c.stroke(); }
      c.lineWidth = m * 0.04; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - R * 0.5); c.moveTo(cx, cy); c.lineTo(cx + R * 0.36, cy + R * 0.1); c.stroke();
      c.fillStyle = col; c.beginPath(); c.arc(cx, cy, m * 0.03, 0, 7); c.fill();
    } },
    'flame': { name: 'Flame', aspect: 0.8, tint: false, color: '#ff4a12', themes: ['cooking', 'smp'], draw: function (c, w, h) {
      var o = Math.min(w, h) * 0.045;
      var fl = function (x, sx, sy, ox, oy) {
        var P = function (px, py) { return [ox + px * sx, oy + py * sy]; };
        var a = P(0.5, 0), b = P(0.97, 0.62), d = P(0.5, 1), e = P(0.03, 0.62);
        x.moveTo(a[0], a[1]);
        var c1 = P(0.62, 0.2), c2 = P(0.98, 0.36); x.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], b[0], b[1]);
        var c3 = P(0.96, 0.88), c4 = P(0.76, 1); x.bezierCurveTo(c3[0], c3[1], c4[0], c4[1], d[0], d[1]);
        var c5 = P(0.24, 1), c6 = P(0.04, 0.88); x.bezierCurveTo(c5[0], c5[1], c6[0], c6[1], e[0], e[1]);
        var f1 = P(0.02, 0.42), f2 = P(0.16, 0.3), f = P(0.26, 0.2); x.bezierCurveTo(f1[0], f1[1], f2[0], f2[1], f[0], f[1]);
        var g1 = P(0.28, 0.36), g2 = P(0.36, 0.42), g = P(0.42, 0.44); x.bezierCurveTo(g1[0], g1[1], g2[0], g2[1], g[0], g[1]);
        var k1 = P(0.4, 0.28), k2 = P(0.42, 0.12); x.bezierCurveTo(k1[0], k1[1], k2[0], k2[1], a[0], a[1]); x.closePath();
      };
      var bw = w - 2 * o, bh = h - 2 * o;
      ink(c, function (x) { fl(x, bw, bh, o, o); }, '#ff3d0a', o);
      c.beginPath(); fl(c, bw * 0.66, bh * 0.66, o + bw * 0.17, o + bh * 0.34); c.fillStyle = '#ff9a12'; c.fill();
      c.beginPath(); fl(c, bw * 0.38, bh * 0.4, o + bw * 0.31, o + bh * 0.6); c.fillStyle = '#ffe14d'; c.fill();
    } },
    'sparkles': { name: 'Sparkles', aspect: 1.1, tint: true, color: '#ffe14d', themes: ['cooking', 'smp'], draw: function (c, w, h, col) {
      var m = Math.min(w, h), o = m * 0.03;
      ink(c, function (x) { star4(x, w * 0.38, h * 0.56, m * 0.38); }, col, o);
      ink(c, function (x) { star4(x, w * 0.8, h * 0.22, m * 0.17); }, col, o);
      ink(c, function (x) { star4(x, w * 0.83, h * 0.8, m * 0.12); }, '#ffffff', o);
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); star4(c, w * 0.34, h * 0.5, m * 0.1); c.fill();
    } },
    'check': { name: 'Tick', aspect: 1.15, tint: false, color: '#22c55e', themes: ['cooking', 'smp'], draw: function (c, w, h) {
      var m = Math.min(w, h), t = m * 0.2, o = m * 0.045;
      var path = function (x) { x.moveTo(w * 0.14, h * 0.55); x.lineTo(w * 0.4, h * 0.8); x.lineTo(w * 0.86, h * 0.2); };
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); path(c); c.lineWidth = t + 2 * o; c.strokeStyle = OUTLINE; c.stroke();
      c.beginPath(); path(c); c.lineWidth = t; c.strokeStyle = '#22c55e'; c.stroke();
      c.beginPath(); c.moveTo(w * 0.17, h * 0.52); c.lineTo(w * 0.39, h * 0.73); c.lineTo(w * 0.83, h * 0.17); c.lineWidth = t * 0.28; c.strokeStyle = '#86efac'; c.stroke();
    } },
    'cross': { name: 'Cross', aspect: 1, tint: false, color: '#ff2d2d', themes: ['cooking', 'smp'], draw: function (c, w, h) {
      var m = Math.min(w, h), t = m * 0.2, o = m * 0.045;
      var path = function (x) { x.moveTo(w * 0.2, h * 0.2); x.lineTo(w * 0.8, h * 0.8); x.moveTo(w * 0.8, h * 0.2); x.lineTo(w * 0.2, h * 0.8); };
      c.lineCap = 'round';
      c.beginPath(); path(c); c.lineWidth = t + 2 * o; c.strokeStyle = OUTLINE; c.stroke();
      c.beginPath(); path(c); c.lineWidth = t; c.strokeStyle = '#ff2d2d'; c.stroke();
      c.beginPath(); c.moveTo(w * 0.22, h * 0.18); c.lineTo(w * 0.5, h * 0.46); c.moveTo(w * 0.78, h * 0.18); c.lineTo(w * 0.62, h * 0.34); c.lineWidth = t * 0.25; c.strokeStyle = '#ff9a9a'; c.stroke();
    } },
    'utensils': { name: 'Fork & spoon', aspect: 1, tint: false, color: '#e9edf2', themes: ['cooking'], draw: function (c, w, h) {
      var m = Math.min(w, h), o = m * 0.03, L = m * 0.92;
      var item = function (rot, spoon) {
        c.save(); c.translate(w / 2, h / 2); c.rotate(rot); c.translate(-L * 0.09, -L / 2);
        var hw = L * 0.085;
        var p = function (x) {
          if (spoon) { x.ellipse ? x.ellipse(hw, L * 0.17, L * 0.13, L * 0.17, 0, 0, Math.PI * 2) : x.arc(hw, L * 0.17, L * 0.15, 0, Math.PI * 2); x.moveTo(hw * 0.55, L * 0.3); rr(x, hw * 0.45, L * 0.3, hw * 1.1, L * 0.7, hw * 0.55); }
          else { rr(x, -hw * 0.6, 0, hw * 3.2, L * 0.3, hw * 0.5); rr(x, hw * 0.45, L * 0.26, hw * 1.1, L * 0.74, hw * 0.55); }
        };
        ink(c, p, '#e9edf2', o);
        c.fillStyle = '#b8c1cc';
        if (spoon) { c.beginPath(); c.ellipse ? c.ellipse(hw * 1.25, L * 0.2, L * 0.07, L * 0.11, 0, 0, Math.PI * 2) : c.arc(hw * 1.25, L * 0.2, L * 0.08, 0, 7); c.fill(); }
        else { c.fillStyle = OUTLINE; for (var i = 1; i < 4; i++) c.fillRect(-hw * 0.6 + i * hw * 0.8 - hw * 0.12, -1, hw * 0.24, L * 0.2); }
        c.restore();
      };
      item(-0.62, true); item(0.62, false);
    } },
    'chef-hat': { name: 'Chef hat', aspect: 1.05, tint: false, color: '#ffffff', themes: ['cooking'], draw: function (c, w, h) {
      var m = Math.min(w, h), o = m * 0.035;
      var shapes = function (x) {
        x.moveTo(w * 0.3 + m * 0.2, h * 0.4); x.arc(w * 0.3, h * 0.4, m * 0.2, 0, Math.PI * 2);
        x.moveTo(w * 0.5 + m * 0.25, h * 0.3); x.arc(w * 0.5, h * 0.3, m * 0.25, 0, Math.PI * 2);
        x.moveTo(w * 0.7 + m * 0.2, h * 0.4); x.arc(w * 0.7, h * 0.4, m * 0.2, 0, Math.PI * 2);
        x.rect(w * 0.24, h * 0.42, w * 0.52, h * 0.34);
      };
      c.lineJoin = 'round'; c.beginPath(); shapes(c); c.lineWidth = o * 2; c.strokeStyle = OUTLINE; c.stroke();
      c.beginPath(); rr(c, w * 0.21, h * 0.7, w * 0.58, h * 0.22, m * 0.04); c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); shapes(c); c.fill();
      c.fillStyle = '#f1f1f1'; c.beginPath(); rr(c, w * 0.21, h * 0.7, w * 0.58, h * 0.22, m * 0.04); c.fill();
      c.strokeStyle = '#c9ced6'; c.lineWidth = m * 0.02; c.lineCap = 'round';
      c.beginPath(); c.moveTo(w * 0.4, h * 0.5); c.lineTo(w * 0.4, h * 0.68); c.moveTo(w * 0.6, h * 0.5); c.lineTo(w * 0.6, h * 0.68); c.stroke();
    } },
    'heart': { name: 'Heart', aspect: 1.1, tint: true, color: '#ff2d55', themes: ['cooking'], draw: function (c, w, h, col) {
      var m = Math.min(w, h), o = m * 0.045;
      var p = function (x) { var X = function (u) { return o + u * (w - 2 * o); }, Y = function (v) { return o + v * (h - 2 * o); };
        x.moveTo(X(0.5), Y(0.98)); x.bezierCurveTo(X(0.18), Y(0.74), X(0), Y(0.5), X(0.02), Y(0.28)); x.bezierCurveTo(X(0.05), Y(0.04), X(0.38), Y(-0.04), X(0.5), Y(0.2));
        x.bezierCurveTo(X(0.62), Y(-0.04), X(0.95), Y(0.04), X(0.98), Y(0.28)); x.bezierCurveTo(X(1), Y(0.5), X(0.82), Y(0.74), X(0.5), Y(0.98)); x.closePath(); };
      ink(c, p, col, o);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse ? c.ellipse(w * 0.28, h * 0.3, m * 0.1, m * 0.06, -0.7, 0, Math.PI * 2) : c.arc(w * 0.28, h * 0.3, m * 0.07, 0, 7); c.fill();
    } },
    'star': { name: 'Star', aspect: 1.05, tint: true, color: '#ffd60a', themes: ['cooking'], draw: function (c, w, h, col) {
      var m = Math.min(w, h), o = m * 0.04, cx = w / 2, cy = h * 0.53, R = m * 0.47 - o, r = R * 0.48;
      var p = function (x) { for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath(); };
      ink(c, p, col, o);
      c.save(); c.beginPath(); p(c); c.clip(); c.fillStyle = shade(col, -0.18); c.beginPath(); c.moveTo(cx, cy); c.lineTo(w, cy - R * 0.3); c.lineTo(w, h); c.lineTo(cx, h); c.closePath(); c.fill(); c.restore();
    } },
    'speech': { name: 'Speech bubble', aspect: 1.45, tint: true, color: '#ffffff', text: 'YUM!', themes: ['cooking'], draw: function (c, w, h, col, L) {
      var m = Math.min(w, h), o = m * 0.04;
      ink(c, function (x) { rr(x, o, o, w - 2 * o, h * 0.74, h * 0.24); x.moveTo(w * 0.24, h * 0.7); x.lineTo(w * 0.16, h - o); x.lineTo(w * 0.44, h * 0.72); }, col, o);
      c.fillStyle = col; c.fillRect(w * 0.2, h * 0.6, w * 0.26, h * 0.14);
      stickerText(c, L.text != null ? String(L.text) : 'YUM!', w / 2, o + h * 0.37, w * 0.8, h * 0.42, str(L.textColor, '#e3121b'), null, L.font || 'luckiest');
    } },
    'divider': { name: 'Split line', aspect: 0.16, tint: true, color: '#ffffff', themes: ['cooking', 'smp'], draw: function (c, w, h, col) {
      var o = w * 0.09;
      ink(c, function (x) { poly(x, [[w * 0.62, o], [w - o, o], [w * 0.38, h - o], [o, h - o]]); }, col, o);
    } }
  };

  /* pixel art: rows of palette chars ('.' = empty). Auto 1-cell dark outline. */
  var GLYPH = {
    '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
    'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'N': ['#..#', '##.#', '#.##', '#..#', '#..#'],
    '!': ['##', '##', '##', '##', '##', '..', '##']
  };
  function blank(w, h) { var r = []; for (var y = 0; y < h; y++) r.push(new Array(w + 1).join('.')); return r; }
  function setPx(rows, x, y, ch) { if (y < 0 || y >= rows.length || x < 0 || x >= rows[y].length) return; rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1); }
  function stamp(rows, g, gx, gy, ch) { var G = GLYPH[g]; for (var j = 0; j < G.length; j++) for (var i = 0; i < G[j].length; i++) if (G[j][i] === '#') setPx(rows, gx + i, gy + j, ch); return rows; }
  function fnGrid(w, h, fn) { var rows = []; for (var y = 0; y < h; y++) { var r = ''; for (var x = 0; x < w; x++) r += fn(x, y) || '.'; rows.push(r); } return rows; }
  /* bevel: top/left edge cells -> light char, bottom/right edge cells -> dark char (only for base char) */
  function bevel(rows, base, light, dark) {
    var out = rows.slice(), at = function (x, y) { return y >= 0 && y < rows.length && x >= 0 && x < rows[y].length ? rows[y][x] : '.'; };
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== base) continue;
      if (at(x, y - 1) === '.' || at(x - 1, y) === '.') setPx(out, x, y, light);
      else if (at(x, y + 1) === '.' || at(x + 1, y) === '.') setPx(out, x, y, dark);
    }
    return out;
  }
  var PX = {
    'px-diamond': { name: 'Diamond', pal: { w: '#ffffff', l: '#b4f5ff', c: '#3fd8ee', d: '#1592b4', e: '#0c5f80' }, rows: [
      '....wwllllcc....',
      '...wwlllllccc...',
      '..wllllllllccc..',
      '.lllllllllcccdd.',
      'cccccccccccdddde',
      '.llllllcccccddd.',
      '..lllllcccccdd..',
      '...llllccccdd...',
      '....lllcccdd....',
      '.....llccdd.....',
      '......lcdd......',
      '.......cd.......'] },
    'px-emerald': { name: 'Emerald', pal: { w: '#eafff0', l: '#86f7a6', g: '#1fc75a', d: '#0c8a3a', k: '#06602a' }, rows: [
      '....llgg....',
      '...lwlggg...',
      '..lwllgggd..',
      '.llwlggggdd.',
      '.lwllggggdd.',
      '.lwlgkkggdd.',
      '.llgkggkgdd.',
      '.lggkggkgdd.',
      '.lgggkkgddd.',
      '.gggggggddd.',
      '..gggggddd..',
      '...gggddd...',
      '....ggdd....'] },
    'px-gold': { name: 'Gold bar', pal: { h: '#fff6b0', w: '#ffffff', y: '#ffd21f', o: '#e09a00', b: '#a86400' }, rows: [
      '....hhhhhhhh....',
      '...hwhyyyyyyo...',
      '..hwyyyyyyyyyo..',
      '.hyyyyyyyyyyyyo.',
      'hyyyyyyyyyyyyyyo',
      'oooooooooooooooo',
      'bbbbbbbbbbbbbbbb'] },
    'px-money': { name: 'Cash stack', pal: { p: '#c6f7b8', g: '#5fd36a', c: '#2e9a3e', w: '#eaffe5', y: '#ffe066', e: '#4cc25a', f: '#2f8f3c' }, rows: [
      'pppyyppppppppppp',
      'pggyygggggccgggp',
      'pggyyggggcwwcggp',
      'pggyyggggcwwcggp',
      'pggyygggggccgggp',
      'pppyyppppppppppp',
      'eeeyyeeeeeeeeeee',
      'fffyyfffffffffff',
      'eeeyyeeeeeeeeeee',
      'fffyyfffffffffff'] },
    'px-moneybag': { name: 'Money bag', pal: { r: '#7a3f12', t: '#e7bf74', s: '#c3913f', h: '#fbe3ad', g: '#1f9d3a' }, rows: (function () {
      var r = [
        '....rr..rr....',
        '.....rrrr.....',
        '......rr......',
        '.....tttt.....',
        '....tttttt....',
        '...ttttttts...',
        '..tttttttttss.',
        '.ttttttttttss.',
        'tttttttttttsss',
        'tttttttttttsss',
        'tttttttttttsss',
        'tttttttttttsss',
        '.ttttttttttss.',
        '..sssssssssss.'];
      stamp(r, '$', 4, 6, 'g'); setPx(r, 3, 6, 'h'); setPx(r, 2, 7, 'h'); setPx(r, 1, 8, 'h'); setPx(r, 1, 9, 'h'); setPx(r, 6, 3, 'h');
      return r; })() },
    'px-coin': { name: 'Coin', pal: { y: '#ffd21f', o: '#d98a00', h: '#fff4a3', d: '#a86400' }, rows: (function () {
      var r = fnGrid(15, 15, function (x, y) {
        var d = Math.hypot(x - 7, y - 7); if (d > 7.3) return '.';
        if (d > 6.2) return (x + y < 13) ? 'h' : 'd';
        if (d > 5.2) return 'o'; return 'y';
      });
      stamp(r, '$', 5, 4, 'o'); return r; })() },
    'px-sword': { name: 'Sword', pal: { w: '#e9fffd', l: '#7ff0e6', b: '#29b9b0', d: '#137a75', g: '#ffd21f', h: '#8a4b1f', k: '#5a2d0e' }, rows: fnGrid(16, 16, function (x, y) {
      var s = x + y, d = x - y;
      if (d >= -8 && d <= -6 && s >= 11 && s <= 19 && !(s === 15 && d === -7)) return 'g';
      if (s >= 14 && s <= 16 && y <= 10 && x >= 5) return s === 15 ? 'w' : (s === 14 ? 'l' : 'b');
      if (s === 15 && d === -7) return 'g';
      if (s >= 14 && s <= 16 && d <= -9 && d >= -13) return (d % 2) ? 'h' : 'k';
      if (s >= 14 && s <= 16 && d <= -14 && d >= -16) return 'g';
      return '.';
    }) },
    'px-pickaxe': { name: 'Pickaxe', pal: { w: '#e9fffd', c: '#3fd8ee', d: '#1592b4', b: '#9a5a26', k: '#5a2d0e' }, rows: fnGrid(16, 16, function (x, y) {
      var r = Math.hypot(x - 4.5, y - 10.5);
      var ang = Math.atan2(10.5 - y, x - 4.5);
      if (r > 7.2 && r < 9.6 && ang > 0.05 && ang < 1.52) return r > 8.8 ? 'w' : (r < 7.9 ? 'd' : 'c');
      var s = x + y;
      if ((s === 15 || s === 16) && x >= 1 && x <= 10) return ((x - y) % 3 === 0) ? 'k' : 'b';
      return '.';
    }) },
    'px-tnt': { name: 'TNT block', pal: { r: '#e0332b', k: '#a3201a', l: '#ff6a5c', w: '#f4efe6', x: '#1b1b1b' }, rows: (function () {
      var r = fnGrid(16, 16, function (x, y) {
        if (y >= 5 && y <= 10) return 'w';
        if (y === 0) return 'l';
        return (x % 4 === 3) ? 'k' : 'r';
      });
      stamp(r, 'T', 2, 6, 'x'); stamp(r, 'N', 6, 6, 'x'); stamp(r, 'T', 11, 6, 'x');
      return r; })() },
    'px-chest': { name: 'Chest', pal: { h: '#e8ab5f', b: '#b8742f', k: '#4a2a0c', d: '#8a5220', s: '#3b3b3b', g: '#e6e6e6' }, rows: [
      'hhhhhhhhhhhhhhhh',
      'dbbbbbbbbbbbbbbd',
      'dbbbbbbbbbbbbbbd',
      'dbbbbbbbbbbbbbbd',
      'dbbbbbssssbbbbbd',
      'kkkkkksggskkkkkk',
      'dbbbbbsggsbbbbbd',
      'dbbbbbssssbbbbbd',
      'dbbbbbbbbbbbbbbd',
      'dbbbbbbbbbbbbbbd',
      'dbbbbbbbbbbbbbbd',
      'dddddddddddddddd'] },
    'px-spawner': { name: 'Spawner cage', pal: { f: '#434b58', g: '#7a8597', i: '#10131a', r: '#b3122a', o: '#ff6a1a', y: '#ffe14d' }, rows: fnGrid(16, 16, function (x, y) {
      var edge = x === 0 || x === 15 || y === 0 || y === 15, bar = x % 5 === 0 || y % 5 === 0;
      if (edge || bar) return (x === 0 || y === 0) ? 'g' : 'f';
      var d = Math.hypot(x - 7.5, y - 8);
      if (d < 1.7) return 'y'; if (d < 3) return 'o'; if (d < 4.3) return 'r';
      return 'i';
    }) },
    'px-heart': { name: 'Heart', pal: { r: '#ff2a3d', h: '#ffb3bd', d: '#b3001b' }, rows: [
      '.rrr...rrr.',
      'rhhrr.rrrrr',
      'rhrrrrrrrrr',
      'rrrrrrrrrrd',
      'rrrrrrrrrrd',
      '.rrrrrrrrd.',
      '..rrrrrrd..',
      '...rrrrd...',
      '....rrd....',
      '.....d.....'] },
    'px-crown': { name: 'Crown', pal: { h: '#fff6b0', y: '#ffd21f', o: '#d98a00', r: '#ff2a3d', b: '#3f7bff', e: '#22d36a' }, rows: [
      'h......h......h',
      'yy....yhy....yy',
      'yyy..yyyyy..yyy',
      'yhyyyyyyyyyyyyy',
      'yyyrryyeyybbyyy',
      'yyyrryyeyybbyyy',
      'yyyyyyyyyyyyyyy',
      'ooooooooooooooo'] },
    'px-donut': { name: 'Donut', pal: { b: '#e0a35a', k: '#a8662a', p: '#ff6fb5', w: '#ffc8e6', y: '#ffe14d', c: '#3fd8ee', g: '#22d36a', v: '#ffffff' }, rows: fnGrid(16, 16, function (x, y) {
      var d = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5);
      if (d > 7.6 || d < 2.2) return '.';
      var fo = 6.0 + 0.7 * Math.sin(a * 5 + 0.6);
      if (d < 2.9) return 'k';
      if (d < fo) {
        var hsh = hash2(x, y, 3);
        if (hsh < 0.08) return 'y'; if (hsh < 0.14) return 'c'; if (hsh < 0.2) return 'v'; if (hsh < 0.24) return 'g';
        return (d > fo - 1.1 && a < -0.5 && a > -2.8) ? 'w' : 'p';
      }
      return (x + y > 16) ? 'k' : 'b';
    }) },
    'px-arrow': { name: 'Pixel arrow', tint: true, color: '#ff2a2a', pal: { c: '@', l: '@l', d: '@d' }, rows: bevel(fnGrid(16, 12, function (x, y) {
      if (x >= 8 && Math.abs(y - 5.5) <= (15.6 - x) * 0.78) return 'c';
      if (x < 9 && y >= 3 && y <= 8) return 'c';
      return '.';
    }), 'c', 'l', 'd') },
    'px-circle': { name: 'Pixel circle', tint: true, color: '#ff2a2a', pal: { c: '@', l: '@l', d: '@d' }, rows: fnGrid(18, 18, function (x, y) {
      var d = Math.hypot(x - 8.5, y - 8.5); if (d > 8.6 || d < 6.4) return '.';
      return d > 7.9 ? ((x + y < 17) ? 'l' : 'd') : 'c';
    }) },
    'px-alert': { name: 'Alert !', tint: true, color: '#ff2a2a', pal: { c: '@', l: '@l', d: '@d', w: '#ffffff' }, rows: (function () {
      var r = bevel(fnGrid(12, 14, function (x, y) { if ((x === 0 || x === 11) && (y === 0 || y === 13)) return '.'; return 'c'; }), 'c', 'l', 'd');
      stamp(r, '!', 5, 3, 'w'); return r; })() },
    'px-skull': { name: 'Skull', pal: { w: '#f2f2ee', g: '#b9b9b2', k: '#1b1b1b' }, rows: [
      '...wwwwww...',
      '.wwwwwwwwww.',
      'wwwwwwwwwwwg',
      'wwwwwwwwwwwg',
      'wkkkwwwkkkwg',
      'wkkkwwwkkkwg',
      'wkkkwwwkkkwg',
      'wwwwwkwwwwwg',
      '.gwwwwwwwwg.',
      '..wkwkwkwg..',
      '..gwgwgwgg..',
      '...gggggg...'] },
    'px-trap': { name: 'Trap block', pal: { q: '#d6d6d6', z: '#8d8d8d', t: '#c99a5b', k: '#8a6331', s: '#8e8e8e', n: '#6f6f6f', x: '#3d3d3d', r: '#ff2a1a', R: '#9e0f05' }, rows: fnGrid(16, 16, function (x, y) {
      if (y === 0) return (x >= 3 && x <= 12) ? 'q' : '.';
      if (y === 1) return (x >= 3 && x <= 12) ? 'z' : '.';
      if (y >= 2 && y <= 5) return (y === 4 || x === 0 || x === 15) ? 'k' : 't';
      if (x >= 6 && x <= 9 && y >= 6 && y <= 9) return 'x';
      if (y >= 12 && y <= 13 && (x === 2 || x === 3 || x === 12 || x === 13)) return (y === 12) ? 'r' : 'R';
      if (y === 14 && x >= 2 && x <= 13) return 'r';
      return hash2(x, y, 9) < 0.3 ? 'n' : 's';
    }) },
    'px-portal': { name: 'Portal', pal: { o: '#1c0f2e', v: '#3e2266', l: '#e7beff', p: '#b056ff', m: '#7426d9' }, rows: fnGrid(12, 16, function (x, y) {
      if (x < 2 || x > 9 || y < 2 || y > 13) return hash2(x, y, 5) < 0.25 ? 'v' : 'o';
      var a = Math.atan2(y - 7.5, x - 5.5), r = Math.hypot(x - 5.5, y - 7.5);
      var v = Math.sin(a * 2 + r * 1.25);
      return v > 0.55 ? 'l' : v > -0.25 ? 'p' : 'm';
    }) }
  };
  /* finish pixel sprites: pad 1 + outline */
  Object.keys(PX).forEach(function (id) {
    var d = PX[id], rows = d.rows, w = rows[0].length, h = rows.length;
    rows.forEach(function (r, i) { if (r.length !== w) console.warn('ThumbRender: bad pixel row', id, i, r.length, w); });
    var g = []; for (var y = 0; y < h + 2; y++) { var line = ''; for (var x = 0; x < w + 2; x++) { var ch = (y >= 1 && y <= h && x >= 1 && x <= w) ? (rows[y - 1][x - 1] || '.') : '.'; line += ch; } g.push(line); }
    var at = function (x, y) { return y >= 0 && y < g.length && x >= 0 && x < g[y].length ? g[y][x] : '.'; };
    var o = g.slice();
    for (var yy = 0; yy < g.length; yy++) for (var xx = 0; xx < g[yy].length; xx++) {
      if (g[yy][xx] !== '.') continue;
      if (at(xx - 1, yy) !== '.' || at(xx + 1, yy) !== '.' || at(xx, yy - 1) !== '.' || at(xx, yy + 1) !== '.') setPx(o, xx, yy, '#');
    }
    d.grid = o; d.gw = w + 2; d.gh = h + 2; d.aspect = (w + 2) / (h + 2);
  });
  function pxColor(d, ch, tint) {
    if (ch === '#') return d.outline || OUTLINE;
    var v = d.pal[ch]; if (!v) return null;
    if (v.charAt(0) === '@') { var base = tint || d.color || '#ff2a2a'; return v === '@l' ? shade(base, 0.35) : v === '@d' ? shade(base, -0.35) : base; }
    return v;
  }
  function drawPixelSprite(c, d, x0, y0, wpx, hpx, tint) {
    var cw = wpx / d.gw, chh = hpx / d.gh;
    for (var y = 0; y < d.gh; y++) {
      var row = d.grid[y], py0 = Math.round(y0 + y * chh), py1 = Math.round(y0 + (y + 1) * chh);
      for (var x = 0; x < d.gw; x++) {
        var ch = row[x]; if (ch === '.') continue;
        var col = pxColor(d, ch, tint); if (!col) continue;
        var px0 = Math.round(x0 + x * cw), px1 = Math.round(x0 + (x + 1) * cw);
        c.fillStyle = col; c.fillRect(px0, py0, px1 - px0, py1 - py0);
      }
    }
  }

  var STICKERS = [];
  Object.keys(VEC).forEach(function (id) { var d = VEC[id]; STICKERS.push({ id: id, name: d.name, themes: d.themes, tintable: !!d.tint, aspect: d.aspect, color: d.color, hasText: d.text != null, text: d.text || '' }); });
  Object.keys(PX).forEach(function (id) { var d = PX[id]; STICKERS.push({ id: id, name: d.name, themes: ['smp'], tintable: !!d.tint, aspect: d.aspect, color: d.color || null, pixel: true, hasText: false, text: '' }); });
  var STK_BY = {}; STICKERS.forEach(function (s) { STK_BY[s.id] = s; });

  function stickerDims(L) {
    var meta = STK_BY[L.sticker] || STK_BY['arrow-straight'];
    var w = clamp(num(L.w, 200), 8, 6000); return { w: w, h: w / meta.aspect, meta: meta };
  }
  var DEFAULT_STK_SHADOW = { blur: 14, color: 'rgba(0,0,0,0.45)', dx: 0, dy: 6 };
  function renderSticker(L, s) {
    var dm = stickerDims(L), meta = dm.meta, id = meta.id, w = dm.w, h = dm.h;
    var col = meta.tintable ? str(L.color, meta.color) : meta.color;
    var ol = obj(L.outline), ow = clamp(num(ol.width, 0), 0, 60), oc = str(ol.color, '#ffffff');
    var sh = shadowOf(L.shadow === undefined ? DEFAULT_STK_SHADOW : L.shadow);
    var gl = obj(L.glow), glow = { size: clamp(num(gl.size, 0), 0, 120), color: str(gl.color, '#ffffff') };
    var tail = [id, col, !!L.flipX, ow, oc, sh.on ? [sh.blur, sh.dx, sh.dy, sh.color].join(',') : '', glow.size, glow.color, meta.hasText ? str(L.text, meta.text) + '/' + str(L.textColor) + '/' + str(L.font) + '/' + fontEpoch : '', s.toFixed(3)].join('|');
    var hit = lookup(L, 'S|' + w.toFixed(2) + '|' + tail, 'Sq|' + quantPx(w * s).toFixed(2) + '|' + tail); if (hit) return hit;
    var key = storeKey;
    var pad = fxPad(ow, glow.size, sh), dw = w + 2 * pad, dh = h + 2 * pad;
    var es = safeScale(s, dw, dh), cw = Math.ceil(dw * es), ch = Math.ceil(dh * es);
    var I = mk(cw, ch), c = I.getContext('2d');
    if (meta.pixel) {
      smooth(c, false);
      if (L.flipX) { c.translate(cw, 0); c.scale(-1, 1); }
      drawPixelSprite(c, PX[id], Math.round(pad * es), Math.round(pad * es), Math.round(w * es), Math.round(h * es), col);
    } else {
      c.setTransform(es, 0, 0, es, pad * es, pad * es);
      if (L.flipX) { c.translate(w, 0); c.scale(-1, 1); }
      unflipText = !!L.flipX;
      try { VEC[id].draw(c, w, h, col, L); } finally { unflipText = false; }
    }
    var sil = ow > 0 ? dilate(I, ow * es, oc, !!meta.pixel) : null;
    var out = finishFx(I, sil, glow, sh, es);
    return cset(key, { canvas: out, ax: (pad + w / 2) * es, ay: (pad + h / 2) * es, m: s / es, w0: w });
  }

  /* ------------------------------------------------------------------ emoji */
  function renderEmoji(L, s) {
    var size = clamp(num(L.size, 120), 8, 1200), ch = str(L.char, '😱');
    var ol = obj(L.outline), ow = clamp(num(ol.width, 0), 0, 40), oc = str(ol.color, '#ffffff');
    var sh = shadowOf(L.shadow === undefined ? { blur: size * 0.12, color: 'rgba(0,0,0,0.45)', dx: 0, dy: size * 0.05 } : L.shadow);
    var tail = [ch, ow, oc, sh.on ? [sh.blur, sh.dx, sh.dy, sh.color].join(',') : '', s.toFixed(3), fontEpoch].join('|');
    var hit = lookup(L, 'E|' + size + '|' + tail, 'Eq|' + quantPx(size * s).toFixed(2) + '|' + tail); if (hit) return hit;
    var key = storeKey;
    var box = size * 1.25, pad = fxPad(ow, 0, sh), dw = box + 2 * pad;
    var es = safeScale(s, dw, dw), cw = Math.ceil(dw * es);
    var I = mk(cw, cw), c = I.getContext('2d');
    c.setTransform(es, 0, 0, es, pad * es, pad * es);
    c.font = size + 'px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    var asc = size * 0.8, desc = size * 0.2;
    try { var m = c.measureText(ch); if (m.actualBoundingBoxAscent > 0) { asc = m.actualBoundingBoxAscent; desc = m.actualBoundingBoxDescent || 0; } } catch (e) { /* ignore */ }
    c.fillStyle = '#000'; c.fillText(ch, box / 2, box / 2 + (asc - desc) / 2);
    var sil = ow > 0 ? dilate(I, ow * es, oc, false) : null;
    var out = finishFx(I, sil, { size: 0 }, sh, es);
    return cset(key, { canvas: out, ax: (pad + box / 2) * es, ay: (pad + box / 2) * es, m: s / es, w0: size });
  }

  /* ------------------------------------------------------------------ scenes (1280x720, cached) */
  function sceneCanvas(id) {
    var key = 'SC|' + id, hit = cget(key); if (hit) return hit.canvas;
    var C = mk(W, H), c = C.getContext('2d');
    var def = SCENE_BY[id] || SCENE_BY['blocky-day'];
    try { def.draw(c); } catch (e) { c.fillStyle = '#333'; c.fillRect(0, 0, W, H); }
    return cset(key, { canvas: C }).canvas;
  }
  function shades(base, n, spread) { var out = []; for (var i = 0; i < n; i++) out.push(shade(base, (i / (n - 1) - 0.5) * spread)); return out; }
  /* draw one textured block: 8x8 sub-pixels */
  function block(c, x, y, s, kind, R) {
    var p = s / 8, pal = BLOCK_PAL[kind], ores = null;
    if (pal.ore) { ores = []; var n = 2 + ((R() * 2) | 0); for (var k = 0; k < n; k++) ores.push([1.5 + R() * 5, 1.5 + R() * 5]); }
    for (var j = 0; j < 8; j++) for (var i = 0; i < 8; i++) {
      var arr = pal.main, idx = (R() * arr.length) | 0;
      if (kind === 'grass') { var drip = j < 2 || (j === 2 && R() < 0.6) || (j === 3 && R() < 0.2); arr = drip ? pal.top : pal.main; idx = (R() * arr.length) | 0; }
      if (ores) { for (var q = 0; q < ores.length; q++) if (Math.abs(i - ores[q][0]) + Math.abs(j - ores[q][1]) < 1.6) { arr = pal.ore; idx = (R() * arr.length) | 0; } }
      if (pal.edge && arr === pal.main) { if (j === 7 || i === 7) idx = 0; else if (j === 0 || i === 0) idx = arr.length - 1; }
      c.fillStyle = arr[idx];
      c.fillRect(Math.round(x + i * p), Math.round(y + j * p), Math.ceil(p), Math.ceil(p));
    }
  }
  var BLOCK_PAL = {
    grass: { top: shades('#5fbf3a', 5, 0.35), main: shades('#8b5a2b', 5, 0.3) },
    dirt: { main: shades('#8b5a2b', 5, 0.3) },
    stone: { main: shades('#7d7d7d', 6, 0.2), edge: 1 },
    dstone: { main: shades('#4a4a50', 6, 0.2), edge: 1 },
    ore: { main: shades('#73737a', 6, 0.2), ore: shades('#4fe3f0', 3, 0.35), edge: 1 },
    goldore: { main: shades('#73737a', 6, 0.2), ore: shades('#ffd21f', 3, 0.35), edge: 1 },
    redore: { main: shades('#73737a', 6, 0.2), ore: shades('#ff2a1a', 3, 0.35), edge: 1 },
    leaves: { main: shades('#2f8f2a', 6, 0.4) },
    log: { main: shades('#6b4423', 4, 0.3) },
    sand: { main: shades('#e2d39b', 5, 0.15) },
    nrack: { main: shades('#7a2222', 6, 0.24), edge: 1 },
    glow: { main: shades('#ffd76a', 5, 0.3), edge: 1 },
    lava: { main: shades('#ff7a12', 6, 0.35) },
    plank: { main: shades('#b8874e', 4, 0.2), edge: 1 },
    nightgrass: { top: shades('#2f6a3a', 5, 0.3), main: shades('#4a3424', 5, 0.3) }
  };
  function terrain(c, R, bs, heights, opts) {
    var cols = Math.ceil(W / bs);
    for (var x = 0; x < cols; x++) {
      var top = heights[x];
      for (var y = top; y < Math.ceil(H / bs); y++) {
        var depth = y - top, kind = depth === 0 ? opts.top : depth < 3 ? opts.mid : (R() < 0.06 ? 'ore' : opts.deep);
        if (opts.custom) { var k2 = opts.custom(x, y, depth); if (k2) kind = k2; }
        if (kind === 'grass' && opts.night) kind = 'nightgrass';
        if (BLOCK_PAL[kind].top === undefined && kind === 'nightgrass') kind = 'dirt';
        block(c, x * bs, y * bs, bs, kind === 'nightgrass' ? 'grass' : kind, R);
      }
    }
  }
  function tree(c, R, bx, by, bs) {
    for (var i = 0; i < 4; i++) block(c, bx * bs, (by - 1 - i) * bs, bs, 'log', R);
    var top = by - 4;
    for (var yy = -3; yy <= 0; yy++) for (var xx = -2; xx <= 2; xx++) {
      if ((yy === -3 && Math.abs(xx) === 2) || (yy === 0 && Math.abs(xx) === 2 && R() < 0.5)) continue;
      if (yy === 0 && xx === 0) continue;
      block(c, (bx + xx) * bs, (top + yy) * bs, bs, 'leaves', R);
    }
  }
  function cloud(c, x, y, u, R, color, shadowColor) {
    var w = 4 + ((R() * 4) | 0);
    c.fillStyle = shadowColor; c.fillRect(x, y + u, w * u * 2, u);
    c.fillStyle = color; c.fillRect(x, y, w * u * 2, u);
    c.fillRect(x + u * 2, y - u, (w - 2) * u * 2, u);
    if (R() < 0.7) c.fillRect(x + u * 4, y - 2 * u, Math.max(2, w - 4) * u * 2, u);
  }
  function heightsFor(R, cols, base, amp) {
    var a = R() * 6, b = R() * 6, out = [];
    for (var x = 0; x < cols; x++) out.push(Math.round(base + Math.sin(x * 0.23 + a) * amp + Math.sin(x * 0.61 + b) * amp * 0.45));
    return out;
  }
  function vignette(c, amt, color) {
    var g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, color || ('rgba(0,0,0,' + amt + ')'));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  var SCENES = [
    { id: 'kitchen-bokeh', name: 'Warm kitchen', themes: ['cooking'], draw: function (c) {
      var R = rng(11);
      var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b1408'); g.addColorStop(0.55, '#6e3511'); g.addColorStop(1, '#2a1306');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      var warm = c.createRadialGradient(W * 0.68, H * 0.32, 20, W * 0.68, H * 0.32, W * 0.6);
      warm.addColorStop(0, 'rgba(255,170,70,0.55)'); warm.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = warm; c.fillRect(0, 0, W, H);
      var cols = ['255,196,110', '255,226,160', '255,150,70', '255,240,200', '255,120,60'];
      for (var i = 0; i < 46; i++) {
        var x = R() * W, y = R() * H * 0.72, r = 18 + R() * 85, a = 0.12 + R() * 0.32, cc = cols[(R() * cols.length) | 0];
        var bg = c.createRadialGradient(x, y, r * 0.2, x, y, r);
        bg.addColorStop(0, 'rgba(' + cc + ',' + (a * 0.7) + ')'); bg.addColorStop(0.85, 'rgba(' + cc + ',' + a + ')'); bg.addColorStop(1, 'rgba(' + cc + ',0)');
        c.fillStyle = bg; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
      var t = c.createLinearGradient(0, H * 0.7, 0, H); t.addColorStop(0, '#5a2d10'); t.addColorStop(0.08, '#8a4a1c'); t.addColorStop(1, '#3a1c08');
      c.fillStyle = t; c.fillRect(0, H * 0.72, W, H * 0.28);
      c.fillStyle = 'rgba(255,210,150,0.35)'; c.fillRect(0, H * 0.72, W, 3);
      for (var k = 0; k < 30; k++) { c.fillStyle = 'rgba(40,18,4,' + (0.08 + R() * 0.12) + ')'; c.fillRect(0, H * 0.74 + R() * H * 0.26, W, 1 + R() * 2); }
      vignette(c, 0.55);
    } },
    { id: 'wood-board', name: 'Wooden board', themes: ['cooking'], draw: function (c) {
      var R = rng(5), ph = 120;
      for (var p = 0; p < 7; p++) {
        var base = ['#b8743a', '#c4834a', '#a9682f', '#bf7c41', '#b06d35', '#c88a50', '#ad6b33'][p];
        c.fillStyle = base; c.fillRect(0, p * ph, W, ph);
        for (var i = 0; i < 26; i++) {
          var yy = p * ph + R() * ph, amp = 2 + R() * 6, fr = 0.002 + R() * 0.006, ofs = R() * 10;
          c.strokeStyle = 'rgba(70,32,8,' + (0.1 + R() * 0.2) + ')'; c.lineWidth = 1 + R() * 2.5; c.beginPath();
          for (var x = 0; x <= W; x += 16) { var y2 = yy + Math.sin(x * fr + ofs) * amp; if (x) c.lineTo(x, y2); else c.moveTo(x, y2); }
          c.stroke();
        }
        if (R() < 0.8) { var kx = R() * W, ky = p * ph + ph * (0.3 + R() * 0.4); c.fillStyle = 'rgba(80,36,10,0.45)'; c.beginPath(); c.ellipse ? c.ellipse(kx, ky, 26, 10, 0, 0, 7) : c.arc(kx, ky, 12, 0, 7); c.fill(); }
        c.fillStyle = 'rgba(50,20,4,0.55)'; c.fillRect(0, p * ph + ph - 3, W, 3);
        c.fillStyle = 'rgba(255,220,170,0.18)'; c.fillRect(0, p * ph, W, 2);
      }
      var l = c.createLinearGradient(0, 0, W, H); l.addColorStop(0, 'rgba(255,230,180,0.18)'); l.addColorStop(1, 'rgba(40,15,0,0.25)'); c.fillStyle = l; c.fillRect(0, 0, W, H);
      vignette(c, 0.45);
    } },
    { id: 'marble', name: 'Marble counter', themes: ['cooking'], draw: function (c) {
      var R = rng(21);
      var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#fbfaf7'); g.addColorStop(1, '#e9e5df'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      var vein = function (x, y, ang, alpha, lw, blur, len) {
        c.beginPath(); c.moveTo(x, y);
        for (var i = 0; i < len; i++) {
          ang += (R() - 0.5) * 0.35; var nx = x + Math.cos(ang) * 26, ny = y + Math.sin(ang) * 26;
          c.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2); x = nx; y = ny;
          if (R() < 0.05 && lw > 1) { c.stroke(); vein(x, y, ang + (R() - 0.5) * 1.4, alpha * 0.7, lw * 0.5, blur, 10 + (R() * 15 | 0)); c.beginPath(); c.moveTo(x, y); }
        }
        c.strokeStyle = 'rgba(120,112,104,' + alpha + ')'; c.lineWidth = lw; c.shadowColor = 'rgba(120,112,104,' + alpha + ')'; c.shadowBlur = blur; c.stroke();
      };
      c.lineJoin = 'round'; c.lineCap = 'round';
      for (var v0 = 0; v0 < 4; v0++) vein(-60, R() * H * 1.2 - 100, 0.35 + R() * 0.3, 0.06, 18 + R() * 14, 30, 70);
      for (var v = 0; v < 5; v++) vein(-40, R() * H * 1.1 - 60, 0.3 + R() * 0.35, 0.3 + R() * 0.15, 1.5 + R() * 2, 4, 70);
      c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)';
      vignette(c, 0.16);
    } },
    { id: 'color-pop', name: 'Colour pop', themes: ['cooking'], draw: function (c) {
      var cx = W * 0.64, cy = H * 0.5;
      c.fillStyle = '#ffbf00'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#ffd60a';
      for (var i = 0; i < 24; i += 2) { var a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a0) * 2000, cy + Math.sin(a0) * 2000); c.lineTo(cx + Math.cos(a1) * 2000, cy + Math.sin(a1) * 2000); c.closePath(); c.fill(); }
      var g = c.createRadialGradient(cx, cy, 30, cx, cy, W * 0.75); g.addColorStop(0, 'rgba(255,255,220,0.65)'); g.addColorStop(0.4, 'rgba(255,240,150,0)'); g.addColorStop(1, 'rgba(255,90,0,0.55)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    } },
    { id: 'gingham', name: 'Picnic cloth', themes: ['cooking'], draw: function (c) {
      c.fillStyle = '#fbf6ef'; c.fillRect(0, 0, W, H);
      var s = 64; c.fillStyle = 'rgba(220,38,38,0.45)';
      for (var x = 0; x < W; x += s * 2) c.fillRect(x, 0, s, H);
      for (var y = 0; y < H; y += s * 2) c.fillRect(0, y, W, s);
      vignette(c, 0.35);
    } },
    { id: 'blocky-day', name: 'Blocky day', themes: ['smp'], draw: function (c) {
      var R = rng(42), bs = 48;
      var sky = ['#3d96ff', '#4ea2ff', '#62aeff', '#78bbff', '#8fc8ff', '#a8d5ff', '#c1e2ff'];
      for (var i = 0; i < sky.length; i++) { c.fillStyle = sky[i]; c.fillRect(0, i * 60, W, 61); }
      c.fillStyle = sky[sky.length - 1]; c.fillRect(0, sky.length * 60, W, H);
      c.fillStyle = '#fff3a0'; c.fillRect(1030, 60, 110, 110); c.fillStyle = '#ffe14d'; c.fillRect(1045, 75, 80, 80);
      for (var k = 0; k < 7; k++) cloud(c, (R() * 1.2 - 0.1) * W, 40 + R() * 230, 16, R, '#ffffff', '#dbe9f7');
      var cols = Math.ceil(W / bs) + 1, far = heightsFor(R, cols, 8.3, 1.4);
      for (var x = 0; x < cols; x++) { c.fillStyle = '#86b9a4'; c.fillRect(x * bs, far[x] * bs * 0.82, bs, H); c.fillStyle = '#9cc9b3'; c.fillRect(x * bs, far[x] * bs * 0.82, bs, bs * 0.3); }
      var hs = heightsFor(R, cols, 11, 1.6);
      terrain(c, R, bs, hs, { top: 'grass', mid: 'dirt', deep: 'stone' });
      var treeCols = [3, 11, 22, 24];
      treeCols.forEach(function (tx) { if (tx < cols) tree(c, R, tx, hs[tx], bs); });
    } },
    { id: 'blocky-night', name: 'Blocky night', themes: ['smp'], draw: function (c) {
      var R = rng(77), bs = 48;
      var sky = ['#070b22', '#0b1130', '#10183e', '#16204c', '#1d295a', '#253368', '#2e3d74'];
      for (var i = 0; i < sky.length; i++) { c.fillStyle = sky[i]; c.fillRect(0, i * 60, W, 61); }
      c.fillStyle = sky[sky.length - 1]; c.fillRect(0, sky.length * 60, W, H);
      for (var s = 0; s < 110; s++) { var sz = R() < 0.15 ? 8 : 4; c.fillStyle = R() < 0.2 ? '#ffe9a8' : '#ffffff'; c.fillRect(Math.round(R() * W / 4) * 4, Math.round(R() * 400 / 4) * 4, sz, sz); }
      c.fillStyle = '#f4f1dc'; c.fillRect(180, 70, 100, 100); c.fillStyle = '#d8d3b6'; c.fillRect(200, 95, 20, 20); c.fillRect(245, 130, 15, 15); c.fillRect(235, 85, 12, 12);
      var glow = c.createRadialGradient(230, 120, 40, 230, 120, 260); glow.addColorStop(0, 'rgba(200,210,255,0.25)'); glow.addColorStop(1, 'rgba(200,210,255,0)'); c.fillStyle = glow; c.fillRect(0, 0, 600, 500);
      var cols = Math.ceil(W / bs) + 1, hs = heightsFor(R, cols, 10.5, 1.7);
      var T = mk(W, H), tc = T.getContext('2d');
      terrain(tc, R, bs, hs, { top: 'grass', mid: 'dirt', deep: 'stone' });
      [5, 18, 23].forEach(function (tx) { if (tx < cols) tree(tc, R, tx, hs[tx], bs); });
      tc.globalCompositeOperation = 'source-atop'; tc.fillStyle = 'rgba(8,12,40,0.6)'; tc.fillRect(0, 0, W, H);
      c.drawImage(T, 0, 0); free(T);
      [[9, hs[9] - 1], [15, hs[15] - 1]].forEach(function (p) {
        var x = p[0] * bs + bs / 2 - 4, y = p[1] * bs + 10;
        var tg = c.createRadialGradient(x + 4, y, 4, x + 4, y, 170); tg.addColorStop(0, 'rgba(255,170,60,0.55)'); tg.addColorStop(1, 'rgba(255,140,40,0)');
        c.fillStyle = tg; c.fillRect(x - 170, y - 170, 340, 340);
        c.fillStyle = '#6b4423'; c.fillRect(x, y + 8, 8, 30); c.fillStyle = '#ffd24d'; c.fillRect(x - 2, y, 12, 12); c.fillStyle = '#fff6c0'; c.fillRect(x + 1, y + 2, 6, 6);
      });
    } },
    { id: 'cave', name: 'Cave', themes: ['smp'], draw: function (c) {
      var R = rng(9), bs = 48, cols = Math.ceil(W / bs), rows = Math.ceil(H / bs);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var r = R(), kind = r < 0.05 ? 'ore' : r < 0.085 ? 'goldore' : r < 0.11 ? 'redore' : (y > rows - 3 ? 'dstone' : 'stone');
        block(c, x * bs, y * bs, bs, kind, R);
      }
      var d = c.createRadialGradient(W * 0.5, H * 0.45, 60, W * 0.5, H * 0.45, W * 0.55);
      d.addColorStop(0, 'rgba(0,0,0,0.78)'); d.addColorStop(0.6, 'rgba(0,0,0,0.45)'); d.addColorStop(1, 'rgba(0,0,0,0.15)');
      c.fillStyle = d; c.fillRect(0, 0, W, H);
      for (var lx = 14; lx < cols; lx++) block(c, lx * bs, (rows - 1) * bs, bs, 'lava', R);
      for (var lx2 = 17; lx2 < cols; lx2++) block(c, lx2 * bs, (rows - 2) * bs, bs, 'lava', R);
      var lg = c.createRadialGradient(W * 0.85, H, 30, W * 0.85, H, 520); lg.addColorStop(0, 'rgba(255,120,20,0.7)'); lg.addColorStop(1, 'rgba(255,80,0,0)');
      c.globalCompositeOperation = 'lighter'; c.fillStyle = lg; c.fillRect(0, 0, W, H);
      var tg = c.createRadialGradient(150, 300, 10, 150, 300, 300); tg.addColorStop(0, 'rgba(255,190,90,0.55)'); tg.addColorStop(1, 'rgba(255,160,60,0)');
      c.fillStyle = tg; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#6b4423'; c.fillRect(146, 300, 8, 34); c.fillStyle = '#ffd24d'; c.fillRect(144, 290, 12, 12); c.fillStyle = '#fff6c0'; c.fillRect(147, 293, 6, 6);
    } },
    { id: 'nether', name: 'Nether glow', themes: ['smp'], draw: function (c) {
      var R = rng(66), bs = 48, cols = Math.ceil(W / bs), rows = Math.ceil(H / bs);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) block(c, x * bs, y * bs, bs, 'nrack', R);
      var d = c.createRadialGradient(W * 0.5, H * 0.42, 50, W * 0.5, H * 0.42, W * 0.6);
      d.addColorStop(0, 'rgba(255,90,40,0.35)'); d.addColorStop(0.5, 'rgba(80,0,0,0.45)'); d.addColorStop(1, 'rgba(20,0,0,0.75)');
      c.fillStyle = d; c.fillRect(0, 0, W, H);
      [[3, 0], [4, 0], [3, 1], [20, 0], [21, 0], [21, 1], [22, 0]].forEach(function (p) { block(c, p[0] * bs, p[1] * bs, bs, 'glow', R); });
      c.globalCompositeOperation = 'lighter';
      [[4, 1], [21, 1]].forEach(function (p) { var gg = c.createRadialGradient(p[0] * bs, p[1] * bs, 10, p[0] * bs, p[1] * bs, 260); gg.addColorStop(0, 'rgba(255,200,90,0.35)'); gg.addColorStop(1, 'rgba(255,160,40,0)'); c.fillStyle = gg; c.fillRect(0, 0, W, H); });
      c.globalCompositeOperation = 'source-over';
      for (var lx = 0; lx < cols; lx++) { block(c, lx * bs, (rows - 1) * bs, bs, 'lava', R); if (lx % 7 < 4) block(c, lx * bs, (rows - 2) * bs, bs, 'lava', R); }
      c.globalCompositeOperation = 'lighter';
      var lg = c.createLinearGradient(0, H, 0, H * 0.45); lg.addColorStop(0, 'rgba(255,120,20,0.65)'); lg.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = lg; c.fillRect(0, 0, W, H);
      for (var i = 0; i < 70; i++) { c.fillStyle = 'rgba(255,' + (120 + (R() * 100 | 0)) + ',40,' + (0.4 + R() * 0.5) + ')'; var s = R() < 0.3 ? 8 : 4; c.fillRect(R() * W, R() * H * 0.8, s, s); }
      c.globalCompositeOperation = 'source-over';
    } },
    { id: 'blocky-sunset', name: 'Blocky sunset', themes: ['smp'], draw: function (c) {
      var R = rng(31), bs = 48;
      var sky = ['#2a1b5c', '#4a2475', '#7a2f7d', '#b23f6e', '#e0605a', '#f58b4a', '#ffb347'];
      for (var i = 0; i < sky.length; i++) { c.fillStyle = sky[i]; c.fillRect(0, i * 60, W, 61); }
      c.fillStyle = sky[sky.length - 1]; c.fillRect(0, sky.length * 60, W, H);
      c.fillStyle = '#ffd36b'; c.fillRect(760, 300, 160, 160); c.fillStyle = '#ffe9a3'; c.fillRect(780, 320, 120, 120);
      for (var k = 0; k < 5; k++) cloud(c, R() * W, 60 + R() * 200, 16, R, '#ffb3a1', '#d9798a');
      var cols = Math.ceil(W / bs) + 1, hs = heightsFor(R, cols, 11, 1.5);
      terrain(c, R, bs, hs, { top: 'grass', mid: 'dirt', deep: 'stone' });
      [6, 20].forEach(function (tx) { tree(c, R, tx, hs[tx], bs); });
      c.fillStyle = 'rgba(90,20,80,0.35)'; c.fillRect(0, 0, W, H);
    } }
  ];
  var SCENE_BY = {}; SCENES.forEach(function (s) { SCENE_BY[s.id] = s; });
  var THEME_SCENE = { cooking: 'kitchen-bokeh', smp: 'blocky-day' };

  /* ------------------------------------------------------------------ background */
  function bgKey(bg, theme, src, s) {
    return ['B', bg.kind, bg.kind === 'image' && natSize(src) ? tokenOf(src) : '', bg.scene || '', bg.color, bg.color2, num(bg.angle, 135), num(bg.zoom, 1), num(bg.fx, 0.5), num(bg.fy, 0.5),
      num(bg.brightness, 0), num(bg.contrast, 0), num(bg.saturation, 0), num(bg.blur, 0), num(bg.vignette, 0), bg.tint || '', num(bg.tintAmount, 0), theme, s.toFixed(3),
      SETPIECES[bg.setPiece] ? bg.setPiece + '/' + str(bg.setPieceSide, 'right') : ''].join('|');
  }
  function adjustPixels(c, w, h, b, ct, sat) {
    var d;
    try { d = c.getImageData(0, 0, w, h); } catch (e) { return; }
    var p = d.data, lut = new Uint8ClampedArray(256);
    var cf = ct >= 0 ? 1 + ct * 1.1 : 1 + ct * 0.85, bo = b * 70;
    for (var i = 0; i < 256; i++) lut[i] = (i - 128) * cf + 128 + bo;
    var sf = sat >= 0 ? 1 + sat * 1.1 : 1 + sat;
    for (var j = 0; j < p.length; j += 4) {
      var r = lut[p[j]], g = lut[p[j + 1]], bb = lut[p[j + 2]];
      if (sf !== 1) { var l = 0.299 * r + 0.587 * g + 0.114 * bb; r = l + (r - l) * sf; g = l + (g - l) * sf; bb = l + (bb - l) * sf; }
      p[j] = r; p[j + 1] = g; p[j + 2] = bb;
    }
    c.putImageData(d, 0, 0);
  }
  function blurCanvas(C, amt) {
    if (amt <= 0.01) return;
    var w = C.width, h = C.height, f = 1 + amt * 4 + amt * amt * 20, steps = [];
    var cw = w, ch = h, cur = C;
    while (cw / 2 >= w / f && cw > 8) { cw = Math.max(2, Math.round(cw / 2)); ch = Math.max(2, Math.round(ch / 2)); var n = mk(cw, ch), x = n.getContext('2d'); smooth(x, true); x.drawImage(cur, 0, 0, cw, ch); steps.push(n); cur = n; }
    var fw = Math.max(2, Math.round(w / f)), fh = Math.max(2, Math.round(h / f));
    if (fw < cw) { var n2 = mk(fw, fh), x2 = n2.getContext('2d'); smooth(x2, true); x2.drawImage(cur, 0, 0, fw, fh); steps.push(n2); cur = n2; }
    for (var i = steps.length - 2; i >= 0; i--) { var t = steps[i], tx = t.getContext('2d'); tx.clearRect(0, 0, t.width, t.height); smooth(tx, true); tx.drawImage(cur, 0, 0, t.width, t.height); cur = t; }
    var c = C.getContext('2d'); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); smooth(c, true); c.clearRect(0, 0, w, h); c.drawImage(cur, 0, 0, w, h); c.restore();
    steps.forEach(free);
  }
  function renderBackground(design, images, s) {
    var bg = obj(design.background), theme = design.theme === 'smp' ? 'smp' : 'cooking';
    var src = bg.kind === 'image' && bg.imageId ? images[bg.imageId] : null;
    var key = bgKey(bg, theme, src, s), hit = cget(key); if (hit) return hit;
    var cw = Math.max(1, Math.round(W * s)), ch = Math.max(1, Math.round(H * s));
    var C = mk(cw, ch), c = C.getContext('2d'); smooth(c, true);
    c.setTransform(cw / W, 0, 0, ch / H, 0, 0);
    var n = natSize(src), kind = bg.kind;
    if (kind === 'image' && !n) kind = 'scene';
    if (kind === 'image') { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); coverDraw(c, src, n, bg.fx, bg.fy, bg.zoom, 0, 0, W, H); }
    else if (kind === 'color') { c.fillStyle = str(bg.color, '#222222'); c.fillRect(0, 0, W, H); }
    else if (kind === 'gradient') {
      var a = num(bg.angle, 135) * DEG, dx = Math.cos(a), dy = Math.sin(a), half = (Math.abs(dx) * W + Math.abs(dy) * H) / 2;
      var g = c.createLinearGradient(W / 2 - dx * half, H / 2 - dy * half, W / 2 + dx * half, H / 2 + dy * half);
      stop(g, 0, str(bg.color, '#ff7a00'), '#ff7a00'); stop(g, 1, str(bg.color2, '#ffd60a'), '#ffd60a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    } else {
      var sid = SCENE_BY[bg.scene] ? bg.scene : THEME_SCENE[theme];
      var sc = sceneCanvas(sid);
      if (num(bg.zoom, 1) > 1.001) coverDraw(c, sc, { w: W, h: H }, bg.fx, bg.fy, bg.zoom, 0, 0, W, H); else c.drawImage(sc, 0, 0, W, H);
      if (SETPIECES[bg.setPiece]) { try { drawSetPiece(c, bg.setPiece, bg.setPieceSide); } catch (e) { if (window.console) console.warn('ThumbRender set-piece failed', e); } }
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    var blur = clamp(num(bg.blur, 0), 0, 1);
    if (blur > 0.01) blurCanvas(C, blur);
    var b = clamp(num(bg.brightness, 0), -1, 1), ct = clamp(num(bg.contrast, 0), -1, 1), sat = clamp(num(bg.saturation, 0), -1, 1);
    if (Math.abs(b) > 0.004 || Math.abs(ct) > 0.004 || Math.abs(sat) > 0.004) adjustPixels(c, cw, ch, b, ct, sat);
    c.setTransform(cw / W, 0, 0, ch / H, 0, 0);
    var ta = clamp(num(bg.tintAmount, 0), 0, 1);
    if (bg.tint && ta > 0.01) {
      c.globalCompositeOperation = 'overlay'; c.globalAlpha = ta; c.fillStyle = bg.tint; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = ta * 0.3; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    }
    var v = clamp(num(bg.vignette, 0), 0, 1);
    if (v > 0.01) {
      var vg = c.createRadialGradient(W / 2, H / 2, H * (0.55 - v * 0.25), W / 2, H / 2, H * 1.05);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (0.25 + v * 0.6) + ')'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    }
    return cset(key, { canvas: C });
  }

  /* ------------------------------------------------------------------ tiny orthographic 3D (skins + set-pieces)
   * Every face of a box is a parallelogram on screen, so a texture rect maps onto it with one affine
   * drawImage (nearest-neighbour, slightly overdrawn so neighbouring faces never show seams). */
  function m3(a, b) {
    var r = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
  }
  function rotX(a) { var c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [1, 0, 0, 0, c, -s, 0, s, c]; }
  function rotY(a) { var c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
  function rotZ(a) { var c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
  var I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  function mv(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
  function vnorm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  /* the six faces of box [x,y,z,w,h,d] (inflated by inf) with Minecraft skin UVs at (u,v) */
  function boxFaces(bx, inf, uv, mirror) {
    var w = bx[3], h = bx[4], d = bx[5], u = uv ? uv[0] : 0, v = uv ? uv[1] : 0;
    var x0 = bx[0] - inf, y0 = bx[1] - inf, z0 = bx[2] - inf, W_ = w + 2 * inf, H_ = h + 2 * inf, D_ = d + 2 * inf, x1 = x0 + W_, y1 = y0 + H_, z1 = z0 + D_;
    var R = { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + 2 * d + w, v + d, w, h] };
    var F = [
      { n: [0, 0, 1], f: 'front', p: [x0, y1, z1], U: [W_, 0, 0], V: [0, -H_, 0] },
      { n: [0, 0, -1], f: 'back', p: [x1, y1, z0], U: [-W_, 0, 0], V: [0, -H_, 0] },
      { n: [-1, 0, 0], f: 'right', p: [x0, y1, z0], U: [0, 0, D_], V: [0, -H_, 0] },
      { n: [1, 0, 0], f: 'left', p: [x1, y1, z1], U: [0, 0, -D_], V: [0, -H_, 0] },
      { n: [0, 1, 0], f: 'top', p: [x0, y1, z0], U: [W_, 0, 0], V: [0, 0, D_] },
      { n: [0, -1, 0], f: 'bottom', p: [x0, y0, z1], U: [W_, 0, 0], V: [0, 0, -D_] }
    ];
    F.forEach(function (q) {
      var k = q.f; if (mirror && (k === 'left' || k === 'right')) k = k === 'left' ? 'right' : 'left';
      q.r = R[k];
      if (mirror) { q.p = vadd(q.p, q.U); q.U = [-q.U[0], -q.U[1], -q.U[2]]; }
    });
    return F;
  }
  function drawFace(c, tex, r, p, U, V, k, ox, oy, e) {
    c.setTransform(k * U[0] / r[2], k * U[1] / r[2], k * V[0] / r[3], k * V[1] / r[3], ox + k * p[0], oy + k * p[1]);
    c.drawImage(tex, r[0], r[1], r[2], r[3], -e, -e, r[2] + 2 * e, r[3] + 2 * e);
  }
  /* darker/lighter copies of a texture (shading baked in, so transparent texels stay transparent) */
  function shadedCopy(store, tex, b, cool) {
    var q = Math.round(clamp(b, 0.2, 1.3) * 25) / 25, key = 'b' + q;
    if (store[key]) return store[key];
    var C = mk(tex.width, tex.height), c = C.getContext('2d');
    c.drawImage(tex, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    if (q < 0.999) { c.fillStyle = cool ? 'rgba(18,16,48,' + (1 - q).toFixed(3) + ')' : 'rgba(0,0,0,' + (1 - q).toFixed(3) + ')'; c.fillRect(0, 0, C.width, C.height); }
    else if (q > 1.001) { c.fillStyle = 'rgba(255,248,230,' + (q - 1).toFixed(3) + ')'; c.fillRect(0, 0, C.width, C.height); }
    store[key] = C;
    return C;
  }

  /* ------------------------------------------------------------------ skins: texture parsing */
  var SKIN_INFO = new WeakMap();
  function isSkinSize(n) { return !!n && n.w >= 64 && n.w <= 1024 && n.w % 64 === 0 && (n.h === n.w || n.h * 2 === n.w); }
  function skinInfoOf(src) {
    if (!src || typeof src !== 'object') return null;
    var tok = tokenOf(src), hit = SKIN_INFO.get(src);
    if (hit && hit.tok === tok) return hit.info;
    var info = null, n = natSize(src);
    if (isSkinSize(n)) {
      var C = mk(64, n.h * 64 / n.w), c = C.getContext('2d'); smooth(c, false); c.drawImage(src, 0, 0, C.width, C.height);
      info = { tex: C, legacy: C.height === 32, slim: false, hat: true, shades: {}, tok: tok };
      try {
        var d = c.getImageData(0, 0, 64, C.height).data, A = function (x, y) { return d[(y * 64 + x) * 4 + 3]; };
        var cnt = function (x0, y0, w, h) { var k = 0; for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) if (A(x, y) > 128) k++; return k; };
        // a real skin has an opaque face + body front; a random 64x64 picture usually doesn't
        if (cnt(8, 8, 8, 8) < 44 || cnt(20, 20, 8, 12) < 66) info = null;
        else if (!info.legacy) info.slim = cnt(54, 20, 2, 12) === 0 && cnt(50, 16, 2, 4) === 0;
        else info.hat = cnt(32, 0, 32, 16) < 32 * 16 - 8; // old skins with a fully solid hat layer: ignore it
      } catch (e) { /* tainted canvas: trust the size */ }
    }
    SKIN_INFO.set(src, { tok: tok, info: info });
    return info;
  }
  function isSkinTexture(img) { return !!skinInfoOf(img); }

  /* ------------------------------------------------------------------ skins: default ORIGINAL characters (painted here, not Mojang art) */
  var DEFAULT_SKINS = {};
  function paintSkin(o) {
    var C = mk(64, 64), c = C.getContext('2d'), R = rng(o.seed || 5);
    var P = function (x, y, w, h, col, amt) {
      for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) { c.fillStyle = shade(col, (R() - 0.5) * (amt == null ? 0.14 : amt)); c.fillRect(x + i, y + j, 1, 1); }
    };
    var D = function (x, y, col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
    var faces = function (u, v, w, h, d, fn) {
      var Q = { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + 2 * d + w, v + d, w, h] };
      for (var k in Q) fn(k, Q[k][0], Q[k][1], Q[k][2], Q[k][3]);
    };
    var sk = o.skin, skD = shade(o.skin, -0.12), hr = o.hair, hrL = shade(o.hair, 0.22);
    // head
    faces(0, 0, 8, 8, 8, function (f, x, y, w, h) {
      if (f === 'top') { P(x, y, w, h, hr, 0.2); return; }
      if (f === 'bottom') { P(x, y, w, h, sk, 0.05); return; }
      if (f === 'back') { P(x, y, w, h, hr, 0.2); P(x, y + 7, w, 1, shade(hr, -0.15), 0.1); return; }
      P(x, y, w, h, sk, 0.05);
      if (f === 'right' || f === 'left') { P(x, y, w, 3, hr, 0.2); var bx = f === 'right' ? x : x + 5; P(bx, y + 3, 3, 2, hr, 0.2); P(f === 'right' ? x : x + 7, y + 5, 1, 1, hr); D(f === 'right' ? x + 5 : x + 2, y + 4, skD); return; }
      // front: fringe swoop + face
      P(x, y, 8, 2, hr, 0.2); P(x, y + 2, 1, 2, hr, 0.2); P(x + 7, y + 2, 1, 1, hr, 0.2); P(x + 5, y + 2, 2, 1, hr, 0.2); D(x + 3, y + 1, hrL); D(x + 4, y + 1, hrL); D(x + 6, y + 0, hrL);
      if (o.mask) { P(x, y + 5, 8, 3, o.mask, 0.1); D(x + 2, y + 6, shade(o.mask, 0.25)); D(x + 5, y + 6, shade(o.mask, 0.25)); }
      if (o.shock) {
        D(x + 1, y + 2, shade(hr, 0.1)); D(x + 2, y + 2, shade(hr, 0.1)); D(x + 5, y + 2, shade(hr, 0.1)); D(x + 6, y + 2, shade(hr, 0.1)); // raised brows
        P(x + 1, y + 3, 2, 2, '#ffffff', 0); P(x + 5, y + 3, 2, 2, '#ffffff', 0); D(x + 2, y + 4, o.eye); D(x + 5, y + 4, o.eye);
        if (!o.mask) { P(x + 3, y + 5, 2, 3, '#3a0d10', 0); D(x + 3, y + 7, '#c2363c'); D(x + 4, y + 7, '#c2363c'); D(x + 2, y + 5, skD); D(x + 5, y + 5, skD); }
      } else {
        if (o.angry) { D(x + 1, y + 2, hr); D(x + 2, y + 3, hr); D(x + 6, y + 2, hr); D(x + 5, y + 3, hr); }
        D(x + 1, y + 4, '#ffffff'); D(x + 2, y + 4, o.eye); D(x + 5, y + 4, o.eye); D(x + 6, y + 4, '#ffffff');
        D(x + 2, y + 3, shade(hr, 0.05)); D(x + 5, y + 3, shade(hr, 0.05));
        if (!o.mask) { D(x + 3, y + 5, skD); D(x + 4, y + 5, skD); D(x + 2, y + 6, '#8a3f37'); D(x + 3, y + 6, '#a94b3f'); D(x + 4, y + 6, '#a94b3f'); D(x + 5, y + 6, '#8a3f37'); }
      }
    });
    // body (hoodie)
    var top = o.top, topD = shade(o.top, -0.2), trim = o.trim;
    faces(16, 16, 8, 12, 4, function (f, x, y, w, h) {
      P(x, y, w, h, f === 'top' || f === 'bottom' ? topD : top, 0.1);
      if (f === 'front') {
        P(x + 3, y, 2, 1, sk, 0.05);
        D(x + 2, y + 1, '#f4f4f4'); D(x + 2, y + 2, '#f4f4f4'); D(x + 2, y + 3, '#dcdcdc'); D(x + 5, y + 1, '#f4f4f4'); D(x + 5, y + 2, '#f4f4f4'); D(x + 5, y + 3, '#dcdcdc');
        P(x + 1, y + 7, 6, 3, topD, 0.08); P(x + 1, y + 7, 6, 1, shade(top, -0.3), 0.05);
        if (trim) { P(x + 3, y + 4, 2, 2, trim, 0.05); }
        P(x, y + 11, 8, 1, topD, 0.06);
      }
      if (f === 'back') { P(x + 1, y, 6, 3, topD, 0.08); }
    });
    // arms: sleeve + cuff + hand
    var arm = function (u, v) {
      faces(u, v, 4, 12, 4, function (f, x, y, w, h) {
        if (f === 'top') { P(x, y, w, h, top, 0.1); return; }
        if (f === 'bottom') { P(x, y, w, h, sk, 0.05); return; }
        P(x, y, w, h, top, 0.1); P(x, y + 8, w, 1, trim || topD, 0.06); P(x, y + 9, w, 3, sk, 0.05);
        if (o.glove) P(x, y + 9, w, 3, o.glove, 0.08);
      });
    };
    arm(40, 16); arm(32, 48);
    var leg = function (u, v) {
      faces(u, v, 4, 12, 4, function (f, x, y, w, h) {
        if (f === 'top') { P(x, y, w, h, o.pants, 0.1); return; }
        if (f === 'bottom') { P(x, y, w, h, '#2b2b2b', 0.1); return; }
        P(x, y, w, h, o.pants, 0.12); P(x, y + 9, w, 3, o.shoe, 0.06); P(x, y + 11, w, 1, shade(o.shoe, -0.25), 0.04);
        if (o.shoeStripe) P(x, y + 10, w, 1, o.shoeStripe, 0.05);
      });
    };
    leg(0, 16); leg(16, 48);
    // overlay: fluffy hair on the hat layer, hood rim on the jacket layer
    faces(32, 0, 8, 8, 8, function (f, x, y, w, h) {
      if (f === 'front') { for (var i = 0; i < 8; i++) if (R() < 0.75) D(x + i, y, R() < 0.3 ? hrL : hr); D(x + 7, y + 1, hr); D(x, y + 1, hr); }
      if (f === 'top') { for (var j = 0; j < 8; j++) for (var k = 0; k < 8; k++) if (R() < 0.35) D(x + k, y + j, R() < 0.5 ? hrL : hr); }
      if (f === 'right' || f === 'left') { for (var q = 0; q < 8; q++) if (R() < 0.6) D(x + q, y, hr); }
      if (f === 'back') { for (var b = 0; b < 8; b++) { D(x + b, y, hr); if (R() < 0.6) D(x + b, y + 1, hr); } }
    });
    faces(16, 32, 8, 12, 4, function (f, x, y, w, h) {
      if (f === 'back') { P(x, y, w, 4, topD, 0.1); P(x + 1, y + 4, w - 2, 1, topD, 0.1); }
      if (f === 'front') { D(x, y, topD); D(x + 1, y, topD); D(x + 6, y, topD); D(x + 7, y, topD); }
      if (f === 'top') { P(x, y, w, h, topD, 0.1); }
    });
    return C;
  }
  var SKIN_LOOKS = {
    hero: { seed: 11, skin: '#e2a67c', hair: '#3a2417', eye: '#2c6e9e', top: '#ff7417', trim: '#ffd23f', pants: '#2b3140', shoe: '#f5f5f5', shoeStripe: '#e8322a' },
    rival: { seed: 23, skin: '#9a6440', hair: '#121212', eye: '#c0282e', top: '#c81d2b', trim: '#1b1b1b', pants: '#191a1f', shoe: '#e8322a', mask: '#1d1d22', angry: true },
    buddy: { seed: 31, skin: '#f0c3a0', hair: '#d9a03a', eye: '#2f8a3c', top: '#2f6fe0', trim: '#ffffff', pants: '#3b3b46', shoe: '#ffffff' }
  };
  function defaultSkinInfo(variant, shock) {
    var look = SKIN_LOOKS[variant] ? variant : 'hero', key = look + (shock ? '!' : '');
    if (DEFAULT_SKINS[key]) return DEFAULT_SKINS[key];
    var o = assign({}, SKIN_LOOKS[look], { shock: !!shock });
    return (DEFAULT_SKINS[key] = { tex: paintSkin(o), legacy: false, slim: false, hat: true, shades: {}, tok: 'def-' + key });
  }

  /* ------------------------------------------------------------------ skins: model + poses */
  var PITCH = 13;
  function skinParts(slim, legacy, hat) {
    var aw = slim ? 3 : 4;
    return [
      { n: 'rleg', box: [-4, 0, -2, 4, 12, 4], uv: [0, 16], ov: legacy ? null : [0, 32], inf: 0.25, piv: [-2, 12, 0], bias: -1.2 },
      { n: 'lleg', box: [0, 0, -2, 4, 12, 4], uv: legacy ? [0, 16] : [16, 48], ov: legacy ? null : [0, 48], mirror: legacy, inf: 0.25, piv: [2, 12, 0], bias: -1.2 },
      { n: 'body', box: [-4, 12, -2, 8, 12, 4], uv: [16, 16], ov: legacy ? null : [16, 32], inf: 0.25, piv: [0, 12, 0], bias: 0 },
      { n: 'rarm', box: [-4 - aw, 12, -2, aw, 12, 4], uv: [40, 16], ov: legacy ? null : [40, 32], inf: 0.25, piv: [-4 - aw / 2, 22, 0], bias: 0.3 },
      { n: 'larm', box: [4, 12, -2, aw, 12, 4], uv: legacy ? [40, 16] : [32, 48], ov: legacy ? null : [48, 48], mirror: legacy, inf: 0.25, piv: [4 + aw / 2, 22, 0], bias: 0.3 },
      { n: 'head', box: [-4, 24, -4, 8, 8, 8], uv: [0, 0], ov: hat ? [32, 0] : null, inf: 0.5, piv: [0, 24, 0], bias: 2.5 }
    ];
  }
  /* k = +1 for the left arm/leg (screen-right when facing the viewer), -1 for the right one */
  function limb(k, out, fwd, twist) { return m3(rotY(-k * (twist || 0)), m3(rotZ(k * (out || 0)), rotX(-(fwd || 0)))); }
  var POSES = {
    stand: function (s) { return { yaw: 24, head: rotY(-s * 10), rarm: limb(-1, 5, s > 0 ? 9 : -7), larm: limb(1, 5, s > 0 ? -7 : 9), rleg: rotX(s > 0 ? -5 : 4), lleg: rotX(s > 0 ? 4 : -5) }; },
    shock: function (s) { return { yaw: 20, head: m3(rotY(-s * 12), rotX(-8)), rarm: limb(-1, s > 0 ? 152 : 140, 0, 24), larm: limb(1, s > 0 ? 140 : 152, 0, 24), rleg: rotZ(-7), lleg: rotZ(7) }; },
    point: function (s) {
      var lead = limb(s, 84, 0, 42), back = limb(-s, 14, 12, 0);
      return { yaw: 24, head: rotY(-s * 4), rarm: s > 0 ? back : lead, larm: s > 0 ? lead : back, rleg: rotZ(-4), lleg: rotZ(4) };
    },
    run: function (s) {
      return { yaw: 34, head: rotY(-s * 16), rarm: limb(-1, 6, 58), larm: limb(1, 6, -48), rleg: rotX(42), lleg: rotX(-46) };
    }
  };
  var MODEL_CACHE = {};
  function skinModel(pose, facing, slim, legacy, hat) {
    pose = POSES[pose] ? pose : 'stand';
    var s = facing === 'right' ? 1 : -1;
    var key = [pose, s, slim ? 1 : 0, legacy ? 1 : 0, hat ? 1 : 0].join('|');
    if (MODEL_CACHE[key]) return MODEL_CACHE[key];
    var pr = POSES[pose](s), cam = m3(rotX(PITCH), rotY(pr.yaw * s));
    var Lt = vnorm([s * 0.5, 0.8, 0.75]);
    var parts = [], minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, hand = null;
    skinParts(slim, legacy, hat).forEach(function (pt) {
      var R = pr[pt.n] || I3, M = m3(cam, R), piv = pt.piv;
      var tf = function (p) { var q = mv(R, [p[0] - piv[0], p[1] - piv[1], p[2] - piv[2]]); return mv(cam, [q[0] + piv[0], q[1] + piv[1], q[2] + piv[2]]); };
      var layersOf = [{ inf: 0, uv: pt.uv, ov: false, mirror: !!pt.mirror }];
      if (pt.ov) layersOf.push({ inf: pt.inf, uv: pt.ov, ov: true, mirror: false });
      var faces = [];
      layersOf.forEach(function (ly) {
        boxFaces(pt.box, ly.inf, ly.uv, ly.mirror).forEach(function (f) {
          var corners = [f.p, vadd(f.p, f.U), vadd(f.p, f.V), vadd(vadd(f.p, f.U), f.V)].map(tf);
          corners.forEach(function (q) { minx = Math.min(minx, q[0]); maxx = Math.max(maxx, q[0]); miny = Math.min(miny, -q[1]); maxy = Math.max(maxy, -q[1]); });
          var n = mv(M, f.n); if (n[2] <= 0.02) return;
          var p = corners[0], pu = corners[1], pv = corners[2];
          var b = 0.56 + 0.5 * Math.max(0, vdot(n, Lt)) + (f.f === 'top' ? 0.04 : 0);
          faces.push({ p: [p[0], -p[1]], U: [pu[0] - p[0], -(pu[1] - p[1])], V: [pv[0] - p[0], -(pv[1] - p[1])], r: f.r, b: b, ov: ly.ov });
        });
      });
      var bx = pt.box, ctr = tf([bx[0] + bx[3] / 2, bx[1] + bx[4] / 2, bx[2] + bx[5] / 2]);
      parts.push({ n: pt.n, z: ctr[2] + pt.bias, faces: faces });
      if ((s > 0 && pt.n === 'larm') || (s < 0 && pt.n === 'rarm')) { var hp = tf([bx[0] + bx[3] / 2, bx[1] + 1, 0]); hand = [hp[0], -hp[1]]; }
    });
    parts.sort(function (a, b) { return a.z - b.z; });
    return (MODEL_CACHE[key] = { parts: parts, minx: minx, miny: miny, bw: maxx - minx, bh: maxy - miny, hand: hand });
  }
  /* draw the model so its bounding box spans [x, x+bw*k] x [y, y+bh*k] */
  function drawSkinModel(c, info, model, k, x, y) {
    var ox = x - model.minx * k, oy = y - model.miny * k;
    smooth(c, false);
    for (var i = 0; i < model.parts.length; i++) {
      var fs = model.parts[i].faces;
      for (var j = 0; j < fs.length; j++) {
        var f = fs[j];
        if (f.ov && !info.hat && f.r[1] < 16 && f.r[0] >= 32) continue;
        drawFace(c, shadedCopy(info.shades, info.tex, f.b, true), f.r, f.p, f.U, f.V, k, ox, oy, f.ov ? 0.01 : 0.045);
      }
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ------------------------------------------------------------------ skin layer */
  var PIC_ALPHA = new WeakMap();
  function hasAlpha(src) {
    var tok = tokenOf(src), hit = PIC_ALPHA.get(src); if (hit && hit.tok === tok) return hit.a;
    var a = false, n = natSize(src);
    try {
      var C = mk(48, 48), c = C.getContext('2d'); c.drawImage(src, 0, 0, 48, 48);
      var d = c.getImageData(0, 0, 48, 48).data, clear = 0;
      for (var i = 0; i < 48; i++) { [[i, 0], [i, 47], [0, i], [47, i]].forEach(function (p) { if (d[(p[1] * 48 + p[0]) * 4 + 3] < 200) clear++; }); }
      a = clear > 24; free(C);
    } catch (e) { a = !!(n && /png|gif|webp/i.test(String(src.src || ''))); }
    PIC_ALPHA.set(src, { tok: tok, a: a });
    return a;
  }
  function skinSpec(L, src) {
    var h = clamp(num(L.h, 520), 24, 3000), n = natSize(src);
    var info = n ? skinInfoOf(src) : defaultSkinInfo(str(L.variant, 'hero'), L.pose === 'shock');
    if (n && !info) {
      var cut = hasAlpha(src), a = n.w / n.h;
      if (!cut) a = (a > 0.8 && a < 1.25) ? 1 : clamp(a, 0.72, 1.4);
      return { kind: cut ? 'cut' : (a === 1 ? 'circle' : 'rounded'), w: h * a, h: h, src: src, n: n };
    }
    var model = skinModel(L.pose, L.facing, info.slim, info.legacy, info.hat);
    return { kind: 'model', w: h * model.bw / model.bh, h: h, info: info, model: model };
  }
  function renderSkin(L, src, s) {
    var sp = skinSpec(L, src), w = sp.w, h = sp.h;
    var ol = obj(L.outline), ow = clamp(num(ol.width, 0), 0, 60), oc = str(ol.color, '#ffffff');
    var gl = obj(L.glow), glow = { size: clamp(num(gl.size, 0), 0, 120), color: str(gl.color, '#ffffff') };
    var sh = shadowOf(L.shadow);
    var who = sp.kind === 'model' ? sp.info.tok : tokenOf(src);
    var tail = [who, sp.kind, str(L.pose), str(L.facing), (w / h).toFixed(4), ow, oc, glow.size, glow.color, sh.on ? [sh.blur, sh.dx, sh.dy, sh.color].join(',') : '', s.toFixed(3)].join('|');
    var hit = lookup(L, 'K|' + h.toFixed(2) + '|' + tail, 'Kq|' + quantPx(h * s).toFixed(2) + '|' + tail); if (hit) return hit;
    var key = storeKey;
    var pad = fxPad(ow, glow.size, sh), dw = w + 2 * pad, dh = h + 2 * pad;
    var es = safeScale(s, dw, dh), cw = Math.ceil(dw * es), ch = Math.ceil(dh * es);
    var I = mk(cw, ch), c = I.getContext('2d'), sil = null;
    if (sp.kind === 'model') {
      drawSkinModel(c, sp.info, sp.model, h * es / sp.model.bh, pad * es, pad * es);
      if (ow > 0) sil = dilate(I, ow * es, oc, false);
    } else {
      c.setTransform(es, 0, 0, es, pad * es, pad * es); smooth(c, true);
      if (L.flipX) { c.translate(w, 0); c.scale(-1, 1); }
      if (sp.kind === 'cut') { c.drawImage(src, 0, 0, w, h); if (ow > 0) sil = dilate(I, ow * es, oc, false); }
      else {
        var shp = sp.kind === 'circle' ? 'circle' : 'rounded';
        c.save(); shapePath(c, shp, 0, 0, w, h, 0); c.clip(); coverDraw(c, src, sp.n, 0.5, 0.4, 1, 0, 0, w, h); c.restore();
        if (ow > 0) { sil = mk(cw, ch); var x = sil.getContext('2d'); x.setTransform(es, 0, 0, es, pad * es, pad * es); x.fillStyle = oc; shapePath(x, shp, 0, 0, w, h, ow); x.fill(); }
      }
    }
    var out = finishFx(I, sil, glow, sh, es);
    return cset(key, { canvas: out, ax: (pad + w / 2) * es, ay: (pad + h / 2) * es, m: s / es, w0: h });
  }
  /* small character for set-pieces (feet anchor) */
  function charSprite(variant, pose, facing, hPx) {
    var key = 'CH|' + variant + '|' + pose + '|' + facing + '|' + Math.round(hPx), hit = cget(key); if (hit) return hit;
    var info = defaultSkinInfo(variant, pose === 'shock'), model = skinModel(pose, facing, false, false, true);
    var k = hPx / model.bh, pad = 4, C = mk(model.bw * k + pad * 2, model.bh * k + pad * 2), c = C.getContext('2d');
    drawSkinModel(c, info, model, k, pad, pad);
    return cset(key, { canvas: C, fx: pad - model.minx * k, fy: pad - model.miny * k, k: k, hand: model.hand });
  }
  function renderSkinPreview(ctx, img, pose, x, y, h) {
    var L = { id: 'skin-preview', type: 'skin', imageId: null, pose: pose || 'stand', facing: 'right', h: h || 200, outline: { width: 0 }, shadow: { blur: Math.max(4, (h || 200) * 0.06), color: 'rgba(0,0,0,0.35)', dx: 0, dy: (h || 200) * 0.025 } };
    var e = renderSkin(L, img && natSize(img) ? img : null, 1);
    var m = (e.m || 1) * (e.w0 ? L.h / e.w0 : 1);
    ctx.save(); smooth(ctx, true); ctx.drawImage(e.canvas, x - e.ax * m, y - e.ay * m, e.canvas.width * m, e.canvas.height * m); ctx.restore();
    return { w: skinSpec(L, img && natSize(img) ? img : null).w, h: L.h };
  }

  /* ------------------------------------------------------------------ set-pieces: original 8x8 block textures + a tiny voxel renderer */
  var BTEX = {};
  function btex(id) {
    if (BTEX[id]) return BTEX[id];
    var C = mk(8, 8), c = C.getContext('2d'), R = rng(strHash(id) + 17);
    var px = function (x, y, col) { if (!col) return; c.fillStyle = col; c.fillRect(x, y, 1, 1); };
    var nf = function (x0, y0, w, h, cols) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) px(x, y, cols[(R() * cols.length) | 0]); };
    (TEXP[id] || TEXP.stone)(px, nf, R, c);
    BTEX[id] = { canvas: C, shades: {} };
    return BTEX[id];
  }
  var TEXP = {
    grass_top: function (px, nf) { nf(0, 0, 8, 8, shades('#62b83c', 6, 0.32)); },
    grass_side: function (px, nf, R) { nf(0, 0, 8, 8, shades('#8b5a2b', 5, 0.3)); var g = shades('#62b83c', 5, 0.3); for (var x = 0; x < 8; x++) { var d = 2 + (R() < 0.5 ? 1 : 0) + (R() < 0.18 ? 1 : 0); for (var y = 0; y < d; y++) px(x, y, g[(R() * 5) | 0]); } },
    dirt: function (px, nf) { nf(0, 0, 8, 8, shades('#8b5a2b', 6, 0.32)); },
    farmland: function (px, nf) { nf(0, 0, 8, 8, shades('#5a3a1c', 5, 0.3)); for (var x = 0; x < 8; x++) { px(x, 2, '#3e2712'); px(x, 6, '#3e2712'); } },
    stone: function (px, nf) { nf(0, 0, 8, 8, shades('#808080', 6, 0.2)); },
    deepslate: function (px, nf) { nf(0, 0, 8, 8, shades('#4b4b52', 6, 0.22)); for (var x = 0; x < 8; x++) px(x, 3, '#3a3a40'); },
    cobble: function (px, nf, R) { nf(0, 0, 8, 8, shades('#7a7a7a', 6, 0.3)); [[0, 2], [3, 0], [5, 4], [1, 6], [6, 1], [3, 5]].forEach(function (p) { px(p[0], p[1], '#505050'); px(p[0] + 1, p[1], '#555'); px(p[0], p[1] + 1, '#5a5a5a'); px(p[0] + 1, p[1] + 1, '#9a9a9a'); }); },
    stone_bricks: function (px, nf) { nf(0, 0, 8, 8, shades('#7d7d7d', 5, 0.16)); for (var x = 0; x < 8; x++) { px(x, 3, '#555'); px(x, 7, '#555'); } px(3, 0, '#555'); px(3, 1, '#555'); px(3, 2, '#555'); px(7, 4, '#555'); px(7, 5, '#555'); px(7, 6, '#555'); },
    obsidian: function (px, nf, R) { nf(0, 0, 8, 8, ['#100a1c', '#140d24', '#1b1230', '#0c0816']); for (var i = 0; i < 5; i++) px((R() * 8) | 0, (R() * 8) | 0, R() < 0.5 ? '#3d2a66' : '#5a3f8f'); },
    planks: function (px, nf) { nf(0, 0, 8, 8, shades('#b8874e', 4, 0.18)); for (var x = 0; x < 8; x++) { px(x, 3, '#7a5530'); px(x, 7, '#7a5530'); } px(2, 1, '#8a6136'); px(6, 5, '#8a6136'); },
    roof: function (px, nf) { nf(0, 0, 8, 8, shades('#5a3a24', 4, 0.2)); for (var x = 0; x < 8; x++) { px(x, 3, '#3a2414'); px(x, 7, '#3a2414'); } },
    log: function (px, nf) { nf(0, 0, 8, 8, shades('#6b4423', 4, 0.3)); for (var y = 0; y < 8; y++) { px(1, y, '#4a2e17'); px(5, y, '#4a2e17'); } },
    log_top: function (px, nf) { nf(0, 0, 8, 8, shades('#b98b52', 3, 0.15)); for (var i = 0; i < 8; i++) { px(i, 0, '#6b4423'); px(i, 7, '#6b4423'); px(0, i, '#6b4423'); px(7, i, '#6b4423'); } [[2, 2], [3, 2], [4, 2], [5, 2], [2, 5], [3, 5], [4, 5], [5, 5], [2, 3], [2, 4], [5, 3], [5, 4]].forEach(function (p) { px(p[0], p[1], '#9a7040'); }); },
    leaves: function (px, nf, R) { nf(0, 0, 8, 8, shades('#2f8f2a', 6, 0.45)); for (var i = 0; i < 6; i++) px((R() * 8) | 0, (R() * 8) | 0, '#1d5a1a'); },
    glass: function (px) { for (var i = 0; i < 8; i++) { px(i, 0, '#e6f6ff'); px(i, 7, '#bcdbe8'); px(0, i, '#e6f6ff'); px(7, i, '#bcdbe8'); } px(2, 2, 'rgba(255,255,255,0.8)'); px(3, 3, 'rgba(255,255,255,0.7)'); px(2, 3, 'rgba(255,255,255,0.55)'); for (var y = 1; y < 7; y++) for (var x = 1; x < 7; x++) if (!((x === 2 && y === 2) || (x === 3 && y === 3) || (x === 2 && y === 3))) px(x, y, 'rgba(150,210,240,0.28)'); },
    lava: function (px, nf, R) { nf(0, 0, 8, 8, ['#ff6a00', '#ff8a10', '#ff9f1c', '#e85100', '#ffb52e']); for (var i = 0; i < 6; i++) px((R() * 8) | 0, (R() * 8) | 0, '#ffe066'); for (var j = 0; j < 4; j++) px((R() * 8) | 0, (R() * 8) | 0, '#c23a00'); },
    water: function (px, nf) { nf(0, 0, 8, 8, ['rgba(40,110,230,0.85)', 'rgba(52,124,240,0.85)', 'rgba(34,96,210,0.85)', 'rgba(70,140,250,0.85)']); px(1, 2, 'rgba(180,220,255,0.9)'); px(2, 2, 'rgba(180,220,255,0.9)'); px(5, 5, 'rgba(180,220,255,0.9)'); },
    netherrack: function (px, nf, R) { nf(0, 0, 8, 8, shades('#7a2626', 6, 0.3)); for (var i = 0; i < 5; i++) px((R() * 8) | 0, (R() * 8) | 0, '#4e1414'); },
    gold_block: function (px, nf) { nf(0, 0, 8, 8, ['#ffd83a', '#ffcf1f', '#f7c614', '#ffe36a']); for (var i = 0; i < 8; i++) { px(i, 0, '#fff3a6'); px(0, i, '#fff3a6'); px(i, 7, '#c99400'); px(7, i, '#c99400'); } px(2, 2, '#fffbe0'); },
    diamond_block: function (px, nf) { nf(0, 0, 8, 8, ['#5fe8e0', '#4fdcd4', '#74f2ea', '#3fcfc6']); for (var i = 0; i < 8; i++) { px(i, 0, '#d8fffb'); px(0, i, '#d8fffb'); px(i, 7, '#1e9e98'); px(7, i, '#1e9e98'); } px(2, 2, '#ffffff'); px(5, 4, '#b8fff9'); },
    emerald_block: function (px, nf) { nf(0, 0, 8, 8, ['#3ee07a', '#2fd06a', '#52ef8c', '#22b85a']); for (var i = 0; i < 8; i++) { px(i, 0, '#c8ffd8'); px(0, i, '#c8ffd8'); px(i, 7, '#13853d'); px(7, i, '#13853d'); } },
    iron_block: function (px, nf) { nf(0, 0, 8, 8, ['#dcdcdc', '#e8e8e8', '#cfcfcf']); for (var i = 0; i < 8; i++) { px(i, 0, '#ffffff'); px(i, 7, '#a8a8a8'); } },
    tnt_side: function (px, nf) { nf(0, 0, 8, 8, ['#e0332b', '#d42a22', '#ea4038']); for (var x = 0; x < 8; x++) { px(x, 3, '#f2ede4'); px(x, 4, '#f2ede4'); } px(2, 3, '#1b1b1b'); px(3, 4, '#1b1b1b'); px(4, 3, '#1b1b1b'); px(5, 4, '#1b1b1b'); },
    tnt_top: function (px, nf) { nf(0, 0, 8, 8, ['#e0332b', '#d42a22']); px(3, 3, '#f2ede4'); px(4, 3, '#f2ede4'); px(3, 4, '#f2ede4'); px(4, 4, '#2b2b2b'); },
    chest_top: function (px, nf) { nf(0, 0, 8, 8, shades('#b8742f', 4, 0.15)); for (var i = 0; i < 8; i++) { px(i, 0, '#5a3210'); px(i, 7, '#5a3210'); px(0, i, '#5a3210'); px(7, i, '#5a3210'); } },
    chest_side: function (px, nf) { nf(0, 0, 8, 8, shades('#b8742f', 4, 0.15)); for (var i = 0; i < 8; i++) { px(i, 3, '#4a2a0c'); px(0, i, '#5a3210'); px(7, i, '#5a3210'); px(i, 7, '#5a3210'); } },
    chest_front: function (px, nf) { TEXP.chest_side(px, nf); px(3, 2, '#d8d8d8'); px(4, 2, '#d8d8d8'); px(3, 3, '#a0a0a0'); px(4, 3, '#a0a0a0'); px(3, 4, '#d8d8d8'); px(4, 4, '#d8d8d8'); },
    spawner: function (px) {
      for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) px(x, y, '#121620');
      px(3, 4, '#ff3b1f'); px(4, 4, '#ff6a1a'); px(3, 5, '#ff8a1a'); px(4, 5, '#ffd23f'); px(4, 3, '#ff3b1f'); px(2, 5, '#c41a12'); px(5, 5, '#c41a12');
      for (var i = 0; i < 8; i++) { px(i, 0, '#7f8a9c'); px(0, i, '#7f8a9c'); px(i, 7, '#3c4452'); px(7, i, '#3c4452'); px(i, 3.5 | 0, i % 2 ? '#56607a' : null); px(3, i, i % 3 ? '#56607a' : null); }
    },
    piston_side_e: function (px, nf) { nf(0, 0, 8, 8, shades('#7a7a7a', 5, 0.3)); for (var y = 0; y < 8; y++) { px(6, y, '#b8874e'); px(7, y, '#c9975c'); } for (var x = 0; x < 6; x++) px(x, 4, '#5a5a5a'); },
    piston_side_w: function (px, nf) { nf(0, 0, 8, 8, shades('#7a7a7a', 5, 0.3)); for (var y = 0; y < 8; y++) { px(0, y, '#c9975c'); px(1, y, '#b8874e'); } for (var x = 2; x < 8; x++) px(x, 4, '#5a5a5a'); },
    piston_face: function (px, nf) { nf(0, 0, 8, 8, shades('#b8874e', 4, 0.15)); for (var y = 2; y < 6; y++) for (var x = 2; x < 6; x++) px(x, y, x === 2 || y === 2 ? '#8fd45f' : '#5cb83a'); },
    piston_back: function (px, nf) { nf(0, 0, 8, 8, shades('#6a6a6a', 5, 0.3)); px(3, 3, '#3a3a3a'); px(4, 3, '#3a3a3a'); px(3, 4, '#3a3a3a'); px(4, 4, '#3a3a3a'); },
    dust: function (px) { for (var i = 1; i < 7; i++) { px(i, 4, '#e0140c'); px(i, 3, i % 2 ? '#ff3a22' : '#b80e08'); } px(3, 5, '#a00c06'); },
    redstone_block: function (px, nf) { nf(0, 0, 8, 8, ['#c4140c', '#e01e12', '#a80e08', '#ff3a22']); },
    torch: function (px) { for (var y = 2; y < 8; y++) { px(3, y, '#7a5230'); px(4, y, '#5c3c20'); } px(3, 0, '#fff6c0'); px(4, 0, '#ffd23f'); px(3, 1, '#ffb52e'); px(4, 1, '#ff8a10'); },
    lantern: function (px, nf) { nf(1, 1, 6, 6, ['#ffcf5a', '#ffe28a', '#ffb52e']); for (var i = 1; i < 7; i++) { px(i, 1, '#3a3a44'); px(i, 6, '#3a3a44'); px(1, i, '#3a3a44'); px(6, i, '#3a3a44'); } },
    wheat: function (px) { var col = ['#d9b23a', '#e8c64e', '#b8902a']; for (var x = 0; x < 8; x += 2) { for (var y = 2; y < 8; y++) px(x + (y % 2), y, y < 4 ? col[(x + y) % 3] : (y < 6 ? '#9bb83a' : '#6f9a2a')); px(x, 1, '#f2d65c'); } },
    carrots: function (px) { for (var x = 0; x < 8; x += 2) { for (var y = 2; y < 6; y++) px(x + (y % 2), y, y % 2 ? '#4fbf3a' : '#2f9a2a'); px(x, 6, '#ff8a1a'); px(x + 1, 7, '#e86a10'); px(x, 1, '#6fdf4a'); } },
    flower: function (px) { px(3, 4, '#3a8a2a'); px(3, 5, '#3a8a2a'); px(3, 6, '#2f7a22'); px(3, 7, '#2f7a22'); px(2, 6, '#3a8a2a'); px(3, 2, '#ffd23f'); px(2, 2, '#ff4d6d'); px(4, 2, '#ff4d6d'); px(3, 1, '#ff4d6d'); px(3, 3, '#ff4d6d'); },
    tall_grass: function (px) { [[1, 3], [2, 1], [4, 2], [5, 4], [6, 2]].forEach(function (p) { for (var y = p[1]; y < 8; y++) px(p[0], y, y < p[1] + 2 ? '#7fd34a' : '#4f9f2f'); }); },
    hay_side: function (px, nf) { nf(0, 0, 8, 8, ['#d9b23a', '#c9a02a', '#e8c64e']); for (var x = 0; x < 8; x++) { px(x, 2, '#8a5a1a'); px(x, 5, '#8a5a1a'); } },
    hay_top: function (px, nf) { nf(0, 0, 8, 8, ['#d9b23a', '#c9a02a', '#e8c64e', '#b8902a']); },
    crafting_top: function (px, nf) { nf(0, 0, 8, 8, shades('#b8874e', 4, 0.15)); for (var i = 0; i < 8; i++) { px(i, 0, '#6b4423'); px(0, i, '#6b4423'); px(i, 7, '#6b4423'); px(7, i, '#6b4423'); px(i, 4, '#7a5530'); px(4, i, '#7a5530'); } },
    crafting_side: function (px, nf) { nf(0, 0, 8, 8, shades('#9a6a3a', 4, 0.2)); for (var x = 0; x < 8; x++) px(x, 0, '#c9975c'); px(1, 3, '#7f7f7f'); px(2, 3, '#7f7f7f'); px(2, 4, '#6b4423'); px(5, 2, '#c4c4c4'); px(5, 3, '#6b4423'); px(5, 4, '#6b4423'); },
    furnace_front: function (px, nf) { nf(0, 0, 8, 8, shades('#6f6f6f', 5, 0.25)); for (var x = 2; x < 6; x++) { px(x, 4, '#1a1a1a'); px(x, 5, x % 2 ? '#ff8a10' : '#ffd23f'); px(x, 6, '#2a2a2a'); } },
    door_bottom: function (px, nf) { nf(0, 0, 8, 8, shades('#6b4423', 3, 0.15)); for (var y = 0; y < 8; y++) { px(0, y, '#4a2e17'); px(7, y, '#4a2e17'); } px(6, 1, '#c9c9c9'); for (var x = 0; x < 8; x++) px(x, 4, '#4a2e17'); },
    door_top: function (px, nf) { nf(0, 0, 8, 8, shades('#6b4423', 3, 0.15)); for (var y = 2; y < 6; y++) for (var x = 2; x < 6; x++) px(x, y, (x === 2 && y === 2) ? '#e6f6ff' : '#9fd0e8'); for (var i = 0; i < 8; i++) { px(0, i, '#4a2e17'); px(7, i, '#4a2e17'); } },
    portal: function (px, nf, R) { for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) { var v = Math.sin((x * 1.1 + y * 0.7) + Math.sin(y * 1.3) * 1.4); px(x, y, v > 0.5 ? 'rgba(232,180,255,0.88)' : v > -0.2 ? 'rgba(170,80,255,0.84)' : 'rgba(110,30,220,0.84)'); } },
    fire: function (px) { [[1, 4], [2, 2], [3, 1], [4, 3], [5, 2], [6, 4]].forEach(function (p) { for (var y = p[1]; y < 8; y++) px(p[0], y, y < p[1] + 1 ? '#ffe066' : y < p[1] + 3 ? '#ffb52e' : '#ff6a00'); }); },
    shulker_p: function (px, nf) { nf(0, 0, 8, 8, ['#9a5fc9', '#a96fd6', '#8a4fb9']); for (var x = 0; x < 8; x++) px(x, 3, '#5a2f80'); },
    shulker_c: function (px, nf) { nf(0, 0, 8, 8, ['#2fb9c9', '#3fc9d6', '#1fa9b9']); for (var x = 0; x < 8; x++) px(x, 3, '#156f7a'); },
    glowstone: function (px, nf) { nf(0, 0, 8, 8, ['#ffd76a', '#ffe38f', '#e8b23a', '#fff1b8', '#c98f2a']); },
    sign: function (px, nf) { nf(0, 0, 8, 8, shades('#b8874e', 3, 0.12)); for (var x = 1; x < 7; x++) { px(x, 2, '#3a2414'); px(x, 5, '#3a2414'); } }
  };
  /* block defs: per-face texture ids (top/bottom/front=+z/back=-z/east=+x/west=-x, side = fallback) */
  var BLK = {
    grass: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, dirt: { side: 'dirt' }, farmland: { top: 'farmland', side: 'dirt', box: [0, 0, 0, 1, 0.94, 1] },
    stone: { side: 'stone' }, deepslate: { side: 'deepslate' }, cobble: { side: 'cobble' }, bricks: { side: 'stone_bricks' }, obsidian: { side: 'obsidian' },
    planks: { side: 'planks' }, roof: { side: 'roof' }, log: { side: 'log', top: 'log_top', bottom: 'log_top' }, leaves: { side: 'leaves' }, glass: { side: 'glass', clear: 1 },
    lava: { side: 'lava', emit: '#ff7a1a', box: [0, 0, 0, 1, 0.88, 1] }, water: { side: 'water', clear: 1, box: [0, 0, 0, 1, 0.88, 1] }, netherrack: { side: 'netherrack' },
    gold: { side: 'gold_block' }, diamond: { side: 'diamond_block' }, emerald: { side: 'emerald_block' }, iron: { side: 'iron_block' },
    tnt: { side: 'tnt_side', top: 'tnt_top', bottom: 'tnt_top' }, chest: { side: 'chest_side', top: 'chest_top', front: 'chest_front', box: [0.06, 0, 0.06, 0.94, 0.88, 0.94] },
    spawner: { side: 'spawner', emit: '#ff5a1a', dim: 1 }, piston_e: { side: 'piston_side_e', east: 'piston_face', west: 'piston_back' }, piston_w: { side: 'piston_side_w', west: 'piston_face', east: 'piston_back' },
    piston_up: { side: 'piston_side_e', top: 'piston_face' }, dust: { side: 'dust', flat: 1 }, plate: { side: 'stone', box: [0.1, 0, 0.1, 0.9, 0.08, 0.9] }, redstone: { side: 'redstone_block' },
    torch: { side: 'torch', emit: '#ffc46a', box: [0.42, 0, 0.42, 0.58, 0.65, 0.58] }, lantern: { side: 'lantern', emit: '#ffc46a', box: [0.3, 0, 0.3, 0.7, 0.5, 0.7] },
    wheat: { side: 'wheat', cross: 1 }, carrots: { side: 'carrots', cross: 1 }, flower: { side: 'flower', cross: 1 }, tallgrass: { side: 'tall_grass', cross: 1 }, fire: { side: 'fire', cross: 1, emit: '#ff8a1a' },
    hay: { side: 'hay_side', top: 'hay_top', bottom: 'hay_top' }, crafting: { side: 'crafting_side', top: 'crafting_top' }, furnace: { side: 'cobble', front: 'furnace_front', top: 'stone', emit: '#ff9a2a', dim: 1 },
    door_b: { side: 'planks', front: 'door_bottom', box: [0, 0, 0.8, 1, 1, 1] }, door_t: { side: 'planks', front: 'door_top', box: [0, 0, 0.8, 1, 1, 1] },
    portal: { side: 'portal', emit: '#b45cff', clear: 1, box: [0, 0, 0.38, 1, 1, 0.62] }, shulker_p: { side: 'shulker_p' }, shulker_c: { side: 'shulker_c' },
    glowstone: { side: 'glowstone', emit: '#ffd76a' }, sign: { side: 'sign', box: [0.1, 0.3, 0.45, 0.9, 0.9, 0.55] }
  };
  function VW() {
    var at = {}, o = {
      at: at, sprites: [], glows: [],
      set: function (x, y, z, t) { var k = x + ',' + y + ',' + z; if (t) at[k] = t; else delete at[k]; },
      get: function (x, y, z) { return at[x + ',' + y + ',' + z]; },
      box: function (x0, y0, z0, x1, y1, z1, t) { for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) for (var z = z0; z <= z1; z++) o.set(x, y, z, typeof t === 'function' ? t(x, y, z) : t); }
    };
    return o;
  }
  function vwGround(w, X, Z, top, under) {
    w.box(0, -3, 0, X - 1, -3, Z - 1, 'stone'); w.box(0, -2, 0, X - 1, -1, Z - 1, under || 'dirt'); w.box(0, 0, 0, X - 1, 0, Z - 1, top || 'grass');
  }
  var SETPIECES = {
    'trap-lava': { name: 'Lava trap', build: function (w) {
      vwGround(w, 9, 8);
      w.box(2, 0, 2, 6, 0, 6, 'cobble'); w.box(3, -1, 3, 5, 0, 5, null); w.box(3, -2, 3, 5, -2, 5, 'lava');
      w.set(3, 1, 0, 'chest'); w.set(4, 1, 0, 'chest'); w.set(5, 1, 0, 'diamond'); w.set(2, 1, 2, 'torch'); w.set(6, 1, 2, 'torch'); w.set(4, 1, 6, 'plate');
      w.set(1, 1, 6, 'tallgrass'); w.set(7, 1, 5, 'flower'); w.set(0, 1, 2, 'tallgrass'); w.set(8, 1, 7, 'tallgrass');
      w.glows.push({ p: [4.5, -0.6, 4.5], r: 3.6, c: '#ff7a1a', a: 0.75 });
      w.sprites.push({ who: 'rival', pose: 'shock', facing: 'right', p: [4.5, 1.6, 4.4], h: 1.9 });
    } },
    'trap-piston': { name: 'Piston trap', build: function (w) {
      vwGround(w, 9, 7);
      w.box(4, -1, 2, 4, 0, 4, null); w.box(4, -2, 2, 4, -2, 4, 'lava');
      w.box(3, 1, 2, 3, 1, 4, 'piston_e'); w.box(5, 1, 2, 5, 1, 4, 'piston_w');
      w.box(2, 1, 1, 2, 1, 5, 'dust'); w.box(6, 1, 1, 6, 1, 5, 'dust'); w.box(3, 1, 1, 5, 1, 1, 'dust'); w.box(3, 1, 5, 3, 1, 5, 'dust'); w.box(5, 1, 5, 5, 1, 5, 'dust');
      w.set(4, 1, 5, 'plate'); w.set(4, 1, 0, 'redstone'); w.set(7, 1, 1, 'tnt'); w.set(8, 1, 1, 'tnt'); w.set(7, 2, 1, 'tnt'); w.set(1, 1, 0, 'obsidian'); w.set(0, 1, 0, 'obsidian'); w.set(0, 2, 0, 'obsidian');
      w.set(1, 1, 5, 'tallgrass'); w.set(7, 1, 5, 'flower');
      w.glows.push({ p: [4.5, -0.6, 3.5], r: 2.6, c: '#ff7a1a', a: 0.7 }); w.glows.push({ p: [4.5, 1.2, 0.5], r: 1.6, c: '#ff2a1a', a: 0.45 });
    } },
    'base-house': { name: 'Blocky house', build: function (w) {
      vwGround(w, 11, 9);
      w.box(2, 1, 2, 8, 1, 6, 'cobble'); w.box(2, 2, 2, 8, 4, 6, 'planks');
      [[2, 2], [8, 2], [2, 6], [8, 6]].forEach(function (p) { w.box(p[0], 1, p[1], p[0], 4, p[1], 'log'); });
      w.set(3, 3, 6, 'glass'); w.set(4, 3, 6, 'glass'); w.set(6, 3, 6, 'glass'); w.set(7, 3, 6, 'glass'); w.set(8, 3, 4, 'glass'); w.set(2, 3, 4, 'glass');
      w.set(5, 2, 6, null); w.set(5, 3, 6, null); w.set(5, 2, 7, 'door_b'); w.set(5, 3, 7, 'door_t'); w.set(5, 1, 7, 'cobble');
      w.box(1, 5, 1, 9, 5, 7, 'roof'); w.box(1, 6, 2, 9, 6, 6, 'roof'); w.box(1, 7, 3, 9, 7, 5, 'roof'); w.box(1, 8, 4, 9, 8, 4, 'roof');
      w.box(7, 6, 3, 7, 9, 3, 'cobble');
      w.set(4, 1, 8, 'torch'); w.set(6, 1, 8, 'torch'); w.set(1, 1, 7, 'chest'); w.set(9, 1, 7, 'crafting');
      w.box(10, 1, 1, 10, 3, 1, 'log'); w.box(9, 4, 0, 10, 5, 2, 'leaves'); w.set(10, 6, 1, 'leaves'); w.set(0, 1, 4, 'flower'); w.set(0, 1, 8, 'tallgrass'); w.set(10, 1, 6, 'tallgrass'); w.set(3, 1, 8, 'flower');
    } },
    'base-bunker': { name: 'Secret bunker', build: function (w) {
      w.box(0, -7, 0, 8, -7, 7, 'deepslate'); w.box(0, -6, 0, 8, -3, 7, 'stone'); w.box(0, -2, 0, 8, -1, 7, 'dirt'); w.box(0, 0, 0, 8, 0, 7, 'grass');
      w.box(1, -6, 1, 7, -6, 7, 'obsidian'); w.box(1, -5, 1, 1, -2, 7, 'obsidian'); w.box(7, -5, 1, 7, -2, 7, 'obsidian'); w.box(1, -5, 1, 7, -2, 1, 'obsidian'); w.box(1, -2, 1, 7, -2, 7, 'obsidian');
      w.box(2, -5, 2, 6, -3, 7, null);
      w.box(2, -5, 2, 6, -5, 2, 'chest'); w.set(2, -4, 2, 'chest'); w.set(3, -4, 2, 'gold'); w.set(5, -4, 2, 'diamond'); w.set(6, -4, 2, 'chest');
      w.set(2, -5, 4, 'furnace'); w.set(6, -5, 4, 'crafting'); w.set(4, -5, 5, 'lantern'); w.set(2, -3, 2, 'torch');
      w.set(4, 0, 3, 'plate'); w.set(1, 1, 1, 'tallgrass'); w.set(7, 1, 6, 'flower'); w.set(6, 1, 1, 'tallgrass');
      w.set(3, -5, 6, 'lantern'); w.set(5, -5, 6, 'lantern'); w.box(2, -5, 1, 6, -3, 1, 'bricks');
      w.glows.push({ p: [4.5, -4, 5], r: 4.4, c: '#ffb04a', a: 0.85 }); w.glows.push({ p: [4.5, -3.2, 3], r: 3, c: '#fff0c0', a: 0.4 });
    } },
    'spawner-farm': { name: 'Spawner farm', build: function (w) {
      vwGround(w, 9, 7, 'bricks', 'stone');
      [1, 3, 5, 7].forEach(function (x) { [1, 3].forEach(function (z) { w.set(x, 1, z, 'spawner'); w.set(x, 2, z, 'spawner'); w.glows.push({ p: [x + 0.5, 1.6, z + 0.5], r: 1.15, c: '#ff5a1a', a: 0.4 }); }); });
      [0, 2, 4, 6, 8].forEach(function (x) { w.set(x, 1, 5, 'chest'); }); w.set(1, 1, 6, 'gold'); w.set(7, 1, 6, 'emerald'); w.set(4, 1, 6, 'torch');
    } },
    'crop-farm': { name: 'Crop farm', build: function (w) {
      vwGround(w, 11, 9);
      w.box(1, 0, 1, 9, 0, 7, 'farmland'); w.box(1, 0, 4, 9, 0, 4, 'water');
      w.box(1, 1, 1, 9, 1, 3, 'wheat'); w.box(1, 1, 5, 9, 1, 7, 'carrots');
      w.set(10, 1, 1, 'hay'); w.set(10, 1, 2, 'hay'); w.set(10, 2, 1, 'hay'); w.set(0, 1, 8, 'chest'); w.set(0, 1, 0, 'torch'); w.set(10, 1, 8, 'torch'); w.set(10, 1, 5, 'flower');
    } },
    'pvp-duel': { name: 'PvP duel', build: function (w) {
      vwGround(w, 7, 5, 'bricks', 'stone');
      w.box(0, 1, 0, 6, 1, 0, 'bricks'); w.set(0, 2, 0, 'bricks'); w.set(6, 2, 0, 'bricks'); w.set(0, 3, 0, 'torch'); w.set(6, 3, 0, 'torch'); w.set(3, 2, 0, 'gold');
      w.sprites.push({ who: 'hero', pose: 'point', facing: 'right', p: [1.7, 1, 2.8], h: 3.1, sword: 1 });
      w.sprites.push({ who: 'rival', pose: 'point', facing: 'left', p: [5.3, 1, 2.6], h: 3.1, sword: 1 });
    } },
    'stash-chests': { name: 'Loot stash', build: function (w) {
      vwGround(w, 8, 7, 'bricks', 'stone');
      w.box(0, 1, 0, 7, 2, 0, 'chest'); w.box(0, 1, 1, 7, 1, 1, 'chest'); w.set(0, 3, 0, 'chest'); w.set(1, 3, 0, 'chest'); w.set(6, 3, 0, 'chest'); w.set(7, 3, 0, 'chest');
      w.box(1, 1, 3, 3, 1, 4, 'gold'); w.set(2, 2, 3, 'gold'); w.set(2, 2, 4, 'gold'); w.box(5, 1, 3, 6, 1, 4, 'diamond'); w.set(5, 2, 3, 'diamond'); w.set(6, 1, 5, 'emerald'); w.set(4, 1, 5, 'shulker_p'); w.set(0, 1, 5, 'shulker_c'); w.set(3, 1, 6, 'emerald');
      w.glows.push({ p: [3.5, 2.2, 4], r: 3, c: '#fff2a0', a: 0.35 });
    } },
    'portal': { name: 'Nether portal', build: function (w) {
      vwGround(w, 9, 7, 'netherrack', 'netherrack');
      for (var x = 2; x <= 5; x++) for (var y = 1; y <= 5; y++) w.set(x, y, 3, (x === 2 || x === 5 || y === 1 || y === 5) ? 'obsidian' : 'portal');
      w.box(6, 0, 4, 8, 0, 6, 'lava'); w.set(1, 1, 1, 'fire'); w.set(7, 1, 2, 'fire'); w.set(0, 1, 5, 'glowstone'); w.set(1, 1, 6, 'netherrack');
      w.glows.push({ p: [4, 3, 3.5], r: 3.4, c: '#b45cff', a: 0.6 }); w.glows.push({ p: [7.5, 0.6, 5.5], r: 2.4, c: '#ff7a1a', a: 0.55 });
    } },
    'dirt-hut': { name: 'Dirt hut', build: function (w) {
      vwGround(w, 7, 6);
      w.box(2, 1, 1, 4, 3, 3, 'dirt'); w.box(3, 1, 3, 3, 2, 3, null); w.set(1, 1, 4, 'torch'); w.set(5, 1, 4, 'tallgrass'); w.set(0, 1, 1, 'flower');
    } }
  };
  var SETPIECE_IDS = Object.keys(SETPIECES);
  var VFACES = [
    { k: 'top', n: [0, 1, 0], d: [0, 1, 0] }, { k: 'bottom', n: [0, -1, 0], d: [0, -1, 0] }, { k: 'front', n: [0, 0, 1], d: [0, 0, 1] },
    { k: 'back', n: [0, 0, -1], d: [0, 0, -1] }, { k: 'east', n: [1, 0, 0], d: [1, 0, 0] }, { k: 'west', n: [-1, 0, 0], d: [-1, 0, 0] }
  ];
  var FACE_OF = { front: 'front', back: 'back', left: 'east', right: 'west', top: 'top', bottom: 'bottom' }; // boxFaces names -> world dirs
  function solidCube(def) { return def && !def.box && !def.cross && !def.flat && !def.clear; }
  /* draws world w into a new canvas; returns { canvas, w, h } (design px at block size bs) */
  function renderVoxels(w, yaw, pitch, bs) {
    var M = m3(rotX(pitch), rotY(yaw)), Lt = vnorm([-0.45 * (yaw < 0 ? -1 : 1), 0.85, 0.5]);
    var P = function (p) { var q = mv(M, p); return [q[0] * bs, -q[1] * bs, q[2]]; };
    var cells = Object.keys(w.at).map(function (k) { var a = k.split(','); return { x: +a[0], y: +a[1], z: +a[2], t: w.at[k] }; });
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    var grow = function (q) { minx = Math.min(minx, q[0]); maxx = Math.max(maxx, q[0]); miny = Math.min(miny, q[1]); maxy = Math.max(maxy, q[1]); };
    cells.forEach(function (b) { for (var i = 0; i < 8; i++) grow(P([b.x + (i & 1), b.y + ((i >> 1) & 1), b.z + ((i >> 2) & 1)])); });
    w.sprites.forEach(function (sp) { grow(P([sp.p[0], sp.p[1] + sp.h + 0.6, sp.p[2]])); });
    var pad = Math.ceil(bs * 0.3), C = mk(maxx - minx + pad * 2, maxy - miny + pad * 2), c = C.getContext('2d');
    var ox = pad - minx, oy = pad - miny;
    smooth(c, false);
    cells.forEach(function (b) { b.d = mv(M, [b.x + 0.5, b.y + 0.5, b.z + 0.5])[2]; });
    cells.sort(function (a, b) { return a.d - b.d; });
    var faceB = {}; VFACES.forEach(function (f) { var n = mv(M, f.n); f.vis = n[2] > 0.02; faceB[f.k] = 0.5 + 0.55 * Math.max(0, vdot(n, Lt)) + (f.k === 'top' ? 0.06 : 0); });
    var drawQuad = function (tid, b, p, U, V, e) {
      var t = btex(tid), tex = shadedCopy(t.shades, t.canvas, b, false);
      var p2 = P(p), u2 = P(vadd(p, U)), v2 = P(vadd(p, V));
      drawFace(c, tex, [0, 0, 8, 8], [p2[0], p2[1]], [u2[0] - p2[0], u2[1] - p2[1]], [v2[0] - p2[0], v2[1] - p2[1]], 1, ox, oy, e);
    };
    cells.forEach(function (b) {
      var def = BLK[b.t]; if (!def) return;
      var emit = def.emit && !def.dim;
      if (def.cross) {
        var bb = emit ? 1.05 : 0.95;
        drawQuad(def.side, bb, [b.x + 0.1, b.y + 1, b.z + 0.1], [0.8, 0, 0.8], [0, -1, 0], 0.02);
        drawQuad(def.side, bb, [b.x + 0.9, b.y + 1, b.z + 0.1], [-0.8, 0, 0.8], [0, -1, 0], 0.02);
        return;
      }
      var bx = def.box || (def.flat ? [0, 0, 0, 1, 0.06, 1] : null), full = !bx;
      var geom = boxFaces(bx ? [b.x + bx[0], b.y + bx[1], b.z + bx[2], bx[3] - bx[0], bx[4] - bx[1], bx[5] - bx[2]] : [b.x, b.y, b.z, 1, 1, 1], 0, null, false);
      geom.forEach(function (g) {
        var dir = FACE_OF[g.f], vf = null;
        for (var i = 0; i < 6; i++) if (VFACES[i].k === dir) vf = VFACES[i];
        if (!vf.vis) return;
        if (full || dir === 'bottom' || (bx && bx[1] === 0 && dir === 'bottom')) {
          var nb = BLK[w.get(b.x + vf.d[0], b.y + vf.d[1], b.z + vf.d[2])];
          if (nb && (solidCube(nb) || (nb === def && def.clear))) return;
        } else if (dir === 'top' && bx[4] === 1) { var nt = BLK[w.get(b.x, b.y + 1, b.z)]; if (solidCube(nt)) return; }
        if (def.flat && dir !== 'top') return;
        var tid = def[dir] || (dir === 'east' || dir === 'west' || dir === 'front' || dir === 'back' ? def.side : null) || def.side;
        drawQuad(tid, emit ? 1.02 : faceB[dir], g.p, g.U, g.V, def.clear ? 0.005 : 0.03);
      });
    });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // characters (drawn after the blocks: they always stand in the open)
    w.sprites.forEach(function (sp) {
      var hPx = sp.h * bs * Math.cos(pitch * DEG), ch = charSprite(sp.who, sp.pose, sp.facing, hPx);
      var f = P(sp.p), x0 = ox + f[0] - ch.fx, y0 = oy + f[1] - ch.fy;
      c.save(); c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath();
      if (c.ellipse) c.ellipse(ox + f[0], oy + f[1], hPx * 0.2, hPx * 0.07, 0, 0, Math.PI * 2); c.fill(); c.restore();
      c.drawImage(ch.canvas, Math.round(x0), Math.round(y0));
      if (sp.sword && ch.hand) {
        var hx = x0 + ch.fx + ch.hand[0] * ch.k, hy = y0 + ch.fy + ch.hand[1] * ch.k, sw = hPx * 0.62;
        c.save(); c.translate(hx, hy); c.rotate((sp.facing === 'right' ? 1 : -1) * 0.55 - (sp.facing === 'right' ? 0 : 0)); if (sp.facing !== 'right') c.scale(-1, 1);
        c.translate(-sw * 0.16, -sw * 0.84); smooth(c, false); drawPixelSprite(c, PX['px-sword'], 0, 0, sw, sw, null); c.restore();
      }
    });
    // light from lava / portals / torches
    c.save(); c.globalCompositeOperation = 'lighter';
    var gl = w.glows.slice();
    cells.forEach(function (b) { var def = BLK[b.t]; if (def && def.emit && (b.t === 'torch' || b.t === 'lantern' || b.t === 'fire' || b.t === 'glowstone')) gl.push({ p: [b.x + 0.5, b.y + 0.7, b.z + 0.5], r: 1.3, c: def.emit, a: 0.45 }); });
    gl.forEach(function (g) {
      var q = P(g.p), x = ox + q[0], y = oy + q[1], r = g.r * bs;
      var rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba(g.c, g.a)); rg.addColorStop(1, rgba(g.c, 0));
      c.fillStyle = rg; c.fillRect(x - r, y - r, r * 2, r * 2);
    });
    c.restore();
    return { canvas: C, w: C.width, h: C.height };
  }
  function setPieceCanvas(id, side) {
    var key = 'SP|' + id + '|' + side, hit = cget(key); if (hit) return hit;
    var def = SETPIECES[id]; if (!def) return null;
    var w = VW(); def.build(w);
    var yaw = side === 'left' ? 34 : side === 'center' ? 26 : -34, pitch = 30;
    var probe = renderVoxels(w, yaw, pitch, 4);
    var tw = side === 'center' ? 820 : 760, th = 560, k = Math.min(tw / probe.w, th / probe.h);
    free(probe.canvas);
    var out = renderVoxels(w, yaw, pitch, 4 * k);
    return cset(key, { canvas: out.canvas, w: out.w, h: out.h });
  }
  /* paints a set-piece onto a 1280x720 design-space context */
  function drawSetPiece(c, id, side) {
    side = side === 'left' || side === 'center' ? side : 'right';
    var sp = setPieceCanvas(id, side); if (!sp) return;
    var cx = side === 'left' ? 360 : side === 'center' ? 640 : 920, x = cx - sp.w / 2, y = H - sp.h * 0.9;
    c.save();
    var halo = c.createRadialGradient(cx, y + sp.h * 0.55, 10, cx, y + sp.h * 0.55, sp.w * 0.62);
    halo.addColorStop(0, 'rgba(255,255,235,0.22)'); halo.addColorStop(1, 'rgba(255,255,235,0)'); c.fillStyle = halo; c.fillRect(cx - sp.w, y - sp.h * 0.2, sp.w * 2, sp.h * 1.6);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 14;
    c.drawImage(sp.canvas, x, y);
    c.restore();
  }

  /* ------------------------------------------------------------------ food: generated plate-of-food illustrations (soft light, no outlines) */
  var FOODS = ['cookies', 'pasta', 'pancakes', 'burger', 'cake', 'salad', 'soup', 'generic', 'ingredients'];
  function foodKind(t) {
    t = String(t || '').toLowerCase();
    if (FOODS.indexOf(t) >= 0) return t;
    if (/cookie|biscuit|snickerdoodle/.test(t)) return 'cookies';
    if (/pancake|waffle|crepe|crêpe|french toast/.test(t)) return 'pancakes';
    if (/pasta|spaghetti|noodle|mac\b|macaroni|lasagn|carbonara|bolognese|ramen|penne|linguine/.test(t)) return 'pasta';
    if (/burger|sandwich|slider|sub\b|toastie/.test(t)) return 'burger';
    if (/cake|cupcake|brownie|cheesecake|muffin|dessert|chocolate|donut|doughnut/.test(t)) return 'cake';
    if (/salad|bowl|healthy|veg/.test(t)) return 'salad';
    if (/soup|stew|chowder|broth|chili|curry/.test(t)) return 'soup';
    if (/ingredient|raw|before|prep/.test(t)) return 'ingredients';
    return 'generic';
  }
  function ellP(c, x, y, rx, ry, rot) { c.beginPath(); if (c.ellipse) c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, Math.PI * 2); else { c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(1, ry / rx); c.arc(0, 0, rx, 0, Math.PI * 2); c.restore(); } }
  function fillE(c, x, y, rx, ry, fill, rot) { ellP(c, x, y, rx, ry, rot); c.fillStyle = fill; c.fill(); }
  function radG(c, x, y, r, stops) { var g = c.createRadialGradient(x, y, 0, x, y, Math.max(0.01, r)); for (var i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]); return g; }
  function linG(c, x0, y0, x1, y1, stops) { var g = c.createLinearGradient(x0, y0, x1, y1); for (var i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]); return g; }
  function blobP(c, x, y, rx, ry, R, n, jit, rot) {
    var pts = [], i; n = n || 9; rot = rot || 0;
    for (i = 0; i < n; i++) { var a = rot + i / n * Math.PI * 2, k = 1 + (R() - 0.5) * 2 * jit; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
    c.beginPath();
    var mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }, m0 = mid(pts[n - 1], pts[0]);
    c.moveTo(m0[0], m0[1]);
    for (i = 0; i < n; i++) { var p = pts[i], m = mid(p, pts[(i + 1) % n]); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
    c.closePath();
  }
  var FOOD_SIL = false;
  function softShadow(c, k, blur, dy, alpha) { if (FOOD_SIL) return; c.shadowColor = 'rgba(40,20,5,' + (alpha == null ? 0.35 : alpha) + ')'; c.shadowBlur = blur * k; c.shadowOffsetY = dy * k; c.shadowOffsetX = 0; }
  function noShadow(c) { c.shadowColor = 'rgba(0,0,0,0)'; c.shadowBlur = 0; c.shadowOffsetY = 0; }
  function gloss(c, x, y, rx, ry, a, rot) { fillE(c, x, y, rx, ry, 'rgba(255,255,255,' + a + ')', rot); }
  function plate(c, cx, cy, rx, ry, k, rim) {
    c.save(); softShadow(c, k, rx * 0.14, ry * 0.16, 0.38);
    fillE(c, cx, cy, rx, ry, linG(c, cx - rx, cy - ry, cx + rx, cy + ry, [0, '#ffffff', 1, '#d9d9d6'])); c.restore();
    fillE(c, cx, cy + ry * 0.05, rx * 0.74, ry * 0.7, radG(c, cx - rx * 0.15, cy - ry * 0.25, rx * 0.9, [0, '#fbfbf9', 1, '#e3e3df']));
    ellP(c, cx, cy + ry * 0.05, rx * 0.74, ry * 0.7); c.lineWidth = rx * 0.012; c.strokeStyle = 'rgba(0,0,0,0.07)'; c.stroke();
    if (rim) { ellP(c, cx, cy, rx * 0.93, ry * 0.9); c.lineWidth = rx * 0.018; c.strokeStyle = rim; c.stroke(); }
    c.save(); c.beginPath(); if (c.ellipse) c.ellipse(cx, cy, rx * 0.97, ry * 0.94, 0, Math.PI * 1.05, Math.PI * 1.55); c.lineWidth = rx * 0.025; c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke(); c.restore();
  }
  function bowl(c, cx, cy, rx, ry, depth, k, outside, inside) {
    c.save(); softShadow(c, k, rx * 0.12, ry * 0.25, 0.4);
    c.beginPath(); c.moveTo(cx - rx, cy); c.bezierCurveTo(cx - rx, cy + depth * 0.9, cx - rx * 0.5, cy + depth, cx, cy + depth); c.bezierCurveTo(cx + rx * 0.5, cy + depth, cx + rx, cy + depth * 0.9, cx + rx, cy); c.closePath();
    c.fillStyle = linG(c, cx - rx, 0, cx + rx, 0, [0, shade(outside, -0.25), 0.35, outside, 0.6, shade(outside, 0.18), 1, shade(outside, -0.35)]); c.fill(); c.restore();
    fillE(c, cx, cy, rx, ry, linG(c, 0, cy - ry, 0, cy + ry, [0, shade(inside, -0.1), 1, shade(inside, 0.08)]));
    ellP(c, cx, cy, rx, ry); c.lineWidth = rx * 0.02; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.stroke();
  }
  function chip(c, x, y, r, R) { blobP(c, x, y, r, r * 0.8, R, 6, 0.3, R() * 6); c.fillStyle = '#3a1d10'; c.fill(); blobP(c, x - r * 0.2, y - r * 0.25, r * 0.5, r * 0.35, R, 5, 0.3, 0); c.fillStyle = '#6a3a20'; c.fill(); fillE(c, x - r * 0.3, y - r * 0.35, r * 0.16, r * 0.1, 'rgba(255,240,220,0.7)'); }
  function cookie(c, x, y, r, R, k) {
    var ry = r * 0.55, th = r * 0.17, seed = R() * 6;
    c.save(); softShadow(c, k, r * 0.1, r * 0.06, 0.35);
    blobP(c, x, y + th, r, ry, rng(seed * 1000 | 0), 11, 0.06, seed); c.fillStyle = '#8a4a1a'; c.fill(); c.restore();
    for (var i = 6; i >= 0; i--) { blobP(c, x, y + th * i / 6, r, ry, rng(seed * 1000 | 0), 11, 0.06, seed); c.fillStyle = shade('#b26a2a', -0.05 * i / 6); c.fill(); }
    blobP(c, x, y, r, ry, rng(seed * 1000 | 0), 11, 0.06, seed);
    c.fillStyle = radG(c, x - r * 0.15, y - ry * 0.2, r * 1.05, [0, '#f0c27a', 0.55, '#dd9e52', 0.9, '#c27c36', 1, '#a8642a']); c.fill();
    c.save(); c.clip();
    c.strokeStyle = 'rgba(255,226,170,0.55)'; c.lineWidth = r * 0.03; c.lineCap = 'round';
    for (var q = 0; q < 4; q++) { var a = R() * 6.28, d = R() * 0.6; c.beginPath(); c.moveTo(x + Math.cos(a) * r * d, y + Math.sin(a) * ry * d); c.quadraticCurveTo(x + Math.cos(a + 0.4) * r * (d + 0.15), y + Math.sin(a + 0.4) * ry * (d + 0.15), x + Math.cos(a + 0.2) * r * (d + 0.3), y + Math.sin(a + 0.2) * ry * (d + 0.3)); c.stroke(); }
    for (var j = 0; j < 8; j++) { var b = R() * 6.28, e = Math.sqrt(R()) * 0.78; chip(c, x + Math.cos(b) * r * e, y + Math.sin(b) * ry * e, r * (0.1 + R() * 0.06), R); }
    for (var s = 0; s < 6; s++) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(x + (R() - 0.5) * r * 1.2, y + (R() - 0.5) * ry * 1.2, r * 0.03, r * 0.03); }
    c.restore();
  }
  var FOOD_DRAW = {
    cookies: function (c, cx, cy, S, R, k) {
      plate(c, cx, cy + S * 0.12, S, S * 0.5, k);
      cookie(c, cx - S * 0.36, cy - S * 0.08, S * 0.4, R, k); cookie(c, cx + S * 0.38, cy - S * 0.1, S * 0.4, R, k);
      for (var i = 0; i < 3; i++) cookie(c, cx + S * 0.02, cy + S * 0.2 - i * S * 0.085, S * 0.44, R, k);
      for (var j = 0; j < 7; j++) { var a = R() * 6.28; blobP(c, cx + Math.cos(a) * S * 0.62, cy + S * 0.22 + Math.sin(a) * S * 0.22, S * 0.02, S * 0.015, R, 5, 0.3); c.fillStyle = j % 2 ? '#c27c36' : '#3a1d10'; c.fill(); }
    },
    pasta: function (c, cx, cy, S, R, k) {
      plate(c, cx, cy + S * 0.12, S, S * 0.5, k);
      var mx = cx, my = cy + S * 0.08, rx = S * 0.62, ry = S * 0.3, hgt = S * 0.26;
      c.save(); softShadow(c, k, S * 0.05, S * 0.03, 0.3); fillE(c, mx, my, rx, ry, '#e6b84e'); c.restore();
      var cols = ['#f8dc8c', '#f1cb68', '#e8bb52', '#fbe3a0', '#e0ab42'];
      c.lineCap = 'round';
      var nest = function (a, d) { return [mx + Math.cos(a) * rx * d, my + Math.sin(a) * ry * d - hgt * (1 - d * d)]; };
      for (var i = 0; i < 150; i++) {
        var a0 = R() * 6.28, sweep = (0.8 + R() * 1.8) * (R() < 0.5 ? -1 : 1), d0 = 0.15 + R() * 0.85, d1 = clamp(d0 + (R() - 0.5) * 0.5, 0.1, 1);
        c.beginPath();
        for (var t = 0; t <= 16; t++) { var u = t / 16, q = nest(a0 + sweep * u, d0 + (d1 - d0) * u + Math.sin(u * 6 + i) * 0.03); if (t) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }
        c.lineWidth = S * 0.034; c.strokeStyle = 'rgba(150,95,20,0.5)'; c.stroke();
        c.lineWidth = S * 0.022; c.strokeStyle = cols[i % cols.length]; c.stroke();
        if (i % 5 === 0) { c.lineWidth = S * 0.007; c.strokeStyle = 'rgba(255,250,225,0.8)'; c.stroke(); }
      }
      var sx = mx, sy = my - hgt * 0.75;
      c.save(); softShadow(c, k, S * 0.04, S * 0.02, 0.3);
      blobP(c, sx, sy, S * 0.33, S * 0.16, R, 10, 0.18); c.fillStyle = radG(c, sx - S * 0.08, sy - S * 0.05, S * 0.36, [0, '#ef5a3a', 0.6, '#cf2e1c', 1, '#a01a0e']); c.fill(); c.restore();
      for (var b = 0; b < 8; b++) fillE(c, sx + (R() - 0.5) * S * 0.45, sy + (R() - 0.5) * S * 0.18, S * 0.025, S * 0.016, '#8a140a');
      [[-0.15, -0.02], [0.13, -0.05], [0.0, 0.07]].forEach(function (p) {
        var x = sx + p[0] * S, y = sy + p[1] * S, r = S * 0.11;
        c.save(); softShadow(c, k, S * 0.03, S * 0.02, 0.35); fillE(c, x, y, r, r * 0.92, radG(c, x - r * 0.3, y - r * 0.35, r * 1.3, [0, '#a8643a', 0.5, '#7a3e1e', 1, '#4a200e'])); c.restore();
        for (var q = 0; q < 6; q++) fillE(c, x + (R() - 0.5) * r * 1.2, y + (R() - 0.5) * r, r * 0.08, r * 0.06, '#5a2a12');
        gloss(c, x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, 0.55, -0.5);
      });
      gloss(c, sx + S * 0.2, sy - S * 0.04, S * 0.05, S * 0.02, 0.6, -0.3);
      [[0.18, -0.12, 0.6], [-0.22, -0.1, -0.5]].forEach(function (p) { var x = sx + p[0] * S, y = sy + p[1] * S, L2 = S * 0.11; c.save(); c.translate(x, y); c.rotate(p[2]); c.beginPath(); c.moveTo(-L2, 0); c.quadraticCurveTo(0, -L2 * 0.55, L2, 0); c.quadraticCurveTo(0, L2 * 0.55, -L2, 0); c.fillStyle = linG(c, 0, -L2 * 0.5, 0, L2 * 0.5, [0, '#4fb848', 1, '#2a7a2a']); c.fill(); c.beginPath(); c.moveTo(-L2 * 0.9, 0); c.lineTo(L2 * 0.8, 0); c.lineWidth = S * 0.008; c.strokeStyle = 'rgba(200,255,190,0.6)'; c.stroke(); c.restore(); });
      for (var p2 = 0; p2 < 26; p2++) { c.fillStyle = p2 % 3 ? '#fff6d6' : '#f2e2a8'; c.fillRect(mx + (R() - 0.5) * rx * 1.2, my - hgt * 0.6 + (R() - 0.5) * ry * 1.1, S * 0.018, S * 0.012); }
    },
    pancakes: function (c, cx, cy, S, R, k) {
      plate(c, cx, cy + S * 0.2, S, S * 0.5, k);
      var rx = S * 0.58, ry = S * 0.25, th = S * 0.085, base = cy + S * 0.22, n = 5;
      for (var i = 0; i < n; i++) {
        var y = base - i * th * 1.08, jx = (R() - 0.5) * S * 0.04, seed = (R() * 1e4) | 0;
        c.save(); if (i === 0) softShadow(c, k, S * 0.06, S * 0.03, 0.35);
        blobP(c, cx + jx, y + th, rx, ry, rng(seed), 12, 0.03); c.fillStyle = '#9a5418'; c.fill(); c.restore();
        for (var t = 5; t >= 0; t--) { blobP(c, cx + jx, y + th * t / 5, rx, ry, rng(seed), 12, 0.03); c.fillStyle = linG(c, cx - rx, 0, cx + rx, 0, [0, '#a8581c', 0.3, '#d99448', 0.6, '#e8a85a', 1, '#a05018']); c.fill(); }
        blobP(c, cx + jx, y, rx, ry, rng(seed), 12, 0.03); c.fillStyle = radG(c, cx + jx - rx * 0.1, y - ry * 0.1, rx, [0, '#f6cf8a', 0.7, '#e2a458', 1, '#c27a34']); c.fill();
      }
      var ty = base - (n - 1) * th * 1.08;
      c.save(); blobP(c, cx + S * 0.02, ty, rx * 0.78, ry * 0.72, R, 10, 0.12); c.fillStyle = radG(c, cx - S * 0.1, ty - S * 0.05, rx, [0, 'rgba(214,120,30,0.95)', 1, 'rgba(150,62,10,0.95)']); c.fill(); c.restore();
      [-0.42, -0.18, 0.12, 0.38].forEach(function (f, i) {
        var dx = cx + f * rx * 1.5, len = S * (0.12 + R() * 0.2), top = ty + ry * Math.sqrt(Math.max(0, 1 - f * f * 2.2)) * 0.9;
        c.beginPath(); c.moveTo(dx - S * 0.04, top - S * 0.02); c.lineTo(dx + S * 0.04, top - S * 0.02); c.lineTo(dx + S * 0.03, top + len); c.arc(dx, top + len, S * 0.03, 0, Math.PI); c.closePath();
        c.fillStyle = 'rgba(160,66,10,0.94)'; c.fill(); fillE(c, dx - S * 0.012, top + len * 0.4, S * 0.008, len * 0.3, 'rgba(255,220,170,0.6)');
      });
      gloss(c, cx - S * 0.18, ty - S * 0.04, S * 0.12, S * 0.025, 0.45, -0.1);
      var bx = cx + S * 0.04, by = ty - S * 0.05;
      c.save(); softShadow(c, k, S * 0.02, S * 0.015, 0.3);
      c.beginPath(); rr(c, bx - S * 0.1, by - S * 0.05, S * 0.2, S * 0.1, S * 0.025); c.fillStyle = '#f5d670'; c.fill(); c.restore();
      c.beginPath(); rr(c, bx - S * 0.1, by - S * 0.065, S * 0.2, S * 0.07, S * 0.025); c.fillStyle = '#fff0b0'; c.fill(); gloss(c, bx - S * 0.04, by - S * 0.045, S * 0.04, S * 0.012, 0.8);
      var berry = function (x, y, r) { c.save(); softShadow(c, k, r * 0.6, r * 0.3, 0.35); fillE(c, x, y, r, r, radG(c, x - r * 0.3, y - r * 0.3, r * 1.3, [0, '#7a8be8', 0.5, '#3a4aa8', 1, '#141a50'])); c.restore(); fillE(c, x + r * 0.1, y - r * 0.1, r * 0.25, r * 0.2, '#1a1f45'); gloss(c, x - r * 0.4, y - r * 0.4, r * 0.2, r * 0.14, 0.75); };
      berry(cx - S * 0.12, ty - S * 0.02, S * 0.045); berry(cx + S * 0.22, ty + S * 0.02, S * 0.045); berry(cx + S * 0.1, ty + S * 0.07, S * 0.04);
      berry(cx - S * 0.72, cy + S * 0.3, S * 0.05); berry(cx - S * 0.64, cy + S * 0.38, S * 0.045); berry(cx + S * 0.7, cy + S * 0.33, S * 0.05);
      var rasp = function (x, y, r) { for (var i = 0; i < 9; i++) { var a = i / 9 * 6.28, d = i % 3 ? 0.55 : 0; fillE(c, x + Math.cos(a) * r * d, y + Math.sin(a) * r * d * 0.9, r * 0.42, r * 0.42, radG(c, x + Math.cos(a) * r * d - r * 0.1, y + Math.sin(a) * r * d - r * 0.1, r * 0.5, [0, '#ff6a7a', 1, '#c4142e'])); } };
      rasp(cx + S * 0.62, cy + S * 0.42, S * 0.06); rasp(cx - S * 0.3, ty + S * 0.06, S * 0.05);
    },
    burger: function (c, cx, cy, S, R, k) {
      plate(c, cx, cy + S * 0.38, S, S * 0.4, k);
      var w = S * 1.02, b = cy + S * 0.42;
      c.save(); softShadow(c, k, S * 0.08, S * 0.04, 0.4);
      c.beginPath(); rr(c, cx - w * 0.5, b - S * 0.16, w, S * 0.16, S * 0.07); c.fillStyle = linG(c, 0, b - S * 0.16, 0, b, [0, '#eaa658', 1, '#b06a2a']); c.fill(); c.restore();
      var py = b - S * 0.16;
      blobP(c, cx, py - S * 0.1, w * 0.56, S * 0.14, R, 14, 0.04); c.fillStyle = linG(c, 0, py - S * 0.2, 0, py + S * 0.02, [0, '#6e3a1c', 0.5, '#4e2410', 1, '#2e1408']); c.fill();
      for (var i = 0; i < 40; i++) fillE(c, cx + (R() - 0.5) * w * 1.0, py - S * 0.09 + (R() - 0.5) * S * 0.16, S * 0.012, S * 0.008, R() < 0.5 ? '#8a5030' : '#1e0c04');
      var cy2 = py - S * 0.19;
      c.beginPath(); c.moveTo(cx - w * 0.56, cy2); c.lineTo(cx + w * 0.56, cy2 - S * 0.01);
      [[0.42, 0.13], [0.15, 0.07], [-0.12, 0.16], [-0.4, 0.09]].forEach(function (d) { var x = cx + d[0] * w; c.lineTo(x + S * 0.05, cy2 + S * 0.02); c.quadraticCurveTo(x, cy2 + d[1] * S * 1.4, x - S * 0.05, cy2 + S * 0.02); });
      c.lineTo(cx - w * 0.58, cy2 + S * 0.03); c.closePath(); c.fillStyle = linG(c, 0, cy2 - S * 0.03, 0, cy2 + S * 0.2, [0, '#ffd54a', 1, '#f2a614']); c.fill();
      var ty = cy2 - S * 0.05;
      c.beginPath(); rr(c, cx - w * 0.5, ty - S * 0.045, w, S * 0.07, S * 0.035); c.fillStyle = linG(c, 0, ty - S * 0.05, 0, ty + S * 0.03, [0, '#ff6a52', 1, '#c4221a']); c.fill();
      var ly = ty - S * 0.05;
      c.beginPath(); c.moveTo(cx - w * 0.6, ly + S * 0.02);
      for (var j = 0; j <= 12; j++) { var x = cx - w * 0.6 + j / 12 * w * 1.2; c.quadraticCurveTo(x - w * 0.05, ly + (j % 2 ? S * 0.07 : -S * 0.01), x, ly + S * 0.02); }
      c.lineTo(cx + w * 0.55, ly - S * 0.03); c.lineTo(cx - w * 0.55, ly - S * 0.03); c.closePath(); c.fillStyle = linG(c, 0, ly - S * 0.03, 0, ly + S * 0.07, [0, '#8fe05a', 1, '#3f9a2a']); c.fill();
      var top = ly - S * 0.03;
      c.save(); softShadow(c, k, S * 0.04, S * 0.02, 0.3);
      c.beginPath(); c.moveTo(cx - w * 0.54, top); c.bezierCurveTo(cx - w * 0.56, top - S * 0.5, cx + w * 0.56, top - S * 0.5, cx + w * 0.54, top); c.quadraticCurveTo(cx, top + S * 0.05, cx - w * 0.54, top); c.closePath();
      c.fillStyle = radG(c, cx - w * 0.15, top - S * 0.3, w * 0.75, [0, '#f8c278', 0.45, '#e09a48', 0.85, '#b8682a', 1, '#94501c']); c.fill(); c.restore();
      gloss(c, cx - w * 0.2, top - S * 0.28, w * 0.14, S * 0.05, 0.3, -0.35);
      for (var s = 0; s < 16; s++) { var a = R() * Math.PI, d = 0.25 + R() * 0.65, sx = cx + Math.cos(a) * w * 0.42 * d * (R() < 0.5 ? -1 : 1), sy = top - S * 0.36 * Math.sqrt(1 - Math.pow((sx - cx) / (w * 0.55), 2)) * (0.55 + R() * 0.4); fillE(c, sx, sy, S * 0.022, S * 0.012, '#fff2d0', R() * 3); }
    },
    cake: function (c, cx, cy, S, R, k) {
      plate(c, cx, cy + S * 0.35, S * 0.95, S * 0.42, k);
      var rx = S * 0.6, ry = S * 0.22, top = cy - S * 0.2, bot = cy + S * 0.32;
      c.save(); softShadow(c, k, S * 0.08, S * 0.04, 0.4);
      c.beginPath(); c.moveTo(cx - rx, top); c.lineTo(cx - rx, bot); if (c.ellipse) c.ellipse(cx, bot, rx, ry, 0, Math.PI, 0, true); c.lineTo(cx + rx, top); c.closePath();
      c.fillStyle = linG(c, cx - rx, 0, cx + rx, 0, [0, '#3e1c0c', 0.3, '#6e3820', 0.55, '#7e4428', 1, '#341608']); c.fill(); c.restore();
      fillE(c, cx, top, rx, ry, radG(c, cx - rx * 0.2, top - ry * 0.3, rx * 1.1, [0, '#7a4226', 1, '#4a220e']));
      c.beginPath(); c.moveTo(cx - rx, top);
      for (var i = 0; i <= 14; i++) { var a = Math.PI - i / 14 * Math.PI, x = cx + Math.cos(a) * rx, y = top + Math.sin(a) * ry, len = S * (0.06 + R() * 0.16) * (i % 2 ? 1 : 0.4); c.lineTo(x - S * 0.02, y); c.lineTo(x - S * 0.02, y + len); c.arc(x, y + len, S * 0.02, Math.PI, 0, true); c.lineTo(x + S * 0.02, y); }
      c.lineTo(cx + rx, top); if (c.ellipse) c.ellipse(cx, top, rx, ry, 0, 0, Math.PI, true); c.closePath(); c.fillStyle = '#2e1206'; c.fill();
      fillE(c, cx, top, rx * 0.98, ry * 0.96, radG(c, cx - rx * 0.25, top - ry * 0.4, rx, [0, '#5a2a14', 1, '#2a1006']));
      gloss(c, cx - rx * 0.35, top - ry * 0.35, rx * 0.25, ry * 0.12, 0.28, -0.1);
      for (var g = 0; g < 9; g++) { var a2 = Math.PI - g / 8 * Math.PI, gx = cx + Math.cos(a2) * rx * 0.98, gy = top + Math.sin(a2) * ry; gloss(c, gx - S * 0.006, gy + S * 0.04, S * 0.006, S * 0.02, 0.35); }
      var berry = function (x, y, r) {
        c.save(); softShadow(c, k, r * 0.4, r * 0.25, 0.4); c.beginPath(); c.moveTo(x, y + r); c.bezierCurveTo(x - r * 1.1, y + r * 0.3, x - r * 0.9, y - r * 0.8, x, y - r * 0.6); c.bezierCurveTo(x + r * 0.9, y - r * 0.8, x + r * 1.1, y + r * 0.3, x, y + r); c.fillStyle = radG(c, x - r * 0.3, y - r * 0.3, r * 1.4, [0, '#ff5a6a', 0.6, '#e01e36', 1, '#9a0a1e']); c.fill(); c.restore();
        for (var q = 0; q < 6; q++) fillE(c, x + (R() - 0.5) * r, y + (R() - 0.3) * r, r * 0.06, r * 0.09, '#ffe27a');
        c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.6); c.lineTo(x, y - r * 0.95); c.lineTo(x + r * 0.5, y - r * 0.6); c.lineTo(x, y - r * 0.45); c.closePath(); c.fillStyle = '#3f9a2a'; c.fill();
        gloss(c, x - r * 0.35, y - r * 0.2, r * 0.15, r * 0.25, 0.55, 0.3);
      };
      var cream = function (x, y, r) { c.save(); softShadow(c, k, r * 0.4, r * 0.2, 0.3); fillE(c, x, y, r, r * 0.7, '#fffaf2'); c.restore(); fillE(c, x, y - r * 0.35, r * 0.65, r * 0.45, '#ffffff'); fillE(c, x, y - r * 0.65, r * 0.3, r * 0.25, '#ffffff'); c.beginPath(); c.arc(x, y - r * 0.2, r * 0.55, Math.PI * 1.1, Math.PI * 1.7); c.lineWidth = r * 0.08; c.strokeStyle = 'rgba(200,190,180,0.6)'; c.stroke(); };
      for (var b = 0; b < 7; b++) { var a3 = Math.PI * 1.06 + b / 6 * Math.PI * 0.88; cream(cx + Math.cos(a3) * rx * 0.72, top + Math.sin(a3) * ry * 0.62, S * 0.075); }
      berry(cx - S * 0.18, top + S * 0.04, S * 0.09); berry(cx + S * 0.16, top + S * 0.02, S * 0.085); berry(cx, top - S * 0.06, S * 0.08);
      for (var sp = 0; sp < 24; sp++) { c.fillStyle = ['#ffd23f', '#ff5aa5', '#4fd8ff', '#ffffff', '#7dff6b'][sp % 5]; c.save(); c.translate(cx + (R() - 0.5) * rx * 1.5, top + (R() - 0.5) * ry * 1.4); c.rotate(R() * 3); c.fillRect(-S * 0.012, -S * 0.004, S * 0.024, S * 0.008); c.restore(); }
    },
    salad: function (c, cx, cy, S, R, k) {
      var ry = S * 0.34;
      bowl(c, cx, cy, S * 0.9, ry, S * 0.62, k, '#f4f4f0', '#e8ece6');
      c.save(); ellP(c, cx, cy, S * 0.88, ry * 0.96); c.rect(cx - S, cy - S, S * 2, S); c.clip();
      var greens = ['#3f9a2a', '#5cbf3a', '#2f7a22', '#8fd45f', '#4a8a2a', '#76c94a'];
      for (var i = 0; i < 46; i++) {
        var a = R() * 6.28, d = Math.sqrt(R()) * 0.92, x = cx + Math.cos(a) * S * 0.8 * d, y = cy + Math.sin(a) * ry * 0.85 * d - S * 0.14 * (1 - d * d);
        c.save(); c.translate(x, y); c.rotate(R() * 6.28); var L2 = S * (0.1 + R() * 0.08);
        c.beginPath(); c.moveTo(-L2, 0); c.bezierCurveTo(-L2 * 0.4, -L2 * 0.8, L2 * 0.5, -L2 * 0.7, L2, 0); c.bezierCurveTo(L2 * 0.5, L2 * 0.7, -L2 * 0.4, L2 * 0.8, -L2, 0);
        var gc = greens[i % greens.length]; c.fillStyle = linG(c, 0, -L2, 0, L2, [0, shade(gc, 0.2), 1, shade(gc, -0.2)]); c.fill();
        c.beginPath(); c.moveTo(-L2 * 0.8, 0); c.lineTo(L2 * 0.8, 0); c.lineWidth = S * 0.006; c.strokeStyle = 'rgba(230,255,200,0.55)'; c.stroke(); c.restore();
      }
      c.restore();
      var tom = function (x, y, r) { c.save(); softShadow(c, k, r * 0.4, r * 0.2, 0.3); fillE(c, x, y, r, r * 0.85, radG(c, x - r * 0.3, y - r * 0.3, r * 1.3, [0, '#ff7a6a', 0.6, '#e42a1e', 1, '#a01008'])); c.restore(); fillE(c, x + r * 0.1, y + r * 0.05, r * 0.6, r * 0.45, '#ff9a80'); for (var q = 0; q < 4; q++) fillE(c, x + (q - 1.5) * r * 0.22, y + r * 0.08, r * 0.06, r * 0.1, '#fff0b0'); gloss(c, x - r * 0.45, y - r * 0.45, r * 0.2, r * 0.12, 0.7, -0.5); };
      var cuc = function (x, y, r) { fillE(c, x, y, r, r * 0.6, '#2f7a22'); fillE(c, x, y - r * 0.05, r * 0.86, r * 0.5, '#e2f5b8'); for (var q = 0; q < 6; q++) { var a = q / 6 * 6.28; fillE(c, x + Math.cos(a) * r * 0.35, y - r * 0.05 + Math.sin(a) * r * 0.2, r * 0.07, r * 0.05, '#c2df8a'); } };
      var feta = function (x, y, r) { c.save(); softShadow(c, k, r * 0.4, r * 0.2, 0.25); c.beginPath(); rr(c, x - r, y - r * 0.8, r * 2, r * 1.6, r * 0.25); c.fillStyle = '#fbfbf4'; c.fill(); c.restore(); c.fillStyle = '#e6e6d8'; c.fillRect(x - r, y + r * 0.2, r * 2, r * 0.5); };
      var crou = function (x, y, r) { c.beginPath(); rr(c, x - r, y - r, r * 2, r * 1.8, r * 0.3); c.fillStyle = linG(c, 0, y - r, 0, y + r, [0, '#f2c060', 1, '#b8742a']); c.fill(); for (var q = 0; q < 4; q++) fillE(c, x + (R() - 0.5) * r, y + (R() - 0.5) * r, r * 0.12, r * 0.1, '#8a4a10'); };
      var bits = [[-0.42, -0.06, 'tom'], [0.3, -0.12, 'tom'], [0.05, 0.08, 'tom'], [-0.12, -0.16, 'cuc'], [0.5, 0.05, 'cuc'], [-0.55, 0.1, 'cuc'], [0.18, -0.02, 'feta'], [-0.28, 0.06, 'feta'], [0.4, -0.22, 'crou'], [-0.05, -0.08, 'crou']];
      bits.forEach(function (b) { var x = cx + b[0] * S, y = cy + b[1] * S - S * 0.08; if (b[2] === 'tom') tom(x, y, S * 0.085); else if (b[2] === 'cuc') cuc(x, y, S * 0.09); else if (b[2] === 'feta') feta(x, y, S * 0.04); else crou(x, y, S * 0.04); });
      c.strokeStyle = '#a03a8a'; c.lineWidth = S * 0.014; for (var o = 0; o < 3; o++) { c.beginPath(); if (c.ellipse) c.ellipse(cx + (R() - 0.5) * S * 0.9, cy - S * 0.1 + (R() - 0.5) * ry * 0.6, S * 0.08, S * 0.05, R() * 3, 0, Math.PI * 1.2); c.stroke(); }
    },
    soup: function (c, cx, cy, S, R, k) {
      var ry = S * 0.32;
      bowl(c, cx, cy + S * 0.05, S * 0.88, ry, S * 0.6, k, '#2f5f9a', '#f2f0ea');
      var sy = cy + S * 0.07;
      fillE(c, cx, sy, S * 0.8, ry * 0.86, radG(c, cx - S * 0.2, sy - ry * 0.3, S * 0.9, [0, '#f27a3a', 0.6, '#e0582a', 1, '#b23a14']));
      c.save(); ellP(c, cx, sy, S * 0.8, ry * 0.86); c.clip();
      c.beginPath(); for (var i = 0; i < 70; i++) { var a = i * 0.32, r = S * 0.02 + i * S * 0.0045; var x = cx + S * 0.05 + Math.cos(a) * r, y = sy + Math.sin(a) * r * 0.42; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.lineWidth = S * 0.035; c.lineCap = 'round'; c.strokeStyle = 'rgba(255,248,236,0.95)'; c.stroke(); c.lineWidth = S * 0.012; c.strokeStyle = 'rgba(255,255,255,1)'; c.stroke();
      for (var h = 0; h < 30; h++) fillE(c, cx + (R() - 0.5) * S * 1.3, sy + (R() - 0.5) * ry * 1.2, S * 0.014, S * 0.009, h % 4 ? '#2f8a2a' : '#1a1a1a', R() * 3);
      [[-0.45, -0.05], [-0.3, 0.12], [0.45, -0.08]].forEach(function (p) { var x = cx + p[0] * S, y = sy + p[1] * S, r = S * 0.05; c.save(); softShadow(c, k, r * 0.4, r * 0.2, 0.3); c.beginPath(); rr(c, x - r, y - r, r * 2, r * 1.7, r * 0.3); c.fillStyle = linG(c, 0, y - r, 0, y + r, [0, '#f6cf70', 1, '#c07a2a']); c.fill(); c.restore(); });
      gloss(c, cx - S * 0.35, sy - ry * 0.4, S * 0.18, ry * 0.08, 0.35, -0.08);
      c.restore();
      c.lineCap = 'round';
      if (!FOOD_SIL) [[-0.25, 0], [0.05, 1], [0.32, 2]].forEach(function (p) {
        var x = cx + p[0] * S, y = sy - ry * 0.5;
        c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - S * 0.12, y - S * 0.18, x + S * 0.12, y - S * 0.3, x - S * 0.02, y - S * 0.5 - p[1] * S * 0.04);
        c.lineWidth = S * 0.05; c.strokeStyle = 'rgba(255,255,255,0.16)'; c.stroke(); c.lineWidth = S * 0.022; c.strokeStyle = 'rgba(255,255,255,0.28)'; c.stroke();
      });
    },
    generic: function (c, cx, cy, S, R, k) {
      plate(c, cx, cy + S * 0.12, S, S * 0.5, k);
      var stick = function (x, y, L2, rot) {
        c.save(); c.translate(x, y); c.rotate(rot);
        c.save(); softShadow(c, k, S * 0.05, S * 0.03, 0.4);
        c.beginPath(); c.moveTo(L2 * 0.25, -L2 * 0.06); c.lineTo(L2 * 0.62, -L2 * 0.04); c.lineTo(L2 * 0.62, L2 * 0.04); c.lineTo(L2 * 0.25, L2 * 0.06); c.closePath(); c.fillStyle = '#f2e6c8'; c.fill();
        fillE(c, L2 * 0.66, -L2 * 0.05, L2 * 0.06, L2 * 0.055, '#fbf2dc'); fillE(c, L2 * 0.66, L2 * 0.05, L2 * 0.06, L2 * 0.055, '#efe2c2');
        blobP(c, 0, 0, L2 * 0.38, L2 * 0.25, R, 11, 0.12); c.fillStyle = radG(c, -L2 * 0.1, -L2 * 0.1, L2 * 0.45, [0, '#f2b850', 0.6, '#d2862a', 1, '#9a5214']); c.fill(); c.restore();
        for (var i = 0; i < 46; i++) { var a = R() * 6.28, d = Math.sqrt(R()) * 0.9; fillE(c, Math.cos(a) * L2 * 0.34 * d, Math.sin(a) * L2 * 0.22 * d, L2 * 0.03, L2 * 0.022, R() < 0.55 ? 'rgba(255,214,120,0.85)' : 'rgba(130,64,12,0.7)', R() * 3); }
        gloss(c, -L2 * 0.14, -L2 * 0.12, L2 * 0.12, L2 * 0.05, 0.35, -0.2);
        c.restore();
      };
      stick(cx - S * 0.28, cy + S * 0.02, S * 0.95, -0.5); stick(cx + S * 0.25, cy - S * 0.08, S * 0.9, 0.35); stick(cx - S * 0.02, cy + S * 0.22, S * 0.95, 0.08);
      var lx = cx + S * 0.62, ly = cy + S * 0.18;
      c.beginPath(); c.moveTo(lx - S * 0.13, ly); c.quadraticCurveTo(lx, ly - S * 0.2, lx + S * 0.13, ly); c.closePath(); c.fillStyle = '#ffe14d'; c.fill(); c.lineWidth = S * 0.02; c.strokeStyle = '#f2c414'; c.stroke();
      c.beginPath(); c.moveTo(lx - S * 0.1, ly - S * 0.01); c.quadraticCurveTo(lx, ly - S * 0.15, lx + S * 0.1, ly - S * 0.01); c.closePath(); c.fillStyle = '#fff6b0'; c.fill();
      for (var p = 0; p < 7; p++) fillE(c, cx - S * 0.66 + (R() - 0.5) * S * 0.16, cy + S * 0.2 + (R() - 0.5) * S * 0.1, S * 0.035, S * 0.025, p % 2 ? '#3f9a2a' : '#5cbf3a', R() * 3);
    },
    ingredients: function (c, cx, cy, S, R, k) {
      bowl(c, cx - S * 0.45, cy - S * 0.05, S * 0.42, S * 0.15, S * 0.28, k, '#f4f4f0', '#e8e8e2');
      c.beginPath(); c.moveTo(cx - S * 0.8, cy - S * 0.06); c.bezierCurveTo(cx - S * 0.7, cy - S * 0.42, cx - S * 0.2, cy - S * 0.42, cx - S * 0.1, cy - S * 0.06); c.closePath(); c.fillStyle = radG(c, cx - S * 0.55, cy - S * 0.3, S * 0.45, [0, '#ffffff', 0.7, '#f4efe6', 1, '#dcd3c4']); c.fill(); for (var fl = 0; fl < 12; fl++) fillE(c, cx - S * 0.45 + (R() - 0.5) * S * 0.5, cy - S * 0.16 + (R() - 0.5) * S * 0.16, S * 0.02, S * 0.008, 'rgba(210,200,185,0.6)');
      var egg = function (x, y, r, rot) { c.save(); softShadow(c, k, r * 0.4, r * 0.2, 0.35); fillE(c, x, y, r * 0.78, r, radG(c, x - r * 0.3, y - r * 0.4, r * 1.4, [0, '#fff3e2', 0.6, '#e9c9a0', 1, '#c09068']), rot); c.restore(); gloss(c, x - r * 0.3, y - r * 0.45, r * 0.18, r * 0.12, 0.7, rot); };
      egg(cx + S * 0.18, cy - S * 0.08, S * 0.16, 0.5); egg(cx + S * 0.4, cy + S * 0.02, S * 0.16, 1.2);
      c.save(); softShadow(c, k, S * 0.05, S * 0.03, 0.35); c.beginPath(); rr(c, cx - S * 0.2, cy + S * 0.18, S * 0.42, S * 0.2, S * 0.03); c.fillStyle = '#f2cf6a'; c.fill(); c.restore();
      c.beginPath(); rr(c, cx - S * 0.2, cy + S * 0.14, S * 0.42, S * 0.12, S * 0.03); c.fillStyle = '#fff0b0'; c.fill(); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(cx - S * 0.12, cy + S * 0.16, S * 0.2, S * 0.02);
      for (var i = 0; i < 26; i++) { var dd = Math.sqrt(R()), aa = R() * 6.28, x = cx + S * 0.55 + Math.cos(aa) * dd * S * 0.2, y = cy + S * 0.3 + Math.sin(aa) * dd * S * 0.08 - (1 - dd) * S * 0.08; c.beginPath(); c.moveTo(x, y - S * 0.06); c.quadraticCurveTo(x + S * 0.05, y + S * 0.03, x, y + S * 0.03); c.quadraticCurveTo(x - S * 0.05, y + S * 0.03, x, y - S * 0.06); c.fillStyle = i % 3 ? '#3a1d10' : '#5a301a'; c.fill(); fillE(c, x - S * 0.012, y - S * 0.01, S * 0.008, S * 0.012, 'rgba(255,230,200,0.5)'); }
    }
  };
  /* draws the dish centred in [0,w]x[0,h]; k = device px per design px (for blur) */
  function drawFood(c, dish, w, h, k, seed) {
    var kind = foodKind(dish), S = Math.min(w * 0.46, h * 0.62), R = rng(seed || strHash(kind) + 3);
    c.save(); c.lineJoin = 'round';
    try { FOOD_DRAW[kind](c, w / 2, h * 0.5, S, R, k || 1); } finally { c.restore(); }
  }

  /* ------------------------------------------------------------------ boxes + hit test */
  function layerBox(design, L, images) {
    images = images || {};
    var t = L.type, w = 0, h = 0;
    if (t === 'text') { var tb = textBox(L); w = tb.w; h = tb.h; }
    else if (t === 'image') { var src = L.imageId ? images[L.imageId] : null; var fr = imageFrame(L, natSize(src) ? src : null); w = fr.w; h = fr.h; }
    else if (t === 'sticker') { var sd = stickerDims(L); w = sd.w; h = sd.h; }
    else if (t === 'emoji') { var sz = clamp(num(L.size, 120), 8, 1200); w = sz * 1.08; h = sz * 1.08; }
    else if (t === 'skin') { var ks = skinSpec(L, L.imageId ? images[L.imageId] : null); w = ks.w; h = ks.h; }
    return { x: num(L.x, W / 2), y: num(L.y, H / 2), w: w, h: h, rotation: num(L.rotation, 0) };
  }
  function hitTest(design, images, px, py) {
    var layers = (design && design.layers) || [];
    for (var i = layers.length - 1; i >= 0; i--) {
      var L = layers[i]; if (!L || L.hidden || L.locked) continue;
      var b = layerBox(design, L, images);
      var a = -b.rotation * DEG, dx = px - b.x, dy = py - b.y;
      var lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      var hw = Math.max(b.w, 44) / 2, hh = Math.max(b.h, 44) / 2;
      if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) return L.id;
    }
    return null;
  }

  /* ------------------------------------------------------------------ render */
  function drawCached(ctx, e, L, s, cur) {
    if (!e) return;
    var x = num(L.x, W / 2) * s, y = num(L.y, H / 2) * s, r = num(L.rotation, 0), m = (e.m || 1) * (e.w0 && cur ? cur / e.w0 : 1);
    if (Math.abs(m - 1) < 1e-6) m = 1;
    var op = clamp(num(L.opacity, 1), 0, 1); if (op <= 0) return;
    ctx.save();
    ctx.globalAlpha = op;
    if (Math.abs(r) < 0.01 && m === 1) { ctx.drawImage(e.canvas, Math.round(x - e.ax), Math.round(y - e.ay)); }
    else {
      ctx.translate(x, y); ctx.rotate(r * DEG);
      ctx.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(e.canvas, -e.ax * m, -e.ay * m, e.canvas.width * m, e.canvas.height * m);
    }
    ctx.restore();
  }
  function render(ctx, design, images, opts) {
    var wasExact = EXACT; settled = true;
    try { renderInner(ctx, design, images, opts); }
    finally { EXACT = wasExact; }
    return { settled: settled };
  }
  function renderInner(ctx, design, images, opts) {
    opts = opts || {}; images = images || {}; design = design || {};
    var s = num(opts.scale, 1); if (!(s > 0)) s = 1;
    if (opts.exact) EXACT = true;
    frame++;
    ctx.save();
    smooth(ctx, true);
    try { var bge = renderBackground(design, images, s); ctx.drawImage(bge.canvas, 0, 0, W * s, H * s); }
    catch (err) { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, W * s, H * s); if (window.console) console.warn('ThumbRender background failed', err); }
    var layers = design.layers || [];
    var bgo = obj(design.background), thm = design.theme === 'smp' ? 'smp' : 'cooking';
    var info = { theme: thm, bgScene: (bgo.kind === 'scene' || (bgo.kind === 'image' && !natSize(bgo.imageId ? images[bgo.imageId] : null))) ? (SCENE_BY[bgo.scene] ? bgo.scene : THEME_SCENE[thm]) : null };
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i]; if (!L || L.hidden) continue;
      try {
        var e = null, cur = 0;
        if (L.type === 'text') { e = renderText(L, s); cur = textMetricsOf(L).size; }
        else if (L.type === 'image') { e = renderImage(L, L.imageId ? images[L.imageId] : null, s, opts, info); cur = clamp(num(L.w, 400), 8, 6000); }
        else if (L.type === 'sticker') { e = renderSticker(L, s); cur = clamp(num(L.w, 200), 8, 6000); }
        else if (L.type === 'emoji') { e = renderEmoji(L, s); cur = clamp(num(L.size, 120), 8, 1200); }
        else if (L.type === 'skin') { e = renderSkin(L, L.imageId ? images[L.imageId] : null, s); cur = clamp(num(L.h, 520), 24, 3000); }
        drawCached(ctx, e, L, s, cur);
      } catch (err) { if (window.console) console.warn('ThumbRender layer failed', L && L.id, err); }
    }
    var mark = function (id, dashed) {
      for (var k = 0; k < layers.length; k++) if (layers[k] && layers[k].id === id && !layers[k].hidden) {
        var b = layerBox(design, layers[k], images);
        ctx.save(); ctx.translate(b.x * s, b.y * s); ctx.rotate(b.rotation * DEG);
        if (dashed && ctx.setLineDash) ctx.setLineDash([6, 5]);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.strokeRect(-b.w * s / 2, -b.h * s / 2, b.w * s, b.h * s);
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.strokeRect(-b.w * s / 2, -b.h * s / 2, b.w * s, b.h * s);
        ctx.restore(); return;
      }
    };
    if (opts.hoverId && opts.hoverId !== opts.selectedId) mark(opts.hoverId, true);
    if (opts.selectedId) mark(opts.selectedId, false);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ export */
  var MAX_BYTES = 2000000;
  function toBlobP(canvas, type, q) {
    return new Promise(function (res) {
      var fallback = function () {
        try {
          var url = canvas.toDataURL(type, q), b64 = url.split(',')[1], bin = atob(b64), arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          res(new Blob([arr], { type: type }));
        } catch (e) { res(null); }
      };
      if (canvas.toBlob) { try { canvas.toBlob(function (b) { if (b) res(b); else fallback(); }, type, q); } catch (e) { fallback(); } }
      else fallback();
    });
  }
  function exportBlob(design, images, o) {
    o = o || {}; var fmt = o.format || 'auto';
    return ensureFonts().then(function () {
      var C = mk(W, H), c = C.getContext('2d');
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      render(c, design, images, { scale: 1, placeholders: false, exact: true });
      var tryJpeg = function (qs, i) {
        return toBlobP(C, 'image/jpeg', qs[i]).then(function (b) {
          if (!b) throw new Error('Could not make the image');
          if (b.size <= MAX_BYTES || i === qs.length - 1) return { blob: b, ext: 'jpg', width: W, height: H, quality: qs[i] };
          return tryJpeg(qs, i + 1);
        });
      };
      var Q = [0.92, 0.88, 0.84, 0.8, 0.75, 0.7, 0.6, 0.5];
      var p = fmt === 'jpg' || fmt === 'jpeg' ? tryJpeg(Q, 0) : toBlobP(C, 'image/png').then(function (b) {
        if (b && (fmt === 'png' || b.size <= MAX_BYTES)) return { blob: b, ext: 'png', width: W, height: H };
        return tryJpeg(Q, 0);
      });
      return p.then(function (r) { free(C); return r; }, function (e) { free(C); throw e; });
    });
  }

  /* ------------------------------------------------------------------ layer factories + defaults */
  var DARK = '#111111';
  function txt(o) {
    return assign({ id: newId(), type: 'text', text: 'YOUR TEXT', font: 'anton', size: 120, lineHeight: 0.95, letterSpacing: 0, uppercase: true, align: 'center',
      x: 640, y: 360, rotation: 0, maxWidth: 0, opacity: 1,
      fill: { kind: 'solid', color: '#ffffff', color2: '#ffd60a' }, stroke: { width: 12, color: DARK },
      shadow: { blur: 18, color: 'rgba(0,0,0,0.55)', dx: 0, dy: 8 }, effect: 'none', effectColor: '#000000', box: { color: '#ffd60a', padding: 22, radius: 16 } }, o);
  }
  function img(o) {
    return assign({ id: newId(), type: 'image', imageId: null, x: 640, y: 360, w: 520, rotation: 0, flipX: false, opacity: 1, shape: 'none',
      outline: { width: 0, color: '#ffffff' }, glow: { size: 0, color: '#ffffff' }, shadow: { blur: 30, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 14 }, placeholder: 'Your photo' }, o);
  }
  function stk(id, o) {
    var m = STK_BY[id] || {};
    return assign({ id: newId(), type: 'sticker', sticker: id, x: 640, y: 360, w: 200, rotation: 0, flipX: false, opacity: 1, color: m.color || '#ff2d2d', outline: { width: 0, color: '#ffffff' } }, o);
  }
  function emo(ch, o) { return assign({ id: newId(), type: 'emoji', char: ch, x: 640, y: 360, size: 130, rotation: 0, opacity: 1 }, o); }
  function bgd(o) {
    return assign({ kind: 'scene', imageId: null, scene: null, color: '#1f1f1f', color2: '#3a3a3a', angle: 135, zoom: 1, fx: 0.5, fy: 0.5,
      brightness: 0, contrast: 0, saturation: 0, blur: 0, vignette: 0, tint: null, tintAmount: 0 }, o);
  }
  function design(theme, tpl, name, bg, layers) { return { v: 1, id: newId(), name: name, theme: theme, template: tpl, background: bgd(bg), layers: layers }; }

  function defaultsFor(type, theme) {
    var smp = theme === 'smp';
    if (type === 'text') {
      return smp
        ? txt({ text: 'YOUR TEXT', font: 'lilita', size: 120, lineHeight: 1, fill: { kind: 'solid', color: '#ffe100', color2: '#ff9d00' }, stroke: { width: 10, color: DARK }, shadow: { blur: 0, color: 'rgba(0,0,0,0)', dx: 0, dy: 0 }, effect: 'pixel', effectColor: '#000000', maxWidth: 1100 })
        : txt({ text: 'YOUR TEXT', font: 'anton', size: 130, fill: { kind: 'solid', color: '#ffffff', color2: '#ffd60a' }, stroke: { width: 13, color: DARK }, maxWidth: 1100 });
    }
    if (type === 'sticker') return smp ? stk('px-diamond', { w: 180 }) : stk('arrow-curved', { w: 240, color: '#ff2d2d' });
    if (type === 'emoji') return emo(smp ? '😱' : '🤤', { size: 140 });
    if (type === 'skin') return skn({ x: smp ? 1000 : 960, y: 430, h: 520, pose: 'stand', facing: 'left', glow: smp ? { size: 30, color: '#39ff5a' } : { size: 0, color: '#ffffff' } });
    if (type === 'image') {
      return smp
        ? img({ w: 520, shape: 'none', outline: { width: 8, color: '#ffffff' }, glow: { size: 30, color: '#39ff5a' }, shadow: { blur: 24, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 10 }, placeholder: 'Your photo' })
        : img({ w: 560, shape: 'none', outline: { width: 12, color: '#ffffff' }, shadow: { blur: 30, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 14 }, placeholder: 'Your photo' });
    }
    return null;
  }

  /* ------------------------------------------------------------------ templates (make({ me }) -> a finished, filled design) */
  var NOSH = { blur: 0, color: 'rgba(0,0,0,0)', dx: 0, dy: 0 };
  var SOFT = { blur: 18, color: 'rgba(0,0,0,0.6)', dx: 0, dy: 8 };
  function meOf(o) { var m = obj(o && o.me); return { skinId: m.skinId || null, faceId: m.faceId || null, dishId: m.dishId || null, shotId: m.shotId || null }; }
  function skn(o) {
    return assign({ id: newId(), type: 'skin', imageId: null, pose: 'stand', facing: 'left', x: 1000, y: 430, h: 520, rotation: 0, opacity: 1,
      outline: { width: 8, color: '#ffffff' }, glow: { size: 0, color: '#ffffff' }, shadow: { blur: 24, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 10 }, slotHint: 'your skin' }, o);
  }
  /* screenshot background when the owner gave one, else the scene (+ set-piece) */
  function shotBg(me, scene, setPiece, side) { return { kind: me.shotId ? 'image' : 'scene', imageId: me.shotId, scene: scene, setPiece: setPiece || null, setPieceSide: side || 'right', slotHint: 'your screenshot' }; }
  var TEMPLATES = [
    /* ---------------- Cooking ---------------- */
    { id: 'cook-hero', theme: 'cooking', name: 'Hero dish', blurb: 'Big food photo + two-line title', make: function (o) {
      var me = meOf(o);
      return design('cooking', 'cook-hero', 'Crispy chicken', { kind: 'scene', scene: 'kitchen-bokeh' }, [
        img({ x: 900, y: 430, w: 680, aspect: 1.05, shape: 'none', imageId: me.dishId, fill: 'food:fried chicken', placeholder: 'Your dish', slotHint: 'your dish', outline: { width: 10, color: '#ffffff' }, shadow: { blur: 40, color: 'rgba(0,0,0,0.6)', dx: 0, dy: 24 } }),
        txt({ text: 'CRISPY', font: 'anton', size: 140, x: 300, y: 180, rotation: -4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 14, color: DARK } }),
        txt({ text: 'CHICKEN', font: 'anton', size: 168, x: 318, y: 355, rotation: -4, fill: { kind: 'gradient', color: '#fff36b', color2: '#ffb000' }, stroke: { width: 15, color: DARK }, effect: 'extrude', effectColor: '#8a3b00', effectSize: 12 }),
        stk('arrow-curved', { x: 520, y: 575, w: 230, rotation: -20, color: '#ff2d2d', flipX: false }),
        emo('🤤', { x: 1160, y: 130, size: 150, rotation: 12 })
      ]);
    } },
    { id: 'cook-before-after', theme: 'cooking', name: 'Before → After', blurb: 'Raw ingredients vs the finished dish', make: function (o) {
      var me = meOf(o);
      return design('cooking', 'cook-before-after', 'Before and after', { kind: 'color', color: '#111111' }, [
        img({ x: 320, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'wood-board', fill: 'food:ingredients', placeholder: 'Raw ingredients', slotHint: 'your ingredients', shadow: NOSH }),
        img({ x: 960, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'kitchen-bokeh', imageId: me.dishId, fill: 'food:cookies', placeholder: 'Finished dish', slotHint: 'your finished dish', shadow: NOSH }),
        stk('divider', { x: 640, y: 360, w: 120, color: '#ffffff', shadow: SOFT }),
        txt({ text: 'BEFORE', font: 'archivo', size: 76, x: 245, y: 92, rotation: -3, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 0, color: DARK }, effect: 'box', box: { color: '#111111', padding: 20, radius: 10 }, shadow: SOFT }),
        txt({ text: 'AFTER', font: 'archivo', size: 76, x: 1050, y: 92, rotation: 3, fill: { kind: 'solid', color: '#111111' }, stroke: { width: 0, color: DARK }, effect: 'box', box: { color: '#ffd60a', padding: 20, radius: 10 }, shadow: SOFT }),
        stk('arrow-straight', { x: 650, y: 420, w: 250, color: '#ffd60a', rotation: -6 }),
        txt({ text: 'WORTH IT?', font: 'luckiest', size: 96, x: 660, y: 640, rotation: -2, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 12, color: DARK } })
      ]);
    } },
    { id: 'cook-ingredients', theme: 'cooking', name: 'Only 3 ingredients', blurb: 'Huge number badge + the dish', make: function (o) {
      var me = meOf(o);
      return design('cooking', 'cook-ingredients', '3 ingredient dessert', { kind: 'scene', scene: 'marble' }, [
        img({ x: 890, y: 400, w: 680, aspect: 1.05, shape: 'none', imageId: me.dishId, fill: 'food:pancakes', placeholder: 'Your dish', slotHint: 'your dish', outline: { width: 10, color: '#ffffff' }, shadow: { blur: 36, color: 'rgba(0,0,0,0.45)', dx: 0, dy: 22 } }),
        stk('burst', { x: 300, y: 300, w: 470, color: '#ffd60a', text: '', rotation: -8 }),
        txt({ text: '3', font: 'bowlby', size: 300, x: 300, y: 300, rotation: -8, fill: { kind: 'solid', color: '#e3121b' }, stroke: { width: 14, color: '#ffffff' }, effect: 'extrude', effectColor: '#7a0000', effectSize: 14, shadow: NOSH }),
        txt({ text: 'INGREDIENTS', font: 'anton', size: 92, x: 310, y: 585, rotation: -3, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 0, color: DARK }, effect: 'box', box: { color: '#e3121b', padding: 18, radius: 12 }, shadow: SOFT }),
        txt({ text: 'only', font: 'caveat', size: 100, uppercase: false, x: 150, y: 90, rotation: -10, fill: { kind: 'solid', color: '#111111' }, stroke: { width: 8, color: '#ffffff' }, shadow: NOSH })
      ]);
    } },
    { id: 'cook-quick', theme: 'cooking', name: 'Quick time', blurb: 'Clock badge "10 MIN" + big title', make: function (o) {
      var me = meOf(o);
      return design('cooking', 'cook-quick', '10 minute dinner', { kind: 'scene', scene: 'wood-board' }, [
        img({ x: 900, y: 410, w: 700, aspect: 1.05, shape: 'none', imageId: me.dishId, fill: 'food:pasta', placeholder: 'Your dish', slotHint: 'your dish', outline: { width: 10, color: '#ffffff' }, shadow: { blur: 36, color: 'rgba(0,0,0,0.55)', dx: 0, dy: 22 } }),
        stk('badge-time', { x: 270, y: 120, w: 420, color: '#ff3b30', text: '10 MIN', rotation: -5 }),
        txt({ text: 'EASY\nDINNER', font: 'bowlby', size: 118, lineHeight: 1, x: 305, y: 420, rotation: -4, fill: { kind: 'gradient', color: '#ffffff', color2: '#ffe27a' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#2a1300', effectSize: 10 }),
        stk('flame', { x: 1150, y: 120, w: 140, rotation: 10 })
      ]);
    } },
    { id: 'cook-taste', theme: 'cooking', name: 'Taste test', blurb: 'Your face + the dish + reaction', make: function (o) {
      var me = meOf(o), L = [];
      if (me.faceId) {
        L.push(img({ x: 330, y: 445, w: 560, aspect: 0.8, shape: 'none', imageId: me.faceId, placeholder: 'Your face', slotHint: 'your face', outline: { width: 12, color: '#ffffff' }, shadow: { blur: 30, color: 'rgba(0,0,0,0.45)', dx: 0, dy: 14 } }));
        L.push(img({ x: 945, y: 430, w: 440, shape: 'circle', imageId: me.dishId, fill: 'food:burger', placeholder: 'Your dish', slotHint: 'your dish', outline: { width: 14, color: '#ffffff' }, shadow: { blur: 30, color: 'rgba(0,0,0,0.45)', dx: 0, dy: 14 } }));
        L.push(stk('arrow-curved', { x: 650, y: 620, w: 200, rotation: -95, color: '#e3121b', flipX: true }));
        L.push(emo('😱', { x: 590, y: 220, size: 130, rotation: -12 }));
      } else {
        L.push(img({ x: 420, y: 410, w: 600, shape: 'circle', imageId: me.dishId, fill: 'food:burger', placeholder: 'Your dish', slotHint: 'your dish', outline: { width: 14, color: '#ffffff' }, shadow: { blur: 30, color: 'rgba(0,0,0,0.45)', dx: 0, dy: 14 } }));
        L.push(stk('arrow-curved', { x: 860, y: 470, w: 230, rotation: 10, color: '#e3121b', flipX: true }));
        L.push(emo('😱', { x: 1090, y: 520, size: 170, rotation: 10 }));
      }
      L.push(txt({ text: 'IS IT GOOD?!', font: 'luckiest', size: 118, x: 900, y: 118, rotation: 4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 14, color: DARK }, maxWidth: 700 }));
      return design('cooking', 'cook-taste', 'Taste test', { kind: 'scene', scene: 'color-pop' }, L);
    } },
    { id: 'cook-band', theme: 'cooking', name: 'Clean recipe title', blurb: 'Photo + bold title band + handwritten note', make: function (o) {
      var me = meOf(o), L = [];
      if (!me.dishId) L.push(img({ x: 760, y: 300, w: 660, aspect: 1.25, shape: 'none', fill: 'food:cookies', placeholder: 'Your dish', slotHint: 'your dish', outline: { width: 0, color: '#ffffff' }, shadow: { blur: 30, color: 'rgba(0,0,0,0.45)', dx: 0, dy: 16 } }));
      L.push(txt({ text: 'CHOC CHIP COOKIES', font: 'archivo', size: 92, x: 640, y: 590, maxWidth: 1180, fill: { kind: 'solid', color: '#111111' }, stroke: { width: 0, color: DARK }, effect: 'box', box: { color: '#ffd60a', padding: 26, radius: 6 }, rotation: -2, shadow: { blur: 24, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 10 } }));
      L.push(txt({ text: 'the best ones ever', font: 'caveat', size: 92, uppercase: false, x: 300, y: 450, rotation: -5, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 9, color: DARK }, shadow: SOFT }));
      L.push(stk('sparkles', { x: 1130, y: 120, w: 170, color: '#ffe14d', rotation: 8 }));
      L.push(stk('heart', { x: 1170, y: 440, w: 120, rotation: 14, color: '#ff2d55' }));
      return design('cooking', 'cook-band', 'Choc chip cookies', { kind: me.dishId ? 'image' : 'scene', imageId: me.dishId, scene: 'wood-board', slotHint: 'your food photo' }, L);
    } },
    { id: 'cook-vs', theme: 'cooking', name: 'Cheap vs Fancy', blurb: '$5 vs $50 split with price tags', make: function () {
      return design('cooking', 'cook-vs', 'Cheap vs fancy', { kind: 'color', color: '#111111' }, [
        img({ x: 320, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'wood-board', fill: 'food:burger', placeholder: 'Cheap version', slotHint: 'the cheap one', shadow: NOSH }),
        img({ x: 960, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'marble', fill: 'food:burger', placeholder: 'Fancy version', slotHint: 'the fancy one', shadow: NOSH }),
        stk('divider', { x: 640, y: 360, w: 120, color: '#ffd60a', shadow: SOFT }),
        txt({ text: '$5', font: 'bowlby', size: 170, x: 190, y: 130, rotation: -7, fill: { kind: 'gradient', color: '#7dff6b', color2: '#18b34a' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#0a4d1b', effectSize: 10 }),
        txt({ text: '$50', font: 'bowlby', size: 170, x: 1080, y: 130, rotation: 6, fill: { kind: 'gradient', color: '#fff36b', color2: '#ffb000' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#7a3b00', effectSize: 10 }),
        txt({ text: 'VS', font: 'luckiest', size: 150, x: 640, y: 410, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 16, color: '#e3121b' }, shadow: { blur: 20, color: 'rgba(0,0,0,0.7)', dx: 0, dy: 8 } }),
        stk('check', { x: 1150, y: 600, w: 130, rotation: 6 })
      ]);
    } },
    /* ---------------- Donut SMP ---------------- */
    { id: 'smp-money', theme: 'smp', name: 'Big money', blurb: '"$10,000,000" + title + your skin', make: function (o) {
      var me = meOf(o);
      return design('smp', 'smp-money', 'Big money', shotBg(me, 'blocky-day', 'stash-chests', 'center'), [
        skn({ x: 1070, y: 440, h: 580, pose: 'stand', facing: 'left', imageId: me.skinId, glow: { size: 34, color: '#39ff5a' } }),
        stk('px-money', { x: 140, y: 610, w: 210, rotation: -10 }),
        txt({ text: '$10,000,000', font: 'lilita', size: 128, x: 450, y: 330, rotation: -4, maxWidth: 1100, fill: { kind: 'gradient', color: '#9dff7a', color2: '#1fbf3a' }, stroke: { width: 13, color: '#04260c' }, effect: 'extrude', effectColor: '#0a5a1c', effectSize: 13, shadow: { blur: 24, color: 'rgba(0,0,0,0.55)', dx: 0, dy: 10 } }),
        txt({ text: 'IN ONE DAY', font: 'pixelify', size: 92, x: 380, y: 140, rotation: -2, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 9, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 8, shadow: NOSH })
      ]);
    } },
    { id: 'smp-days', theme: 'smp', name: 'Day 1 vs Day 100', blurb: 'Two screenshots, before vs after', make: function () {
      return design('smp', 'smp-days', 'Day 1 vs Day 100', { kind: 'color', color: '#0a0a0a' }, [
        img({ x: 320, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'blocky-night', fill: 'scene:blocky-night:dirt-hut', placeholder: 'Day 1 screenshot', slotHint: 'your day 1 screenshot', shadow: NOSH }),
        img({ x: 960, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'blocky-day', fill: 'scene:blocky-day:base-house', placeholder: 'Day 100 screenshot', slotHint: 'your day 100 screenshot', shadow: NOSH }),
        stk('divider', { x: 640, y: 360, w: 116, color: '#ffffff', shadow: SOFT }),
        txt({ text: 'DAY 1', font: 'lilita', size: 140, x: 260, y: 120, rotation: -4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 12, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 10, shadow: NOSH }),
        txt({ text: 'DAY 100', font: 'lilita', size: 136, x: 980, y: 120, rotation: 3, fill: { kind: 'gradient', color: '#fff36b', color2: '#ffb000' }, stroke: { width: 12, color: DARK }, effect: 'extrude', effectColor: '#7a3b00', effectSize: 11, shadow: NOSH }),
        stk('px-arrow', { x: 640, y: 560, w: 200, color: '#ff2a2a', rotation: -8 }),
        stk('px-crown', { x: 1150, y: 600, w: 150, rotation: 10 })
      ]);
    } },
    { id: 'smp-base', theme: 'smp', name: 'Base reveal', blurb: 'Screenshot + red circle + arrow', make: function (o) {
      var me = meOf(o);
      return design('smp', 'smp-base', 'My base', shotBg(me, 'blocky-day', 'base-house', 'right'), [
        stk('circle-ring', { x: 900, y: 420, w: 520, color: '#ff2d2d', rotation: -6 }),
        stk('arrow-curved', { x: 560, y: 380, w: 230, color: '#ff2d2d', rotation: 10 }),
        skn({ x: 180, y: 520, h: 400, pose: 'point', facing: 'right', imageId: me.skinId }),
        txt({ text: 'MY SECRET\nBASE', font: 'lilita', size: 122, lineHeight: 0.98, x: 380, y: 170, rotation: -4, fill: { kind: 'solid', color: '#ffe100' }, stroke: { width: 12, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 11, shadow: NOSH }),
        stk('px-diamond', { x: 400, y: 640, w: 120, rotation: 8 })
      ]);
    } },
    { id: 'smp-shocked', theme: 'smp', name: 'Shocked reaction', blurb: 'Your face/skin + huge text', make: function (o) {
      var me = meOf(o);
      return design('smp', 'smp-shocked', 'I got trapped', shotBg(me, 'nether', 'trap-lava', 'right'), [
        skn({ x: 300, y: 430, h: 600, pose: 'shock', facing: 'right', imageId: me.skinId, outline: { width: 9, color: '#ffffff' }, glow: { size: 40, color: '#ff3b1f' } }),
        txt({ text: 'I GOT', font: 'luckiest', size: 120, x: 905, y: 130, rotation: 4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 13, color: DARK }, shadow: { blur: 20, color: 'rgba(0,0,0,0.6)', dx: 0, dy: 8 } }),
        txt({ text: 'TRAPPED', font: 'luckiest', size: 165, x: 900, y: 290, rotation: 4, fill: { kind: 'gradient', color: '#ff5a4a', color2: '#c40000' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#3a0000', effectSize: 12 }),
        stk('px-alert', { x: 1180, y: 600, w: 110, rotation: 12, color: '#ff2a2a' }),
        emo('😱', { x: 590, y: 150, size: 120, rotation: -10 })
      ]);
    } },
    { id: 'smp-rank', theme: 'smp', name: '#1 Top rank', blurb: 'Gold "#1" + crown + title', make: function (o) {
      var me = meOf(o);
      return design('smp', 'smp-rank', 'Richest player', shotBg(me, 'blocky-night', null), [
        skn({ x: 1000, y: 440, h: 590, pose: 'stand', facing: 'left', imageId: me.skinId, glow: { size: 36, color: '#ffd21f' } }),
        txt({ text: '#1', font: 'bungee', size: 300, x: 300, y: 300, rotation: -6, fill: { kind: 'gradient', color: '#fff36b', color2: '#ff9d00' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#7a3b00', effectSize: 18, shadow: { blur: 30, color: 'rgba(0,0,0,0.6)', dx: 0, dy: 12 } }),
        stk('px-crown', { x: 250, y: 105, w: 200, rotation: -12 }),
        txt({ text: 'RICHEST PLAYER', font: 'pixelify', size: 84, x: 360, y: 575, maxWidth: 640, rotation: -3, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 8, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 7, shadow: NOSH })
      ]);
    } },
    { id: 'smp-vs', theme: 'smp', name: 'VS / PvP', blurb: 'Two players, slanted split, giant VS', make: function (o) {
      var me = meOf(o);
      return design('smp', 'smp-vs', 'PvP fight', { kind: 'color', color: '#0a0a0a' }, [
        img({ x: 320, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'nether', fill: 'scene:nether', placeholder: 'Player 1', slotHint: 'a screenshot', shadow: NOSH }),
        img({ x: 960, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'blocky-night', fill: 'scene:blocky-night', placeholder: 'Player 2', slotHint: 'a screenshot', shadow: NOSH }),
        skn({ x: 300, y: 450, h: 520, pose: 'point', facing: 'right', imageId: me.skinId, glow: { size: 30, color: '#ff3b1f' } }),
        skn({ x: 980, y: 450, h: 520, pose: 'point', facing: 'left', variant: 'rival', slotHint: 'the other player', glow: { size: 30, color: '#3fa0ff' } }),
        stk('divider', { x: 640, y: 360, w: 120, color: '#ffffff', shadow: SOFT }),
        stk('px-sword', { x: 640, y: 360, w: 330, rotation: 0 }),
        stk('px-sword', { x: 640, y: 360, w: 330, rotation: 0, flipX: true }),
        txt({ text: 'VS', font: 'bungee', size: 230, x: 640, y: 380, rotation: -6, fill: { kind: 'gradient', color: '#fff36b', color2: '#ff7a00' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#5a1d00', effectSize: 14, shadow: { blur: 30, color: 'rgba(0,0,0,0.7)', dx: 0, dy: 12 } }),
        txt({ text: '1V1 FOR $1M', font: 'pixelify', size: 76, x: 640, y: 655, fill: { kind: 'solid', color: '#7dff6b' }, stroke: { width: 8, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 7, shadow: NOSH })
      ]);
    } },
    { id: 'smp-trap', theme: 'smp', name: 'Trap reveal', blurb: 'Screenshot of the trap + arrow + "I TRAPPED HIM"', make: function (o) {
      var me = meOf(o);
      return design('smp', 'smp-trap', 'Trap base', shotBg(me, 'cave', 'trap-lava', 'right'), [
        stk('circle-ring', { x: 920, y: 470, w: 460, color: '#ff2d2d', rotation: 8 }),
        stk('arrow-curved', { x: 590, y: 470, w: 220, color: '#ff2d2d', rotation: 30 }),
        skn({ x: 175, y: 520, h: 390, pose: 'point', facing: 'right', imageId: me.skinId }),
        txt({ text: 'I TRAPPED\nHIM', font: 'lilita', size: 130, lineHeight: 0.98, x: 330, y: 190, rotation: -4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 12, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 11, shadow: NOSH }),
        txt({ text: '+$250M', font: 'lilita', size: 110, x: 1050, y: 110, rotation: 5, fill: { kind: 'gradient', color: '#9dff7a', color2: '#1fbf3a' }, stroke: { width: 11, color: '#04260c' }, effect: 'extrude', effectColor: '#0a5a1c', effectSize: 10, shadow: NOSH }),
        stk('px-skull', { x: 400, y: 630, w: 100, rotation: 10 })
      ]);
    } },
    { id: 'smp-0to1b', theme: 'smp', name: '$0 → $1B', blurb: 'The money jump: red $0 to green $1B', make: function (o) {
      var me = meOf(o);
      return design('smp', 'smp-0to1b', '$0 to $1B', shotBg(me, 'blocky-sunset', null), [
        skn({ x: 1060, y: 450, h: 560, pose: 'stand', facing: 'left', imageId: me.skinId, glow: { size: 30, color: '#ffd21f' } }),
        txt({ text: '$0', font: 'lilita', size: 190, x: 170, y: 250, rotation: -6, fill: { kind: 'gradient', color: '#ff6a5a', color2: '#d10000' }, stroke: { width: 13, color: DARK }, effect: 'extrude', effectColor: '#3a0000', effectSize: 12, shadow: NOSH }),
        stk('px-arrow', { x: 385, y: 270, w: 170, color: '#ffffff', rotation: -4 }),
        txt({ text: '$1B', font: 'lilita', size: 230, x: 640, y: 270, rotation: -4, fill: { kind: 'gradient', color: '#9dff7a', color2: '#1fbf3a' }, stroke: { width: 14, color: '#04260c' }, effect: 'extrude', effectColor: '#0a5a1c', effectSize: 15, shadow: { blur: 26, color: 'rgba(0,0,0,0.55)', dx: 0, dy: 10 } }),
        txt({ text: 'TRAPPING ONLY', font: 'pixelify', size: 78, x: 420, y: 520, rotation: -2, fill: { kind: 'solid', color: '#ffe100' }, stroke: { width: 8, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 7, shadow: NOSH }),
        stk('px-money', { x: 180, y: 620, w: 170, rotation: -8 }),
        stk('px-gold', { x: 640, y: 640, w: 150, rotation: 6 })
      ]);
    } }
  ];

  /* ------------------------------------------------------------------ extras for UI (sticker sheet / scene previews) */
  function drawSticker(ctx, id, x, y, w, color, extra) {
    var L = assign({ type: 'sticker', sticker: id, x: 0, y: 0, w: w, color: color }, extra || {});
    var e = renderSticker(L, 1); var m = (e.m || 1) * (e.w0 ? w / e.w0 : 1);
    ctx.drawImage(e.canvas, x - e.ax * m, y - e.ay * m, e.canvas.width * m, e.canvas.height * m);
  }

  window.ThumbRender = {
    version: 1,
    W: W, H: H,
    themes: [{ id: 'cooking', name: 'Cooking' }, { id: 'smp', name: 'Donut SMP' }],
    fonts: FONTS.map(function (f) { return { id: f.id, label: f.label, family: f.family, weight: f.weight, css: f.css, themes: f.themes.slice() }; }),
    fontsCssUrl: fontsCssUrl,
    ensureFonts: ensureFonts,
    templates: TEMPLATES,
    stickers: STICKERS,
    scenes: SCENES.map(function (s) { return { id: s.id, name: s.name, themes: s.themes.slice() }; }),
    defaultScene: function (theme) { return THEME_SCENE[theme === 'smp' ? 'smp' : 'cooking']; },
    /* "Make it pop" background preset (merge into design.background) */
    pop: { brightness: 0.06, contrast: 0.22, saturation: 0.35, vignette: 0.35 },
    newId: newId,
    render: render,
    layerBox: layerBox,
    hitTest: hitTest,
    exportBlob: exportBlob,
    foods: FOODS.slice(),
    foodKind: foodKind,
    drawFood: function (ctx, dish, x, y, w, h) { ctx.save(); ctx.translate(x - w / 2, y - h / 2); drawFood(ctx, dish, w, h, 1); ctx.restore(); },
    defaultsFor: defaultsFor,
    clearCache: clearCache,
    invalidate: invalidate,
    sceneCanvas: sceneCanvas,
    drawSticker: drawSticker,
    isSkinTexture: isSkinTexture,
    setPieces: SETPIECE_IDS.map(function (id) { return { id: id, name: SETPIECES[id].name }; }),
    renderSkinPreview: renderSkinPreview,
    _stats: function () { return { entries: cache.size, megapixels: +(cachePx / 1e6).toFixed(2), fontEpoch: fontEpoch }; }
  };
})();
