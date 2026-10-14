/* Digital Quest Studio – Oszilloskop-Fenster (Stufe 1)
 * Mehrere, frei platzierbar (Titelleiste ziehen) und in der Grösse veraenderbar (Ecke unten rechts), jedes mit eigenen Kanaelen.
 * Signal hinzufuegen: Werkzeug «Messen», dann Anschluss oder Bauteil im Schaltplan anklicken. Die Kurve schreibt fortlaufend mit.
 * Zeitbasis und Amplitude stellen sich selbst ein (Auto), von Hand umschaltbar. Messcursor: Δt, ΔU, 1/Δt; «τ bestimmen» legt die
 * Cursor auf Start und 63,2 % der letzten Lade-/Entladekurve. Eigene Komponente (kein Teil von bench.js, das zum Spiel gehoert). */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E;
  var COLORS = ['#0b6e94', '#d9480f', '#11864f', '#7b3fb5', '#b8860b', '#c2255c', '#2b6cb0', '#6b7a00'];
  var NICE = [1, 2, 5];
  var $ = function (s, el) { return (el || document).querySelector(s); };

  function niceUp(x) { // naechster Wert der 1-2-5-Reihe >= x
    if (!(x > 0)) return 1; var e = Math.pow(10, Math.floor(Math.log10(x) + 1e-12));
    for (var i = 0; i < 3; i++) if (NICE[i] * e >= x * 0.9999) return NICE[i] * e;
    return 10 * e;
  }
  function niceStep(range, divs) { return niceUp(range / divs); }
  function fmtV(v, unit) { return E.fmt(v, unit || 'V'); }
  var SPAN_LIST = []; (function () { for (var e = -8; e <= 3; e++) NICE.forEach(function (m) { SPAN_LIST.push(m * Math.pow(10, e)); }); })();
  var VDIV_LIST = []; (function () { for (var e = -3; e <= 2; e++) NICE.forEach(function (m) { VDIV_LIST.push(m * Math.pow(10, e)); }); })();

  /* ---------- Hilfsfunktionen auf Aufzeichnungen ---------- */
  /* Periode eines Signals aus steigenden Durchgaengen durch die Mitte (Schmitt-Trigger), null wenn keine drei */
  function estPeriod(tr) {
    var n = tr.n; if (n < 20) return null;
    var i0 = Math.max(0, n - 30000), mn = Infinity, mx = -Infinity, i;
    for (i = i0; i < n; i++) { var v = tr.v[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    var amp = mx - mn; if (!(amp > 1e-9)) return null;
    var lo = mn + 0.35 * amp, hi = mn + 0.65 * amp, below = tr.v[i0] < lo, ups = [];
    for (i = i0 + 1; i < n; i++) {
      var y = tr.v[i];
      if (y < lo) below = true;
      else if (y > hi && below) { below = false; var y0 = tr.v[i - 1], t0 = tr.t[i - 1], mid = mn + 0.5 * amp; ups.push(y > y0 && y0 < mid ? t0 + (mid - y0) / (y - y0) * (tr.t[i] - t0) : tr.t[i]); }
    }
    if (ups.length < 3) return null;
    return (ups[ups.length - 1] - ups[0]) / (ups.length - 1);
  }

  /* τ aus der groessten monotonen Lade-/Entladekurve im Fenster [t0, t1] (Kanal tr): Start = Ende des ruhigen Anfangswerts,
   * Ziel = 63,2 % des Hubs. Gibt {ta, tb, ya, yb, tau} oder null. */
  function tauFit(tr, t0, t1) {
    var i0 = tr.lower(t0), i1 = Math.min(tr.n - 1, tr.lower(t1)); if (i1 - i0 < 20) return null;
    var mn = Infinity, mx = -Infinity, i; for (i = i0; i <= i1; i++) { if (tr.v[i] < mn) mn = tr.v[i]; if (tr.v[i] > mx) mx = tr.v[i]; }
    var rng = mx - mn; if (!(rng > 1e-9)) return null;
    // Extrema mit Schwelle 10 % des Hubs (Hysterese)
    var ext = [], dir = 0, cand = i0, thr = 0.1 * rng;
    for (i = i0 + 1; i <= i1; i++) {
      var y = tr.v[i];
      if (dir >= 0 && y > tr.v[cand]) { cand = i; if (dir === 0 && y - tr.v[i0] > thr) dir = 1; }
      else if (dir <= 0 && y < tr.v[cand]) { cand = i; if (dir === 0 && tr.v[i0] - y > thr) dir = -1; }
      if (dir === 1 && tr.v[cand] - y > thr) { ext.push(cand); dir = -1; cand = i; }
      else if (dir === -1 && y - tr.v[cand] > thr) { ext.push(cand); dir = 1; cand = i; }
    }
    ext.push(cand);
    var best = null;
    for (var k = 1; k < ext.length; k++) { var d = Math.abs(tr.v[ext[k]] - tr.v[ext[k - 1]]); if (d > 0.3 * rng && (!best || d >= best.d * 0.98)) best = { a: ext[k - 1], b: ext[k], d: d }; }
    if (!best) return null;
    var ya = tr.v[best.a], yb = tr.v[best.b], dy = yb - ya, ja = best.a;
    for (i = best.a; i < best.b; i++) { if (Math.abs(tr.v[i] - ya) < 0.005 * Math.abs(dy)) ja = i; else break; } // letzter Wert noch auf dem Anfangswert
    var target = ya + (1 - Math.exp(-1)) * dy, tc = null;
    for (i = ja; i < best.b; i++) {
      var a = tr.v[i] - target, b2 = tr.v[i + 1] - target;
      if (a === 0) { tc = tr.t[i]; break; } if (a * b2 < 0) { tc = tr.t[i] + (tr.t[i + 1] - tr.t[i]) * (-a) / (b2 - a); break; }
    }
    if (tc === null) return null;
    return { ta: tr.t[ja], tb: tc, ya: ya, yb: yb, tau: tc - tr.t[ja] };
  }
  S.estPeriod = estPeriod; S.tauFit = tauFit;

  /* ---------- Fenster ---------- */
  var count = 0, active = null;
  function Scope() {
    var self = this; this.id = ++count; this.ch = []; this.auto = true; this.spanMan = null; this.vdiv = null; this.frozen = null;
    this.cur = { on: false, x1: null, x2: null }; this.cls = {}; this.autoSpan = null; this.autoAt = -1e9; this.version = -1; this.fit = null;
    var el = this.el = document.createElement('div'); el.className = 'fwin'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Oszilloskop ' + this.id);
    var k = S.scopes.length, W = Math.min(560, root.innerWidth - 16), x = Math.max(8, root.innerWidth - W - 330 - 24 * k), y = 150 + 28 * k;
    if (root.innerWidth <= 900) { x = 8 + 10 * k; y = 120 + 20 * k; }
    el.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + W + 'px;height:430px';
    el.innerHTML = '<div class="fh"><b>Oszilloskop ' + this.id + '</b><button data-a="close" title="Fenster schliessen" aria-label="Schliessen">×</button></div>' +
      '<div class="fb"><canvas></canvas><div class="sc-read" hidden></div><div class="sc-chs"></div>' +
      '<div class="sc-bar"><label>Zeit <select data-a="span"></select></label><label>Höhe <select data-a="vdiv"></select></label>' +
      '<button data-a="freeze" title="Anzeige anhalten, die Simulation läuft weiter">⏸ Anhalten</button><button data-a="cursor" title="Messcursor ein/aus (hält die Anzeige an)">↔ Cursor</button><button data-a="tau" title="Zeitkonstante τ der letzten Lade-/Entladekurve bestimmen">τ bestimmen</button></div></div>';
    $('#floats').appendChild(el);
    this.cv = $('canvas', el); this.ctx = this.cv.getContext('2d');
    var ss = $('[data-a="span"]', el); ss.innerHTML = '<option value="auto">Zeit: Auto</option>' + SPAN_LIST.map(function (s) { return '<option value="' + s + '">' + S.fmtT(s / 10).replace(/\.0+ /, ' ') + '/Div</option>'; }).join('');
    var vs = $('[data-a="vdiv"]', el); vs.innerHTML = '<option value="auto">Höhe: Auto</option>' + VDIV_LIST.map(function (s) { return '<option value="' + s + '">' + fmtV(s, 'V') + '/Div</option>'; }).join('');
    el.addEventListener('pointerdown', function () { setActive(self); });
    el.addEventListener('change', function (ev) {
      var a = ev.target.dataset.a;
      if (a === 'span') { self.spanMan = ev.target.value === 'auto' ? null : +ev.target.value; self.dirty(); }
      if (a === 'vdiv') { self.vdiv = ev.target.value === 'auto' ? null : +ev.target.value; self.cls = {}; self.dirty(); }
    });
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a;
      if (a === 'close') self.close();
      else if (a === 'freeze') self.setFrozen(!self.frozen);
      else if (a === 'cursor') self.setCursors(!self.cur.on);
      else if (a === 'tau') self.tau();
      else if (a === 'rm') { self.removeChannel(+b.dataset.i); }
    });
    // Fenster verschieben (Titelleiste), auch mit Finger
    var drag = null, fh = $('.fh', el);
    fh.addEventListener('pointerdown', function (ev) { if (ev.target.closest('button')) return; drag = { x: ev.clientX - el.offsetLeft, y: ev.clientY - el.offsetTop }; fh.setPointerCapture(ev.pointerId); });
    fh.addEventListener('pointermove', function (ev) { if (!drag) return; el.style.left = Math.max(-200, Math.min(root.innerWidth - 60, ev.clientX - drag.x)) + 'px'; el.style.top = Math.max(0, Math.min(root.innerHeight - 40, ev.clientY - drag.y)) + 'px'; });
    fh.addEventListener('pointerup', function () { drag = null; });
    // Cursor ziehen
    var cd = null;
    this.cv.addEventListener('pointerdown', function (ev) {
      if (!self.cur.on || !self.geom) return;
      var r = self.cv.getBoundingClientRect(), x = ev.clientX - r.left, g = self.geom, px1 = self.tx(self.cur.x1), px2 = self.tx(self.cur.x2);
      cd = Math.abs(x - px1) <= Math.abs(x - px2) ? 'x1' : 'x2'; self.cur[cd] = self.xt(x); self.cv.setPointerCapture(ev.pointerId); self.dirty();
    });
    this.cv.addEventListener('pointermove', function (ev) { if (!cd) return; var r = self.cv.getBoundingClientRect(); self.cur[cd] = self.xt(ev.clientX - r.left); self.dirty(); });
    this.cv.addEventListener('pointerup', function () { cd = null; });
    if (root.ResizeObserver) new ResizeObserver(function () { self.dirty(); }).observe(this.cv);
    S.scopes.push(this); setActive(this); this.renderChannels();
  }
  function setActive(sc) { active = sc; S.scopes.forEach(function (s) { s.el.style.borderColor = s === sc ? '#0b6e94' : ''; s.el.style.zIndex = s === sc ? 2 : 1; }); }
  S.activeScope = function () { return active; };

  Scope.prototype.dirty = function () { this.version = -1; };
  Scope.prototype.close = function () {
    var self = this; this.ch.forEach(function (c) { S.sim.removeTrace(c.tr); });
    this.el.remove(); S.scopes = S.scopes.filter(function (s) { return s !== self; }); if (active === this) active = S.scopes[S.scopes.length - 1] || null;
  };
  Scope.prototype.addChannel = function (desc) {
    if (this.ch.some(function (c) { return JSON.stringify(c.tr.desc) === JSON.stringify(desc); })) return null;
    var tr = S.sim.addTrace(desc), used = this.ch.map(function (c) { return c.color; });
    var color = COLORS.filter(function (c) { return used.indexOf(c) < 0; })[0] || COLORS[this.ch.length % COLORS.length];
    var c = { tr: tr, color: color }; this.ch.push(c); this.cls = {}; this.renderChannels(); this.dirty(); return c;
  };
  Scope.prototype.removeChannel = function (i) { var c = this.ch.splice(i, 1)[0]; if (c) S.sim.removeTrace(c.tr); this.cls = {}; this.renderChannels(); this.dirty(); };
  Scope.prototype.renderChannels = function () {
    var h = this.ch.map(function (c, i) { return '<span class="sc-ch"><i style="background:' + c.color + '"></i>' + c.tr.label + '<button data-a="rm" data-i="' + i + '" aria-label="Kanal entfernen" title="Kanal entfernen">×</button></span>'; }).join('');
    $('.sc-chs', this.el).innerHTML = h || '<span class="sc-empty">Kein Signal. Werkzeug «Messen» wählen und im Schaltplan einen Anschluss oder ein Bauteil anklicken.</span>';
  };
  Scope.prototype.setFrozen = function (on) {
    this.frozen = on ? { tEnd: S.sim.state.t } : null; var b = $('[data-a="freeze"]', this.el); b.classList.toggle('on', !!on); b.textContent = on ? '▶ Weiter' : '⏸ Anhalten';
    if (!on) this.setCursors(false); this.dirty();
  };
  Scope.prototype.setCursors = function (on) {
    this.cur.on = on; $('.sc-read', this.el).hidden = !on; $('[data-a="cursor"]', this.el).classList.toggle('on', on);
    if (on) { if (!this.frozen) this.setFrozen(true); if (this.cur.x1 === null && this.geom) { this.cur.x1 = this.geom.t0 + (this.geom.t1 - this.geom.t0) / 3; this.cur.x2 = this.geom.t0 + 2 * (this.geom.t1 - this.geom.t0) / 3; } }
    this.dirty();
  };
  Scope.prototype.tx = function (t) { var g = this.geom; return g.l + (t - g.t0) / (g.t1 - g.t0) * g.w; };
  Scope.prototype.xt = function (x) { var g = this.geom; return g.t0 + (x - g.l) / g.w * (g.t1 - g.t0); };
  /* τ bestimmen: Cursor auf Start und 63,2 % des ersten sichtbaren Kanals */
  Scope.prototype.tau = function () {
    if (!this.ch.length) return null; if (!this.frozen) this.setFrozen(true);
    this.draw(true); var g = this.geom, r = tauFit(this.ch[0].tr, g.t0, g.t1);
    if (!r) { this.note = 'Keine Lade- oder Entladekurve im Fenster gefunden'; this.dirty(); return null; }
    this.note = null; this.cur.on = true; this.cur.x1 = r.ta; this.cur.x2 = r.tb; $('.sc-read', this.el).hidden = false; $('[data-a="cursor"]', this.el).classList.add('on');
    this.tauResult = r; this.dirty(); return r;
  };

  /* Zeitbasis (Dauer des ganzen Bildes in s) */
  Scope.prototype.span = function () {
    if (this.spanMan) return this.spanMan;
    var now = performance.now();
    if (now - this.autoAt > 300 || this.autoSpan === null) {
      this.autoAt = now; var best = 0, any = false;
      this.ch.forEach(function (c) { var p = estPeriod(c.tr); if (p) { any = true; best = Math.max(best, p); } });
      var want = any ? 4 * best : (S.sim.span || null);
      if (!want) want = Math.max(S.sim.state.t * 1.15, 20 * S.sim.dt);
      var sn = SPAN_LIST.filter(function (s) { return s >= want * 0.9999; })[0] || SPAN_LIST[SPAN_LIST.length - 1];
      if (this.autoSpan === null || sn !== this.autoSpan) this.autoSpan = sn;
    }
    return this.autoSpan;
  };
  Scope.prototype.version_ = function () { return S.sim.version; };

  Scope.prototype.draw = function (force) {
    var cv = this.cv, dpr = root.devicePixelRatio || 1, W = Math.max(50, cv.clientWidth), H = Math.max(50, cv.clientHeight);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var ctx = this.ctx, sim = S.sim; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var units = []; this.ch.forEach(function (c) { if (units.indexOf(c.tr.unit) < 0) units.push(c.tr.unit); });
    var g = this.geom = { l: 58, r: W - (units.length > 1 ? 58 : 12), t: 10, b: H - 24 }; g.w = g.r - g.l; g.h = g.b - g.t;
    var span = this.span(), tEnd = this.frozen ? this.frozen.tEnd : sim.state.t, t0 = tEnd > span ? tEnd - span : 0; g.t0 = t0; g.t1 = t0 + span;
    // Zeitgitter
    ctx.font = '11px ' + getComputedStyle(document.body).getPropertyValue('--font-mono'); ctx.textBaseline = 'top';
    ctx.strokeStyle = '#e2eef0'; ctx.lineWidth = 1; ctx.fillStyle = '#5b6b73'; ctx.textAlign = 'center';
    for (var i = 0; i <= 10; i++) {
      var x = Math.round(g.l + g.w * i / 10) + .5; ctx.beginPath(); ctx.moveTo(x, g.t); ctx.lineTo(x, g.b); ctx.stroke();
      if (i % 2 === 0) ctx.fillText(S.fmtT(t0 + span * i / 10), Math.min(Math.max(x, g.l + 24), g.r - 24), g.b + 6);
    }
    // je Einheit eine Skala
    var self = this; this.cls = this.cls || {};
    units.forEach(function (u, ui) {
      var items = self.ch.filter(function (c) { return c.tr.unit === u; }), i0s = [], mn = Infinity, mx = -Infinity;
      items.forEach(function (c) {
        var tr = c.tr, a = tr.lower(g.t0), b = Math.min(tr.n, tr.lower(g.t1 + 1e-15) + 1), stride = Math.max(1, Math.floor((b - a) / 3000));
        for (var j = a; j < b; j += stride) { var v = tr.v[j]; if (v < mn) mn = v; if (v > mx) mx = v; }
      });
      var cl = self.cls[u] || (self.cls[u] = { lo: 0, hi: 1, set: false });
      if (u === 'V' && self.vdiv) { cl.lo = -4 * self.vdiv; cl.hi = 4 * self.vdiv; cl.set = true; }
      else if (isFinite(mn)) {
        var pad = (mx - mn) * 0.1 || Math.max(Math.abs(mx) * 0.1, 0.1), lo = mn - pad, hi = mx + pad, step = niceStep(hi - lo, 8);
        var nlo = Math.floor(lo / step) * step, nhi = Math.ceil(hi / step) * step; if (nhi - nlo < step * 4) nhi = nlo + step * 4;
        if (mn >= 0 && mn < (mx - mn) * 0.5) nlo = Math.min(nlo, 0); if (mx <= 0 && -mx < (mx - mn) * 0.5) nhi = Math.max(nhi, 0);
        if (!cl.set || mn < cl.lo || mx > cl.hi || (cl.hi - cl.lo) > 2.6 * (nhi - nlo)) { cl.lo = nlo; cl.hi = nhi; cl.set = true; }
      }
      cl.step = niceStep(cl.hi - cl.lo, 8);
      // Skala zeichnen: erste Einheit mit Gitter links, zweite rechts
      ctx.textBaseline = 'middle'; ctx.textAlign = ui === 0 ? 'right' : 'left'; ctx.fillStyle = items[0].color;
      for (var v = Math.ceil(cl.lo / cl.step - 1e-9) * cl.step; v <= cl.hi + cl.step * 1e-6; v += cl.step) {
        var y = Math.round(g.b - (v - cl.lo) / (cl.hi - cl.lo) * g.h) + .5;
        if (ui === 0) { ctx.strokeStyle = Math.abs(v) < cl.step * 1e-6 ? '#9db7c0' : '#e2eef0'; ctx.beginPath(); ctx.moveTo(g.l, y); ctx.lineTo(g.r, y); ctx.stroke(); }
        ctx.fillText(E.fmt(Math.abs(v) < cl.step * 1e-6 ? 0 : v, u).replace(/\.?0+ /, ' ').replace(/\.(\d) /, '.$1 '), ui === 0 ? g.l - 6 : g.r + 6, y);
      }
    });
    ctx.strokeStyle = '#0f2d3a'; ctx.lineWidth = 1; ctx.strokeRect(g.l + .5, g.t + .5, g.w, g.h);
    // Kurven (Huellkurve je Bildspalte bei dichten Daten)
    ctx.save(); ctx.beginPath(); ctx.rect(g.l, g.t, g.w, g.h); ctx.clip(); ctx.lineWidth = 2; ctx.lineJoin = 'round';
    this.ch.forEach(function (c) {
      var tr = c.tr, cl = self.cls[tr.unit]; if (!cl || !tr.n) return;
      var a = Math.max(0, tr.lower(g.t0) - 1), b = Math.min(tr.n, tr.lower(g.t1 + 1e-15) + 1), dense = (b - a) > g.w * 2;
      function px(t) { return g.l + (t - g.t0) / (g.t1 - g.t0) * g.w; } function py(v) { return g.b - (v - cl.lo) / (cl.hi - cl.lo) * g.h; }
      ctx.strokeStyle = c.color; ctx.beginPath();
      if (!dense) { for (var j = a; j < b; j++) { var X = px(tr.t[j]), Y = py(tr.v[j]); if (j === a) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } }
      else {
        var col = -1, lo = 0, hi = 0, first = true, last = 0;
        for (var j2 = a; j2 < b; j2++) {
          var X2 = Math.floor(px(tr.t[j2])), v2 = tr.v[j2];
          if (X2 !== col) { if (col >= 0) { if (first) { ctx.moveTo(col + .5, py(lo)); first = false; } else ctx.lineTo(col + .5, py(last)); ctx.lineTo(col + .5, py(lo)); ctx.lineTo(col + .5, py(hi)); last = hi; } col = X2; lo = hi = v2; }
          else { if (v2 < lo) lo = v2; if (v2 > hi) hi = v2; }
        }
        if (col >= 0) { if (first) ctx.moveTo(col + .5, py(lo)); ctx.lineTo(col + .5, py(lo)); ctx.lineTo(col + .5, py(hi)); }
      }
      ctx.stroke();
    });
    ctx.restore();
    // Cursor
    if (this.cur.on && this.cur.x1 !== null) {
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; [['x1', '1'], ['x2', '2']].forEach(function (k) {
        var x = self.tx(self.cur[k[0]]); if (x < g.l || x > g.r) return; ctx.strokeStyle = '#d9480f'; ctx.beginPath(); ctx.moveTo(x, g.t); ctx.lineTo(x, g.b); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = '#d9480f'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(k[1], x, g.t + 2); ctx.setLineDash([5, 4]);
      }); ctx.setLineDash([]);
      this.renderReadout();
    }
    if (!this.ch.length) { ctx.fillStyle = '#5b6b73'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '13px ' + getComputedStyle(document.body).getPropertyValue('--font-ui'); ctx.fillText('Werkzeug «Messen» wählen und ein Signal anklicken', g.l + g.w / 2, g.t + g.h / 2); }
    this.version = sim.version;
  };
  Scope.prototype.renderReadout = function () {
    var c = this.cur, el = $('.sc-read', this.el), dt = c.x2 - c.x1, h = '<span>t1 = ' + S.fmtT(c.x1) + '</span><span>t2 = ' + S.fmtT(c.x2) + '</span><span><b>Δt = ' + S.fmtT(dt) + '</b></span><span>1/Δt = ' + (dt ? E.fmt(Math.abs(1 / dt), 'Hz') : '–') + '</span>';
    this.ch.forEach(function (ch) { var u1 = ch.tr.at(c.x1), u2 = ch.tr.at(c.x2); if (!isNaN(u1) && !isNaN(u2)) h += '<span style="color:' + ch.color + '">' + ch.tr.label + ': ' + E.fmt(u1, ch.tr.unit) + ' → ' + E.fmt(u2, ch.tr.unit) + ', Δ = ' + E.fmt(u2 - u1, ch.tr.unit) + '</span>'; });
    if (this.tauResult && Math.abs(this.tauResult.ta - c.x1) < 1e-15 && Math.abs(this.tauResult.tb - c.x2) < 1e-15) h += '<span><b>τ ≈ ' + S.fmtT(this.tauResult.tau) + '</b> (63,2 % von ' + E.fmt(this.tauResult.ya, 'V') + ' → ' + E.fmt(this.tauResult.yb, 'V') + ')</span>';
    if (this.note) h += '<span class="sc-empty">' + this.note + '</span>';
    el.innerHTML = h;
  };

  /* ---------- Anbindung an das Hauptfenster ---------- */
  S.openScope = function (descs) {
    var sc = new Scope(); (descs || []).forEach(function (d) { sc.addChannel(d); }); return sc;
  };
  S.initScopes = function () {};
  var lastDraw = 0;
  S.frame = function (now) {
    if (now - lastDraw < 33) return; lastDraw = now;
    S.scopes.forEach(function (sc) { if (!sc.frozen && sc.version !== S.sim.version) sc.draw(); else if (sc.version === -1) sc.draw(); });
    if (S.timingFrame) S.timingFrame(now);
  };
  S.measurePin = function (pin) {
    var sc = active || S.openScope(); sc.addChannel({ kind: 'node', a: pin }); setActive(sc);
  };
  S.measurePart = function (p) {
    var kind = S.measureKind(), d = E.PARTS[p.type];
    if (kind === 'pi' && (d.digital || d.logic)) kind = 'pv';
    var sc = active || S.openScope(); sc.addChannel({ kind: kind, id: p.id }); setActive(sc);
  };
  S.closeScopes = function () { S.scopes.slice().forEach(function (s) { s.close(); }); };
  S.onLoad = (function (prev) { return function (o) { S.closeScopes(); if (prev) prev(o); (o.scopes || []).forEach(function (sc) { var w = S.openScope(sc.channels || sc); if (sc.span) { w.spanMan = sc.span; var sel = w.el.querySelector('[data-a="span"]'); sel.value = String(sc.span); } }); }; })(S.onLoad);
  S.onReset = function () { S.scopes.forEach(function (sc) { sc.autoSpan = null; sc.cls = {}; if (sc.frozen) sc.setFrozen(false); sc.dirty(); }); };
  S.Scope = Scope;
})(window);
