/* Digital Quest Studio – Bode-Diagramm (Stufe 7)
 * Frequenzgang aus der Wechselstromanalyse der Engine (E.acSweep: komplexe Knotenanalyse um den Arbeitspunkt, dieselbe Netzliste):
 * Verstärkung in dB (oben) und Phase in Grad (unten) über logarithmischer Frequenzachse. Reiz: 1 V an der ersten Wechselspannungsquelle.
 * Signal hinzufügen: Rechtsklick auf einen Anschluss (gegen den Bezugspunkt) oder ein Bauteil (Spannung über dem Bauteil), siehe signale.js. */
(function (root) {
  'use strict';
  var S = root.Studio, E = S.E;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var COLORS = ['#0b6e94', '#d9480f', '#11864f', '#7b3fb5'];
  S.bodes = [];
  var active = null, count = 0;

  function Bode() {
    var self = this; this.id = ++count; this.ch = []; this.fmin = 1; this.fmax = 1e6; this.data = []; this.marks = []; this.cursor = null; this.timer = 0; this.note = '';
    var el = this.el = document.createElement('div'); el.className = 'fwin';
    var k = S.bodes.length, W = Math.min(600, root.innerWidth - 16);
    el.style.cssText = 'left:' + Math.max(8, root.innerWidth - W - 330 - 24 * k) + 'px;top:' + (170 + 28 * k) + 'px;width:' + W + 'px;height:480px';
    el.innerHTML = '<div class="fh"><b>Bode-Diagramm ' + this.id + '</b><button data-a="close" title="Fenster schliessen" aria-label="Schliessen">×</button></div>' +
      '<div class="fb"><canvas></canvas><div class="sc-read bd-read"></div><div class="sc-chs"></div><div class="sc-bar"><label>von <input class="tin" data-a="fmin" value="1" style="width:78px;min-height:36px"></label><label>bis <input class="tin" data-a="fmax" value="1M" style="width:78px;min-height:36px"></label><span>Hz</span>' +
      '<button data-a="m3" title="Die −3-dB-Frequenzen (bezogen auf die höchste Verstärkung) markieren">−3 dB markieren</button></div></div>';
    $('#floats').appendChild(el); this.cv = $('canvas', el); this.ctx = this.cv.getContext('2d');
    el.addEventListener('pointerdown', function () { active = self; });
    el.addEventListener('click', function (ev) { var b = ev.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a; if (a === 'close') self.close(); else if (a === 'm3') self.minus3(); else if (a === 'rm') { self.ch.splice(+b.dataset.i, 1); self.renderChannels(); self.compute(); } });
    el.addEventListener('change', function (ev) { var a = ev.target.dataset.a; if (a === 'fmin' || a === 'fmax') { var v = S.parseSI(ev.target.value); if (v > 0) { self[a] = v; self.marks = []; self.compute(); } } });
    var drag = null, fh = $('.fh', el);
    fh.addEventListener('pointerdown', function (ev) { if (ev.target.closest('button')) return; drag = { x: ev.clientX - el.offsetLeft, y: ev.clientY - el.offsetTop }; fh.setPointerCapture(ev.pointerId); });
    fh.addEventListener('pointermove', function (ev) { if (!drag) return; el.style.left = Math.max(-200, Math.min(root.innerWidth - 60, ev.clientX - drag.x)) + 'px'; el.style.top = Math.max(0, Math.min(root.innerHeight - 40, ev.clientY - drag.y)) + 'px'; });
    fh.addEventListener('pointerup', function () { drag = null; });
    this.cv.addEventListener('pointermove', function (ev) { var r = self.cv.getBoundingClientRect(); self.cursor = ev.clientX - r.left; self.draw(); });
    this.cv.addEventListener('pointerleave', function () { self.cursor = null; self.draw(); });
    if (root.ResizeObserver) new ResizeObserver(function () { self.draw(); }).observe(this.cv);
    S.bodes.push(this); active = this; this.renderChannels();
  }
  Bode.prototype.close = function () { var self = this; this.el.remove(); S.bodes = S.bodes.filter(function (b) { return b !== self; }); if (active === this) active = S.bodes[S.bodes.length - 1] || null; };
  Bode.prototype.addChannel = function (c) {
    var key = JSON.stringify(c); if (this.ch.some(function (x) { return JSON.stringify(x.probe) === key; })) return;
    var used = this.ch.map(function (x) { return x.color; }); this.ch.push({ probe: c, color: COLORS.filter(function (x) { return used.indexOf(x) < 0; })[0] || COLORS[0] });
    this.renderChannels(); this.compute();
  };
  Bode.prototype.renderChannels = function () {
    $('.sc-chs', this.el).innerHTML = this.ch.map(function (c, i) { var p = c.probe; return '<span class="sc-ch"><i style="background:' + c.color + '"></i>U(' + p.a + (p.b ? ' − ' + p.b : '') + ')/U₀<button data-a="rm" data-i="' + i + '" aria-label="Kanal entfernen">×</button></span>'; }).join('') ||
      '<span class="sc-empty">Kein Signal.</span>';
    if (!this.hint) this.hint = S.makeHint(this, 'bode'); this.hint.hidden = this.ch.length > 0;
  };
  Bode.prototype.compute = function () {
    var self = this; clearTimeout(this.timer);
    this.timer = setTimeout(function () {
      self.note = ''; self.data = [];
      var layout = S.core.layout, hasAc = layout.parts.some(function (p) { return p.type === 'acsource'; });
      if (!hasAc) self.note = 'Keine Wechselspannungsquelle – Reiz ist die erste Spannungsquelle.';
      self.ch.forEach(function (c) {
        try { var r = E.acSweep(layout, c.probe, { fmin: self.fmin, fmax: self.fmax, points: 200 }); self.data.push(r.ok ? r : null); if (!r.ok) self.note = r.error; } catch (e) { self.data.push(null); self.note = e.message; }
      });
      self.draw();
    }, 60);
  };
  /* −3 dB: Bezug = höchste Verstärkung des ersten Kanals; markiert die Durchgänge durch Bezug − 3,0103 dB (linear zwischen den Stützstellen, in log f) */
  Bode.prototype.minus3 = function () {
    var d = this.data[0]; this.marks = []; if (!d) return;
    var ref = Math.max.apply(null, d.db), lim = ref - 3.0103;
    for (var i = 1; i < d.db.length; i++) {
      var a = d.db[i - 1], b = d.db[i]; if ((a - lim) * (b - lim) < 0) { var t = (lim - a) / (b - a), lf = Math.log(d.freqs[i - 1]) + t * (Math.log(d.freqs[i]) - Math.log(d.freqs[i - 1])); this.marks.push({ f: Math.exp(lf), db: lim, phase: d.phase[i - 1] + t * (d.phase[i] - d.phase[i - 1]) }); }
    }
    this.draw(); return this.marks;
  };
  Bode.prototype.fx = function (f) { var g = this.g; return g.l + Math.log(f / this.fmin) / Math.log(this.fmax / this.fmin) * g.w; };
  Bode.prototype.draw = function () {
    var cv = this.cv, dpr = root.devicePixelRatio || 1, W = Math.max(60, cv.clientWidth), H = Math.max(60, cv.clientHeight), self = this;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var ctx = this.ctx, mono = getComputedStyle(document.body).getPropertyValue('--font-mono'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.font = '11px ' + mono;
    var g = this.g = { l: 52, r: W - 10, w: W - 62 }, h1 = Math.floor((H - 40) * 0.58), p1 = { t: 8, b: 8 + h1 }, p2 = { t: 8 + h1 + 14, b: H - 22 };
    // dB-Bereich
    var lo = 0, hi = 0, any = false; this.data.forEach(function (d) { if (d) { any = true; d.db.forEach(function (v) { if (v > hi) hi = v; if (v < lo) lo = v; }); } });
    hi = Math.ceil((hi + 3) / 10) * 10; lo = Math.max(-100, Math.floor((lo - 3) / 10) * 10); if (!any) { hi = 10; lo = -60; } if (hi - lo < 30) lo = hi - 30;
    var ymap = function (v, p, a, b) { return p.b - (v - a) / (b - a) * (p.b - p.t); };
    // Gitter
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.fillStyle = '#5b6b73'; ctx.lineWidth = 1;
    var step = (hi - lo) > 90 ? 20 : 10;
    for (var v = lo; v <= hi; v += step) { var y = Math.round(ymap(v, p1, lo, hi)) + .5; ctx.strokeStyle = v === 0 ? '#9db7c0' : '#e2eef0'; ctx.beginPath(); ctx.moveTo(g.l, y); ctx.lineTo(g.r, y); ctx.stroke(); ctx.fillText(v + ' dB', g.l - 4, y); }
    for (var ph = -180; ph <= 180; ph += 45) { var y2 = Math.round(ymap(ph, p2, -180, 180)) + .5; ctx.strokeStyle = ph === 0 ? '#9db7c0' : '#e2eef0'; ctx.beginPath(); ctx.moveTo(g.l, y2); ctx.lineTo(g.r, y2); ctx.stroke(); if (ph % 90 === 0) ctx.fillText(ph + '°', g.l - 4, y2); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var dec = Math.floor(Math.log10(this.fmin)); dec <= Math.ceil(Math.log10(this.fmax)); dec++) for (var m = 1; m < 10; m++) {
      var f = m * Math.pow(10, dec); if (f < this.fmin * 0.9999 || f > this.fmax * 1.0001) continue; var x = Math.round(this.fx(f)) + .5;
      ctx.strokeStyle = m === 1 ? '#c9dde1' : '#eef5f6'; ctx.beginPath(); ctx.moveTo(x, p1.t); ctx.lineTo(x, p2.b); ctx.stroke(); if (m === 1) { ctx.fillStyle = '#5b6b73'; ctx.fillText(E.fmt(f, 'Hz').replace(/\.0+ /, ' ').replace(/(\.\d)0 /, '$1 '), x, p2.b + 4); }
    }
    ctx.strokeStyle = '#0f2d3a'; ctx.strokeRect(g.l + .5, p1.t + .5, g.w, p1.b - p1.t); ctx.strokeRect(g.l + .5, p2.t + .5, g.w, p2.b - p2.t);
    // Kurven
    this.ch.forEach(function (c, k) {
      var d = self.data[k]; if (!d) return; ctx.lineWidth = 2; ctx.strokeStyle = c.color;
      [[d.db, p1, lo, hi], [d.phase, p2, -180, 180]].forEach(function (pl) { ctx.save(); ctx.beginPath(); ctx.rect(g.l, pl[1].t, g.w, pl[1].b - pl[1].t); ctx.clip(); ctx.beginPath(); d.freqs.forEach(function (f, i) { var X = self.fx(f), Y = ymap(pl[0][i], pl[1], pl[2], pl[3]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); ctx.restore(); });
    });
    // −3-dB-Marken
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#d9480f'; ctx.fillStyle = '#d9480f'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    this.marks.forEach(function (mk) { var x = self.fx(mk.f); ctx.beginPath(); ctx.moveTo(x, p1.t); ctx.lineTo(x, p2.b); ctx.stroke(); ctx.fillText(E.fmt(mk.f, 'Hz'), Math.min(x + 3, g.r - 60), p1.t + 2); });
    ctx.setLineDash([]);
    // Anzeige
    var txt = '', d0 = this.data[0];
    if (this.cursor !== null && d0) {
      var cf = this.fmin * Math.pow(this.fmax / this.fmin, Math.max(0, Math.min(1, (this.cursor - g.l) / g.w))), i2 = 0; while (i2 < d0.freqs.length - 1 && d0.freqs[i2] < cf) i2++;
      txt = '<span>f = ' + E.fmt(d0.freqs[i2], 'Hz') + '</span><span>' + d0.db[i2].toFixed(2) + ' dB</span><span>' + d0.phase[i2].toFixed(1) + '°</span>';
      var xx = this.fx(d0.freqs[i2]); ctx.strokeStyle = '#5b6b73'; ctx.beginPath(); ctx.moveTo(xx + .5, p1.t); ctx.lineTo(xx + .5, p2.b); ctx.stroke();
    }
    if (this.marks.length) txt += this.marks.map(function (mk) { return '<span><b>−3 dB bei ' + E.fmt(mk.f, 'Hz') + '</b>, Phase ' + mk.phase.toFixed(1) + '°</span>'; }).join('');
    if (this.note) txt += '<span class="sc-empty">' + this.note + '</span>';
    var rd = $('.bd-read', this.el); var html = txt || '<span class="sc-empty">Mauszeiger über das Diagramm: Frequenz, Verstärkung, Phase.</span>'; if (rd.innerHTML !== html) rd.innerHTML = html;
  };

  S.openBode = function (channels) { var b = new Bode(); (channels || []).forEach(function (c) { b.addChannel(c); }); b.compute(); return b; };
  S.onCircuitChange = function () { S.bodes.forEach(function (b) { b.compute(); }); };
  S.initFns.push(function () {
    var btn = $('#btnBode'); if (btn) btn.addEventListener('click', function () { S.openBode(); });
  });
  S.onLoad = (function (prev) { return function (o) { S.bodes.slice().forEach(function (b) { b.close(); }); if (prev) prev(o); (o.bode || []).forEach(function (b) { S.openBode(b.channels); }); }; })(S.onLoad);
})(window);
