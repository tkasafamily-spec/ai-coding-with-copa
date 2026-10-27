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
  function drawChip(c, label, cx, cy, size) {
    var t = '+ ' + String(label || 'Add photo');
    c.save();
    c.font = '700 ' + size + 'px ' + UI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    var tw = c.measureText(t).width, pw = tw + size * 1.4, ph = size * 1.9;
    c.fillStyle = 'rgba(12,12,14,0.72)'; c.beginPath(); rr(c, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2); c.fill();
    c.lineWidth = Math.max(1, size * 0.09); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.stroke();
    c.fillStyle = '#ffffff'; c.fillText(t, cx, cy + size * 0.04);
    c.restore();
  }
  function drawPlaceholderArt(c, kind, shape, w, h, label, hasScene) {
    var m = Math.min(w, h);
    if (shape === 'circle' && kind === 'plate' && !hasScene) {
      var pg = c.createLinearGradient(0, 0, w, h); pg.addColorStop(0, '#c98a4f'); pg.addColorStop(1, '#8a5528');
      c.fillStyle = pg; shapePath(c, 'circle', 0, 0, w, h, 0); c.fill();
      c.save(); c.translate(w * 0.06, h * 0.06); c.scale(0.88, 0.88); drawPlaceholderArt(c, 'plate', 'none', w, h, label, false); c.restore();
      return;
    }
    if (shape !== 'none') {
      if (!hasScene) {
        shapePath(c, shape, 0, 0, w, h, 0);
        var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(40,40,46,0.55)'); g.addColorStop(1, 'rgba(10,10,14,0.65)');
        c.fillStyle = g; c.fill();
        c.save(); shapePath(c, shape, 0, 0, w, h, -m * 0.035); c.setLineDash && c.setLineDash([m * 0.05, m * 0.035]);
        c.lineWidth = Math.max(2, m * 0.012); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.stroke(); c.restore();
        // small photo icon
        var s = m * 0.22, ix = w / 2 - s / 2, iy = h / 2 - s * 0.75;
        c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); rr(c, ix, iy, s, s * 0.78, s * 0.12); c.fill();
        c.fillStyle = 'rgba(30,30,36,0.9)'; c.beginPath(); c.moveTo(ix + s * 0.12, iy + s * 0.66); c.lineTo(ix + s * 0.4, iy + s * 0.32); c.lineTo(ix + s * 0.6, iy + s * 0.52); c.lineTo(ix + s * 0.72, iy + s * 0.42); c.lineTo(ix + s * 0.9, iy + s * 0.66); c.closePath(); c.fill();
        c.beginPath(); c.arc(ix + s * 0.72, iy + s * 0.22, s * 0.08, 0, 7); c.fill();
      }
      drawChip(c, label, w / 2, hasScene ? h / 2 : h / 2 + m * 0.2, clamp(m * 0.075, 14, 40));
      return;
    }
    if (kind === 'person') {
      var g2 = c.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#f4f4f4'); g2.addColorStop(1, '#c9c9cf');
      c.fillStyle = g2;
      var hr = Math.min(w * 0.27, h * 0.2);
      c.beginPath(); c.arc(w * 0.5, h * 0.33, hr, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(w * 0.04, h); c.bezierCurveTo(w * 0.04, h * 0.66, w * 0.25, h * 0.57, w * 0.5, h * 0.57); c.bezierCurveTo(w * 0.75, h * 0.57, w * 0.96, h * 0.66, w * 0.96, h); c.closePath(); c.fill();
      drawChip(c, label, w / 2, h * 0.8, clamp(m * 0.075, 14, 40));
    } else if (kind === 'plate') {
      var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.48;
      c.fillStyle = '#fbfbfb'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      var g3 = c.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r * 0.72);
      g3.addColorStop(0, '#ffffff'); g3.addColorStop(1, '#e1e1e4');
      c.fillStyle = g3; c.beginPath(); c.arc(cx, cy, r * 0.7, 0, Math.PI * 2); c.fill();
      c.lineWidth = r * 0.03; c.strokeStyle = 'rgba(0,0,0,0.08)'; c.stroke();
      drawChip(c, label, cx, cy, clamp(m * 0.075, 14, 40));
    } else {
      c.fillStyle = 'rgba(20,20,26,0.5)'; c.beginPath(); rr(c, 0, 0, w, h, m * 0.06); c.fill();
      c.save(); c.beginPath(); rr(c, m * 0.03, m * 0.03, w - m * 0.06, h - m * 0.06, m * 0.04);
      c.setLineDash && c.setLineDash([m * 0.05, m * 0.035]); c.lineWidth = Math.max(2, m * 0.012); c.strokeStyle = 'rgba(255,255,255,0.75)'; c.stroke(); c.restore();
      drawChip(c, label, w / 2, h / 2, clamp(m * 0.075, 14, 40));
    }
  }
  function strHash(t) { var h = 7; t = String(t || ''); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return Math.abs(h); }
  function autoScene(L, info) {
    var list = info.theme === 'smp' ? ['blocky-day', 'blocky-sunset', 'cave'] : ['wood-board', 'marble', 'gingham'];
    list = list.filter(function (x) { return x !== info.bgScene; }).slice(0, 2);
    return list[strHash(L.placeholder) % list.length];
  }
  function renderImage(L, src, s, placeholders, info) {
    var n = natSize(src);
    info = info || { theme: 'cooking', bgScene: null };
    var fr = imageFrame(L, n ? src : null), w = fr.w, h = fr.h, shape = fr.shape;
    var ol = obj(L.outline), ow = clamp(num(ol.width, 0), 0, 60), oc = str(ol.color, '#ffffff');
    var gl = obj(L.glow), glow = { size: clamp(num(gl.size, 0), 0, 120), color: str(gl.color, '#ffffff') };
    var sh = shadowOf(L.shadow);
    var sceneId = !n && L.scene && SCENE_BY[L.scene] ? L.scene : null;
    if (!n && !sceneId && !placeholders) return null;
    var phk = phKind(L.placeholder), autoPlate = false;
    if (!n && !sceneId && placeholders && shape !== 'none' && phk !== 'person') { sceneId = autoScene(L, info); autoPlate = info.theme !== 'smp'; }
    var tail = [n ? tokenOf(src) : 'ph:' + (sceneId || '') + ':' + autoPlate + ':' + (placeholders ? 1 : 0) + ':' + str(L.placeholder), (w / h).toFixed(4), shape, !!L.flipX,
      num(L.fx, 0.5), num(L.fy, 0.5), num(L.zoom, 1), ow, oc, glow.size, glow.color, sh.on ? [sh.blur, sh.dx, sh.dy, sh.color].join(',') : '', s.toFixed(3)].join('|');
    var hit = lookup(L, 'I|' + w.toFixed(2) + '|' + tail, 'Iq|' + quantPx(w * s).toFixed(2) + '|' + tail); if (hit) return hit;
    var key = storeKey;
    if (!n && !sceneId) { ow = Math.min(ow, 10); }
    var pad = fxPad(ow, glow.size, sh), dw = w + 2 * pad, dh = h + 2 * pad;
    var es = safeScale(s, dw, dh), cw = Math.ceil(dw * es), ch = Math.ceil(dh * es);
    var I = mk(cw, ch), c = I.getContext('2d');
    c.setTransform(es, 0, 0, es, pad * es, pad * es);
    smooth(c, true);
    var cut = shape === 'none';
    if (L.flipX) { c.translate(w, 0); c.scale(-1, 1); }
    if (n) {
      if (cut) c.drawImage(src, 0, 0, w, h);
      else { c.save(); shapePath(c, shape, 0, 0, w, h, 0); c.clip(); coverDraw(c, src, n, L.fx, L.fy, L.zoom, 0, 0, w, h); c.restore(); }
    } else {
      if (sceneId) {
        var sc = sceneCanvas(sceneId);
        c.save(); shapePath(c, cut ? 'square' : shape, 0, 0, w, h, 0); c.clip(); coverDraw(c, sc, { w: W, h: H }, L.fx, L.fy, L.zoom, 0, 0, w, h);
        c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, w, h); c.restore();
      }
      if (L.flipX) { c.setTransform(es, 0, 0, es, pad * es, pad * es); }
      if (autoPlate) {
        var pm = Math.min(w, h) * 0.84;
        c.save(); shapePath(c, shape, 0, 0, w, h, 0); c.clip(); c.translate((w - pm) / 2, (h - pm) / 2);
        c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = pm * 0.06 * es; c.shadowOffsetY = pm * 0.03 * es;
        c.fillStyle = '#fbfbfb'; c.beginPath(); c.arc(pm / 2, pm / 2, pm * 0.48, 0, Math.PI * 2); c.fill(); c.shadowColor = 'rgba(0,0,0,0)';
        drawPlaceholderArt(c, 'plate', 'none', pm, pm, str(L.placeholder, 'Your photo'), false); c.restore();
      } else if (placeholders) drawPlaceholderArt(c, phk, sceneId && cut ? 'square' : shape, w, h, str(L.placeholder, 'Your photo'), !!sceneId);
    }
    var sil = null;
    if (ow > 0) {
      if (cut && (n || !sceneId)) sil = dilate(I, ow * es, oc, false);
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
      num(bg.brightness, 0), num(bg.contrast, 0), num(bg.saturation, 0), num(bg.blur, 0), num(bg.vignette, 0), bg.tint || '', num(bg.tintAmount, 0), theme, s.toFixed(3)].join('|');
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

  /* ------------------------------------------------------------------ boxes + hit test */
  function layerBox(design, L, images) {
    images = images || {};
    var t = L.type, w = 0, h = 0;
    if (t === 'text') { var tb = textBox(L); w = tb.w; h = tb.h; }
    else if (t === 'image') { var src = L.imageId ? images[L.imageId] : null; var fr = imageFrame(L, natSize(src) ? src : null); w = fr.w; h = fr.h; }
    else if (t === 'sticker') { var sd = stickerDims(L); w = sd.w; h = sd.h; }
    else if (t === 'emoji') { var sz = clamp(num(L.size, 120), 8, 1200); w = sz * 1.08; h = sz * 1.08; }
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
  // Where the empty background's "+ Add …" chip goes: the spot (bottom, middle, top, then the sides)
  // that covers the least text, then the fewest cut-outs and stickers, so it never hides a subline or the face box's own chip.
  function bgChipSpot(design, layers, images, label, size) {
    var c = measureCtx(); c.font = '700 ' + size + 'px ' + UI_FONT;
    var pw = c.measureText('+ ' + String(label)).width + size * 1.4, ph = size * 1.9, boxes = [];
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i]; if (!L || L.hidden) continue;
      if (L.type === 'image' && L.imageId && L.shape !== 'none') continue; // a filled photo box can take a chip on top
      var b = layerBox(design, L, images), a = num(b.rotation, 0) * DEG, cs = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a));
      var hw = (b.w * cs + b.h * sn) / 2, hh = (b.w * sn + b.h * cs) / 2;
      boxes.push({ x0: b.x - hw, x1: b.x + hw, y0: b.y - hh, y1: b.y + hh, k: L.type === 'text' ? 1 : L.type === 'image' ? 0.6 : 0.4 });
    }
    var best = null, half = pw / 2 + 16;
    [[W / 2, H - 46], [W / 2, H / 2], [W / 2, 46], [half, H - 46], [W - half, H - 46], [half, H / 2], [W - half, H / 2], [half, 46], [W - half, 46]].forEach(function (p) {
      var x0 = p[0] - pw / 2 - 12, x1 = p[0] + pw / 2 + 12, y0 = p[1] - ph / 2 - 12, y1 = p[1] + ph / 2 + 12, cost = 0;
      boxes.forEach(function (q) { var w = Math.min(x1, q.x1) - Math.max(x0, q.x0), h = Math.min(y1, q.y1) - Math.max(y0, q.y0); if (w > 0 && h > 0) cost += w * h * q.k; });
      if (!best || cost < best.cost - 1) best = { x: p[0], y: p[1], cost: cost };
    });
    return best;
  }
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
    var ph = opts.placeholders !== false;
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
        else if (L.type === 'image') { e = renderImage(L, L.imageId ? images[L.imageId] : null, s, ph, info); cur = clamp(num(L.w, 400), 8, 6000); }
        else if (L.type === 'sticker') { e = renderSticker(L, s); cur = clamp(num(L.w, 200), 8, 6000); }
        else if (L.type === 'emoji') { e = renderEmoji(L, s); cur = clamp(num(L.size, 120), 8, 1200); }
        drawCached(ctx, e, L, s, cur);
      } catch (err) { if (window.console) console.warn('ThumbRender layer failed', L && L.id, err); }
    }
    var bg = obj(design.background);
    if (ph && bg.kind === 'image' && !natSize(bg.imageId ? images[bg.imageId] : null) && bg.placeholder) {
      var spot = bgChipSpot(design, layers, images, bg.placeholder, 26);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save(); ctx.scale(s, s); drawChip(ctx, bg.placeholder, spot.x, spot.y, 26); ctx.restore();
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
    if (type === 'image') {
      return smp
        ? img({ w: 520, shape: 'none', outline: { width: 8, color: '#ffffff' }, glow: { size: 30, color: '#39ff5a' }, shadow: { blur: 24, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 10 }, placeholder: 'Your photo' })
        : img({ w: 560, shape: 'none', outline: { width: 12, color: '#ffffff' }, shadow: { blur: 30, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 14 }, placeholder: 'Your photo' });
    }
    return null;
  }

  /* ------------------------------------------------------------------ templates */
  var NOSH = { blur: 0, color: 'rgba(0,0,0,0)', dx: 0, dy: 0 };
  var SOFT = { blur: 18, color: 'rgba(0,0,0,0.6)', dx: 0, dy: 8 };
  var TEMPLATES = [
    /* ---------------- Cooking ---------------- */
    { id: 'cook-hero', theme: 'cooking', name: 'Hero dish', blurb: 'Big food photo + two-line title', make: function () {
      return design('cooking', 'cook-hero', 'Crispy chicken', { kind: 'scene', scene: 'kitchen-bokeh' }, [
        img({ x: 900, y: 430, w: 680, aspect: 1.05, shape: 'none', placeholder: 'Your dish', outline: { width: 10, color: '#ffffff' }, shadow: { blur: 40, color: 'rgba(0,0,0,0.6)', dx: 0, dy: 24 } }),
        txt({ text: 'CRISPY', font: 'anton', size: 140, x: 300, y: 180, rotation: -4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 14, color: DARK } }),
        txt({ text: 'CHICKEN', font: 'anton', size: 168, x: 318, y: 355, rotation: -4, fill: { kind: 'gradient', color: '#fff36b', color2: '#ffb000' }, stroke: { width: 15, color: DARK }, effect: 'extrude', effectColor: '#8a3b00', effectSize: 12 }),
        stk('arrow-curved', { x: 520, y: 575, w: 230, rotation: -20, color: '#ff2d2d', flipX: false }),
        emo('🤤', { x: 1160, y: 130, size: 150, rotation: 12 })
      ]);
    } },
    { id: 'cook-before-after', theme: 'cooking', name: 'Before → After', blurb: 'Raw ingredients vs the finished dish', make: function () {
      return design('cooking', 'cook-before-after', 'Before and after', { kind: 'color', color: '#111111' }, [
        img({ x: 320, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'wood-board', placeholder: 'Raw ingredients', shadow: NOSH }),
        img({ x: 960, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'kitchen-bokeh', placeholder: 'Finished dish', shadow: NOSH }),
        stk('divider', { x: 640, y: 360, w: 120, color: '#ffffff', shadow: SOFT }),
        txt({ text: 'BEFORE', font: 'archivo', size: 76, x: 245, y: 92, rotation: -3, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 0, color: DARK }, effect: 'box', box: { color: '#111111', padding: 20, radius: 10 }, shadow: SOFT }),
        txt({ text: 'AFTER', font: 'archivo', size: 76, x: 1050, y: 92, rotation: 3, fill: { kind: 'solid', color: '#111111' }, stroke: { width: 0, color: DARK }, effect: 'box', box: { color: '#ffd60a', padding: 20, radius: 10 }, shadow: SOFT }),
        stk('arrow-straight', { x: 650, y: 420, w: 250, color: '#ffd60a', rotation: -6 }),
        txt({ text: 'WORTH IT?', font: 'luckiest', size: 96, x: 660, y: 640, rotation: -2, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 12, color: DARK } })
      ]);
    } },
    { id: 'cook-ingredients', theme: 'cooking', name: 'Only 3 ingredients', blurb: 'Huge number badge + the dish', make: function () {
      return design('cooking', 'cook-ingredients', '3 ingredient dessert', { kind: 'scene', scene: 'marble' }, [
        img({ x: 890, y: 400, w: 680, aspect: 1.05, shape: 'none', placeholder: 'Your dish', shadow: { blur: 36, color: 'rgba(0,0,0,0.45)', dx: 0, dy: 22 } }),
        stk('burst', { x: 300, y: 300, w: 470, color: '#ffd60a', text: '', rotation: -8 }),
        txt({ text: '3', font: 'bowlby', size: 300, x: 300, y: 300, rotation: -8, fill: { kind: 'solid', color: '#e3121b' }, stroke: { width: 14, color: '#ffffff' }, effect: 'extrude', effectColor: '#7a0000', effectSize: 14, shadow: NOSH }),
        txt({ text: 'INGREDIENTS', font: 'anton', size: 92, x: 310, y: 585, rotation: -3, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 0, color: DARK }, effect: 'box', box: { color: '#e3121b', padding: 18, radius: 12 }, shadow: SOFT }),
        txt({ text: 'only', font: 'caveat', size: 100, uppercase: false, x: 150, y: 90, rotation: -10, fill: { kind: 'solid', color: '#111111' }, stroke: { width: 8, color: '#ffffff' }, shadow: NOSH })
      ]);
    } },
    { id: 'cook-quick', theme: 'cooking', name: 'Quick time', blurb: 'Clock badge "10 MIN" + big title', make: function () {
      return design('cooking', 'cook-quick', '10 minute dinner', { kind: 'scene', scene: 'wood-board' }, [
        img({ x: 900, y: 410, w: 700, aspect: 1.05, shape: 'none', placeholder: 'Your dish', shadow: { blur: 36, color: 'rgba(0,0,0,0.55)', dx: 0, dy: 22 } }),
        stk('badge-time', { x: 270, y: 120, w: 420, color: '#ff3b30', text: '10 MIN', rotation: -5 }),
        txt({ text: 'EASY\nDINNER', font: 'bowlby', size: 118, lineHeight: 1, x: 305, y: 420, rotation: -4, fill: { kind: 'gradient', color: '#ffffff', color2: '#ffe27a' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#2a1300', effectSize: 10 }),
        stk('flame', { x: 1150, y: 120, w: 140, rotation: 10 })
      ]);
    } },
    { id: 'cook-taste', theme: 'cooking', name: 'Taste test', blurb: 'Your face + the dish + reaction', make: function () {
      return design('cooking', 'cook-taste', 'Taste test', { kind: 'scene', scene: 'color-pop' }, [
        img({ x: 330, y: 445, w: 560, aspect: 0.8, shape: 'none', placeholder: 'Your face', outline: { width: 12, color: '#ffffff' }, shadow: { blur: 30, color: 'rgba(0,0,0,0.45)', dx: 0, dy: 14 } }),
        img({ x: 945, y: 430, w: 440, shape: 'circle', placeholder: 'Your dish', outline: { width: 14, color: '#ffffff' }, shadow: { blur: 30, color: 'rgba(0,0,0,0.45)', dx: 0, dy: 14 } }),
        txt({ text: 'IS IT GOOD?!', font: 'luckiest', size: 118, x: 900, y: 118, rotation: 4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 14, color: DARK }, maxWidth: 700 }),
        stk('arrow-curved', { x: 650, y: 620, w: 200, rotation: -95, color: '#e3121b', flipX: true }),
        emo('😱', { x: 590, y: 220, size: 130, rotation: -12 })
      ]);
    } },
    { id: 'cook-band', theme: 'cooking', name: 'Clean recipe title', blurb: 'Photo + bold title band + handwritten note', make: function () {
      return design('cooking', 'cook-band', 'Choc chip cookies', { kind: 'image', imageId: null, scene: 'kitchen-bokeh', placeholder: 'Add your food photo (Background)' }, [
        txt({ text: 'CHOC CHIP COOKIES', font: 'archivo', size: 92, x: 640, y: 590, maxWidth: 1180, fill: { kind: 'solid', color: '#111111' }, stroke: { width: 0, color: DARK }, effect: 'box', box: { color: '#ffd60a', padding: 26, radius: 6 }, rotation: -2, shadow: { blur: 24, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 10 } }),
        txt({ text: 'the best ones ever', font: 'caveat', size: 92, uppercase: false, x: 340, y: 470, rotation: -5, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 9, color: DARK }, shadow: SOFT }),
        stk('sparkles', { x: 1110, y: 140, w: 170, color: '#ffe14d', rotation: 8 }),
        stk('heart', { x: 1170, y: 470, w: 120, rotation: 14, color: '#ff2d55' })
      ]);
    } },
    { id: 'cook-vs', theme: 'cooking', name: 'Cheap vs Fancy', blurb: '$5 vs $50 split with price tags', make: function () {
      return design('cooking', 'cook-vs', 'Cheap vs fancy', { kind: 'color', color: '#111111' }, [
        img({ x: 320, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'wood-board', placeholder: 'Cheap version', shadow: NOSH }),
        img({ x: 960, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'marble', placeholder: 'Fancy version', shadow: NOSH }),
        stk('divider', { x: 640, y: 360, w: 120, color: '#ffd60a', shadow: SOFT }),
        txt({ text: '$5', font: 'bowlby', size: 170, x: 190, y: 130, rotation: -7, fill: { kind: 'gradient', color: '#7dff6b', color2: '#18b34a' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#0a4d1b', effectSize: 10 }),
        txt({ text: '$50', font: 'bowlby', size: 170, x: 1080, y: 130, rotation: 6, fill: { kind: 'gradient', color: '#fff36b', color2: '#ffb000' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#7a3b00', effectSize: 10 }),
        txt({ text: 'VS', font: 'luckiest', size: 150, x: 640, y: 410, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 16, color: '#e3121b' }, shadow: { blur: 20, color: 'rgba(0,0,0,0.7)', dx: 0, dy: 8 } }),
        stk('check', { x: 1150, y: 600, w: 130, rotation: 6 })
      ]);
    } },
    /* ---------------- Donut SMP ---------------- */
    { id: 'smp-money', theme: 'smp', name: 'Big money', blurb: '"$10,000,000" + title + your skin', make: function () {
      return design('smp', 'smp-money', 'Big money', { kind: 'scene', scene: 'blocky-day' }, [
        img({ x: 1065, y: 455, w: 420, aspect: 0.8, shape: 'none', placeholder: 'Your face / skin', outline: { width: 8, color: '#ffffff' }, glow: { size: 34, color: '#39ff5a' }, shadow: { blur: 24, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 10 } }),
        stk('px-money', { x: 140, y: 600, w: 210, rotation: -10 }),
        stk('px-moneybag', { x: 720, y: 600, w: 170, rotation: 8 }),
        txt({ text: '$10,000,000', font: 'lilita', size: 128, x: 450, y: 330, rotation: -4, maxWidth: 1100, fill: { kind: 'gradient', color: '#9dff7a', color2: '#1fbf3a' }, stroke: { width: 13, color: '#04260c' }, effect: 'extrude', effectColor: '#0a5a1c', effectSize: 13, shadow: { blur: 24, color: 'rgba(0,0,0,0.55)', dx: 0, dy: 10 } }),
        txt({ text: 'IN ONE DAY', font: 'pixelify', size: 92, x: 380, y: 140, rotation: -2, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 9, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 8, shadow: NOSH }),
        stk('px-coin', { x: 560, y: 520, w: 90, rotation: 12, shadow: undefined })
      ]);
    } },
    { id: 'smp-days', theme: 'smp', name: 'Day 1 vs Day 100', blurb: 'Two screenshots, before vs after', make: function () {
      return design('smp', 'smp-days', 'Day 1 vs Day 100', { kind: 'color', color: '#0a0a0a' }, [
        img({ x: 320, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'blocky-night', placeholder: 'Day 1 screenshot', shadow: NOSH }),
        img({ x: 960, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'blocky-day', placeholder: 'Day 100 screenshot', shadow: NOSH }),
        stk('divider', { x: 640, y: 360, w: 116, color: '#ffffff', shadow: SOFT }),
        txt({ text: 'DAY 1', font: 'lilita', size: 140, x: 260, y: 120, rotation: -4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 12, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 10, shadow: NOSH }),
        txt({ text: 'DAY 100', font: 'lilita', size: 136, x: 980, y: 120, rotation: 3, fill: { kind: 'gradient', color: '#fff36b', color2: '#ffb000' }, stroke: { width: 12, color: DARK }, effect: 'extrude', effectColor: '#7a3b00', effectSize: 11, shadow: NOSH }),
        stk('px-arrow', { x: 640, y: 560, w: 200, color: '#ff2a2a', rotation: -8 }),
        stk('px-crown', { x: 1150, y: 600, w: 150, rotation: 10 })
      ]);
    } },
    { id: 'smp-base', theme: 'smp', name: 'Base reveal', blurb: 'Screenshot + red circle + arrow', make: function () {
      return design('smp', 'smp-base', 'My base', { kind: 'image', imageId: null, scene: 'blocky-day', placeholder: 'Add your screenshot (Background)' }, [
        stk('circle-ring', { x: 880, y: 400, w: 420, color: '#ff2d2d', rotation: -6 }),
        stk('arrow-curved', { x: 560, y: 360, w: 230, color: '#ff2d2d', rotation: 10 }),
        txt({ text: 'MY SECRET\nBASE', font: 'lilita', size: 122, lineHeight: 0.98, x: 360, y: 190, rotation: -4, fill: { kind: 'solid', color: '#ffe100' }, stroke: { width: 12, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 11, shadow: NOSH }),
        stk('px-chest', { x: 175, y: 590, w: 170, rotation: -8 }),
        stk('px-diamond', { x: 330, y: 610, w: 120, rotation: 8 })
      ]);
    } },
    { id: 'smp-shocked', theme: 'smp', name: 'Shocked reaction', blurb: 'Your face/skin + huge text', make: function () {
      return design('smp', 'smp-shocked', 'I got trapped', { kind: 'scene', scene: 'nether' }, [
        img({ x: 330, y: 450, w: 580, aspect: 0.8, shape: 'none', placeholder: 'Your face / skin', outline: { width: 9, color: '#ffffff' }, glow: { size: 40, color: '#ff3b1f' }, shadow: { blur: 24, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 10 } }),
        txt({ text: 'I GOT', font: 'luckiest', size: 120, x: 905, y: 175, rotation: 4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 13, color: DARK }, shadow: { blur: 20, color: 'rgba(0,0,0,0.6)', dx: 0, dy: 8 } }),
        txt({ text: 'TRAPPED', font: 'luckiest', size: 165, x: 900, y: 345, rotation: 4, fill: { kind: 'gradient', color: '#ff5a4a', color2: '#c40000' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#3a0000', effectSize: 12 }),
        stk('px-alert', { x: 1150, y: 560, w: 120, rotation: 12, color: '#ff2a2a' }),
        stk('px-trap', { x: 820, y: 580, w: 150, rotation: -8 }),
        emo('😱', { x: 600, y: 160, size: 120, rotation: -10 })
      ]);
    } },
    { id: 'smp-rank', theme: 'smp', name: '#1 Top rank', blurb: 'Gold "#1" + crown + title', make: function () {
      return design('smp', 'smp-rank', 'Richest player', { kind: 'scene', scene: 'blocky-night' }, [
        img({ x: 1000, y: 455, w: 500, aspect: 0.8, shape: 'none', placeholder: 'Your face / skin', outline: { width: 8, color: '#ffffff' }, glow: { size: 36, color: '#ffd21f' }, shadow: { blur: 24, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 10 } }),
        txt({ text: '#1', font: 'bungee', size: 300, x: 300, y: 300, rotation: -6, fill: { kind: 'gradient', color: '#fff36b', color2: '#ff9d00' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#7a3b00', effectSize: 18, shadow: { blur: 30, color: 'rgba(0,0,0,0.6)', dx: 0, dy: 12 } }),
        stk('px-crown', { x: 250, y: 105, w: 200, rotation: -12 }),
        txt({ text: 'RICHEST PLAYER', font: 'pixelify', size: 84, x: 360, y: 575, maxWidth: 640, rotation: -3, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 8, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 7, shadow: NOSH })
      ]);
    } },
    { id: 'smp-vs', theme: 'smp', name: 'VS / PvP', blurb: 'Two players, slanted split, giant VS', make: function () {
      return design('smp', 'smp-vs', 'PvP fight', { kind: 'color', color: '#0a0a0a' }, [
        img({ x: 320, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'nether', placeholder: 'Player 1', shadow: NOSH }),
        img({ x: 960, y: 360, w: 640, aspect: 640 / 720, shape: 'square', scene: 'blocky-night', placeholder: 'Player 2', shadow: NOSH }),
        stk('divider', { x: 640, y: 360, w: 120, color: '#ffffff', shadow: SOFT }),
        stk('px-sword', { x: 640, y: 360, w: 330, rotation: 0 }),
        stk('px-sword', { x: 640, y: 360, w: 330, rotation: 0, flipX: true }),
        txt({ text: 'VS', font: 'bungee', size: 230, x: 640, y: 380, rotation: -6, fill: { kind: 'gradient', color: '#fff36b', color2: '#ff7a00' }, stroke: { width: 14, color: DARK }, effect: 'extrude', effectColor: '#5a1d00', effectSize: 14, shadow: { blur: 30, color: 'rgba(0,0,0,0.7)', dx: 0, dy: 12 } }),
        txt({ text: '1V1 FOR $1M', font: 'pixelify', size: 76, x: 640, y: 640, fill: { kind: 'solid', color: '#7dff6b' }, stroke: { width: 8, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 7, shadow: NOSH })
      ]);
    } },
    { id: 'smp-trap', theme: 'smp', name: 'Trap reveal', blurb: 'Screenshot of the trap + arrow + "I TRAPPED HIM"', make: function () {
      return design('smp', 'smp-trap', 'Trap base', { kind: 'image', imageId: null, scene: 'cave', placeholder: 'Add your trap screenshot (Background)' }, [
        stk('circle-ring', { x: 900, y: 450, w: 380, color: '#ff2d2d', rotation: 8 }),
        stk('arrow-curved', { x: 600, y: 470, w: 220, color: '#ff2d2d', rotation: 30 }),
        txt({ text: 'I TRAPPED\nHIM', font: 'lilita', size: 130, lineHeight: 0.98, x: 320, y: 220, rotation: -4, fill: { kind: 'solid', color: '#ffffff' }, stroke: { width: 12, color: DARK }, effect: 'pixel', effectColor: '#000000', effectSize: 11, shadow: NOSH }),
        txt({ text: '+$250M', font: 'lilita', size: 110, x: 1050, y: 120, rotation: 5, fill: { kind: 'gradient', color: '#9dff7a', color2: '#1fbf3a' }, stroke: { width: 11, color: '#04260c' }, effect: 'extrude', effectColor: '#0a5a1c', effectSize: 10, shadow: NOSH }),
        stk('px-trap', { x: 210, y: 560, w: 160, rotation: -8 }),
        stk('px-skull', { x: 375, y: 600, w: 100, rotation: 10 })
      ]);
    } },
    { id: 'smp-0to1b', theme: 'smp', name: '$0 → $1B', blurb: 'The money jump: red $0 to green $1B', make: function () {
      return design('smp', 'smp-0to1b', '$0 to $1B', { kind: 'scene', scene: 'blocky-sunset' }, [
        img({ x: 1040, y: 470, w: 440, aspect: 0.8, shape: 'none', placeholder: 'Your face / skin', outline: { width: 8, color: '#ffffff' }, glow: { size: 30, color: '#ffd21f' }, shadow: { blur: 24, color: 'rgba(0,0,0,0.5)', dx: 0, dy: 10 } }),
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
    defaultsFor: defaultsFor,
    clearCache: clearCache,
    invalidate: invalidate,
    sceneCanvas: sceneCanvas,
    drawSticker: drawSticker,
    _stats: function () { return { entries: cache.size, megapixels: +(cachePx / 1e6).toFixed(2), fontEpoch: fontEpoch }; }
  };
})();
